use crate::image::{image_format, ImageResponse};
use crate::scope::{markdown_name, open_relative, validate_segment, AppError, AppResult};
use crate::state::{AppState, FileGrant, FileSource};
use percent_encoding::percent_decode_str;
use serde::Serialize;

struct Target {
    segments: Vec<String>,
    anchor: Option<String>,
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
        });
    }
    let FileSource::Root { segments, .. } = &source.source else {
        return Err(AppError::new(
            "blocked",
            "External files grant no access to nearby files",
        ));
    };
    let mut resolved = segments[..segments.len().saturating_sub(1)].to_vec();
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
                if resolved.pop().is_none() {
                    return Err(AppError::new(
                        "blocked",
                        "This link escapes the selected folder",
                    ));
                }
            }
            name => {
                validate_segment(name)?;
                resolved.push(name.to_string());
            }
        }
    }
    if resolved.is_empty() {
        return Err(AppError::new("blocked", "This link has no file target"));
    }
    Ok(Target {
        segments: resolved,
        anchor,
    })
}

#[derive(Serialize)]
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

pub fn resolve_link_impl(state: &AppState, source_id: &str, raw: &str) -> AppResult<LinkResponse> {
    let source = state.file(source_id)?;
    let target = match target_from(&source, raw) {
        Ok(target) => target,
        Err(error) => return Ok(blocked(error)),
    };
    if target.segments.is_empty() {
        return Ok(LinkResponse {
            kind: "anchor",
            file_id: None,
            anchor: target.anchor,
            reason: None,
        });
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
) -> AppResult<LinkResponse> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || resolve_link_impl(&state, &source_id, &target))
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
                .unwrap()
                .kind,
            "blocked"
        );
        #[cfg(target_os = "windows")]
        drop(junction);
    }
}
