//! Compiled only for the separately identified acceptance build.
use crate::scope::{AppError, AppResult};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    fs::File,
    io::{Read, Write},
    os::fd::FromRawFd,
    os::unix::{
        fs::{FileTypeExt, MetadataExt},
        net::UnixStream,
    },
    path::Path,
    sync::{Arc, Condvar, Mutex, OnceLock},
    time::{Duration, Instant},
};
use tauri::{Emitter, Listener, Manager};

const QA_ID: &str = "com.juanmantilla.markdownworkspace.qa";
const MAX_TRACE: usize = 100_000;
static HOST: OnceLock<Arc<Host>> = OnceLock::new();
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Bootstrap {
    socket: String,
    token: String,
    run: String,
    fault: String,
}
#[derive(Debug, Deserialize)]
#[serde(tag = "command", rename_all = "kebab-case", deny_unknown_fields)]
enum Command {
    Arm {
        operation: String,
        ordinal: u64,
    },
    Release {
        #[serde(rename = "operationId")]
        operation_id: u64,
    },
    Snapshot,
    Finish,
}
struct Request {
    schema: u8,
    run: String,
    token: String,
    sequence: u64,
    command: Command,
}
impl<'de> Deserialize<'de> for Request {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Wire {
            schema: u8,
            run: String,
            token: String,
            sequence: u64,
            command: String,
            operation: Option<String>,
            ordinal: Option<u64>,
            #[serde(rename = "operationId")]
            operation_id: Option<u64>,
        }
        let w = Wire::deserialize(deserializer)?;
        let command = match (w.command.as_str(), w.operation, w.ordinal, w.operation_id) {
            ("arm", Some(operation), Some(ordinal), None) => Command::Arm { operation, ordinal },
            ("release", None, None, Some(operation_id)) => Command::Release { operation_id },
            ("snapshot", None, None, None) => Command::Snapshot,
            ("finish", None, None, None) => Command::Finish,
            _ => return Err(serde::de::Error::custom("invalid command fields")),
        };
        Ok(Self {
            schema: w.schema,
            run: w.run,
            token: w.token,
            sequence: w.sequence,
            command,
        })
    }
}
fn authenticated(r: &Request, boot: &Bootstrap, sequence: u64) -> bool {
    let equal = r.token.len() == boot.token.len()
        && r.token
            .bytes()
            .zip(boot.token.bytes())
            .fold(0u8, |a, (b, c)| a | (b ^ c))
            == 0;
    r.schema == 1 && r.run == boot.run && equal && r.sequence > sequence
}

