use md_reader_lib::document_contract_tests::{document, state};

use document::read_document_impl;
use state::AppState;
use std::{fs, path::PathBuf};

struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("md-reselect-{}", uuid::Uuid::new_v4()));
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
fn replaced_root_requires_picker_reselection_and_keeps_logical_tabs() {
    let fixture = Fixture::new();
    let path = fixture.0.join("selected");
    fs::create_dir(&path).unwrap();
    fs::write(path.join("README.md"), b"# Before\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&path).unwrap();
    let tab =
        read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()])).unwrap();
    fs::rename(&path, fixture.0.join("moved")).unwrap();
    fs::create_dir(&path).unwrap();
    fs::write(path.join("README.md"), b"# Replacement\n").unwrap();
    assert_eq!(
        read_document_impl(&state, Some(&tab.file_id), None, None)
            .unwrap_err()
            .code,
        "root_reselection_required"
    );
    let unrelated = fixture.0.join("unrelated");
    fs::create_dir(&unrelated).unwrap();
    assert_eq!(
        state
            .reselect_root(&root.id, &unrelated)
            .err()
            .unwrap()
            .code,
        "root_reselection_required"
    );
    assert_eq!(state.generation().unwrap(), root.generation);
    let selected = state.reselect_root(&root.id, &path).unwrap();
    assert_ne!(selected.id, root.id);
    assert!(selected.generation > root.generation);
    assert!(state.root(&root.id).is_err());
    let after = read_document_impl(&state, Some(&tab.file_id), None, None).unwrap();
    assert_eq!(after.file_id, tab.file_id);
    assert_eq!(after.content, "# Replacement\n");
    assert_eq!(
        fs::read(path.join("README.md")).unwrap(),
        b"# Replacement\n"
    );
}

#[test]
fn explicit_reselection_keeps_file_only_scope_and_rejects_unrelated_files() {
    let fixture = Fixture::new();
    let path = fixture.0.join("selected.md");
    fs::write(&path, b"# Before\n").unwrap();
    let state = AppState::default();
    let selected = state.register_explicit_file(&path).unwrap();
    let staged = fixture.0.join("staged.md");
    fs::write(&staged, b"# Replacement\n").unwrap();
    fs::rename(&staged, &path).unwrap();
    assert_eq!(
        read_document_impl(&state, Some(&selected.id), None, None)
            .unwrap_err()
            .code,
        "reselection_required"
    );
    let sibling = fixture.0.join("sibling.md");
    fs::write(&sibling, b"# Private\n").unwrap();
    assert_eq!(
        state
            .reselect_explicit_file(&selected.id, &sibling)
            .err()
            .unwrap()
            .code,
        "reselection_required"
    );
    let reselected = state.reselect_explicit_file(&selected.id, &path).unwrap();
    assert_eq!(reselected.id, selected.id);
    assert_eq!(
        read_document_impl(&state, Some(&selected.id), None, None)
            .unwrap()
            .content,
        "# Replacement\n"
    );
    assert_eq!(fs::read(&sibling).unwrap(), b"# Private\n");
}

#[test]
#[cfg(target_os = "macos")]
fn missing_or_denied_content_does_not_invalidate_another_open_file() {
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::PermissionsExt;
    let fixture = Fixture::new();
    let missing_path = fixture.0.join("missing.md");
    let denied_path = fixture.0.join("denied.md");
    let unaffected_path = fixture.0.join("unaffected.md");
    for path in [&missing_path, &denied_path, &unaffected_path] {
        fs::write(path, b"# Unchanged\n").unwrap();
    }
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let open = |name: &str| {
        read_document_impl(&state, None, Some(&root.id), Some(vec![name.into()])).unwrap()
    };
    let missing = open("missing.md");
    let denied = open("denied.md");
    let unaffected = open("unaffected.md");
    fs::remove_file(&missing_path).unwrap();
    assert_eq!(
        read_document_impl(&state, Some(&missing.file_id), None, None)
            .unwrap_err()
            .code,
        "missing"
    );
    fs::set_permissions(&denied_path, fs::Permissions::from_mode(0o000)).unwrap();
    let result = read_document_impl(&state, Some(&denied.file_id), None, None);
    fs::set_permissions(&denied_path, fs::Permissions::from_mode(0o600)).unwrap();
    assert_eq!(result.unwrap_err().code, "denied");
    let still_open = read_document_impl(&state, Some(&unaffected.file_id), None, None).unwrap();
    assert_eq!(still_open.file_id, unaffected.file_id);
    assert_eq!(still_open.content, "# Unchanged\n");
    assert_eq!(fs::read(&unaffected_path).unwrap(), b"# Unchanged\n");
}

#[test]
fn a_changed_non_document_target_is_rejected_without_affecting_other_files() {
    let fixture = Fixture::new();
    let path = fixture.0.join("changed.md");
    fs::write(&path, b"# Original\n").unwrap();
    fs::write(fixture.0.join("other.md"), b"# Other\n").unwrap();
    let state = AppState::default();
    let root = state.register_root(&fixture.0).unwrap();
    let selected = read_document_impl(
        &state,
        None,
        Some(&root.id),
        Some(vec!["changed.md".into()]),
    )
    .unwrap();
    for (bytes, reason) in [
        (b"# Binary\0\n".as_slice(), "binary"),
        (&[0xff, 0xfe], "encoding"),
    ] {
        fs::write(&path, bytes).unwrap();
        assert_eq!(
            read_document_impl(&state, Some(&selected.file_id), None, None)
                .unwrap_err()
                .code,
            reason
        );
        assert_eq!(fs::read(&path).unwrap(), bytes);
    }
    fs::remove_file(&path).unwrap();
    fs::create_dir(&path).unwrap();
    assert_eq!(
        read_document_impl(&state, Some(&selected.file_id), None, None)
            .unwrap_err()
            .code,
        "unsupported_type"
    );
    assert_eq!(
        read_document_impl(&state, None, Some(&root.id), Some(vec!["other.md".into()]))
            .unwrap()
            .content,
        "# Other\n"
    );
}
