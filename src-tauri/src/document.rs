use crate::scope::{
    identity, io_error, markdown_name, open_relative, open_selected, size, AppError, AppResult,
    Identity,
};
use crate::state::{AppState, FileGrant, FileSource, RootGrant};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

pub const MAX_DOCUMENT_BYTES: usize = 10 * 1024 * 1024;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentResponse {
    pub file_id: String,
    pub name: String,
    pub display_path: String,
    pub identity_key: String,
    pub content: String,
    pub disk_version: String,
}

use crate::platform::{stamp, PositionalRead};

pub fn immediate_bytes_and_version(file: &File) -> AppResult<(Vec<u8>, String)> {
    let before = stamp(file)?;
    let bytes = bounded_bytes(file, MAX_DOCUMENT_BYTES)?;
    let after = stamp(file)?;
    if before != after {
        return Err(AppError::new("changed", "File changed during the save check"));
    }
    let digest = Sha256::digest(&bytes);
    let token = format!(
        "{}:{}:{}:{}:{}:{}:{}:{digest:x}",
        after.device,
        after.inode,
        after.length,
        after.modified_seconds,
        after.modified_nanos,
        after.changed_seconds,
        after.changed_nanos,
    );
    Ok((bytes, token))
}

pub fn bounded_bytes(file: &File, max: usize) -> AppResult<Vec<u8>> {
    let before = stamp(file)?;
    if size(file)? > max as u64 {
        return Err(AppError::new(
            "oversize",
            format!("File exceeds the {} MiB reading limit", max / 1024 / 1024),
        ));
    }
    let mut result = Vec::with_capacity((before.length as usize).min(max));
    let mut chunk = [0u8; 8192];
    loop {
        let amount = file
            .read_at(&mut chunk, result.len() as u64)
            .map_err(io_error)?;
        if amount == 0 {
            break;
        }
        if result.len() + amount > max {
            return Err(AppError::new("oversize", "File exceeds the reading limit"));
        }
        result.extend_from_slice(&chunk[..amount]);
    }
    let after = stamp(file)?;
    if before != after || result.len() as u64 != after.length
    {
        return Err(AppError::new(
            "changed",
            "File changed while it was being read; retry",
        ));
    }
    Ok(result)
}

fn confirmed_bytes(file: &File) -> AppResult<(Vec<u8>, String)> {
    for _ in 0..3 {
        let before = stamp(file)?;
        let first = match bounded_bytes(file, MAX_DOCUMENT_BYTES) {
            Ok(bytes) => bytes,
            Err(error) if error.code == "changed" => continue,
            Err(error) => return Err(error),
        };
        thread::sleep(Duration::from_millis(125));
        let middle = stamp(file)?;
        let second = match bounded_bytes(file, MAX_DOCUMENT_BYTES) {
            Ok(bytes) => bytes,
            Err(error) if error.code == "changed" => continue,
            Err(error) => return Err(error),
        };
        let after = stamp(file)?;
        if before != middle || middle != after || first != second {
            continue;
        }
        let (immediate, token) = immediate_bytes_and_version(file)?;
        if immediate != second {
            continue;
        }
        return Ok((second, token));
    }
    Err(AppError::new(
        "unstable",
        "File did not settle during the confirmation check; retry",
    ))
}

fn response(grant: FileGrant, content: String, disk_version: String) -> DocumentResponse {
    DocumentResponse {
        file_id: grant.id,
        name: grant.name,
        display_path: grant.display_path,
        identity_key: format!("{}:{}", grant.identity.device, grant.identity.inode),
        content,
        disk_version,
    }
}

enum PostCheck {
    Root(RootGrant, Vec<String>),
    Explicit(PathBuf, Identity),
}

