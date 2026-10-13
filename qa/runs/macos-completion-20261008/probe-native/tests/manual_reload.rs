#[path = "../src/platform/mod.rs"]
mod platform;
#[path = "../src/document.rs"]
mod document;
#[path = "../src/listing.rs"]
mod listing;
#[path = "../src/refresh.rs"]
mod refresh;
#[path = "../src/scope.rs"]
mod scope;
#[path = "../src/state.rs"]
mod state;

use document::read_document_impl;
use refresh::{run_reload, RefreshCore, RefreshNotice, ReloadTarget, ReloadUpdate};
use state::AppState;
use std::fs;

struct Fixture(platform::test_support::FixtureDir);
impl Fixture {
    fn new() -> Self {
        Self(platform::test_support::FixtureDir::new("md-manual-reload"))
    }
}

#[test]
fn file_only_reload_cannot_read_a_sibling_or_follow_replacement() {
    let fixture = Fixture::new();
    fs::write(fixture.0.join("selected.md"), "# Old\n").unwrap();
    fs::write(fixture.0.join("sibling.md"), "# Private\n").unwrap();
    let state = AppState::default();
    let selected = state
        .register_explicit_file(&fixture.0.join("selected.md"))
        .unwrap();
    let mut core = RefreshCore::new(state.clone());
    let mut updates = Vec::new();
    run_reload(
        &state,
        &mut core,
        &ReloadTarget::ExplicitFile {
            file_id: selected.id.clone(),
        },
        &[selected.id.clone()],
        "file-only",
        || false,
        |update| updates.push(update),
    )
    .unwrap();
    assert!(updates
        .iter()
        .all(|update| !format!("{update:?}").contains("sibling")));
    fs::write(fixture.0.join("replacement.md"), "# New\n").unwrap();
    fs::rename(
        fixture.0.join("replacement.md"),
        fixture.0.join("selected.md"),
    )
    .unwrap();
    let error = run_reload(
        &state,
        &mut core,
        &ReloadTarget::ExplicitFile {
            file_id: selected.id,
        },
        &[],
        "replacement",
        || false,
        |_| {},
    )
    .unwrap_err();
    assert_eq!(error.code, "reselection_required");
}

#[test]
fn folder_reload_checks_descendants_and_only_open_tabs() {
    let fixture = Fixture::new();
    fs::create_dir_all(fixture.0.join("docs/nested")).unwrap();
    fs::write(fixture.0.join("docs/nested/open.md"), "# Before\n").unwrap();
    fs::write(fixture.0.join("docs/closed.md"), "# Closed\n").unwrap();
    fs::write(fixture.0.join("outside.md"), "# Outside\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let open = read_document_impl(
        &state,
        None,
        Some(&root.id),
        Some(vec!["docs".into(), "nested".into(), "open.md".into()]),
    )
    .unwrap();
    let outside = read_document_impl(
        &state,
        None,
        Some(&root.id),
        Some(vec!["outside.md".into()]),
    )
    .unwrap();
    let mut core = RefreshCore::new(state.clone());
    core.reconcile_visible(
        &root.id,
        &[open.file_id.clone(), outside.file_id.clone()],
        &[],
    )
    .unwrap();
    fs::write(fixture.0.join("docs/nested/open.md"), "# After\n").unwrap();
    fs::write(fixture.0.join("outside.md"), "# Outside changed\n").unwrap();
    let mut updates = Vec::new();
    let outcome = run_reload(
        &state,
        &mut core,
        &ReloadTarget::Folder {
            root_id: root.id,
            segments: vec!["docs".into()],
        },
        &[open.file_id.clone(), outside.file_id.clone()],
        "folder",
        || false,
        |update| updates.push(update),
    )
    .unwrap();
    assert!(!outcome.cancelled);
    assert!(updates.iter().any(|update| matches!(update,
        ReloadUpdate::Notice(RefreshNotice::FileChanged { file_id, .. }) if file_id == &open.file_id)));
    assert!(!updates.iter().any(|update| matches!(update,
        ReloadUpdate::Notice(RefreshNotice::FileChanged { file_id, .. }) if file_id == &outside.file_id)));
    assert!(updates.iter().any(|update| matches!(update,
        ReloadUpdate::Notice(RefreshNotice::DirectoryChanged { segments, .. }) if segments == &vec!["docs".to_string(), "nested".to_string()])));
    assert_eq!(state.file(&open.file_id).unwrap().name, "open.md");
}

#[test]
fn cancellation_keeps_confirmed_results_and_reports_unchecked_branch() {
    let fixture = Fixture::new();
    fs::create_dir_all(fixture.0.join("docs/a")).unwrap();
    fs::create_dir_all(fixture.0.join("docs/b")).unwrap();
    fs::write(fixture.0.join("docs/a/one.md"), "# One\n").unwrap();
    fs::write(fixture.0.join("docs/b/two.md"), "# Two\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let mut core = RefreshCore::new(state.clone());
    let mut updates = Vec::new();
    let cancel = std::cell::Cell::new(false);
    let outcome = run_reload(
        &state,
        &mut core,
        &ReloadTarget::Folder {
            root_id: root.id,
            segments: vec!["docs".into()],
        },
        &[],
        "cancel",
        || cancel.get(),
        |update| {
            if matches!(
                update,
                ReloadUpdate::Notice(RefreshNotice::DirectoryChanged { .. })
            ) {
                cancel.set(true);
            }
            updates.push(update);
        },
    )
    .unwrap();
    assert!(outcome.cancelled);
    assert!(!outcome.unchecked_segments.is_empty());
    assert!(updates
        .iter()
        .any(|update| matches!(update, ReloadUpdate::Notice(_))));
}

#[test]
fn cancellation_during_a_directory_snapshot_marks_that_branch_unchecked() {
    let fixture = Fixture::new();
    fs::create_dir_all(fixture.0.join("docs")).unwrap();
    fs::write(fixture.0.join("docs/one.md"), "# One\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    state.cancel("snapshot-cancel".into()).unwrap();
    let mut core = RefreshCore::new(state.clone());
    let outcome = run_reload(
        &state,
        &mut core,
        &ReloadTarget::Folder {
            root_id: root.id,
            segments: vec!["docs".into()],
        },
        &[],
        "snapshot-cancel",
        || false,
        |_| {},
    )
    .unwrap();
    assert!(outcome.cancelled);
    assert_eq!(outcome.unchecked_segments, vec![vec!["docs".to_string()]]);
}
