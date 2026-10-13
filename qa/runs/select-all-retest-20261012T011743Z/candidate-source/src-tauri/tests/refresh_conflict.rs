#[path = "../src/document.rs"]
mod document;
#[path = "../src/listing.rs"]
mod listing;
#[path = "../src/platform/mod.rs"]
mod platform;
#[path = "../src/refresh.rs"]
mod refresh;
#[path = "../src/scope.rs"]
mod scope;
#[path = "../src/state.rs"]
mod state;

use document::read_document_impl;
use refresh::{get_confirmed_document_impl, RefreshCore};
use state::AppState;
use std::{fs, path::PathBuf};

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("md-conflict-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&path).unwrap();
        Self(path)
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn stale_comparison_is_rejected_and_refresh_never_writes_the_external_version() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Base\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let base =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    fs::write(&path, b"# Disk two\n").unwrap();
    let inspected = read_document_impl(&state, Some(&base.file_id), None, None).unwrap();
    fs::write(&path, b"# Disk three\n").unwrap();
    assert_eq!(
        get_confirmed_document_impl(
            &state,
            &base.file_id,
            &inspected.disk_version,
            root.generation
        )
        .unwrap_err()
        .code,
        "version_changed"
    );
    let mut refresh = RefreshCore::new(state.clone());
    refresh
        .reconcile_visible(&root.id, &[base.file_id.clone()], &[vec![]])
        .unwrap();
    let newest = read_document_impl(&state, Some(&base.file_id), None, None).unwrap();
    let confirmed =
        get_confirmed_document_impl(&state, &base.file_id, &newest.disk_version, root.generation)
            .unwrap();
    assert_eq!(confirmed.content.as_bytes(), b"# Disk three\n");
    assert_eq!(fs::read(path).unwrap(), b"# Disk three\n");
}

#[test]
fn a_workspace_switch_rejects_an_old_confirmation_even_for_a_retained_id() {
    let fixture = Fixture::new();
    let path = fixture.0.join("README.md");
    fs::write(&path, b"# Base\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let base =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    state.register_root(&fixture.0).unwrap();
    assert_eq!(
        get_confirmed_document_impl(&state, &base.file_id, &base.disk_version, root.generation)
            .unwrap_err()
            .code,
        "version_changed"
    );
    assert_eq!(fs::read(path).unwrap(), b"# Base\n");
}