pub fn read_document_impl(
    state: &AppState,
    file_id: Option<&str>,
    root_id: Option<&str>,
    segments: Option<Vec<String>>,
) -> AppResult<DocumentResponse> {
    let (file, mut grant, post_check) = if let Some(file_id) = file_id {
        let grant = state.file(file_id)?;
        if !markdown_name(&grant.name) {
            return Err(AppError::new(
                "unsupported_type",
                "Only Markdown files can be opened",
            ));
        }
        let (file, post_check) = match &grant.source {
            FileSource::Explicit { file, path } => {
                let current = open_selected(path, false)?;
                if identity(&current)? != grant.identity {
                    return Err(AppError::new(
                        "reselection_required",
                        "Selected file changed; select it again",
                    ));
                }
                (
                    file.try_clone().map_err(io_error)?,
                    PostCheck::Explicit(path.clone(), grant.identity),
                )
            }
            FileSource::Root { root_id, segments } => {
                let root = state.root(root_id)?;
                (
                    open_relative(&root.file, segments, false)?,
                    PostCheck::Root(root, segments.clone()),
                )
            }
        };
        (file, grant, post_check)
    } else {
        let root_id =
            root_id.ok_or_else(|| AppError::new("invalid_grant", "No folder selected"))?;
        let segments = segments.ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        let name = segments
            .last()
            .ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        if !markdown_name(name) {
            return Err(AppError::new(
                "unsupported_type",
                "Only Markdown files can be opened",
            ));
        }
        let root = state.root(root_id)?;
        let file = open_relative(&root.file, &segments, false)?;
        let grant = state.register_root_file(&root, segments.clone(), &file)?;
        (file, grant, PostCheck::Root(root, segments))
    };
    let actual_identity = identity(&file)?;
    let (bytes, disk_version) = confirmed_bytes(&file)?;
    match post_check {
        PostCheck::Root(root, segments) => {
            root.verify_current()?;
            let current = open_relative(&root.file, &segments, false)?;
            if identity(&current)? != actual_identity {
                return Err(AppError::new(
                    "unstable",
                    "File changed again during refresh",
                ));
            }
            if grant.identity != actual_identity {
                grant = state.update_root_file_identity(&grant.id, actual_identity)?;
            }
        }
        PostCheck::Explicit(path, selected_identity) => {
            let current = open_selected(&path, false)?;
            if identity(&current)? != selected_identity {
                return Err(AppError::new(
                    "reselection_required",
                    "Selected file changed; select it again",
                ));
            }
        }
    }
    if bytes.contains(&0) {
        return Err(AppError::new("binary", "This file contains binary data"));
    }
    let content = String::from_utf8(bytes)
        .map_err(|_| AppError::new("encoding", "This file is not valid UTF-8"))?;
    Ok(response(grant, content, disk_version))
}

