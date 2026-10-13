//! Pure-input, pixel-only rendering. The main native process owns cancellation
//! and a monotonic deadline; neither renderer JS nor its run loop can delay it.
use crate::scope::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::VecDeque,
    io::{Read, Write},
    process::{Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::{Duration, Instant},
};
use tauri::Manager;
const MAX_SOURCE: usize = 32 * 1024;
const MAX_PNG: usize = 4 * 1024 * 1024;
const MAX_HEADER: usize = 4096;
#[derive(Default)]
pub struct DiagramState {
    active: Mutex<Option<(String, Arc<Control>)>>,
    cancelled: Mutex<VecDeque<String>>,
}
#[derive(Default)]
struct Control {
    cancelled: AtomicBool,
    child: Mutex<Option<std::process::Child>>,
    #[cfg(any(test, feature = "acceptance-harness"))]
    diagnostic_mode: Option<String>,
    #[cfg(any(test, feature = "acceptance-harness"))]
    events: Arc<Mutex<Vec<String>>>,
    #[cfg(any(test, feature = "acceptance-harness"))]
    pid: std::sync::atomic::AtomicU32,
}
impl Control {
    fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
        if let Ok(mut slot) = self.child.lock() {
            if let Some(child) = slot.as_mut() {
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}
impl DiagramState {
    pub fn cancel_all(&self) {
        if let Ok(active) = self.active.lock() {
            if let Some((_, control)) = active.as_ref() {
                control.cancel();
            }
        }
    }
}
fn error(code: &'static str) -> AppError {
    AppError::new(code, "Diagram unavailable; source is preserved")
}
fn valid_job(job: &str) -> bool {
    !job.is_empty()
        && job.len() <= 64
        && job.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiagramResponse {
    job_id: String,
    generation: u64,
    width: u32,
    height: u32,
    bytes: Vec<u8>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Header {
    version: u32,
    job_id: String,
    token: String,
    source_digest: String,
    generation: u64,
    byte_length: usize,
    width: Option<u32>,
    height: Option<u32>,
    error: Option<String>,
}
fn validate_reply(
    data: &[u8],
    job: &str,
    token: &str,
    digest: &str,
    generation: u64,
) -> AppResult<(Vec<u8>, u32, u32)> {
    if data.len() > MAX_PNG + MAX_HEADER + 1 {
        return Err(error("diagram_output_limit"));
    }
    let end = data
        .iter()
        .position(|b| *b == b'\n')
        .filter(|end| *end <= MAX_HEADER)
        .ok_or_else(|| error("diagram_protocol"))?;
    let header: Header =
        serde_json::from_slice(&data[..end]).map_err(|_| error("diagram_protocol"))?;
    if header.version != 1
        || header.job_id != job
        || header.token != token
        || header.source_digest != digest
        || header.generation != generation
    {
        return Err(error("diagram_stale"));
    }
    let pixels = &data[end + 1..];
    if header.byte_length != pixels.len() || pixels.len() > MAX_PNG {
        return Err(error("diagram_protocol"));
    }
    if header.error.is_some() {
        return Err(error("diagram_rejected"));
    }
    let (width, height) = (
        header.width.ok_or_else(|| error("diagram_protocol"))?,
        header.height.ok_or_else(|| error("diagram_protocol"))?,
    );
    if width == 0
        || height == 0
        || width > 2048
        || height > 2048
        || pixels.len() < 24
        || !pixels.starts_with(b"\x89PNG\r\n\x1a\n")
        || &pixels[12..16] != b"IHDR"
        || u32::from_be_bytes(pixels[16..20].try_into().unwrap()) != width
        || u32::from_be_bytes(pixels[20..24].try_into().unwrap()) != height
    {
        return Err(error("diagram_protocol"));
    }
    Ok((pixels.to_vec(), width, height))
}
#[cfg(target_os = "macos")]
fn execute(
    path: std::path::PathBuf,
    source: String,
    job: String,
    generation: u64,
    control: Arc<Control>,
) -> AppResult<DiagramResponse> {
    let began = Instant::now();
    let token = format!(
        "{}{}",
        uuid::Uuid::new_v4().simple(),
        uuid::Uuid::new_v4().simple()
    );
    let digest = format!("{:x}", Sha256::digest(source.as_bytes()));
    let input = serde_json::to_vec(&serde_json::json!({"version":1,"jobId":job,"generation":generation,"token":token,"sourceDigest":digest,"source":source})).map_err(|_| error("diagram_protocol"))?;
    if control.cancelled.load(Ordering::SeqCst) {
        return Err(error("diagram_cancelled"));
    }
    let (mut stdin, stdout) = {
        let mut slot = control
            .child
            .lock()
            .map_err(|_| error("diagram_unavailable"))?;
        if control.cancelled.load(Ordering::SeqCst) {
            return Err(error("diagram_cancelled"));
        }
        let mut command = Command::new(path);
        command
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null());
        #[cfg(any(test, feature = "acceptance-harness"))]
        if let Some(mode) = &control.diagnostic_mode {
            command
                .env("INTENTGROVE_DIAG_MODE", mode)
                .stderr(Stdio::piped());
        }
        *slot = Some(command.spawn().map_err(|_| error("diagram_unavailable"))?);
        let child = slot.as_mut().unwrap();
        #[cfg(any(test, feature = "acceptance-harness"))]
        {
            control.pid.store(child.id(), Ordering::SeqCst);
            if let Some(stderr) = child.stderr.take() {
                let events = control.events.clone();
                std::thread::spawn(move || {
                    use std::io::BufRead;
                    for line in std::io::BufReader::new(stderr)
                        .lines()
                        .map_while(Result::ok)
                    {
                        events.lock().unwrap().push(line);
                    }
                });
            }
        }
        (
            child
                .stdin
                .take()
                .ok_or_else(|| error("diagram_unavailable"))?,
            child
                .stdout
                .take()
                .ok_or_else(|| error("diagram_unavailable"))?,
        )
    };
    let writer = std::thread::spawn(move || stdin.write_all(&input));
    let reader = std::thread::spawn(move || {
        let mut bytes = Vec::new();
        stdout
            .take((MAX_PNG + MAX_HEADER + 2) as u64)
            .read_to_end(&mut bytes)
            .map(|_| bytes)
    });
    let result = loop {
        if control.cancelled.load(Ordering::SeqCst) {
            break Err(error("diagram_cancelled"));
        }
        if began.elapsed() >= Duration::from_secs(2) {
            break Err(error("diagram_deadline"));
        }
        match control
            .child
            .lock()
            .map_err(|_| error("diagram_unavailable"))?
            .as_mut()
            .unwrap()
            .try_wait()
        {
            Ok(Some(status)) => {
                break if status.success() {
                    Ok(())
                } else {
                    Err(error("diagram_rejected"))
                }
            }
            Ok(None) => std::thread::park_timeout(Duration::from_millis(2)),
            Err(_) => break Err(error("diagram_unavailable")),
        }
    };
    // Always reap, including invalid output, cancellation, pipe failures and timeout.
    if let Some(mut child) = control
        .child
        .lock()
        .map_err(|_| error("diagram_unavailable"))?
        .take()
    {
        let _ = child.kill();
        let _ = child.wait();
    }
    let wrote = writer.join().map_err(|_| error("diagram_protocol"))?;
    let bytes = reader
        .join()
        .map_err(|_| error("diagram_protocol"))?
        .map_err(|_| error("diagram_protocol"))?;
    result?;
    wrote.map_err(|_| error("diagram_protocol"))?;
    let (png, width, height) = validate_reply(&bytes, &job, &token, &digest, generation)?;
    if control.cancelled.load(Ordering::SeqCst) {
        return Err(error("diagram_cancelled"));
    }
    let (pixels, decoded_width, decoded_height, _) =
        crate::image::decode(&png, "png", 2048, generation)?;
    if pixels.len() > MAX_PNG
        || decoded_width != width
        || decoded_height != height
        || control.cancelled.load(Ordering::SeqCst)
    {
        return Err(error("diagram_protocol"));
    }
    Ok(DiagramResponse {
        job_id: job,
        generation,
        width,
        height,
        bytes: pixels,
    })
}
struct Reservation {
    app: tauri::AppHandle,
    job: String,
}
impl Drop for Reservation {
    fn drop(&mut self) {
        let state = self.app.state::<DiagramState>();
        if let Ok(mut active) = state.active.lock() {
            if active.as_ref().is_some_and(|(job, _)| job == &self.job) {
                *active = None;
            }
        };
    }
}
#[tauri::command]
pub async fn render_diagram(
    app: tauri::AppHandle,
    window: tauri::Window,
    source: String,
    job_id: String,
    generation: u64,
) -> AppResult<DiagramResponse> {
    if window.label() != "main"
        || !valid_job(&job_id)
        || generation == 0
        || source.len() > MAX_SOURCE
    {
        return Err(error("diagram_input_limit"));
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        return Err(error("diagram_unavailable"));
    }
    #[cfg(target_os = "macos")]
    {
        let state = app.state::<DiagramState>();
        let flag = Arc::new(Control::default());
        #[cfg(feature = "acceptance-harness")]
        let flag = acceptance::control(flag);
        {
            let mut active = state
                .active
                .lock()
                .map_err(|_| error("diagram_unavailable"))?;
            if active.is_some() {
                return Err(error("diagram_busy"));
            }
            let cancelled = state
                .cancelled
                .lock()
                .map_err(|_| error("diagram_unavailable"))?;
            if cancelled.contains(&job_id) {
                return Err(error("diagram_cancelled"));
            }
            *active = Some((job_id.clone(), flag.clone()));
        }
        let reservation = Reservation {
            app: app.clone(),
            job: job_id.clone(),
        };
        let executable = std::env::current_exe().map_err(|_| error("diagram_unavailable"))?;
        let path = executable
            .parent()
            .and_then(|p| p.parent())
            .ok_or_else(|| error("diagram_unavailable"))?
            .join("Helpers/DiagramRenderer.app/Contents/MacOS/DiagramRenderer");
        #[cfg(feature = "acceptance-harness")]
        let path = if flag.diagnostic_mode.is_some() {
            path.parent()
                .unwrap()
                .parent()
                .unwrap()
                .parent()
                .unwrap()
                .parent()
                .unwrap()
                .join("DiagramDiagnostic.app/Contents/MacOS/DiagramRenderer")
        } else {
            path
        };
        let result = tauri::async_runtime::spawn_blocking(move || {
            let _reservation = reservation;
            execute(path, source, job_id, generation, flag)
        })
        .await
        .map_err(|_| error("diagram_unavailable"))?;
        #[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
        {
            let ticket = crate::acceptance_harness::enter("diagram-reply").await?;
            return ticket.finish(result);
        }
        #[cfg(not(all(feature = "acceptance-harness", target_os = "macos")))]
        result
    }
}
#[tauri::command]
pub fn cancel_diagram(window: tauri::Window, job_id: String) -> AppResult<()> {
    if window.label() != "main" || !valid_job(&job_id) {
        return Err(error("diagram_protocol"));
    }
    let state = window.state::<DiagramState>();
    let active = state
        .active
        .lock()
        .map_err(|_| error("diagram_unavailable"))?;
    if let Some((job, flag)) = active.as_ref().filter(|(job, _)| job == &job_id) {
        let _ = job;
        flag.cancel();
    } else {
        let mut jobs = state
            .cancelled
            .lock()
            .map_err(|_| error("diagram_unavailable"))?;
        if !jobs.contains(&job_id) {
            if jobs.len() == 64 {
                jobs.pop_front();
            }
            jobs.push_back(job_id);
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn reply(width: u32, height: u32) -> Vec<u8> {
        let mut png = b"\x89PNG\r\n\x1a\n\0\0\0\rIHDR".to_vec();
        png.extend(width.to_be_bytes());
        png.extend(height.to_be_bytes());
        let mut out=serde_json::to_vec(&serde_json::json!({"version":1,"jobId":"job","token":"token","sourceDigest":"hash","generation":2,"byteLength":png.len(),"width":width,"height":height})).unwrap();
        out.push(b'\n');
        out.extend(png);
        out
    }
    #[test]
    fn cancellation_reaps_the_owned_process() {
        let control = Control::default();
        *control.child.lock().unwrap() = Some(
            Command::new("/usr/bin/yes")
                .stdout(Stdio::null())
                .spawn()
                .unwrap(),
        );
        control.cancel();
        assert!(control.cancelled.load(Ordering::SeqCst));
        assert!(control
            .child
            .lock()
            .unwrap()
            .as_mut()
            .unwrap()
            .try_wait()
            .unwrap()
            .is_some());
    }
    #[test]
    fn protocol_binds_every_owner_and_rejects_truncation() {
        let data = reply(24, 16);
        assert!(validate_reply(&data, "job", "token", "hash", 2).is_ok());
        for (j, t, h, g) in [
            ("other", "token", "hash", 2),
            ("job", "forged", "hash", 2),
            ("job", "token", "forged", 2),
            ("job", "token", "hash", 3),
        ] {
            assert!(validate_reply(&data, j, t, h, g).is_err());
        }
        assert!(validate_reply(&data[..data.len() - 1], "job", "token", "hash", 2).is_err());
    }
    #[test]
    fn protocol_rejects_pixel_byte_and_header_limits() {
        for (w, h) in [(0, 1), (2049, 1), (1, 2049)] {
            assert!(validate_reply(&reply(w, h), "job", "token", "hash", 2).is_err());
        }
        assert!(validate_reply(
            &vec![b'x'; MAX_PNG + MAX_HEADER + 2],
            "job",
            "token",
            "hash",
            2
        )
        .is_err());
        let mut data = vec![b' '; MAX_HEADER + 1];
        data.extend(reply(24, 16));
        assert!(validate_reply(&data, "job", "token", "hash", 2).is_err());
    }
}

#[cfg(all(test, target_os = "macos"))]
#[path = "../../tests/acceptance/diagram/parent_tests.rs"]
mod process_acceptance;

#[cfg(all(feature = "acceptance-harness", target_os = "macos"))]
#[path = "../../tests/acceptance/diagram/native_acceptance.rs"]
pub mod acceptance;