struct Gate {
    operation: String,
    target: u64,
    id: Option<u64>,
    released: bool,
    deadline: Instant,
}
#[derive(Default)]
struct State {
    counts: BTreeMap<String, u64>,
    gate: Option<Gate>,
    next: u64,
    inflight: usize,
    events: Vec<Value>,
    dead: bool,
    snapshot: Option<Value>,
    snapshot_id: u64,
    fault_used: bool,
}
struct Host {
    state: Mutex<State>,
    changed: Condvar,
    started: Instant,
    fault: String,
}
fn err(message: &str) -> AppError {
    AppError::new("qa_cancelled", message)
}
fn clock() -> f64 {
    #[repr(C)]
    struct Timebase {
        numer: u32,
        denom: u32,
    }
    extern "C" {
        fn mach_continuous_time() -> u64;
        fn mach_timebase_info(info: *mut Timebase) -> i32;
    }
    let mut t = Timebase { numer: 0, denom: 0 };
    unsafe {
        mach_timebase_info(&mut t);
        mach_continuous_time() as f64 * t.numer as f64 / t.denom as f64 / 1e9
    }
}
fn operation_valid(op: &str) -> bool {
    matches!(
        op,
        "read-document"
            | "confirmed-refresh"
            | "save-section"
            | "search-batch"
            | "search-open-reply"
            | "diagram-reply"
    )
}
fn event(s: &mut State, id: u64, phase: &str) -> AppResult<()> {
    if s.events.len() >= MAX_TRACE {
        s.dead = true;
        return Err(err("trace limit"));
    }
    s.events
        .push(json!({"operationId":id,"phase":phase,"time":clock()}));
    Ok(())
}
impl Host {
    fn fixture_save_failure(&self) -> AppResult<()> {
        let mut state = self.state.lock().unwrap();
        if self.fault == "fixture-save" && !state.fault_used {
            state.fault_used = true;
            return Err(AppError::new(
                "io_error",
                "Injected QA staging failure after validation",
            ));
        }
        Ok(())
    }
    fn cancel(&self) {
        self.state.lock().unwrap().dead = true;
        self.changed.notify_all();
    }
    fn enter(self: &Arc<Self>, op: &str) -> AppResult<Ticket> {
        let mut s = self.state.lock().unwrap();
        if s.dead || self.started.elapsed() >= Duration::from_secs(1800) {
            return Err(err("run expired"));
        }
        let count = s.counts.entry(op.to_owned()).or_default();
        *count += 1;
        let count = *count;
        s.next += 1;
        let id = s.next;
        event(&mut s, id, "entered")?;
        if s.gate
            .as_ref()
            .is_some_and(|g| Instant::now() >= g.deadline)
        {
            s.dead = true;
            return Err(err("gate expired"));
        }
        let held = s
            .gate
            .as_ref()
            .is_some_and(|g| g.operation == op && g.target == count);
        if held {
            s.gate.as_mut().unwrap().id = Some(id);
            event(&mut s, id, "reached")?;
            while !s.dead && !s.gate.as_ref().unwrap().released {
                let remaining = s
                    .gate
                    .as_ref()
                    .unwrap()
                    .deadline
                    .saturating_duration_since(Instant::now());
                if remaining.is_zero() {
                    s.dead = true;
                    break;
                }
                s = self
                    .changed
                    .wait_timeout(s, remaining.min(Duration::from_millis(100)))
                    .unwrap()
                    .0;
            }
            if s.dead {
                let _ = event(&mut s, id, "cancelled");
                return Err(err("held operation cancelled"));
            }
        }
        s.inflight += 1;
        event(&mut s, id, "released")?;
        let inject = !s.fault_used && (op == "read-document" && self.fault == "fixture-read");
        if inject {
            s.fault_used = true;
        }
        Ok(Ticket {
            host: self.clone(),
            id,
            inject,
            completed: false,
        })
    }
    fn command(&self, command: Command) -> Result<Value, &'static str> {
        let mut s = self.state.lock().unwrap();
        if s.dead {
            return Err("run closed");
        }
        match command {
            Command::Arm { operation, ordinal } => {
                if !operation_valid(&operation) || !(1..=100).contains(&ordinal) || s.gate.is_some()
                {
                    return Err("invalid arm");
                }
                let target = s.counts.get(&operation).copied().unwrap_or(0) + ordinal;
                s.gate = Some(Gate {
                    operation,
                    target,
                    id: None,
                    released: false,
                    deadline: Instant::now() + Duration::from_secs(60),
                });
                Ok(json!({"armed":true}))
            }
            Command::Release { operation_id } => {
                let g = s.gate.as_mut().ok_or("no gate")?;
                if g.id != Some(operation_id) || g.released || Instant::now() >= g.deadline {
                    return Err("invalid release");
                }
                g.released = true;
                self.changed.notify_all();
                Ok(json!({"released": operation_id}))
            }
            Command::Snapshot => Ok(
                json!({"counts":s.counts,"gate":s.gate.as_ref().map(|g| json!({"operationId":g.id,"released":g.released})),"inflight":s.inflight}),
            ),
            Command::Finish => {
                if s.inflight > 0 || s.gate.as_ref().is_some_and(|g| g.id.is_some()) {
                    return Err("operation active");
                }
                s.gate = None;
                s.dead = true;
                Ok(json!({"finished":true}))
            }
        }
    }
}
pub struct Ticket {
    host: Arc<Host>,
    id: u64,
    inject: bool,
    completed: bool,
}
impl Ticket {
    pub fn injected(&self) -> AppResult<()> {
        if self.inject {
            Err(AppError::new(
                "io_error",
                "Injected QA fixture failure before mutation",
            ))
        } else {
            Ok(())
        }
    }
    pub fn finish<T>(mut self, result: AppResult<T>) -> AppResult<T> {
        let mut s = self.host.state.lock().unwrap();
        let phase = if result.is_ok() {
            "completed"
        } else {
            "failed"
        };
        let _ = event(&mut s, self.id, phase);
        if let Some(last) = s.events.last_mut() {
            last["resultCode"] = json!(result.as_ref().err().map(|e| &e.code));
        }
        if s.gate.as_ref().is_some_and(|g| g.id == Some(self.id)) {
            s.gate = None;
        }
        s.inflight -= 1;
        self.completed = true;
        result
    }
}
impl Drop for Ticket {
    fn drop(&mut self) {
        if !self.completed {
            let mut s = self.host.state.lock().unwrap();
            s.inflight -= 1;
            s.dead = true;
            let _ = event(&mut s, self.id, "aborted");
            self.host.changed.notify_all();
        }
    }
}
// Fixed one-shot I/O failure only. Called after original scope/version/content
// validation, before staging writes; never sleeps or releases a gate under locks.
pub fn fixture_save_failure() -> AppResult<()> {
    match HOST.get() {
        Some(host) => host.fixture_save_failure(),
        None => Ok(()),
    }
}
/// Hold an already computed reply on its existing background worker. No app
/// locks are held, and the production build has no such channel.
pub fn enter_sync(op: &'static str) -> AppResult<Ticket> {
    HOST.get()
        .ok_or_else(|| err("QA runner missing"))?
        .enter(op)
}
pub async fn enter(op: &'static str) -> AppResult<Ticket> {
    let host = HOST.get().ok_or_else(|| err("QA runner missing"))?.clone();
    tauri::async_runtime::spawn_blocking(move || host.enter(op))
        .await
        .map_err(|_| err("gate worker failed"))?
}
fn hex(s: &str, n: usize) -> bool {
    s.len() == n && s.bytes().all(|b| b.is_ascii_hexdigit())
}
fn safe_snapshot(v: &Value) -> bool {
    match v {
        Value::Null | Value::Bool(_) | Value::Number(_) => true,
        Value::String(s) => hex(s, 64),
        Value::Array(a) => a.len() <= 256 && a.iter().all(safe_snapshot),
        Value::Object(m) => {
            m.len() <= 32
                && m.iter().all(|(k, v)| {
                    k.len() <= 40
                        && k.bytes().all(|b| b.is_ascii_alphanumeric())
                        && safe_snapshot(v)
                })
        }
    }
}
fn secure_path(path: &Path, socket: bool) -> std::io::Result<()> {
    for ancestor in path.ancestors() {
        if std::fs::symlink_metadata(ancestor)?
            .file_type()
            .is_symlink()
        {
            return Err(std::io::Error::other("symlink"));
        }
    }
    let m = std::fs::symlink_metadata(path)?;
    if m.uid() != unsafe { libc::getuid() }
        || m.mode() & 0o777 != if socket { 0o600 } else { 0o700 }
        || if socket {
            !m.file_type().is_socket()
        } else {
            !m.is_dir()
        }
    {
        return Err(std::io::Error::other("private owner/mode/type required"));
    }
    Ok(())
}
pub fn setup(app: &tauri::AppHandle) -> Result<String, Box<dyn std::error::Error>> {
    if app.config().identifier != QA_ID || !app.path().app_data_dir()?.ends_with(QA_ID) {
        return Err("QA storage mismatch".into());
    }
    let data = app.path().app_data_dir()?;
    for ancestor in data.ancestors() {
        if let Ok(metadata) = std::fs::symlink_metadata(ancestor) {
            if metadata.file_type().is_symlink() {
                return Err("QA app data symlink".into());
            }
        }
    }
    let fd: i32 = std::env::var("F002A_BOOTSTRAP_FD")?.parse()?;
    if fd < 3 {
        return Err("invalid bootstrap descriptor".into());
    }
    let mut stat = std::mem::MaybeUninit::<libc::stat>::uninit();
    if unsafe { libc::fstat(fd, stat.as_mut_ptr()) } != 0
        || unsafe { stat.assume_init() }.st_mode & libc::S_IFMT != libc::S_IFIFO
    {
        return Err("bootstrap must be inherited pipe".into());
    }
    let mut bytes = Vec::new();
    unsafe { File::from_raw_fd(fd) }
        .take(4097)
        .read_to_end(&mut bytes)?;
    if bytes.len() > 4096 {
        return Err("bootstrap too large".into());
    }
    let bootstrap: Bootstrap = serde_json::from_slice(&bytes)?;
    if !hex(&bootstrap.token, 64)
        || !hex(&bootstrap.run, 32)
        || !matches!(
            bootstrap.fault.as_str(),
            "diagram-acceptance"
                | "none"
                | "preference-read"
                | "preference-write"
                | "native-theme"
                | "fixture-read"
                | "fixture-save"
        )
    {
        return Err("invalid bootstrap".into());
    }
    let path = Path::new(&bootstrap.socket);
    secure_path(path, true)?;
    secure_path(path.parent().ok_or("socket parent")?, false)?;
    let stream = UnixStream::connect(path)?;
    let mut uid = 0;
    let mut gid = 0;
    use std::os::fd::AsRawFd;
    if unsafe { libc::getpeereid(stream.as_raw_fd(), &mut uid, &mut gid) } != 0
        || uid != unsafe { libc::getuid() }
    {
        return Err("wrong peer".into());
    }
    let mut pid: libc::pid_t = 0;
    let mut len = std::mem::size_of_val(&pid) as libc::socklen_t;
    if unsafe {
        libc::getsockopt(
            stream.as_raw_fd(),
            libc::SOL_LOCAL,
            libc::LOCAL_PEERPID,
            &mut pid as *mut _ as *mut _,
            &mut len,
        )
    } != 0
        || pid != unsafe { libc::getppid() }
    {
        return Err("runner is not parent".into());
    }
    stream.set_read_timeout(Some(Duration::from_millis(250)))?;
    stream.set_write_timeout(Some(Duration::from_secs(2)))?;
    let host = Arc::new(Host {
        state: Mutex::new(State::default()),
        changed: Condvar::new(),
        started: Instant::now(),
        fault: bootstrap.fault.clone(),
    });
    HOST.set(host.clone())
        .map_err(|_| "QA already initialized")?;
    let observed = host.clone();
    app.listen("qa:snapshot-response", move |e| {
        if e.payload().len() > 65536 {
            observed.cancel();
            return;
        }
        if let Ok(v) = serde_json::from_str::<Value>(e.payload()) {
            let mut s = observed.state.lock().unwrap();
            if v["id"].as_u64() == Some(s.snapshot_id) && safe_snapshot(&v) {
                s.snapshot = Some(v);
                observed.changed.notify_all();
            }
        }
    });
    let handle = app.clone();
    std::thread::spawn(move || {
        if serve(stream, &bootstrap, &host, &handle).is_err() {
            host.cancel();
        }
    });
    Ok(format!(
        "Object.defineProperty(window,'__F002A_FAULT',{{value:{}}});",
        serde_json::to_string(&host_fault())?
    ))
}
fn host_fault() -> String {
    HOST.get().unwrap().fault.clone()
}
fn serve(
    mut stream: UnixStream,
    boot: &Bootstrap,
    host: &Arc<Host>,
    app: &tauri::AppHandle,
) -> std::io::Result<()> {
    let mut line = Vec::new();
    let mut sequence = 0;
    let mut sent = 0;
    loop {
        if host.started.elapsed() >= Duration::from_secs(1800) {
            host.cancel();
            return Err(std::io::Error::other("expired"));
        }
        {
            let s = host.state.lock().unwrap();
            if s.dead
                || s.gate
                    .as_ref()
                    .is_some_and(|g| Instant::now() >= g.deadline)
            {
                drop(s);
                host.cancel();
                return Err(std::io::Error::other("closed/expired gate"));
            }
        }
        let mut byte = [0];
        match stream.read(&mut byte) {
            Ok(0) => return Err(std::io::Error::other("disconnect")),
            Err(e)
                if matches!(
                    e.kind(),
                    std::io::ErrorKind::WouldBlock | std::io::ErrorKind::TimedOut
                ) =>
            {
                continue
            }
            Err(e) => return Err(e),
            Ok(_) => {}
        }
        if byte[0] != b'\n' {
            line.push(byte[0]);
            if line.len() > 4095 {
                return Err(std::io::Error::other("message limit"));
            }
            continue;
        }
        let request: Request =
            serde_json::from_slice(&line).map_err(|_| std::io::Error::other("invalid request"))?;
        line.clear();
        if !authenticated(&request, boot, sequence) {
            return Err(std::io::Error::other("authentication/sequence"));
        }
        sequence = request.sequence;
        let snapshot = matches!(request.command, Command::Snapshot);
        let finished = matches!(request.command, Command::Finish);
        let pending = host.state.lock().unwrap().events.len().saturating_sub(sent);
        let result = if finished && pending > 128 {
            Err("drain trace with snapshot before finish")
        } else {
            host.command(request.command)
        };
        let mut renderer = Value::Null;
        let before = clock();
        if snapshot && result.is_ok() {
            {
                let mut s = host.state.lock().unwrap();
                s.snapshot = None;
                s.snapshot_id = sequence;
            }
            app.emit("qa:snapshot-request", json!({"id":sequence}))
                .map_err(std::io::Error::other)?;
            let deadline = Instant::now() + Duration::from_secs(2);
            let mut s = host.state.lock().unwrap();
            while s.snapshot.is_none() && Instant::now() < deadline {
                s = host
                    .changed
                    .wait_timeout(s, Duration::from_millis(20))
                    .unwrap()
                    .0;
            }
            renderer = s.snapshot.take().unwrap_or(Value::Null);
        }
        let mut s = host.state.lock().unwrap();
        let end = (sent + 128).min(s.events.len());
        let response = json!({"schema":1,"sequence":sequence,"error":result.as_ref().err(),"result":result.as_ref().ok(),"renderer":renderer,
            "snapshotClockBounds":[before,clock()],"events":&s.events[sent..end],"moreEvents":end<s.events.len()});
        sent = end;
        if finished && response["result"].is_object() {
            s.dead = true;
        }
        drop(s);
        let mut bytes = serde_json::to_vec(&response)?;
        if bytes.len() > 65535 {
            return Err(std::io::Error::other("response limit"));
        }
        bytes.push(b'\n');
        stream.write_all(&bytes)?;
        if finished && response["result"].is_object() {
            return Ok(());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn host() -> Arc<Host> {
        Arc::new(Host {
            state: Mutex::new(State::default()),
            changed: Condvar::new(),
            started: Instant::now(),
            fault: "none".into(),
        })
    }
    #[test]
    fn gate_release_once_preserves_operation() {
        let h = host();
        h.command(Command::Arm {
            operation: "save-section".into(),
            ordinal: 1,
        })
        .unwrap();
        let other = h.clone();
        let thread = std::thread::spawn(move || other.enter("save-section").unwrap().finish(Ok(7)));
        while h.state.lock().unwrap().gate.as_ref().unwrap().id.is_none() {
            std::thread::yield_now();
        }
        h.command(Command::Release { operation_id: 1 }).unwrap();
        assert!(h.command(Command::Release { operation_id: 1 }).is_err());
        assert_eq!(thread.join().unwrap().unwrap(), 7);
        assert_eq!(h.state.lock().unwrap().counts["save-section"], 1);
    }
    #[test]
    fn disconnect_and_timeout_do_not_release_save() {
        for timeout in [false, true] {
            let h = host();
            h.command(Command::Arm {
                operation: "save-section".into(),
                ordinal: 1,
            })
            .unwrap();
            if timeout {
                h.state.lock().unwrap().gate.as_mut().unwrap().deadline = Instant::now();
            } else {
                h.cancel();
            }
            assert!(h.enter("save-section").is_err());
            assert_eq!(h.state.lock().unwrap().inflight, 0);
        }
    }
    #[test]
    fn unsafe_paths_and_trace_overflow_are_rejected() {
        use std::os::unix::fs::PermissionsExt;
        let directory = std::path::PathBuf::from(format!(
            "/private/tmp/f002a-path-test-{}",
            uuid::Uuid::new_v4()
        ));
        std::fs::create_dir(&directory).unwrap();
        std::fs::set_permissions(&directory, std::fs::Permissions::from_mode(0o755)).unwrap();
        assert!(secure_path(&directory, false).is_err());
        std::fs::set_permissions(&directory, std::fs::Permissions::from_mode(0o700)).unwrap();
        assert!(secure_path(&directory, false).is_ok());
        let alias = directory.join("alias");
        std::os::unix::fs::symlink(&directory, &alias).unwrap();
        assert!(secure_path(&alias, false).is_err());
        let ordinary = directory.join("not-socket");
        std::fs::write(&ordinary, b"").unwrap();
        std::fs::set_permissions(&ordinary, std::fs::Permissions::from_mode(0o600)).unwrap();
        assert!(secure_path(&ordinary, true).is_err());
        std::fs::remove_file(alias).unwrap();
        std::fs::remove_file(ordinary).unwrap();
        std::fs::remove_dir(directory).unwrap();
        let h = host();
        h.state.lock().unwrap().events = vec![Value::Null; MAX_TRACE];
        assert!(h.enter("save-section").is_err());
    }
    #[test]
    fn fixture_fault_is_one_shot() {
        let h = Arc::new(Host {
            state: Mutex::new(State::default()),
            changed: Condvar::new(),
            started: Instant::now(),
            fault: "fixture-save".into(),
        });
        let first = h.enter("save-section").unwrap();
        let injected = h.fixture_save_failure();
        assert!(first.finish(injected).is_err());
        let second = h.enter("save-section").unwrap();
        let outcome = h.fixture_save_failure();
        assert!(second.finish(outcome).is_ok());
    }
    #[test]
    fn authentication_replay_and_expiry() {
        let boot = Bootstrap {
            socket: String::new(),
            token: "a".repeat(64),
            run: "b".repeat(32),
            fault: "none".into(),
        };
        let mut r = Request {
            schema: 1,
            token: boot.token.clone(),
            run: boot.run.clone(),
            sequence: 2,
            command: Command::Snapshot,
        };
        assert!(authenticated(&r, &boot, 1));
        assert!(!authenticated(&r, &boot, 2));
        r.token = "c".repeat(64);
        assert!(!authenticated(&r, &boot, 1));
        r.token = boot.token.clone();
        r.run = "c".repeat(32);
        assert!(!authenticated(&r, &boot, 1));
        let h = Arc::new(Host {
            state: Mutex::new(State::default()),
            changed: Condvar::new(),
            started: Instant::now() - Duration::from_secs(1801),
            fault: "none".into(),
        });
        assert!(h.enter("save-section").is_err());
    }
    #[test]
    fn disconnect_while_held_never_runs_body() {
        let h = host();
        h.command(Command::Arm {
            operation: "save-section".into(),
            ordinal: 1,
        })
        .unwrap();
        let other = h.clone();
        let worker = std::thread::spawn(move || other.enter("save-section"));
        while h.state.lock().unwrap().gate.as_ref().unwrap().id.is_none() {
            std::thread::yield_now();
        }
        assert!(h.command(Command::Finish).is_err());
        h.cancel();
        assert!(worker.join().unwrap().is_err());
        assert!(!h
            .state
            .lock()
            .unwrap()
            .events
            .iter()
            .any(|e| e["phase"] == "released"));
    }
    #[test]
    fn original_validation_runs_after_release() {
        let h = host();
        h.command(Command::Arm {
            operation: "read-document".into(),
            ordinal: 1,
        })
        .unwrap();
        let other = h.clone();
        let worker = std::thread::spawn(move || {
            let ticket = other.enter("read-document").unwrap();
            ticket.finish(crate::document::read_document_impl(
                &crate::state::AppState::default(),
                None,
                None,
                None,
            ))
        });
        while h.state.lock().unwrap().gate.as_ref().unwrap().id.is_none() {
            std::thread::yield_now();
        }
        h.command(Command::Release { operation_id: 1 }).unwrap();
        assert_eq!(worker.join().unwrap().unwrap_err().code, "invalid_grant");
    }
    #[test]
    fn released_operation_is_not_cancelled_on_disconnect() {
        let h = host();
        let ticket = h.enter("save-section").unwrap();
        h.cancel();
        assert_eq!(ticket.finish(Ok(9)).unwrap(), 9);
    }
    #[test]
    fn valid_protocol_and_rejection() {
        for command in [
            r#""command":"snapshot""#,
            r#""command":"arm","operation":"save-section","ordinal":1"#,
            r#""command":"release","operationId":1"#,
            r#""command":"finish""#,
        ] {
            let input = format!(r#"{{"schema":1,"run":"a","token":"b","sequence":1,{command}}}"#);
            assert!(serde_json::from_str::<Request>(&input).is_ok(), "{input}");
        }
    }
    #[test]
    fn bounds_and_snapshot_rejection() {
        let h = host();
        for (op, n) in [("shell", 1), ("save-section", 0), ("save-section", 101)] {
            assert!(h
                .command(Command::Arm {
                    operation: op.into(),
                    ordinal: n
                })
                .is_err());
        }
        assert!(!safe_snapshot(&json!({"text":"document contents"})));
        assert!(serde_json::from_str::<Request>(
            r#"{"schema":1,"run":"a","token":"b","sequence":1,"command":"snapshot","path":"/tmp"}"#
        )
        .is_err());
    }
}

pub fn diagram_acceptance_enabled() -> bool {
    HOST.get().is_some_and(|h| h.fault == "diagram-acceptance")
}
