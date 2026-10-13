//! New Markdown boundary; displayed paths never grant authority.
use crate::{
    document::{read_document_impl, DocumentResponse},
    scope::{identity, open_relative, open_selected, validate_segment, AppError, AppResult},
    state::{AppState, RootGrant},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::File,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tauri_plugin_dialog::DialogExt;

#[derive(Clone, Default)]
pub struct CreationState(Arc<Mutex<HashMap<String, Destination>>>);
struct Destination {
    file: Arc<File>,
    path: PathBuf,
    selected: crate::scope::Identity,
    expires: Instant,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DestinationChoice {
    token: String,
    name: String,
    display_path: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateRequest {
    root_id: Option<String>,
    segments: Option<Vec<String>>,
    destination_token: Option<String>,
    filename: String,
}
#[derive(Serialize)]
#[serde(
    tag = "status",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum CreateOutcome {
    Opened {
        document: DocumentResponse,
        root_id: Option<String>,
        explicit_file: bool,
        segments: Vec<String>,
        watch_failed: bool,
    },
    CommittedNotOpened {
        name: String,
        display_path: String,
        identity_key: Option<String>,
        file_id: Option<String>,
        error: AppError,
    },
}
impl CreationState {
    fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, HashMap<String, Destination>>> {
        self.0
            .lock()
            .map_err(|_| AppError::new("internal", "Destination state is unavailable"))
    }
    fn choose(&self, path: PathBuf) -> AppResult<DestinationChoice> {
        let file = Arc::new(open_selected(&path, true)?);
        let selected = identity(&file)?;
        let mut choices = self.lock()?;
        choices.retain(|_, d| d.expires > Instant::now());
        if choices.len() >= 8 {
            return Err(AppError::new("busy", "Too many pending destinations"));
        }
        let token = uuid::Uuid::new_v4().to_string();
        let result = DestinationChoice {
            token: token.clone(),
            name: path
                .file_name()
                .unwrap_or(path.as_os_str())
                .to_string_lossy()
                .into_owned(),
            display_path: path.display().to_string(),
        };
        choices.insert(
            token,
            Destination {
                file,
                path,
                selected,
                expires: Instant::now() + Duration::from_secs(600),
            },
        );
        Ok(result)
    }
    #[cfg(test)]
    fn take(&self, token: &str) -> AppResult<Destination> {
        let mut choices = self.lock()?;
        choices.retain(|_, d| d.expires > Instant::now());
        choices
            .remove(token)
            .ok_or_else(|| AppError::new("invalid_grant", "Destination choice expired"))
    }
}
pub(crate) fn filename(input: &str) -> AppResult<String> {
    // Match the approved Option B prototype's bounded competing-extension rule.
    // Do not silently trim filename content.
    if input.rsplit_once('.').is_some_and(|(_, extension)| {
        (1..=8).contains(&extension.len())
            && extension.bytes().all(|byte| byte.is_ascii_alphanumeric())
            && !extension.eq_ignore_ascii_case("md")
    }) {
        return Err(AppError::new("invalid_filename", "Use .md instead of another extension"));
    }
    let mut stem = input;
    while stem.len() >= 3
        && stem
            .get(stem.len() - 3..)
            .is_some_and(|suffix| suffix.eq_ignore_ascii_case(".md"))
    {
        stem = &stem[..stem.len() - 3];
    }
    let reserved = stem
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end_matches(' ')
        .to_ascii_uppercase();
    if stem.is_empty()
        || stem == "."
        || stem == ".."
        || stem.ends_with(['.', ' '])
        || stem
            .chars()
            .any(|c| c.is_control() || ":/\\<>\"|?*".contains(c))
        || matches!(
            reserved.as_str(),
            "CON" | "PRN" | "AUX" | "NUL" | "CONIN$" | "CONOUT$"
        )
        || ["COM", "LPT"].iter().any(|p| {
            reserved.strip_prefix(p).is_some_and(|s| {
                matches!(
                    s,
                    "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
                )
            })
        })
    {
        return Err(AppError::new(
            "invalid_filename",
            "Use a valid single filename",
        ));
    }
    let name = format!("{stem}.md");
    if name.len() > 255 {
        return Err(AppError::new(
            "invalid_filename",
            "Filename exceeds 255 UTF-8 bytes",
        ));
    }
    validate_segment(&name)?;
    Ok(name)
}
#[tauri::command]
pub async fn choose_markdown_destination(
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    choices: tauri::State<'_, CreationState>,
) -> AppResult<Option<DestinationChoice>> {
    if window.label() != "main" {
        return Err(AppError::new("invalid_owner", "Main workspace required"));
    }
    let choices = choices.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        choices
            .choose(
                selected
                    .into_path()
                    .map_err(|e| AppError::new("invalid_path", e.to_string()))?,
            )
            .map(Some)
    })
    .await
    .map_err(|e| AppError::new("internal", e.to_string()))?
}
#[tauri::command]
pub fn cancel_markdown_destination(
    choices: tauri::State<'_, CreationState>,
    token: String,
) -> AppResult<()> {
    choices.lock()?.remove(&token);
    Ok(())
}
#[tauri::command]
pub async fn create_markdown_file(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, AppState>,
    choices: tauri::State<'_, CreationState>,
    refresh: tauri::State<'_, crate::refresh::RefreshService>,
    request: CreateRequest,
) -> AppResult<CreateOutcome> {
    if window.label() != "main" {
        return Err(AppError::new("invalid_owner", "Main workspace required"));
    }
    let state = state.inner().clone();
    let choices = choices.inner().clone();
    let mut outcome = tauri::async_runtime::spawn_blocking(move || create(&state, &choices, request))
        .await.map_err(|e| AppError::new("internal", e.to_string()))??;
    if let CreateOutcome::Opened { document, explicit_file, watch_failed, .. } = &mut outcome {
        *watch_failed = if *explicit_file { refresh.watch_explicit_file(&document.file_id).is_err() }
            else { false }; // Existing root watch belongs to the selection lifecycle.
    }
    Ok(outcome)
}
fn create(
    state: &AppState,
    choices: &CreationState,
    request: CreateRequest,
) -> AppResult<CreateOutcome> {
    create_with_postcheck(state, choices, request, || Ok(()))
}
fn create_with_postcheck(
    state: &AppState,
    choices: &CreationState,
    request: CreateRequest,
    postcheck: impl FnOnce() -> AppResult<()>,
) -> AppResult<CreateOutcome> {
    let name = filename(&request.filename)?;
    let mut choice_guard = None;
    let mut token_to_consume = None;
    let (root, segments): (RootGrant, Vec<String>) =
        match (request.root_id, request.destination_token, request.segments) {
            (Some(id), None, Some(segments)) => {
                for s in &segments {
                    validate_segment(s)?;
                }
                (state.root(&id)?, segments)
            }
            (None, Some(token), None) => {
                choice_guard = Some(choices.lock()?);
                let guard = choice_guard.as_mut().unwrap();
                guard.retain(|_, d| d.expires > Instant::now());
                let d = guard
                    .get(&token)
                    .ok_or_else(|| AppError::new("invalid_grant", "Destination choice expired"))?;
                if identity(&open_selected(&d.path, true)?)? != d.selected {
                    return Err(AppError::new(
                        "root_reselection_required",
                        "Destination changed",
                    ));
                }
                let selected = RootGrant {
                    id: uuid::Uuid::new_v4().to_string(),
                    file: d.file.clone(),
                    path: d.path.clone(),
                    identity: d.selected,
                    generation: state.generation()?,
                };
                token_to_consume = Some(token);
                (selected, vec![])
            }
            _ => {
                return Err(AppError::new(
                    "invalid_grant",
                    "Choose exactly one destination authority",
                ))
            }
        };
    let parent = open_relative(&root.file, &segments, true)?;
    let parent_id = identity(&parent)?;
    let mut file_segments = segments.clone();
    file_segments.push(name.clone());
    let path = root.path.join(file_segments.iter().collect::<PathBuf>());
    let display_path = path.display().to_string();
    root.verify_current()?;
    if identity(&open_relative(&root.file, &segments, true)?)? != parent_id {
        return Err(AppError::new(
            "root_reselection_required",
            "Destination changed",
        ));
    }
    let created = match crate::platform::create_empty(&parent, &name) {
        Ok(created) => created,
        Err(error) if error.code == "creation_committed" => {
            if let Some(token) = &token_to_consume {
                choice_guard.as_mut().unwrap().remove(token);
            }
            return Ok(CreateOutcome::CommittedNotOpened {
                name,
                display_path,
                identity_key: None,
                file_id: None,
                error,
            });
        }
        Err(error) => return Err(error),
    };
    if let Some(token) = &token_to_consume {
        choice_guard.as_mut().unwrap().remove(token);
    }
    drop(choice_guard);
    let identity_key = Some(format!(
        "{}:{}",
        created.identity.device, created.identity.inode
    ));
    let mut file_id = None;
    let opened = (|| {
        postcheck()?;
        if let Some(error) = created.verification_error {
            return Err(error);
        }
        root.verify_current()?;
        if identity(&open_relative(&root.file, &segments, true)?)? != parent_id {
            return Err(AppError::new(
                "changed",
                "Destination changed after creation",
            ));
        }
        let file = open_relative(&parent, &[name.clone()], false)?;
        if identity(&file)? != created.identity {
            return Err(AppError::new("changed", "Created file was replaced"));
        }
        let id = if token_to_consume.is_some() {
            // Existing session schemas own one project root. A picked creation
            // destination grants this committed document as an explicit file,
            // preserving project ownership and durable recovery without migration.
            state.register_linked_file(&path, file)?.id
        } else { state.register_root_file(&root, file_segments.clone(), &file)?.id };
        file_id = Some(id.clone());
        let document = read_document_impl(state, Some(&id), None, None)?;
        if !document.content.is_empty()
            || document.identity_key != identity_key.as_ref().unwrap().as_str()
        {
            return Err(AppError::new(
                "changed",
                "Created file changed before opening",
            ));
        }
        Ok(document)
    })();
    match opened {
        Ok(document) => Ok(CreateOutcome::Opened {
            document,
            root_id: if token_to_consume.is_some() { None } else { Some(root.id) },
            explicit_file: token_to_consume.is_some(),
            segments: file_segments,
            watch_failed: false,
        }),
        Err(error) => Ok(CreateOutcome::CommittedNotOpened {
            name,
            display_path,
            identity_key,
            file_id,
            error,
        }),
    }
}

#[cfg(test)]
pub(crate) fn create_for_recent_test(state: &AppState, path: &std::path::Path, token: bool) -> DocumentResponse {
    let choices = CreationState::default();
    let request = if token {
        let choice = choices.choose(path.to_owned()).unwrap();
        CreateRequest { root_id: None, segments: None, destination_token: Some(choice.token), filename: "created.md".into() }
    } else {
        let root = state.register_root(path).unwrap();
        CreateRequest { root_id: Some(root.id), segments: Some(vec![]), destination_token: None, filename: "created.md".into() }
    };
    match create(state, &choices, request).unwrap() {
        CreateOutcome::Opened { document, .. } => document,
        _ => panic!("expected opened creation"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::platform::test_support::FixtureDir;
    fn request(root: &str, name: &str) -> CreateRequest {
        CreateRequest {
            root_id: Some(root.into()),
            segments: Some(vec![]),
            destination_token: None,
            filename: name.into(),
        }
    }
    #[test]
    fn qa0030_shared_policy_and_real_create() {
        let cases: Vec<serde_json::Value> = serde_json::from_str(include_str!("../../tests/fixtures/new-markdown-filenames.json")).unwrap();
        for case in cases {
            let input = case["input"].as_str().unwrap();
            let expected = case["expected"].as_str();
            assert_eq!(filename(input).ok().as_deref(), expected, "{input:?}");
            for token in [false, true] {
                let dir = FixtureDir::new("qa0030-policy");
                let state = AppState::default();
                let choices = CreationState::default();
                let root = state.register_root(dir.path()).unwrap();
                let choice = choices.choose(dir.path().to_owned()).unwrap();
                let req = if token {
                    CreateRequest { root_id: None, segments: None, destination_token: Some(choice.token.clone()), filename: input.into() }
                } else { request(&root.id, input) };
                let result = create(&state, &choices, req);
                if let Some(name) = expected {
                    let CreateOutcome::Opened { document, .. } = result.unwrap() else { panic!("expected opened") };
                    assert_eq!(document.name, name);
                    assert_eq!(document.content, "");
                    assert_eq!(std::fs::read(dir.path().join(name)).unwrap(), b"");
                    assert!(!document.identity_key.is_empty());
                    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
                } else {
                    assert_eq!(result.err().unwrap().code, "invalid_filename");
                    assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
                    assert!(choices.lock().unwrap().contains_key(&choice.token));
                }
                assert!(state.root(&root.id).is_ok());
            }
        }
    }
    #[test]
    fn filename_validation_is_native_and_unicode_safe() {
        assert_eq!(filename(" café.MD.md").unwrap(), " café.md");
        assert_eq!(filename("🚀").unwrap(), "🚀.md");
        for bad in [
            "",
            ".MD",
            "..",
            "../escape",
            "a/b",
            "a\\b",
            "NUL",
            "COM¹",
            "a:b",
            "a\nb",
            "a.",
        ] {
            assert!(filename(bad).is_err(), "{bad:?}");
        }
        assert!(filename(&"é".repeat(127)).is_err());
    }
    #[test]
    fn qa0028_malformed_names_never_write_or_consume_authority() {
        let dir = FixtureDir::new("qa0028-invalid");
        let state = AppState::default();
        let choices = CreationState::default();
        let root = state.register_root(dir.path()).unwrap();
        let choice = choices.choose(dir.path().to_owned()).unwrap();
        let mut bad = vec!["note ".to_owned(), "note.".to_owned(), "note.md ".to_owned(), "note .MD.md".to_owned(), "file.txt".to_owned(), "notes.v1.txt".to_owned(), "CON .txt".to_owned(), "con   .notes.MD".to_owned(), "LPT¹ .txt".to_owned(), "é".repeat(126) + "a", "🚀".repeat(63) + "a"];
        bad.extend((0x7f..=0x9f).map(|c| format!("a{}b", char::from_u32(c).unwrap())));
        for name in bad {
            for token in [false, true] {
                let req = if token { CreateRequest { root_id: None, segments: None, destination_token: Some(choice.token.clone()), filename: name.clone() } } else { request(&root.id, &name) };
                let error = match create(&state, &choices, req) { Err(error) => error, Ok(_) => panic!("false success: {name:?}") };
                assert_eq!(error.code, "invalid_filename");
                assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 0);
                assert!(state.root(&root.id).is_ok());
                assert!(choices.lock().unwrap().contains_key(&choice.token));
            }
        }
        for name in ["Niño".to_owned(), "🚀".to_owned(), "é".repeat(126), "🚀".repeat(63), "a".repeat(252), "\u{feff}note".to_owned()] {
            assert_eq!(filename(&name).unwrap(), format!("{name}.md"));
        }
        assert!(filename("\u{85}note\u{85}").is_err());
    }
    #[test]
    fn real_empty_identity_duplicate_directory_and_drafts_preserved() {
        let dir = FixtureDir::new("md-create");
        std::fs::write(dir.path().join("existing.md"), "# Existing\n").unwrap();
        let state = AppState::default();
        let choices = CreationState::default();
        let root = state.register_root(dir.path()).unwrap();
        let existing = read_document_impl(
            &state,
            None,
            Some(&root.id),
            Some(vec!["existing.md".into()]),
        )
        .unwrap();
        let choice = choices.choose(dir.path().to_owned()).unwrap();
        assert!(!dir.path().join("empty.md").exists());
        let created = create(
            &state,
            &choices,
            CreateRequest {
                root_id: None,
                segments: None,
                destination_token: Some(choice.token),
                filename: "empty.MD".into(),
            },
        )
        .unwrap();
        let CreateOutcome::Opened { document, .. } = created else {
            panic!("expected open")
        };
        assert!(matches!(state.file(&document.file_id).unwrap().source, crate::state::FileSource::Explicit { .. }));
        assert_eq!(document.content, "");
        assert!(!document.file_id.is_empty());
        assert!(!document.disk_version.is_empty());
        assert_eq!(
            std::fs::metadata(dir.path().join("empty.md"))
                .unwrap()
                .len(),
            0
        );
        assert_eq!(
            read_document_impl(&state, Some(&existing.file_id), None, None)
                .unwrap()
                .content,
            "# Existing\n"
        );
        assert!(state.root(&root.id).is_ok());
        assert!(create(&state, &choices, request(&root.id, "empty")).is_err());
        std::fs::create_dir(dir.path().join("directory.md")).unwrap();
        assert!(create(&state, &choices, request(&root.id, "directory")).is_err());
        #[cfg(target_os = "macos")]
        {
            std::os::unix::fs::symlink("existing.md", dir.path().join("link.md")).unwrap();
            assert!(create(&state, &choices, request(&root.id, "link")).is_err());
        }
    }
    #[test]
    fn exclusive_racing_creators_have_one_winner() {
        let dir = FixtureDir::new("md-create-race");
        let state = AppState::default();
        let choices = CreationState::default();
        let root = state.register_root(dir.path()).unwrap();
        let barrier = Arc::new(std::sync::Barrier::new(4));
        let workers: Vec<_> = (0..4)
            .map(|_| {
                let state = state.clone();
                let choices = choices.clone();
                let id = root.id.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    create(&state, &choices, request(&id, "race"))
                })
            })
            .collect();
        assert_eq!(
            workers
                .into_iter()
                .map(|w| w.join().unwrap())
                .filter(|result| result.is_ok())
                .count(),
            1
        );
        assert_eq!(std::fs::read(dir.path().join("race.md")).unwrap(), b"");
    }
    #[test]
    fn token_expiry_cancel_invalid_authority_and_replaced_root() {
        let dir = FixtureDir::new("md-create-authority");
        let state = AppState::default();
        let choices = CreationState::default();
        let selected = dir.path().join("selected");
        std::fs::create_dir(&selected).unwrap();
        let root = state.register_root(&selected).unwrap();
        let choice = choices.choose(selected.clone()).unwrap();
        choices
            .lock()
            .unwrap()
            .get_mut(&choice.token)
            .unwrap()
            .expires = Instant::now();
        assert!(choices.take(&choice.token).is_err());
        let choice = choices.choose(selected.clone()).unwrap();
        choices.lock().unwrap().remove(&choice.token);
        assert!(choices.take(&choice.token).is_err());
        assert!(create(&state, &choices, request("invalid", "x")).is_err());
        std::fs::rename(&selected, dir.path().join("moved")).unwrap();
        std::fs::create_dir(&selected).unwrap();
        assert!(create(&state, &choices, request(&root.id, "x")).is_err());
        assert!(!selected.join("x.md").exists());
    }
    #[test]
    fn postcommit_failure_retains_file_and_identity_without_retrying_creation() {
        let dir = FixtureDir::new("md-create-postcommit");
        let state = AppState::default();
        let choices = CreationState::default();
        let root = state.register_root(dir.path()).unwrap();
        let outcome =
            create_with_postcheck(&state, &choices, request(&root.id, "committed"), || {
                Err(AppError::new(
                    "injected_registration",
                    "Simulated registry failure",
                ))
            })
            .unwrap();
        let CreateOutcome::CommittedNotOpened {
            identity_key,
            file_id,
            ..
        } = outcome
        else {
            panic!("truthful committed outcome required")
        };
        assert!(identity_key.is_some());
        assert!(file_id.is_none());
        assert_eq!(std::fs::read(dir.path().join("committed.md")).unwrap(), b"");
        assert!(create(&state, &choices, request(&root.id, "committed")).is_err());
    }
    #[test]
    fn filesystem_equivalent_names_never_replace_existing_bytes() {
        let dir = FixtureDir::new("md-create-equivalence");
        let state = AppState::default();
        let choices = CreationState::default();
        let root = state.register_root(dir.path()).unwrap();
        for (existing, requested) in [("Case.md", "case"), ("café.md", "cafe\u{301}")] {
            std::fs::write(dir.path().join(existing), b"preserve").unwrap();
            // Query actual fixture filesystem equivalence; do not invent Unicode
            // normalization on NTFS or equate distinct names on sensitive volumes.
            if dir.path().join(format!("{requested}.md")).exists() {
                assert!(create(&state, &choices, request(&root.id, requested)).is_err());
            }
            assert_eq!(
                std::fs::read(dir.path().join(existing)).unwrap(),
                b"preserve"
            );
        }
    }
    #[test]
    fn cancelled_or_failed_choice_does_not_install_grant_and_duplicate_can_retry() {
        let dir = FixtureDir::new("md-create-choice");
        let other = FixtureDir::new("md-create-existing");
        let state = AppState::default();
        let choices = CreationState::default();
        let old = state.register_root(other.path()).unwrap();
        std::fs::write(dir.path().join("duplicate.md"), b"keep").unwrap();
        let choice = choices.choose(dir.path().to_owned()).unwrap();
        let req = |name: &str| CreateRequest {
            root_id: None,
            segments: None,
            destination_token: Some(choice.token.clone()),
            filename: name.into(),
        };
        assert!(create(&state, &choices, req("duplicate")).is_err());
        assert!(choices.lock().unwrap().contains_key(&choice.token));
        assert!(state.root(&old.id).is_ok());
        assert!(matches!(
            create(&state, &choices, req("retry")).unwrap(),
            CreateOutcome::Opened { .. }
        ));
        assert!(!choices.lock().unwrap().contains_key(&choice.token));
    }
    #[test]
    fn an_explicit_file_is_not_parent_authority_and_segments_cannot_escape() {
        let dir = FixtureDir::new("md-create-no-inference");
        let state = AppState::default();
        let choices = CreationState::default();
        std::fs::write(dir.path().join("explicit.md"), b"old").unwrap();
        let file = state
            .register_explicit_file(&dir.path().join("explicit.md"))
            .unwrap();
        assert!(create(&state, &choices, request(&file.id, "escape")).is_err());
        let root = state.register_root(dir.path()).unwrap();
        let mut req = request(&root.id, "escape");
        req.segments = Some(vec!["..".into()]);
        assert!(create(&state, &choices, req).is_err());
        #[cfg(target_os = "macos")]
        {
            let outside = FixtureDir::new("md-create-outside");
            std::os::unix::fs::symlink(outside.path(), dir.path().join("link")).unwrap();
            let mut req = request(&root.id, "escape");
            req.segments = Some(vec!["link".into()]);
            assert!(create(&state, &choices, req).is_err());
            assert!(!outside.path().join("escape.md").exists());
        }
    }
}
