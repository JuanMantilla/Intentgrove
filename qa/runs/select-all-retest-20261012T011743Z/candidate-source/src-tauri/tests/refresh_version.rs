#[path = "../src/document.rs"]
mod document;
#[path = "../src/platform/mod.rs"]
mod platform;
#[path = "../src/scope.rs"]
mod scope;
#[path = "../src/state.rs"]
mod state;

use document::read_document_impl;
use state::AppState;
use std::fs::{self, OpenOptions};
use std::io::Write;
#[cfg(target_os = "macos")]
use std::os::unix::fs::symlink;
use std::path::PathBuf;
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

struct Fixture(PathBuf);

impl Fixture {
    fn new() -> Self {
        let path =
            std::env::temp_dir().join(format!("md-refresh-version-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        Self(path)
    }
}

impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn same_size_write_changes_disk_version() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Old\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let before =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    fs::write(&path, b"# New\n").unwrap();
    let after = read_document_impl(&state, Some(&before.file_id), None, None).unwrap();
    assert_eq!(after.content, "# New\n");
    assert_ne!(before.disk_version, after.disk_version);
}

#[test]
fn root_relative_atomic_replacement_keeps_logical_tab() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Before\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let before =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    let replacement = fixture.0.join("replacement.md");
    fs::write(&replacement, b"# After\n").unwrap();
    fs::rename(&replacement, &path).unwrap();
    let after = read_document_impl(&state, Some(&before.file_id), None, None).unwrap();
    assert_eq!(after.file_id, before.file_id);
    assert_eq!(after.content, "# After\n");
    assert_ne!(after.disk_version, before.disk_version);
}

#[test]
fn file_only_replacement_requires_reselection() {
    let fixture = Fixture::new();
    let path = fixture.0.join("selected.md");
    fs::write(&path, b"# Original\n").unwrap();
    let state = AppState::default();
    let selected = state.register_explicit_file(&path).unwrap();
    let before = read_document_impl(&state, Some(&selected.id), None, None).unwrap();
    assert_eq!(before.content, "# Original\n");
    let replacement = fixture.0.join("replacement.md");
    fs::write(&replacement, b"# Different\n").unwrap();
    fs::rename(&replacement, &path).unwrap();
    let error = read_document_impl(&state, Some(&selected.id), None, None).unwrap_err();
    assert_eq!(error.code, "reselection_required");
}

#[test]
fn replacing_selected_root_requires_reselection() {
    let fixture = Fixture::new();
    let selected_path = fixture.0.join("selected");
    fs::create_dir(&selected_path).unwrap();
    fs::write(selected_path.join("README.md"), b"# Original\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&selected_path).unwrap();
    let before =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    fs::rename(&selected_path, fixture.0.join("moved")).unwrap();
    fs::create_dir(&selected_path).unwrap();
    fs::write(selected_path.join("README.md"), b"# Replacement\n").unwrap();
    let error = read_document_impl(&state, Some(&before.file_id), None, None).unwrap_err();
    assert_eq!(error.code, "root_reselection_required");
    let error = read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()]))
        .unwrap_err();
    assert_eq!(error.code, "root_reselection_required");
}

#[test]
#[cfg(target_os = "macos")]
fn symlink_does_not_escape_selected_root() {
    let fixture = Fixture::new();
    let selected_path = fixture.0.join("selected");
    fs::create_dir(&selected_path).unwrap();
    fs::write(fixture.0.join("secret.md"), b"# Secret\n").unwrap();
    symlink(fixture.0.join("secret.md"), selected_path.join("link.md")).unwrap();
    let state = AppState::default();
    let root = state.register_root(&selected_path).unwrap();
    assert!(
        read_document_impl(&state, None, Some(&root.id), Some(vec!["link.md".into()])).is_err()
    );
}

#[test]
fn staged_write_never_publishes_a_partial_version_as_current() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Initial\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let (tx, rx) = mpsc::channel();
    let writer = thread::spawn(move || {
        let mut file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .open(path)
            .unwrap();
        file.write_all(b"# Part\n").unwrap();
        file.sync_all().unwrap();
        tx.send(()).unwrap();
        thread::sleep(Duration::from_millis(80));
        file.write_all(b"More\n").unwrap();
        file.sync_all().unwrap();
    });
    rx.recv().unwrap();
    let outcome = read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()]));
    writer.join().unwrap();
    match outcome {
        Ok(document) => assert_eq!(document.content, "# Part\nMore\n"),
        Err(error) => assert_eq!(error.code, "unstable"),
    }
    assert_eq!(
        fs::read(fixture.0.join("README.md")).unwrap(),
        b"# Part\nMore\n"
    );
}
