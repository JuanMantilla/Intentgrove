// Compiled only in the authenticated, separately identified QA application.
use super::*;
static MODE: Mutex<Option<String>> = Mutex::new(None);
static HISTORY: Mutex<Vec<Arc<Control>>> = Mutex::new(Vec::new());
static LAST: Mutex<Option<Arc<Control>>> = Mutex::new(None);
pub(super) fn control(default: Arc<Control>) -> Arc<Control> {
    if !crate::acceptance_harness::diagram_acceptance_enabled() {
        return default;
    }
    let c = Arc::new(Control {
        diagnostic_mode: MODE.lock().unwrap().clone(),
        ..Default::default()
    });
    let mut history = HISTORY.lock().unwrap();
    assert!(history.len() < 32, "bounded diagnostic stage");
    history.push(c.clone());
    *LAST.lock().unwrap() = Some(c.clone());
    c
}
#[tauri::command]
pub fn diagram_acceptance(
    app: tauri::AppHandle,
    window: tauri::Window,
    action: String,
    mode: Option<String>,
    report: Option<serde_json::Value>,
) -> AppResult<serde_json::Value> {
    if window.label() != "main" || !crate::acceptance_harness::diagram_acceptance_enabled() {
        return Err(error("diagram_protocol"));
    }
    match action.as_str() {
        "fixture" => {
            let index: usize = mode
                .ok_or_else(|| error("diagram_protocol"))?
                .parse()
                .map_err(|_| error("diagram_protocol"))?;
            if index >= 20 {
                return Err(error("diagram_protocol"));
            }
            let root = std::path::PathBuf::from(
                std::env::var("INTENTGROVE_DIAG_FIXTURES")
                    .map_err(|_| error("diagram_protocol"))?,
            );
            if root.file_name().and_then(|s| s.to_str()) != Some("documents")
                || !root
                    .to_string_lossy()
                    .starts_with("/private/tmp/intentgrove-diagram-")
            {
                return Err(error("diagram_protocol"));
            }
            let grant = app
                .state::<crate::state::AppState>()
                .register_explicit_file(&root.join(format!("document-{index:02}.md")))?;
            serde_json::to_value(grant).map_err(|_| error("diagram_protocol"))
        }
        "configure" => {
            if app.state::<DiagramState>().active.lock().unwrap().is_some() {
                return Err(error("diagram_busy"));
            }
            let mode = mode.ok_or_else(|| error("diagram_protocol"))?;
            if ![
                "production",
                "observe",
                "resources",
                "busy-render",
                "busy-parse",
                "token",
                "job",
                "digest",
                "generation",
                "version",
                "unknown",
                "length",
                "dimensions",
                "ihdr",
                "invalid-png",
                "oversized",
                "malformed",
                "truncated",
                "header-limit",
            ]
            .contains(&mode.as_str())
            {
                return Err(error("diagram_protocol"));
            }
            *MODE.lock().unwrap() = if mode == "production" {
                None
            } else {
                Some(mode)
            };
            *LAST.lock().unwrap() = None;
            HISTORY.lock().unwrap().clear();
            Ok(serde_json::json!({"configured":true}))
        }
        "snapshot" => {
            let last = LAST.lock().unwrap().clone();
            let value=last.as_ref().map(|c|{let pid=c.pid.load(Ordering::SeqCst);serde_json::json!({"pid":pid,"alive":pid!=0&&unsafe{libc::kill(pid as i32,0)}==0,"cancelled":c.cancelled.load(Ordering::SeqCst),"events":c.events.lock().unwrap().clone()})});
            let children:Vec<_>=HISTORY.lock().unwrap().iter().map(|c|{let pid=c.pid.load(Ordering::SeqCst);serde_json::json!({"pid":pid,"alive":pid!=0&&unsafe{libc::kill(pid as i32,0)}==0,"cancelled":c.cancelled.load(Ordering::SeqCst),"events":c.events.lock().unwrap().clone()})}).collect();
            Ok(
                serde_json::json!({"child":value,"children":children,"active":app.state::<DiagramState>().active.lock().unwrap().is_some()}),
            )
        }
        "destroy-owner" => {
            let mut report = report.ok_or_else(|| error("diagram_protocol"))?;
            let last = LAST
                .lock()
                .unwrap()
                .clone()
                .ok_or_else(|| error("diagram_protocol"))?;
            let handle = app.clone();
            let start = Instant::now();
            window.destroy().map_err(|_| error("diagram_unavailable"))?;
            std::thread::spawn(move || {
                while handle
                    .state::<DiagramState>()
                    .active
                    .lock()
                    .unwrap()
                    .is_some()
                    && start.elapsed() < Duration::from_millis(500)
                {
                    std::thread::sleep(Duration::from_millis(1))
                }
                let pid = last.pid.load(Ordering::SeqCst);
                let alive = unsafe { libc::kill(pid as i32, 0) } == 0;
                let ok = !alive
                    && last.cancelled.load(Ordering::SeqCst)
                    && start.elapsed() < Duration::from_millis(250);
                report["ownerWindowCleanup"] = serde_json::json!({"pid":pid,"alive":alive,"cancelled":last.cancelled.load(Ordering::SeqCst),"elapsedMs":start.elapsed().as_secs_f64()*1000.,"passed":ok});
                report["passed"] = serde_json::json!(ok && report["passed"] == true);
                eprintln!("INTENTGROVE_DIAGRAM_ACCEPTANCE:{}", report);
                handle.state::<crate::editing::EditingState>().allow_quit();
                handle.exit(if ok { 0 } else { 1 });
            });
            Ok(serde_json::json!({"destroying":true}))
        }
        "finish" => {
            let report = report.ok_or_else(|| error("diagram_protocol"))?;
            if serde_json::to_vec(&report).unwrap().len() > 2 * 1024 * 1024 {
                return Err(error("diagram_output_limit"));
            }
            eprintln!("INTENTGROVE_DIAGRAM_ACCEPTANCE:{}", report);
            app.state::<DiagramState>().cancel_all();
            app.state::<crate::editing::EditingState>().allow_quit();
            app.exit(if report["passed"] == true { 0 } else { 1 });
            Ok(serde_json::json!({"finished":true}))
        }
        _ => Err(error("diagram_protocol")),
    }
}
