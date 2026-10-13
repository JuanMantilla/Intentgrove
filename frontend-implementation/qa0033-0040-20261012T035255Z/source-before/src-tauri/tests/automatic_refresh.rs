use md_reader_lib::document_contract_tests::{document, platform, refresh, state};

use document::read_document_impl;
use refresh::{RefreshCore, RefreshNotice};
use state::AppState;
use std::fs;
use std::time::Duration;

struct Fixture(platform::test_support::FixtureDir);

impl Fixture {
    fn new() -> Self {
        Self(platform::test_support::FixtureDir::new("md-auto-refresh"))
    }
}

// The shared fixture owns cleanup; watcher/replacement assertions stay native.

fn changed_file(notices: &[RefreshNotice], file_id: &str) -> bool {
    notices.iter().any(|notice| {
        matches!(notice,
            RefreshNotice::FileChanged { file_id: changed, .. } if changed == file_id
        )
    })
}

#[test]
fn watcher_hints_refresh_in_place_and_atomic_saves() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Original\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let initial =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    let mut core = RefreshCore::new(state.clone());
    core.watch_root(&root.id).unwrap();
    core.reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    std::thread::sleep(Duration::from_millis(1000));

    fs::write(&path, b"# In place\n").unwrap();
    assert!(core.wait_for_hint(Duration::from_secs(5)).unwrap());
    let notices = core
        .reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    assert!(changed_file(&notices, &initial.file_id));
    let updated = read_document_impl(&state, Some(&initial.file_id), None, None).unwrap();
    assert_eq!(updated.content, "# In place\n");

    let staged = fixture.0.join("staged.md");
    fs::write(&staged, b"# Atomic\n").unwrap();
    fs::rename(&staged, &path).unwrap();
    assert!(core.wait_for_hint(Duration::from_secs(5)).unwrap());
    let notices = core
        .reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    assert!(changed_file(&notices, &initial.file_id));
    let updated = read_document_impl(&state, Some(&initial.file_id), None, None).unwrap();
    assert_eq!(updated.file_id, initial.file_id);
    assert_eq!(updated.content, "# Atomic\n");
}

#[test]
fn focus_reconciliation_finds_a_change_without_a_watcher_event() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Before\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let initial =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    let mut core = RefreshCore::new(state.clone());
    core.reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    fs::write(&path, b"# After\n").unwrap();
    let notices = core
        .reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    assert!(changed_file(&notices, &initial.file_id));
}

#[test]
fn staged_write_only_reports_a_confirmed_version_or_uncertainty() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Before\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let initial =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    let mut core = RefreshCore::new(state.clone());
    core.watch_root(&root.id).unwrap();
    core.reconcile_visible(&root.id, &[initial.file_id.clone()], &[vec![]])
        .unwrap();
    std::thread::sleep(Duration::from_millis(1000));
    let (tx, rx) = std::sync::mpsc::channel();
    let writer = std::thread::spawn(move || {
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(path)
            .unwrap();
        file.write_all(b"# Partial\n").unwrap();
        file.sync_all().unwrap();
        tx.send(()).unwrap();
        std::thread::sleep(Duration::from_millis(80));
        file.write_all(b"Complete\n").unwrap();
        file.sync_all().unwrap();
    });
    rx.recv().unwrap();
    assert!(core.wait_for_hint(Duration::from_secs(5)).unwrap());
    let notices = core
        .reconcile_visible(&root.id, &[initial.file_id.clone()], &[])
        .unwrap();
    writer.join().unwrap();
    if changed_file(&notices, &initial.file_id) {
        let updated = read_document_impl(&state, Some(&initial.file_id), None, None).unwrap();
        assert_eq!(updated.content, "# Partial\nComplete\n");
    } else {
        assert!(notices
            .iter()
            .any(|notice| matches!(notice, RefreshNotice::Uncertain { .. })));
    }
}