#[tauri::command]
pub async fn read_document(
    state: tauri::State<'_, AppState>,
    file_id: Option<String>,
    root_id: Option<String>,
    segments: Option<Vec<String>>,
) -> AppResult<DocumentResponse> {
    #[cfg(feature = "acceptance-harness")]
    let qa = crate::acceptance_harness::enter("read-document").await?;
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        read_document_impl(&state, file_id.as_deref(), root_id.as_deref(), segments)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?;
    #[cfg(feature = "acceptance-harness")]
    {
        let result = result.and_then(|document| { qa.injected()?; Ok(document) });
        return qa.finish(result);
    }
    #[cfg(not(feature = "acceptance-harness"))]
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::hash::{Hash, Hasher};
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::PermissionsExt;

    fn fixture_digest(bytes: &[u8]) -> u64 {
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        bytes.hash(&mut hasher);
        hasher.finish()
    }

    #[test]
    fn preserves_fixture_inventory_and_case_variant_identity() {
        let base = std::env::temp_dir().join(format!("md-reader-case-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("case.md"), b"# Lower").unwrap();
        std::fs::write(base.join("CASE.md"), b"# Upper").unwrap();
        let inventory = || {
            let mut names: Vec<_> = std::fs::read_dir(&base)
                .unwrap()
                .map(|entry| entry.unwrap().file_name())
                .collect();
            names.sort();
            names
        };
        let before_names = inventory();
        let before_lower = std::fs::read(base.join("case.md")).unwrap();
        let before_upper = std::fs::read(base.join("CASE.md")).unwrap();
        let state = AppState::default();
        let root = state.register_root(&base).unwrap();
        let lower =
            read_document_impl(&state, None, Some(&root.id), Some(vec!["case.md".into()])).unwrap();
        let upper =
            read_document_impl(&state, None, Some(&root.id), Some(vec!["CASE.md".into()])).unwrap();
        let lower_id = identity(&File::open(base.join("case.md")).unwrap()).unwrap();
        let upper_id = identity(&File::open(base.join("CASE.md")).unwrap()).unwrap();
        assert_eq!(lower.file_id == upper.file_id, lower_id == upper_id);
        assert_eq!(inventory(), before_names);
        assert_eq!(
            fixture_digest(&std::fs::read(base.join("case.md")).unwrap()),
            fixture_digest(&before_lower)
        );
        assert_eq!(
            fixture_digest(&std::fs::read(base.join("CASE.md")).unwrap()),
            fixture_digest(&before_upper)
        );
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn reads_without_changing_source_and_rejects_invalid_utf8() {
        let base = std::env::temp_dir().join(format!("md-reader-doc-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("README.md"), b"# Guide\n").unwrap();
        std::fs::write(base.join("bad.md"), [0xff, 0xfe]).unwrap();
        let before = std::fs::read(base.join("README.md")).unwrap();
        let state = AppState::default();
        let root = state.register_root(&base).unwrap();
        let opened =
            read_document_impl(&state, None, Some(&root.id), Some(vec!["README.md".into()]))
                .unwrap();
        assert_eq!(opened.content, "# Guide\n");
        assert_eq!(std::fs::read(base.join("README.md")).unwrap(), before);
        let invalid = read_document_impl(&state, None, Some(&root.id), Some(vec!["bad.md".into()]))
            .unwrap_err();
        assert_eq!(invalid.code, "encoding");
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn reports_binary_oversize_and_missing_files_without_partial_content() {
        let base = std::env::temp_dir().join(format!("md-reader-errors-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("binary.md"), b"text\0data").unwrap();
        std::fs::write(base.join("huge.md"), vec![b'x'; MAX_DOCUMENT_BYTES + 1]).unwrap();
        let state = AppState::default();
        let root = state.register_root(&base).unwrap();
        for (name, code) in [
            ("binary.md", "binary"),
            ("huge.md", "oversize"),
            ("gone.md", "missing"),
        ] {
            let error = read_document_impl(&state, None, Some(&root.id), Some(vec![name.into()]))
                .unwrap_err();
            assert_eq!(error.code, code, "{name}");
        }
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn handles_unicode_case_replacement_denial_and_nonregular_targets() {
        let base = std::env::temp_dir().join(format!("md-reader-edges-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        let name = "Café notes.MD";
        std::fs::write(base.join(name), b"# Original").unwrap();
        std::fs::write(base.join("private.md"), b"# Private").unwrap();
        std::fs::create_dir(base.join("folder.md")).unwrap();
        let state = AppState::default();
        let root = state.register_root(&base).unwrap();
        let opened =
            read_document_impl(&state, None, Some(&root.id), Some(vec![name.into()])).unwrap();
        assert_eq!(opened.content, "# Original");

        std::fs::write(base.join("replacement.md"), b"# Replacement").unwrap();
        std::fs::rename(base.join("replacement.md"), base.join(name)).unwrap();
        let changed = read_document_impl(&state, Some(&opened.file_id), None, None).unwrap();
        assert_eq!(changed.file_id, opened.file_id);
        assert_eq!(changed.content, "# Replacement");
        assert_ne!(changed.disk_version, opened.disk_version);

        let nonregular =
            read_document_impl(&state, None, Some(&root.id), Some(vec!["folder.md".into()]))
                .unwrap_err();
        assert_eq!(nonregular.code, "unsupported_type");

        let private = base.join("private.md");
        std::fs::set_permissions(&private, std::fs::Permissions::from_mode(0o000)).unwrap();
        let denied = read_document_impl(
            &state,
            None,
            Some(&root.id),
            Some(vec!["private.md".into()]),
        )
        .unwrap_err();
        assert_eq!(denied.code, "denied");
        std::fs::set_permissions(&private, std::fs::Permissions::from_mode(0o600)).unwrap();
        std::fs::remove_dir_all(base).unwrap();
    }
}
