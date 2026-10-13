//! Opt-in tests invoke the real production execute/validate/decode path, with task-owned helpers.
use super::*;
use std::{path::PathBuf, sync::atomic::AtomicU32};
fn path(key: &str) -> PathBuf {
    PathBuf::from(std::env::var(key).expect("explicit task-owned helper required"))
}
fn run(
    helper: PathBuf,
    source: &str,
    mode: Option<&str>,
) -> (AppResult<DiagramResponse>, Arc<Control>, Duration) {
    let c = Arc::new(Control {
        diagnostic_mode: mode.map(str::to_owned),
        ..Default::default()
    });
    let start = Instant::now();
    let result = execute(helper, source.into(), "acceptance-job".into(), 7, c.clone());
    (result, c, start.elapsed())
}
fn saved(label: &str, c: &Control, result: &str, elapsed: Duration) {
    let record = serde_json::json!({"case":label,"pid":c.pid.load(Ordering::SeqCst),"result":result,"elapsedMs":elapsed.as_secs_f64()*1000.,"events":c.events.lock().unwrap().clone()});
    let dir = path("INTENTGROVE_EVIDENCE");
    std::fs::write(
        dir.join(format!("{label}.json")),
        serde_json::to_vec_pretty(&record).unwrap(),
    )
    .unwrap();
    let pid = c.pid.load(Ordering::SeqCst);
    if pid != 0 {
        assert_eq!(
            unsafe { libc::kill(pid as i32, 0) },
            -1,
            "owned child survived"
        );
    }
    assert!(
        c.child.lock().unwrap().is_none(),
        "parent retained child ownership"
    );
}
const VALID: &str = "flowchart LR\nA-->B";
#[test]
#[ignore = "explicit signed helper paths and evidence directory required"]
fn real_parent_hostile_and_forged_matrix() {
    let prod = path("INTENTGROVE_PRODUCTION_HELPER");
    let diag = path("INTENTGROVE_DIAGNOSTIC_HELPER");
    let sources = [
        VALID,
        "sequenceDiagram\nA->>B: hello",
        "flowchart LR\nA[\"<script>alert(1)</script>\"]",
        "%%{init: {'securityLevel':'loose'}}%%\nflowchart LR\nA-->B",
        "flowchart LR\nclick A \"https://127.0.0.1:9\"",
        "flowchart LR\nA[\"<img src=file:///etc/passwd>\"]",
        "flowchart LR\nA[\"<svg onload=alert(1)>\"]",
        "flowchart LR\nA[\"<iframe src=https://127.0.0.1:9>\"]",
        "flowchart LR\nA[\"<object data=file:///etc/passwd>\"]",
        "flowchart LR\nA[\"<a href=javascript:alert(1)>\"]",
        "flowchart LR\nA[\"<foreignObject>\"]",
        "flowchart LR\nA-->[",
        "---\nconfig: x\n---\nflowchart LR\nA-->B",
        "flowchart LR\nstyle A fill:url(https://127.0.0.1:9)",
        "flowchart LR\nclassDef x fill:red",
        "flowchart LR\nA[\"$$x$$\"]",
        "flowchart LR\nlinkStyle 0 stroke:red",
        "flowchart LR\ncallback A",
        "flowchart LR\nhref A",
        "pie\n\"A\": 2",
    ];
    for (i, source) in sources.iter().enumerate() {
        let (r, c, t) = run(prod.clone(), source, None);
        let status = r.as_ref().map(|_| "pixels").unwrap_or_else(|e| e.code);
        saved(&format!("production-{i:02}"), &c, status, t);
        if i == 0 {
            std::fs::write(
                path("INTENTGROVE_EVIDENCE").join("real-diagram-pixels.png"),
                &r.as_ref().unwrap().bytes,
            )
            .unwrap();
        }
        if i < 2 {
            assert!(r.is_ok(), "{i}: {status}")
        } else {
            assert!(r.is_err(), "hostile {i} admitted")
        }
        let (r, c, t) = run(diag.clone(), source, Some("observe"));
        let status = r.as_ref().map(|_| "pixels").unwrap_or_else(|e| e.code);
        saved(&format!("observed-{i:02}"), &c, status, t);
        if i < 2 {
            assert!(r.is_ok(), "diagnostic {i}: {status}")
        } else {
            assert!(r.is_err())
        }
    }
    for (name, source) in [
        (
            "nodes",
            format!(
                "flowchart LR\n{}",
                (0..257).map(|i| format!("A{i}\n")).collect::<String>()
            ),
        ),
        (
            "edges",
            format!(
                "flowchart LR\n{}",
                (0..513).map(|_| "A-->B\n").collect::<String>()
            ),
        ),
        (
            "actual-pixel-width",
            format!(
                "flowchart LR\n{}",
                (0..100)
                    .map(|i| format!("A{i}-->A{}\n", i + 1))
                    .collect::<String>()
            ),
        ),
    ] {
        let (r, c, t) = run(prod.clone(), &source, None);
        let code = r.err().expect("budget exceeded but accepted").code;
        saved(&format!("budget-{name}"), &c, code, t);
        assert!(matches!(code, "diagram_rejected" | "diagram_deadline"));
        assert!(t < Duration::from_millis(2300));
    }
    for mode in [
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
    ] {
        let (r, c, t) = run(diag.clone(), VALID, Some(mode));
        let code = r.err().expect("forgery accepted").code;
        saved(&format!("forged-{mode}"), &c, code, t);
        assert!(matches!(
            code,
            "diagram_stale" | "diagram_protocol" | "diagram_rejected" | "diagram_output_limit"
        ));
    }
    let (r, c, t) = run(diag, VALID, Some("resources"));
    let status = r.as_ref().map(|_| "pixels").unwrap_or_else(|e| e.code);
    saved("resources", &c, status, t);
    assert!(r.is_ok(), "{status}");
    let events = c.events.lock().unwrap().join("\n");
    assert!(events.contains("resource-attempt"));
    assert!(events.contains("csp"));
    assert!(events.contains("native-file"));
    assert!(events.contains("native-network"));
    assert!(events.contains("font-denied"));
    assert!(events.contains("form-action"));
    assert!(events.contains("download-attempt"));
}
#[test]
#[ignore = "explicit signed helper paths and evidence directory required"]
fn real_parent_executing_cancel_and_deadline() {
    let helper = path("INTENTGROVE_DIAGNOSTIC_HELPER");
    let source = format!(
        "flowchart LR\n{}",
        (0..100)
            .map(|i| format!("A{i}-->A{}\n", i + 1))
            .collect::<String>()
    );
    for i in 0..10 {
        let c = Arc::new(Control {
            diagnostic_mode: Some("observe".into()),
            pid: AtomicU32::new(0),
            ..Default::default()
        });
        let worker = c.clone();
        let h = helper.clone();
        let s = source.clone();
        let thread = std::thread::spawn(move || execute(h, s, format!("cancel-{i}"), 7, worker));
        let start = Instant::now();
        loop {
            if c.events
                .lock()
                .unwrap()
                .iter()
                .any(|l| l.contains("render-entered"))
            {
                break;
            }
            if start.elapsed() > Duration::from_millis(2200) {
                c.cancel();
                let r = thread.join().unwrap();
                saved(
                    &format!("cancel-entry-failure-{i}"),
                    &c,
                    r.err().map(|e| e.code).unwrap_or("pixels"),
                    start.elapsed(),
                );
                panic!("no actual Mermaid render entry");
            }
            std::thread::sleep(Duration::from_millis(1));
        }
        let began = Instant::now();
        c.cancel();
        let r = thread.join().unwrap();
        let elapsed = began.elapsed();
        let code = r.err().expect("cancelled result accepted").code;
        saved(&format!("cancel-render-{i:02}"), &c, code, elapsed);
        assert!(c.cancelled.load(Ordering::SeqCst));
        assert!(
            matches!(code, "diagram_cancelled" | "diagram_rejected"),
            "cancellation admitted unexpected output: {code}"
        );
        assert!(elapsed < Duration::from_millis(250));
    }
    for (mode, phase, name) in [
        ("busy-parse", "parse-entered", "cancel-busy-parse"),
        ("busy-render", "render-entered", "cancel-busy-render"),
    ] {
        let c = Arc::new(Control {
            diagnostic_mode: Some(mode.into()),
            ..Default::default()
        });
        let worker = c.clone();
        let h = helper.clone();
        let s = source.clone();
        let thread = std::thread::spawn(move || execute(h, s, name.into(), 7, worker));
        let start = Instant::now();
        loop {
            if c.events.lock().unwrap().iter().any(|l| l.contains(phase)) {
                break;
            }
            if start.elapsed() > Duration::from_millis(2200) {
                c.cancel();
                let r = thread.join().unwrap();
                saved(
                    &format!("{name}-entry-failure"),
                    &c,
                    r.err().map(|e| e.code).unwrap_or("pixels"),
                    start.elapsed(),
                );
                panic!("no actual busy Mermaid phase entry");
            }
            std::thread::sleep(Duration::from_millis(1));
        }
        let began = Instant::now();
        c.cancel();
        let r = thread.join().unwrap();
        let elapsed = began.elapsed();
        let code = r.err().expect("busy cancelled result accepted").code;
        saved(name, &c, code, elapsed);
        assert!(c.cancelled.load(Ordering::SeqCst));
        assert!(
            matches!(code, "diagram_cancelled" | "diagram_rejected"),
            "cancellation admitted unexpected output: {code}"
        );
        assert!(elapsed < Duration::from_millis(250));
    }
    for (mode, phase, name) in [
        ("busy-parse", "parse-entered", "deadline-parse"),
        ("busy-render", "render-entered", "deadline-render"),
    ] {
        let (r, c, t) = run(helper.clone(), &source, Some(mode));
        let code = r.err().expect("busy renderer succeeded").code;
        saved(name, &c, code, t);
        assert_eq!(code, "diagram_deadline");
        assert!(t < Duration::from_millis(2300));
        assert!(c.events.lock().unwrap().iter().any(|l| l.contains(phase)));
    }
}
