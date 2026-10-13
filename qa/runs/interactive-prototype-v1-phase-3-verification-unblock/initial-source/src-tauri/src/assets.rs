use crate::image::{image_format, ImageResponse};
use crate::scope::{markdown_name, open_relative, validate_segment, AppError, AppResult};
use crate::state::{AppState, FileGrant, FileSource};
use percent_encoding::percent_decode_str;
use serde::Serialize;
use std::path::PathBuf;

struct Target {
    segments: Vec<String>,
    anchor: Option<String>,
    explicit_path: Option<PathBuf>,
}

fn target_from(source: &FileGrant, raw: &str) -> AppResult<Target> {
    if raw.is_empty()
        || raw.len() > 4096
        || raw.starts_with('/')
        || raw.starts_with("//")
        || raw.contains('\\')
        || raw.contains('?')
    {
        return Err(AppError::new(
            "blocked",
            "This target is outside the selected folder or unsupported",
        ));
    }
    let (path_part, fragment) = raw
        .split_once('#')
        .map_or((raw, None), |(path, hash)| (path, Some(hash)));
    let anchor = fragment
        .map(|value| {
            percent_decode_str(value)
                .decode_utf8()
                .map(|part| part.into_owned())
                .map_err(|_| AppError::new("blocked", "Invalid heading anchor"))
        })
        .transpose()?;
    if path_part.is_empty() {
        return Ok(Target {
            segments: Vec::new(),
            anchor,
            explicit_path: None,
        });
    }
    let mut explicit_path = match &source.source {
        FileSource::Explicit { path, .. } => Some(
            path.parent()
                .ok_or_else(|| AppError::new("invalid_path", "Document has no parent directory"))?
                .to_path_buf(),
        ),
        FileSource::Root { .. } => None,
    };
    let mut resolved = match &source.source {
        FileSource::Root { segments, .. } => segments[..segments.len().saturating_sub(1)].to_vec(),
        FileSource::Explicit { .. } => Vec::new(),
    };
    for raw_segment in path_part.split('/') {
        let decoded = percent_decode_str(raw_segment)
            .decode_utf8()
            .map_err(|_| AppError::new("blocked", "Invalid path encoding"))?;
        if decoded.contains('/')
            || decoded.contains('\\')
            || decoded.contains('\0')
            || decoded.contains(':')
        {
            return Err(AppError::new(
                "blocked",
                "Encoded separators and schemes are blocked",
            ));
        }
        match decoded.as_ref() {
            "" | "." => continue,
            ".." => {
                if let Some(path) = &mut explicit_path {
                    if !path.pop() {
                        return Err(AppError::new(
                            "blocked",
                            "This link escapes the filesystem root",
                        ));
                    }
                } else if resolved.pop().is_none() {
                    return Err(AppError::new(
                        "blocked",
                        "This link escapes the selected folder",
                    ));
                }
            }
            name => {
                validate_segment(name)?;
                if let Some(path) = &mut explicit_path {
                    path.push(name);
                } else {
                    resolved.push(name.to_string());
                }
            }
        }
    }
    if resolved.is_empty() && explicit_path.is_none() {
        return Err(AppError::new("blocked", "This link has no file target"));
    }
    Ok(Target {
        segments: resolved,
        anchor,
        explicit_path,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkResponse {
    pub kind: &'static str,
    pub file_id: Option<String>,
    pub anchor: Option<String>,
    pub reason: Option<String>,
}

fn blocked(error: AppError) -> LinkResponse {
    LinkResponse {
        kind: "blocked",
        file_id: None,
        anchor: None,
        reason: Some(error.message),
    }
}

/// Deliberate navigation only: never used for automatic embedded resources.
pub(crate) fn resolve_individual_target(
    state: &AppState,
    source: &FileGrant,
    path: &std::path::Path,
    anchor: Option<String>,
) -> AppResult<LinkResponse> {
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| AppError::new("unsupported_type", "Unsupported file target"))?;
    if !crate::scope::document_name(name) && image_format(name).is_none() {
        return Err(AppError::new(
            "unsupported_type",
            "Unsupported local link target",
        ));
    }
    // Verify the source's current path before deriving access from it. The
    // clicked target receives a file-only grant, never a directory grant.
    let FileSource::Explicit {
        path: source_path, ..
    } = &source.source
    else {
        unreachable!()
    };
    let current_source = crate::scope::open_selected(source_path, false)?;
    if crate::scope::identity(&current_source)? != source.identity {
        return Err(AppError::new(
            "reselection_required",
            "Source document changed; select it again",
        ));
    }
    // Open only the path to this target through the existing no-follow
    // handle walker. This temporary directory handle is never registered
    // as a workspace or resource grant; OS denials remain denials.
    let mut base = source_path.parent().unwrap().to_path_buf();
    while !path.starts_with(&base) {
        if !base.pop() {
            return Err(AppError::new("invalid_path", "No local parent directory"));
        }
    }
    let segments = path
        .strip_prefix(&base)
        .map_err(|_| AppError::new("invalid_path", "Invalid local target"))?
        .components()
        .map(|part| {
            part.as_os_str()
                .to_str()
                .map(str::to_owned)
                .ok_or_else(|| AppError::new("invalid_path", "Invalid path encoding"))
        })
        .collect::<AppResult<Vec<_>>>()?;
    let parent = crate::scope::open_selected(&base, true)?;
    let file = open_relative(&parent, &segments, false)?;
    let grant = state.register_linked_file(&path, file)?;
    let same_document = state.file(&grant.id)?.identity == source.identity;
    Ok(LinkResponse {
        kind: if same_document {
            "anchor"
        } else if image_format(&grant.name).is_some() {
            "image"
        } else if crate::scope::prototype_name(&grant.name) {
            "prototype"
        } else if crate::scope::html_name(&grant.name) {
            "html"
        } else {
            "document"
        },
        file_id: if same_document { None } else { Some(grant.id) },
        anchor,
        reason: None,
    })
}

pub fn resolve_link_impl(state: &AppState, source_id: &str, raw: &str) -> AppResult<LinkResponse> {
    let source = state.file(source_id)?;
    let target = match target_from(&source, raw) {
        Ok(target) => target,
        Err(error) => return Ok(blocked(error)),
    };
    if target.segments.is_empty() && target.explicit_path.is_none() {
        return Ok(LinkResponse {
            kind: "anchor",
            file_id: None,
            anchor: target.anchor,
            reason: None,
        });
    }
    if let Some(path) = target.explicit_path {
        return resolve_individual_target(state, &source, &path, target.anchor);
    }
    let Some(name) = target.segments.last() else {
        unreachable!()
    };
    let is_image = image_format(name).is_some();
    let FileSource::Root { root_id, .. } = &source.source else {
        return Ok(blocked(AppError::new(
            "blocked",
            "External files grant no access to nearby files",
        )));
    };
    let root = state.root(root_id)?;
    let file = match open_relative(&root.file, &target.segments, false) {
        Ok(file) => file,
        Err(error) => {
            return Ok(LinkResponse {
                kind: if error.code == "missing" {
                    "missing"
                } else {
                    "blocked"
                },
                file_id: None,
                anchor: None,
                reason: Some(error.message),
            })
        }
    };
    let grant = state.register_root_file(&root, target.segments, &file)?;
    Ok(LinkResponse {
        kind: if is_image {
            "image"
        } else if crate::scope::prototype_name(&grant.name) {
            "prototype"
        } else if crate::scope::html_name(&grant.name) {
            "html"
        } else if markdown_name(&grant.name) {
            "document"
        } else {
            "details"
        },
        file_id: Some(grant.id),
        anchor: target.anchor,
        reason: None,
    })
}

#[tauri::command]
pub async fn resolve_link(
    state: tauri::State<'_, AppState>,
    source_id: String,
    target: String,
    refresh: tauri::State<'_, crate::refresh::RefreshService>,
) -> AppResult<LinkResponse> {
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let link = resolve_link_impl(&state, &source_id, &target)?;
        if let Some(id) = &link.file_id {
            if matches!(state.file(id)?.source, FileSource::Explicit { .. }) {
                let _ = refresh.watch_explicit_file(id);
            }
        }
        Ok(link)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

pub fn read_image_impl(state: &AppState, source_id: &str, raw: &str) -> AppResult<ImageResponse> {
    let source = state.file(source_id)?;
    let target = target_from(&source, raw)?;
    let name = target
        .segments
        .last()
        .ok_or_else(|| AppError::new("blocked", "No image target"))?;
    if image_format(name).is_none() {
        return Err(AppError::new(
            "unsupported_asset",
            "Only supported local image files can be displayed",
        ));
    }
    let FileSource::Root { root_id, .. } = &source.source else {
        return Err(AppError::new(
            "blocked",
            "External files grant no access to nearby files",
        ));
    };
    crate::image::open_image_impl(state, None, Some(root_id), Some(target.segments), 2048)
}

#[tauri::command]
pub async fn read_image(
    state: tauri::State<'_, AppState>,
    source_id: String,
    target: String,
) -> AppResult<ImageResponse> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || read_image_impl(&state, &source_id, &target))
        .await
        .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scope::Identity;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::symlink;

    fn source() -> FileGrant {
        FileGrant {
            id: "test".into(),
            source: FileSource::Root {
                root_id: "root".into(),
                segments: vec!["docs".into(), "index.md".into()],
            },
            identity: Identity {
                device: 1,
                inode: 1,
            },
            name: "index.md".into(),
            display_path: "docs/index.md".into(),
        }
    }

    #[test]
    fn individual_links_grant_only_clicked_files_and_keep_fragments() {
        let fixture = crate::platform::test_support::FixtureDir::new("individual-links");
        let base = fixture.path();
        std::fs::create_dir(base.join("docs")).unwrap();
        for (path, content) in [
            ("docs/index.md", "# Index"),
            ("docs/sibling.md", "# Sibling"),
            ("Café 文 notes.markdown", "# Parent"),
            ("docs/view.html", "<h1>View</h1>"),
            ("docs/picture.png", "pixels"),
            ("docs/unsupported.txt", "text"),
        ] {
            std::fs::write(base.join(path), content).unwrap();
        }
        let state = AppState::default();
        let source = state
            .register_explicit_file(&base.join("docs/index.md"))
            .unwrap();
        let sibling = resolve_link_impl(&state, &source.id, "./sibling.md#heading%20one").unwrap();
        assert_eq!(sibling.kind, "document");
        assert_eq!(sibling.anchor.as_deref(), Some("heading one"));
        let id = sibling.file_id.unwrap();
        assert!(matches!(
            state.file(&id).unwrap().source,
            FileSource::Explicit { .. }
        ));
        assert_eq!(
            resolve_link_impl(&state, &source.id, "sibling.md")
                .unwrap()
                .file_id
                .as_deref(),
            Some(id.as_str())
        );
        let parent = resolve_link_impl(
            &state,
            &id,
            "../Caf%C3%A9%20%E6%96%87%20notes.markdown#parent",
        )
        .unwrap();
        assert_eq!(parent.kind, "document");
        assert_eq!(parent.anchor.as_deref(), Some("parent"));
        let back = resolve_link_impl(&state, &parent.file_id.unwrap(), "docs/index.md").unwrap();
        assert_eq!(back.file_id.as_deref(), Some(source.id.as_str()));
        for link in ["#index", "index.md#index"] {
            let response = resolve_link_impl(&state, &source.id, link).unwrap();
            assert_eq!(response.kind, "anchor");
            assert_eq!(response.anchor.as_deref(), Some("index"));
        }
        assert_eq!(
            resolve_link_impl(&state, &source.id, "view.html#view")
                .unwrap()
                .kind,
            "html"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.id, "picture.png")
                .unwrap()
                .kind,
            "image"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.id, "missing.md")
                .unwrap_err()
                .code,
            "missing"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.id, "unsupported.txt")
                .unwrap_err()
                .code,
            "unsupported_type"
        );
        for link in [
            "/etc/passwd",
            "file:///etc/passwd",
            "https://host/x",
            "%2fetc/passwd",
            "x%00.md",
        ] {
            assert_eq!(
                resolve_link_impl(&state, &source.id, link).unwrap().kind,
                "blocked",
                "{link}"
            );
        }
        // Automatic image reads still cannot grant nearby files.
        assert!(read_image_impl(&state, &source.id, "picture.png").is_err());
        let _link =
            crate::platform::test_support::directory_link(base, &base.join("docs/shortcut"))
                .unwrap();
        assert!(resolve_link_impl(&state, &source.id, "shortcut/docs/sibling.md").is_err());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn individual_links_preserve_native_permission_denials() {
        use std::os::unix::fs::PermissionsExt;
        let fixture = crate::platform::test_support::FixtureDir::new("individual-links-denied");
        let source_path = fixture.path().join("index.md");
        let denied = fixture.path().join("denied.md");
        std::fs::write(&source_path, "source").unwrap();
        std::fs::write(&denied, "denied").unwrap();
        let state = AppState::default();
        let source = state.register_explicit_file(&source_path).unwrap();
        std::fs::set_permissions(&denied, std::fs::Permissions::from_mode(0)).unwrap();
        let result = resolve_link_impl(&state, &source.id, "denied.md");
        std::fs::set_permissions(&denied, std::fs::Permissions::from_mode(0o600)).unwrap();
        assert_eq!(result.unwrap_err().code, "denied");
        assert_eq!(state.explicit_file_ids().unwrap(), vec![source.id.clone()]);
        assert_eq!(
            resolve_link_impl(&state, &source.id, "denied.md")
                .unwrap()
                .kind,
            "document"
        );
    }

    #[test]
    fn keeps_relative_links_inside_root() {
        assert_eq!(
            target_from(&source(), "../README.md").unwrap().segments,
            vec!["README.md"]
        );
        for path in [
            "../../secret.md",
            "%2e%2e/%2e%2e/secret.md",
            "%2fetc/passwd",
            "https://host/x",
            "javascript:alert(1)",
        ] {
            assert!(target_from(&source(), path).is_err(), "{path}");
        }
    }

    #[test]
    fn follows_only_in_scope_documents_and_raster_assets() {
        let fixture = crate::platform::test_support::FixtureDir::new("md-reader-assets");
        let base = fixture.path();
        let root_path = base.join("root");
        std::fs::create_dir_all(root_path.join("docs")).unwrap();
        std::fs::write(root_path.join("docs/index.md"), b"# Index").unwrap();
        std::fs::write(root_path.join("guide.md"), b"# Guide").unwrap();
        std::fs::write(root_path.join("Café notes.md"), b"# Unicode").unwrap();
        std::fs::write(base.join("outside.md"), b"# Private").unwrap();
        std::fs::write(
            root_path.join("docs/picture.png"),
            b"\x89PNG\r\n\x1a\nfixture",
        )
        .unwrap();
        std::fs::write(root_path.join("docs/vector.svg"), b"<svg></svg>").unwrap();
        #[cfg(target_os = "macos")]
        symlink(base.join("outside.md"), root_path.join("docs/shortcut.md")).unwrap();
        #[cfg(target_os = "macos")]
        let blocked_link = "shortcut.md";
        #[cfg(target_os = "windows")]
        let junction =
            crate::platform::test_support::directory_link(base, &root_path.join("docs/shortcut"))
                .unwrap();
        #[cfg(target_os = "windows")]
        let blocked_link = "shortcut/outside.md";

        let state = AppState::default();
        let root = state.register_root(&root_path).unwrap();
        let source = crate::document::read_document_impl(
            &state,
            None,
            Some(&root.id),
            Some(vec!["docs".into(), "index.md".into()]),
        )
        .unwrap();
        let link = resolve_link_impl(&state, &source.file_id, "../guide.md#guide").unwrap();
        assert_eq!(link.kind, "document");
        assert_eq!(link.anchor.as_deref(), Some("guide"));
        assert_eq!(
            resolve_link_impl(&state, &source.file_id, "../Caf%C3%A9%20notes.md")
                .unwrap()
                .kind,
            "document"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.file_id, "../../outside.md")
                .unwrap()
                .kind,
            "blocked"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.file_id, blocked_link)
                .unwrap()
                .kind,
            "blocked"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.file_id, "https://example.test/x.md")
                .unwrap()
                .kind,
            "blocked"
        );

        assert_eq!(
            resolve_link_impl(&state, &source.file_id, "picture.png")
                .unwrap()
                .kind,
            "image"
        );
        assert_eq!(
            resolve_link_impl(&state, &source.file_id, "vector.svg")
                .unwrap()
                .kind,
            "image"
        );
        for target in ["../../outside.png", "https://example.test/pixel.png"] {
            assert!(
                read_image_impl(&state, &source.file_id, target).is_err(),
                "{target}"
            );
        }

        let explicit = state
            .register_explicit_file(&base.join("outside.md"))
            .unwrap();
        assert_eq!(
            resolve_link_impl(&state, &explicit.id, "guide.md")
                .unwrap_err()
                .code,
            "missing"
        );
        #[cfg(target_os = "windows")]
        drop(junction);
    }
}
