use crate::document::{read_document_impl, MAX_DOCUMENT_BYTES};
use crate::editing::{line_separator, restore_session, sections_from_source, EditSession, EditingState, SectionDescriptor};
use crate::scope::{io_error, open_selected, AppError, AppResult};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{Manager, State};
use uuid::Uuid;

const MAX_CHECKPOINT_BYTES: usize = 32 * 1024 * 1024;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryPayload {
    schema: u32,
    display_path: String,
    disk_version: String,
    base: String,
    section: SectionDescriptor,
    draft: String,
    editor_json: Value,
    editor_scroll_top: f64,
    editor_scroll_left: f64,
    reader_scroll_top: f64,
    sequence: u64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    saved_at_ms: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    owner_id: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    prior_paths: Vec<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecoveryEnvelope {
    checksum: String,
    payload: RecoveryPayload,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointAck {
    pub sequence: u64,
    pub duration_ms: u128,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryResponse {
    pub session_id: String,
    pub disk_version: String,
    pub section: SectionDescriptor,
    pub source: String,
    pub line_separator: &'static str,
    pub draft: String,
    pub editor_json: Value,
    pub editor_scroll_top: f64,
    pub editor_scroll_left: f64,
    pub reader_scroll_top: f64,
    pub sequence: u64,
    pub saved_at_ms: Option<u64>,
    pub conflict: bool,
}

fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn ensure_private_dir(path: &Path) -> AppResult<()> {
    crate::platform::storage::ensure_private_dir(path)
}

pub(crate) fn private_storage_dir(app: &tauri::AppHandle, name: &str) -> AppResult<PathBuf> {
    #[cfg(target_os = "macos")]
    let base = app.path().app_data_dir()
        .map_err(|error| AppError::new("recovery_error", error.to_string()))?;
    #[cfg(target_os = "windows")]
    let base = app.path().app_local_data_dir()
        .map_err(|error| AppError::new("recovery_error", error.to_string()))?;
    if let Some(parent) = base.parent() { #[cfg(target_os = "macos")]
        fs::create_dir_all(parent).map_err(io_error)?;
        #[cfg(target_os = "windows")]
        { let _ = open_selected(parent, true)?; } }
    ensure_private_dir(&base)?;
    let child = base.join(name);
    ensure_private_dir(&child)?;
    Ok(child)
}

fn path_for(app: &tauri::AppHandle, display_path: &str) -> AppResult<PathBuf> {
    let dir = private_storage_dir(app, "drafts")?;
    Ok(dir.join(format!("{}.json", digest(display_path.as_bytes()))))
}

fn decode(bytes: &[u8]) -> AppResult<RecoveryPayload> {
    if bytes.len() > MAX_CHECKPOINT_BYTES {
        return Err(AppError::new("recovery_size", "Recovery record is too large"));
    }
    let envelope: RecoveryEnvelope = serde_json::from_slice(bytes)
        .map_err(|_| AppError::new("recovery_corrupt", "Recovery record is invalid"))?;
    let payload_bytes = serde_json::to_vec(&envelope.payload)
        .map_err(|_| AppError::new("recovery_corrupt", "Recovery record is invalid"))?;
    if envelope.checksum != digest(&payload_bytes) || envelope.payload.schema != 1
        || envelope.payload.base.len() > MAX_DOCUMENT_BYTES
        || envelope.payload.draft.len() > MAX_DOCUMENT_BYTES
        || !envelope.payload.editor_scroll_top.is_finite()
        || !envelope.payload.editor_scroll_left.is_finite()
        || !envelope.payload.reader_scroll_top.is_finite()
        || envelope.payload.owner_id.as_ref().is_some_and(|id| Uuid::parse_str(id).is_err())
        || envelope.payload.prior_paths.len() > 16
        || envelope.payload.prior_paths.iter().any(|path|
            path.len() > 4096 || !Path::new(path).is_absolute()) {
        return Err(AppError::new("recovery_corrupt", "Recovery record failed validation"));
    }
    Ok(envelope.payload)
}

fn write_durable(path: &PathBuf, bytes: &[u8]) -> AppResult<()> {
    let dir = path.parent().ok_or_else(|| AppError::new("recovery_error", "Recovery folder is missing"))?;
    ensure_private_dir(dir)?;
    let temp = dir.join(format!(".{}.tmp", Uuid::new_v4()));
    let mut file = crate::platform::storage::create_private_file(&temp)?;
    if let Err(error) = file.write_all(bytes).and_then(|_| file.sync_all()) {
        let _ = crate::platform::storage::remove_private_file(&temp);
        return Err(io_error(error));
    }
    let result = (|| {
        let previous = path.with_extension("previous");
        #[cfg(target_os = "macos")]
        let valid_current = if path.exists() {
            decode(&fs::read(path).map_err(io_error)?).is_ok()
        } else { false };
        #[cfg(target_os = "windows")]
        let valid_current = match read_payload(path) {
            Ok(Some(_)) => true,
            Ok(None) | Err(AppError { code: "recovery_corrupt" | "recovery_size", .. }) => false,
            // Inspect an anchored, private, bounded handle before reading. An
            // unsafe DACL/reparse/recall failure must not become permission to replace.
            Err(error) => return Err(error),
        };
        if valid_current {
            match crate::platform::storage::remove_private_file(&previous) {
                Ok(()) => {},
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {},
                Err(error) => return Err(io_error(error)),
            }
            crate::platform::storage::preserve_previous(path, &previous)?;
            crate::platform::storage::sync_private_directory(dir)?;
        }
        crate::platform::storage::publish_private(&temp, path)?;
        crate::platform::storage::sync_private_directory(dir)?;
        Ok(())
    })();
    if result.is_err() { let _ = crate::platform::storage::remove_private_file(&temp); }
    result
}

fn storage_lock(dir: &Path) -> AppResult<crate::platform::storage::StorageLock> {
    crate::platform::storage::lock_private(&dir.join("drafts.lock"), "recovery_error", "recovery_permissions")
}

fn read_payload(path: &Path) -> AppResult<Option<RecoveryPayload>> {
    let file = match open_selected(path, false) {
        Ok(file) => file,
        Err(error) if error.code == "missing" => return Ok(None),
        Err(error) => return Err(error),
    };
    #[cfg(target_os = "windows")]
    crate::platform::storage::verify_private_file(&file)?;
    let mut bytes = Vec::new();
    file.take(MAX_CHECKPOINT_BYTES as u64 + 1).read_to_end(&mut bytes).map_err(io_error)?;
    decode(&bytes).map(Some)
}

fn read_current_or_previous(path: &Path) -> AppResult<Option<RecoveryPayload>> {
    let current = read_payload(path);
    let corrupt_current = current.as_ref().err().is_some_and(|error|
        error.code == "recovery_corrupt");
    match current {
        Ok(Some(payload)) => Ok(Some(payload)),
        Ok(None) | Err(AppError { code: "recovery_corrupt", .. }) => {
            match read_payload(&path.with_extension("previous"))? {
                Some(payload) => Ok(Some(payload)),
                None if corrupt_current => Err(AppError::new("recovery_corrupt",
                    "No valid recovery checkpoint remains")),
                None => Ok(None),
            }
        }
        Err(error) => Err(error),
    }
}

fn matches_session(payload: &RecoveryPayload, session: &EditSession) -> bool {
    match &payload.owner_id {
        Some(owner) => owner == &session.recovery_owner,
        None => payload.disk_version == session.disk_version
            && payload.base.as_bytes() == session.base
            && payload.section.id == session.section.id
            && payload.section.source_hash == session.section.source_hash,
    }
}

#[tauri::command]
pub async fn checkpoint_section_edit(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    session_id: String,
    sequence: u64,
    draft: String,
    editor_json: Value,
    editor_scroll_top: f64,
    editor_scroll_left: f64,
    reader_scroll_top: f64,
) -> AppResult<CheckpointAck> {
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        checkpoint_section_edit_impl(&app, &state, &editing, session_id, sequence, draft,
            editor_json, editor_scroll_top, editor_scroll_left, reader_scroll_top)
    }).await.map_err(|error| AppError::new("internal", error.to_string()))?
}

fn checkpoint_section_edit_impl(
    app: &tauri::AppHandle,
    state: &AppState,
    editing: &EditingState,
    session_id: String,
    sequence: u64,
    draft: String,
    editor_json: Value,
    editor_scroll_top: f64,
    editor_scroll_left: f64,
    reader_scroll_top: f64,
) -> AppResult<CheckpointAck> {
    let started = Instant::now();
    let sessions = editing.sessions.lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    let session = sessions.get(&session_id)
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let grant = state.file(&session.file_id)?;
    let path = path_for(app, &grant.display_path)?;
    let _lock = storage_lock(path.parent().ok_or_else(||
        AppError::new("recovery_error", "Recovery folder is missing"))?)?;
    for candidate in candidates(&path) {
        match read_payload(&candidate) {
            Ok(Some(payload)) => {
                if !matches_session(&payload, session) {
                    return Err(AppError::new("recovery_error", "Another draft owns this recovery record"));
                }
                if payload.sequence >= sequence {
                    return Err(AppError::new("checkpoint_stale", "A newer recovery checkpoint exists"));
                }
            }
            Ok(None) => {},
            Err(error) if error.code == "recovery_corrupt" => {},
            Err(error) => return Err(error),
        }
    }
    let base = String::from_utf8(session.base.clone())
        .map_err(|_| AppError::new("encoding", "Edit base is not valid UTF-8"))?;
    let payload = RecoveryPayload {
        schema: 1,
        display_path: grant.display_path,
        disk_version: session.disk_version.clone(),
        base,
        section: session.section.clone(),
        draft,
        editor_json,
        editor_scroll_top,
        editor_scroll_left,
        reader_scroll_top,
        sequence,
        saved_at_ms: Some(SystemTime::now().duration_since(UNIX_EPOCH)
            .map_err(|_| AppError::new("recovery_error", "System clock is unavailable"))?
            .as_millis() as u64),
        owner_id: Some(session.recovery_owner.clone()),
        prior_paths: session.recovery_paths.clone(),
    };
    let payload_bytes = serde_json::to_vec(&payload)
        .map_err(|_| AppError::new("recovery_error", "Could not encode recovery state"))?;
    let envelope = RecoveryEnvelope { checksum: digest(&payload_bytes), payload };
    let bytes = serde_json::to_vec(&envelope)
        .map_err(|_| AppError::new("recovery_error", "Could not encode recovery state"))?;
    if bytes.len() > MAX_CHECKPOINT_BYTES {
        return Err(AppError::new("recovery_size", "Recovery record is too large"));
    }
    write_durable(&path, &bytes)?;
    Ok(CheckpointAck { sequence, duration_ms: started.elapsed().as_millis() })
}

#[tauri::command]
pub async fn load_section_recovery(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    file_id: String,
) -> AppResult<Option<RecoveryResponse>> {
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    tauri::async_runtime::spawn_blocking(move || load_section_recovery_impl(&app, &state, &editing, file_id))
        .await.map_err(|error| AppError::new("internal", error.to_string()))?
}

fn load_section_recovery_impl(
    app: &tauri::AppHandle,
    state: &AppState,
    editing: &EditingState,
    file_id: String,
) -> AppResult<Option<RecoveryResponse>> {
    let grant = state.file(&file_id)?;
    let path = path_for(app, &grant.display_path)?;
    let payload = {
        let _lock = storage_lock(path.parent().ok_or_else(||
            AppError::new("recovery_error", "Recovery folder is missing"))?)?;
        let Some(payload) = read_current_or_previous(&path)? else { return Ok(None) };
        payload
    };
    if payload.display_path != grant.display_path {
        return Err(AppError::new("recovery_corrupt", "Recovery document identity changed"));
    }
    let separator = line_separator(&payload.base);
    let base = payload.base.into_bytes();
    if payload.section.start_byte > payload.section.end_byte || payload.section.end_byte > base.len() {
        return Err(AppError::new("recovery_corrupt", "Recovery section boundary is invalid"));
    }
    let valid_section = sections_from_source(&base, &payload.disk_version)?
        .into_iter().any(|section| section.id == payload.section.id
            && section.source_hash == payload.section.source_hash
            && section.start_byte == payload.section.start_byte
            && section.end_byte == payload.section.end_byte);
    if !valid_section {
        return Err(AppError::new("recovery_corrupt", "Recovery section no longer matches its base"));
    }
    let source = std::str::from_utf8(&base[payload.section.start_byte..payload.section.end_byte])
        .map_err(|_| AppError::new("recovery_corrupt", "Recovery section is invalid"))?
        .to_string();
    let conflict = match read_document_impl(state, Some(&file_id), None, None) {
        Ok(current) => current.disk_version != payload.disk_version,
        Err(error) if matches!(error.code,
            "missing" | "reselection_required" | "root_reselection_required" | "denied" | "unstable") => true,
        Err(error) => return Err(error),
    };
    let existing_id = editing.sessions.lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?
        .values().find(|session| session.file_id == file_id)
        .map(|session| session.id.clone());
    let session_id = match existing_id {
        Some(id) => id,
        None => restore_session(editing, file_id, payload.disk_version.clone(), base,
            payload.section.clone(), payload.owner_id.clone(), payload.prior_paths.clone())?,
    };
    Ok(Some(RecoveryResponse {
        session_id,
        disk_version: payload.disk_version,
        section: payload.section,
        source,
        line_separator: separator,
        draft: payload.draft,
        editor_json: payload.editor_json,
        editor_scroll_top: payload.editor_scroll_top,
        editor_scroll_left: payload.editor_scroll_left,
        reader_scroll_top: payload.reader_scroll_top,
        sequence: payload.sequence,
        saved_at_ms: payload.saved_at_ms,
        conflict,
    }))
}

fn encode_payload(payload: RecoveryPayload) -> AppResult<Vec<u8>> {
    let raw = serde_json::to_vec(&payload)
        .map_err(|_| AppError::new("recovery_error", "Could not encode recovery state"))?;
    let bytes = serde_json::to_vec(&RecoveryEnvelope { checksum: digest(&raw), payload })
        .map_err(|_| AppError::new("recovery_error", "Could not encode recovery state"))?;
    if bytes.len() > MAX_CHECKPOINT_BYTES {
        return Err(AppError::new("recovery_size", "Recovery record is too large"));
    }
    Ok(bytes)
}

fn candidates(path: &Path) -> [PathBuf; 2] {
    [path.to_path_buf(), path.with_extension("previous")]
}

fn migrate_at(dir: &Path, old_display: &str, new_display: &str,
    session: &mut EditSession) -> AppResult<()> {
    if old_display == new_display { return Ok(()); }
    let old = dir.join(format!("{}.json", digest(old_display.as_bytes())));
    let new = dir.join(format!("{}.json", digest(new_display.as_bytes())));
    let mut source = None;
    for path in candidates(&old) {
        match read_payload(&path) {
            Ok(Some(payload)) if payload.display_path == old_display
                && matches_session(&payload, session)
                && source.as_ref().is_none_or(|existing: &RecoveryPayload|
                    existing.sequence < payload.sequence) => source = Some(payload),
            Ok(_) => {},
            Err(error) if error.code == "recovery_corrupt" => {},
            Err(error) => return Err(error),
        }
    }
    let mut payload = source.ok_or_else(|| AppError::new("recovery_error",
        "No owned durable draft exists at the previous location"))?;
    for path in candidates(&new) {
        if let Some(existing) = read_payload(&path)? {
            if existing.display_path != new_display || !matches_session(&existing, session)
                || existing.sequence > payload.sequence {
                return Err(AppError::new("recovery_error",
                    "The new location has another or newer recovery record"));
            }
        }
    }
    let mut prior = payload.prior_paths.clone();
    if !prior.iter().any(|path| path == old_display) { prior.push(old_display.to_string()); }
    if prior.len() > 16 { return Err(AppError::new("recovery_size", "Too many moved recovery locations")); }
    payload.display_path = new_display.to_string();
    payload.owner_id = Some(session.recovery_owner.clone());
    payload.prior_paths = prior.clone();
    write_durable(&new, &encode_payload(payload)?)?;
    session.recovery_paths = prior;
    Ok(())
}

pub(crate) fn migrate_recovery(app: &tauri::AppHandle, old_display: &str,
    new_display: &str, session: &mut EditSession) -> AppResult<()> {
    let dir = private_storage_dir(app, "drafts")?;
    let _lock = storage_lock(&dir)?;
    migrate_at(&dir, old_display, new_display, session)
}

pub(crate) fn recovery_owner_at(app: &tauri::AppHandle,
    display_path: &str) -> AppResult<Option<String>> {
    let path = path_for(app, display_path)?;
    let _lock = storage_lock(path.parent().ok_or_else(||
        AppError::new("recovery_error", "Recovery folder is missing"))?)?;
    Ok(read_current_or_previous(&path)?
        .filter(|payload| payload.display_path == display_path)
        .and_then(|payload| payload.owner_id))
}

fn migrate_unloaded_at(dir: &Path, old_display: &str,
    new_display: &str, owner: &str) -> AppResult<()> {
    if Uuid::parse_str(owner).is_err() {
        return Err(AppError::new("recovery_corrupt", "Recovery owner is invalid"));
    }
    let old = dir.join(format!("{}.json", digest(old_display.as_bytes())));
    let mut found = None;
    for candidate in candidates(&old) {
        match read_payload(&candidate) {
            Ok(Some(payload)) if payload.display_path == old_display
                && payload.owner_id.as_deref() == Some(owner)
                && found.as_ref().is_none_or(|record: &RecoveryPayload| record.sequence < payload.sequence) => {
                    found = Some(payload);
                },
            Ok(_) => {},
            Err(error) if error.code == "recovery_corrupt" => {},
            Err(error) => return Err(error),
        }
    }
    let payload = found.ok_or_else(|| AppError::new("recovery_error",
        "The remembered draft no longer owns its recovery record"))?;
    let mut session = EditSession { id: Uuid::new_v4().to_string(), file_id: String::new(),
        disk_version: payload.disk_version.clone(), base: payload.base.into_bytes(),
        section: payload.section, recovery_owner: owner.to_string(),
        recovery_paths: payload.prior_paths };
    migrate_at(dir, old_display, new_display, &mut session)
}

pub(crate) fn migrate_unloaded_owner(app: &tauri::AppHandle, old_display: &str,
    new_display: &str, owner: &str) -> AppResult<()> {
    let dir = private_storage_dir(app, "drafts")?;
    let _lock = storage_lock(&dir)?;
    migrate_unloaded_at(&dir, old_display, new_display, owner)
}

fn clear_owned_at(dir: &Path, session: &EditSession, current_display: &str) -> AppResult<()> {
    let mut paths = session.recovery_paths.clone();
    paths.push(current_display.to_string());
    paths.sort(); paths.dedup();
    for display in paths {
        let path = dir.join(format!("{}.json", digest(display.as_bytes())));
        for candidate in candidates(&path) {
            let payload = match read_payload(&candidate) {
                Ok(Some(payload)) => payload,
                Ok(None) => continue,
                Err(error) if error.code == "recovery_corrupt" => continue,
                Err(error) => return Err(error),
            };
            if payload.display_path != display || !matches_session(&payload, session) { continue; }
            crate::platform::storage::remove_private_file(&candidate).map_err(io_error)?;
        }
    }
    crate::platform::storage::sync_private_directory(dir)
}

pub fn clear_owned_recovery(app: &tauri::AppHandle, session: &EditSession,
    current_display: &str) -> AppResult<()> {
    let dir = private_storage_dir(app, "drafts")?;
    let _lock = storage_lock(&dir)?;
    clear_owned_at(&dir, session, current_display)
}

pub(crate) fn has_saved_recovery(app: &tauri::AppHandle, session: &EditSession,
    display_path: &str) -> AppResult<bool> {
    let path = path_for(app, display_path)?;
    let _lock = storage_lock(path.parent().ok_or_else(||
        AppError::new("recovery_error", "Recovery folder is missing"))?)?;
    for candidate in [path.clone(), path.with_extension("previous")] {
        if read_payload(&candidate).is_ok_and(|payload|
            payload.is_some_and(|payload| payload.display_path == display_path
                && matches_session(&payload, session))) {
            return Ok(true);
        }
    }
    Ok(false)
}

#[tauri::command]
pub fn clear_all_recovery(app: tauri::AppHandle, editing: State<'_, EditingState>) -> AppResult<usize> {
    if editing.has_sessions() {
        return Err(AppError::new("draft_exists", "Finish open section edits before clearing drafts"));
    }
    let dir = private_storage_dir(&app, "drafts")?;
    let _lock = storage_lock(&dir)?;
    let entries = match fs::read_dir(&dir) {
        Ok(entries) => entries,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(0),
        Err(error) => return Err(io_error(error)),
    };
    let mut removed = 0;
    for entry in entries {
        let entry = entry.map_err(io_error)?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let stem = name.strip_suffix(".json").or_else(|| name.strip_suffix(".previous"));
        let Some(stem) = stem else { continue };
        if stem.len() != 64 || !stem.bytes().all(|byte| byte.is_ascii_hexdigit()) { continue; }
        if entry.file_type().map_err(io_error)?.is_file() {
            crate::platform::storage::remove_private_file(&entry.path()).map_err(io_error)?;
            removed += 1;
        }
    }
    crate::platform::storage::sync_private_directory(&dir)?;
    Ok(removed)
}

#[cfg(test)]
mod tests {
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::PermissionsExt;
    #[cfg(target_os = "macos")]
    use std::fs::Permissions;
    use super::*;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::symlink;
    use crate::editing::sections_from_source;
    use crate::scope::open_relative;

    fn payload(sequence: u64) -> RecoveryPayload {
        let base = "# A\nbody\n".to_string();
        let section = sections_from_source(base.as_bytes(), "v1").unwrap().remove(0);
        RecoveryPayload {
            schema: 1,
            display_path: "/tmp/disposable.md".to_string(),
            disk_version: "v1".to_string(),
            base,
            section,
            draft: "# A\nchanged\n".to_string(),
            editor_json: serde_json::json!({"doc": "# A\nchanged\n"}),
            editor_scroll_top: 2.0,
            editor_scroll_left: 0.0,
            reader_scroll_top: 10.0,
            sequence,
            saved_at_ms: Some(1_700_000_000_000),
            owner_id: None,
            prior_paths: Vec::new(),
        }
    }

    fn session_for(record: &RecoveryPayload, owner: &str) -> EditSession {
        EditSession { id: Uuid::new_v4().to_string(), file_id: Uuid::new_v4().to_string(),
            disk_version: record.disk_version.clone(), base: record.base.as_bytes().to_vec(),
            section: record.section.clone(), recovery_owner: owner.to_string(),
            recovery_paths: Vec::new() }
    }

    fn checkpoint_fixture(prefix: &str) -> (crate::platform::test_support::FixtureDir, PathBuf) {
        let fixture = crate::platform::test_support::FixtureDir::new(prefix);
        let dir = fixture.path().join("drafts");
        ensure_private_dir(&dir).unwrap();
        (fixture, dir)
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn moved_draft_preserves_complete_state_and_cleans_only_its_owner() {
        let dir = std::env::temp_dir().join(format!("md-reader-moved-draft-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let old_display = "/tmp/owned-before.md";
        let new_display = "/tmp/owned-after.md";
        let old = dir.join(format!("{}.json", digest(old_display.as_bytes())));
        let new = dir.join(format!("{}.json", digest(new_display.as_bytes())));
        let owner = Uuid::new_v4().to_string();
        let mut record = payload(42);
        record.display_path = old_display.to_string();
        record.owner_id = Some(owner.clone());
        write_durable(&old, &encode_payload(record).unwrap()).unwrap();
        let mut session = session_for(&payload(42), &owner);
        migrate_at(&dir, old_display, new_display, &mut session).unwrap();
        let migrated = read_payload(&new).unwrap().unwrap();
        assert_eq!(migrated.sequence, 42);
        assert_eq!(migrated.draft, "# A\nchanged\n");
        assert_eq!(migrated.editor_json, serde_json::json!({"doc": "# A\nchanged\n"}));
        assert_eq!(migrated.editor_scroll_top, 2.0);
        assert_eq!(migrated.reader_scroll_top, 10.0);
        assert_eq!(migrated.prior_paths, vec![old_display]);
        assert!(old.exists(), "migration must retain the prior acknowledged checkpoint");
        let other_owner = Uuid::new_v4().to_string();
        let mut unrelated = payload(100);
        unrelated.display_path = old_display.to_string();
        unrelated.owner_id = Some(other_owner);
        write_durable(&old, &encode_payload(unrelated).unwrap()).unwrap();
        clear_owned_at(&dir, &session, new_display).unwrap();
        assert!(!new.exists());
        assert_eq!(read_payload(&old).unwrap().unwrap().sequence, 100,
            "a newer unrelated record must survive owner cleanup");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn migration_failure_keeps_old_checkpoint_and_does_not_take_competing_new_path() {
        let dir = std::env::temp_dir().join(format!("md-reader-moved-conflict-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let old_display = "/tmp/move-source.md";
        let new_display = "/tmp/move-destination.md";
        let old = dir.join(format!("{}.json", digest(old_display.as_bytes())));
        let new = dir.join(format!("{}.json", digest(new_display.as_bytes())));
        let owner = Uuid::new_v4().to_string();
        let mut record = payload(7);
        record.display_path = old_display.to_string(); record.owner_id = Some(owner.clone());
        write_durable(&old, &encode_payload(record).unwrap()).unwrap();
        let mut competing = payload(9);
        competing.display_path = new_display.to_string();
        competing.owner_id = Some(Uuid::new_v4().to_string());
        write_durable(&new, &encode_payload(competing).unwrap()).unwrap();
        let mut session = session_for(&payload(7), &owner);
        assert_eq!(migrate_at(&dir, old_display, new_display, &mut session).unwrap_err().code,
            "recovery_error");
        assert_eq!(read_payload(&old).unwrap().unwrap().sequence, 7);
        assert_eq!(read_payload(&new).unwrap().unwrap().sequence, 9);
        assert!(session.recovery_paths.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn failed_moved_selection_keeps_the_old_file_grant() {
        let dir = std::env::temp_dir().join(format!("md-reader-moved-grant-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let first = dir.join("first.md");
        let second = dir.join("second.md");
        fs::write(&first, b"# A\nbody\n").unwrap();
        let state = AppState::default();
        let grant = state.register_explicit_file(&first).unwrap();
        fs::rename(&first, &second).unwrap();
        let result = state.reselect_explicit_file_with(&grant.id, &second, |_, _| {
            Err(AppError::new("recovery_error", "Injected migration failure"))
        });
        assert_eq!(result.err().unwrap().code, "recovery_error");
        assert_eq!(state.file(&grant.id).unwrap().display_path, first.display().to_string());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn legacy_checkpoint_can_be_adopted_and_moved_twice() {
        let dir = std::env::temp_dir().join(format!("md-reader-legacy-move-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let displays = ["/tmp/legacy-one.md", "/tmp/legacy-two.md", "/tmp/legacy-three.md"];
        let mut record = payload(5);
        record.display_path = displays[0].to_string();
        let first = dir.join(format!("{}.json", digest(displays[0].as_bytes())));
        write_durable(&first, &encode_payload(record).unwrap()).unwrap();
        let owner = Uuid::new_v4().to_string();
        let mut session = session_for(&payload(5), &owner);
        migrate_at(&dir, displays[0], displays[1], &mut session).unwrap();
        migrate_at(&dir, displays[1], displays[2], &mut session).unwrap();
        let third = dir.join(format!("{}.json", digest(displays[2].as_bytes())));
        let current = read_payload(&third).unwrap().unwrap();
        assert_eq!(current.owner_id.as_deref(), Some(owner.as_str()));
        assert_eq!(current.prior_paths, displays[..2]);
        clear_owned_at(&dir, &session, displays[2]).unwrap();
        for display in displays {
            let path = dir.join(format!("{}.json", digest(display.as_bytes())));
            assert!(!path.exists(), "owned moved recovery record was left behind");
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn picker_validated_move_publishes_grant_only_after_durable_draft() {
        let dir = std::env::temp_dir().join(format!("md-reader-picker-move-{}", Uuid::new_v4()));
        let private = dir.join("private");
        fs::create_dir_all(&private).unwrap();
        let first = dir.join("first.md");
        let second = dir.join("second.md");
        fs::write(&first, b"# A\nbody\n").unwrap();
        let state = AppState::default();
        let grant = state.register_explicit_file(&first).unwrap();
        let owner = Uuid::new_v4().to_string();
        let mut record = payload(13);
        record.display_path = grant.display_path.clone(); record.owner_id = Some(owner.clone());
        let old = private.join(format!("{}.json", digest(grant.display_path.as_bytes())));
        write_durable(&old, &encode_payload(record).unwrap()).unwrap();
        let mut session = session_for(&payload(13), &owner);
        fs::rename(&first, &second).unwrap();
        let selected = state.reselect_explicit_file_with(&grant.id, &second, |old, path| {
            migrate_at(&private, &old.display_path, &path.display().to_string(), &mut session)
        }).unwrap();
        assert_eq!(selected.display_path, second.display().to_string());
        let new = private.join(format!("{}.json", digest(selected.display_path.as_bytes())));
        assert_eq!(read_payload(&new).unwrap().unwrap().sequence, 13);
        assert_eq!(session.recovery_paths, vec![first.display().to_string()]);
        clear_owned_at(&private, &session, &selected.display_path).unwrap();
        assert!(!old.exists() && !new.exists());
        assert_eq!(fs::read(&second).unwrap(), b"# A\nbody\n");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn moved_folder_migrates_root_document_before_grant_switch() {
        let dir = std::env::temp_dir().join(format!("md-reader-root-move-{}", Uuid::new_v4()));
        let private = dir.join("private");
        let first = dir.join("first");
        let second = dir.join("second");
        fs::create_dir_all(&private).unwrap();
        fs::create_dir(&first).unwrap();
        fs::write(first.join("entry.md"), b"# A\nbody\n").unwrap();
        let state = AppState::default();
        let root_info = state.register_root(&first).unwrap();
        let root = state.root(&root_info.id).unwrap();
        let file = open_relative(&root.file, &["entry.md".to_string()], false).unwrap();
        let grant = state.register_root_file(&root, vec!["entry.md".to_string()], &file).unwrap();
        let owner = Uuid::new_v4().to_string();
        let mut record = payload(23);
        record.display_path = grant.display_path.clone(); record.owner_id = Some(owner.clone());
        let old = private.join(format!("{}.json", digest(grant.display_path.as_bytes())));
        write_durable(&old, &encode_payload(record).unwrap()).unwrap();
        let mut session = session_for(&payload(23), &owner);
        fs::rename(&first, &second).unwrap();
        let selected = state.reselect_root_with(&root_info.id, &second, |files, _| {
            assert_eq!(files.len(), 1);
            assert_eq!(files[0].0, grant.id);
            migrate_at(&private, &files[0].1, &files[0].2, &mut session)
        }).unwrap();
        assert_eq!(selected.display_path, second.display().to_string());
        let moved = state.file(&grant.id).unwrap();
        assert_eq!(moved.display_path, second.join("entry.md").display().to_string());
        let new = private.join(format!("{}.json", digest(moved.display_path.as_bytes())));
        assert_eq!(read_payload(&new).unwrap().unwrap().sequence, 23);
        clear_owned_at(&private, &session, &moved.display_path).unwrap();
        assert!(!old.exists() && !new.exists());
        assert_eq!(fs::read(second.join("entry.md")).unwrap(), b"# A\nbody\n");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn failed_folder_migration_keeps_old_root_grant() {
        let dir = std::env::temp_dir().join(format!("md-reader-root-fail-{}", Uuid::new_v4()));
        let first = dir.join("first"); let second = dir.join("second");
        fs::create_dir_all(&first).unwrap();
        let state = AppState::default();
        let selected = state.register_root(&first).unwrap();
        fs::rename(&first, &second).unwrap();
        let error = state.reselect_root_with(&selected.id, &second, |_, _| {
            Err(AppError::new("recovery_error", "Injected migration failure"))
        }).err().unwrap();
        assert_eq!(error.code, "recovery_error");
        assert_eq!(state.root_recorded(&selected.id).unwrap().path, first);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn cold_session_move_uses_recorded_owner_and_keeps_competing_record() {
        let dir = std::env::temp_dir().join(format!("md-reader-cold-move-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let old_display = "/tmp/cold-before.md";
        let new_display = "/tmp/cold-after.md";
        let owner = Uuid::new_v4().to_string();
        let other = Uuid::new_v4().to_string();
        let old = dir.join(format!("{}.json", digest(old_display.as_bytes())));
        let new = dir.join(format!("{}.json", digest(new_display.as_bytes())));
        let mut record = payload(17);
        record.display_path = old_display.to_string(); record.owner_id = Some(owner.clone());
        write_durable(&old, &encode_payload(record).unwrap()).unwrap();
        assert_eq!(migrate_unloaded_at(&dir, old_display, new_display, &other)
            .unwrap_err().code, "recovery_error");
        assert!(!new.exists());
        migrate_unloaded_at(&dir, old_display, new_display, &owner).unwrap();
        let migrated = read_payload(&new).unwrap().unwrap();
        assert_eq!(migrated.sequence, 17);
        assert_eq!(migrated.owner_id.as_deref(), Some(owner.as_str()));
        assert_eq!(migrated.prior_paths, vec![old_display]);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn checkpoint_checksum_rejects_tampered_draft() {
        let record = payload(4);
        let raw = serde_json::to_vec(&record).unwrap();
        let envelope = RecoveryEnvelope { checksum: digest(&raw), payload: record };
        let valid = serde_json::to_vec(&envelope).unwrap();
        assert_eq!(decode(&valid).unwrap().sequence, 4);
        let corrupt = String::from_utf8(valid).unwrap().replace("changed", "deleted");
        assert_eq!(decode(corrupt.as_bytes()).unwrap_err().code, "recovery_corrupt");
    }

    #[test]
    fn previous_schema_one_record_without_saved_time_still_loads() {
        let mut record = payload(2);
        record.saved_at_ms = None;
        let raw = serde_json::to_vec(&record).unwrap();
        let envelope = RecoveryEnvelope { checksum: digest(&raw), payload: record };
        let decoded = decode(&serde_json::to_vec(&envelope).unwrap()).unwrap();
        assert_eq!(decoded.sequence, 2);
        assert_eq!(decoded.saved_at_ms, None);
    }

    #[test]
    fn prior_checkpoint_survives_replacement_and_corrupt_latest() {
        let (_fixture, dir) = checkpoint_fixture("md-reader-recovery");
        let path = dir.join("draft.json");
        let encode = |sequence| {
            let record = payload(sequence);
            let raw = serde_json::to_vec(&record).unwrap();
            serde_json::to_vec(&RecoveryEnvelope { checksum: digest(&raw), payload: record }).unwrap()
        };
        write_durable(&path, &encode(1)).unwrap();
        write_durable(&path, &encode(2)).unwrap();
        assert_eq!(decode(&fs::read(path.with_extension("previous")).unwrap()).unwrap().sequence, 1);
        fs::write(&path, b"corrupt").unwrap();
        assert_eq!(decode(&fs::read(path.with_extension("previous")).unwrap()).unwrap().sequence, 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn recovery_storage_tightens_permissions_and_rejects_symlinks() {
                let temp = std::env::temp_dir().join(format!("md-reader-storage-{}", Uuid::new_v4()));
        fs::create_dir(&temp).unwrap();
        let drafts = temp.join("drafts");
        fs::create_dir(&drafts).unwrap();
        fs::set_permissions(&drafts, Permissions::from_mode(0o777)).unwrap();
        ensure_private_dir(&drafts).unwrap();
        assert_eq!(fs::metadata(&drafts).unwrap().permissions().mode() & 0o777, 0o700);
        let record = drafts.join("test.json");
        write_durable(&record, b"fixture").unwrap();
        assert_eq!(fs::metadata(&record).unwrap().permissions().mode() & 0o777, 0o600);
        let link = temp.join("link");
        symlink(&drafts, &link).unwrap();
        assert!(ensure_private_dir(&link).is_err());
        fs::remove_dir_all(temp).unwrap();
    }

    #[test]
    fn one_hundred_checkpoints_keep_latest_and_previous_without_temp_files() {
        let (_fixture, dir) = checkpoint_fixture("md-reader-sequence");
        let path = dir.join("draft.json");
        for sequence in 1..=100 {
            let record = payload(sequence);
            let raw = serde_json::to_vec(&record).unwrap();
            let bytes = serde_json::to_vec(&RecoveryEnvelope {
                checksum: digest(&raw), payload: record
            }).unwrap();
            let started = Instant::now();
            write_durable(&path, &bytes).unwrap();
            assert!(started.elapsed() < std::time::Duration::from_secs(1),
                "a small durable checkpoint exceeded one second");
        }
        assert_eq!(decode(&fs::read(&path).unwrap()).unwrap().sequence, 100);
        assert_eq!(decode(&fs::read(path.with_extension("previous")).unwrap()).unwrap().sequence, 99);
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 2);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn recovery_record_over_quota_is_rejected() {
        let oversized = vec![b' '; MAX_CHECKPOINT_BYTES + 1];
        assert_eq!(decode(&oversized).unwrap_err().code, "recovery_size");
    }

    #[test]
    fn failed_checkpoint_replacement_preserves_the_last_acknowledged_record() {
        let (_fixture, dir) = checkpoint_fixture("md-reader-failed-checkpoint");
        let path = dir.join("draft.json");
        let record = payload(1);
        let raw = serde_json::to_vec(&record).unwrap();
        let bytes = serde_json::to_vec(&RecoveryEnvelope { checksum: digest(&raw), payload: record }).unwrap();
        write_durable(&path, &bytes).unwrap();
        // An unusable previous-record destination simulates a real replacement failure.
        fs::create_dir(path.with_extension("previous")).unwrap();
        assert!(write_durable(&path, &bytes).is_err());
        assert_eq!(decode(&fs::read(&path).unwrap()).unwrap().sequence, 1);
        assert!(fs::read_dir(&dir).unwrap().all(|entry|
            !entry.unwrap().file_name().to_string_lossy().ends_with(".tmp")));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn checkpoint_reparse_failure_preserves_previous_and_outside_data() {
        let (fixture, dir) = checkpoint_fixture("md-reader-reparse-checkpoint");
        let outside = fixture.path().join("outside");
        fs::create_dir(&outside).unwrap();
        fs::write(outside.join("marker.md"), b"outside marker").unwrap();
        let path = dir.join("draft.json");
        let previous = path.with_extension("previous");
        let bytes = encode_payload(payload(1)).unwrap();
        write_durable(&previous, &bytes).unwrap();
        let junction = crate::platform::test_support::directory_link(&outside, &path).unwrap();
        assert!(write_durable(&path, &encode_payload(payload(2)).unwrap()).is_err());
        assert_eq!(fs::read(&previous).unwrap(), bytes);
        assert_eq!(fs::read(outside.join("marker.md")).unwrap(), b"outside marker");
        assert!(fs::read_dir(&dir).unwrap().all(|entry|
            !entry.unwrap().file_name().to_string_lossy().ends_with(".tmp")));
        drop(junction);
    }

    #[test]
    #[ignore = "subprocess harness; executed by checkpoint_survives_process_exit_after_ack"]
    fn checkpoint_child_after_ack() {
        let value = std::env::var_os("MD_READER_RECOVERY_FIXTURE").expect("parent fixture required");
        let path = PathBuf::from(value);
        let directory = path.parent().unwrap();
        assert_eq!(path.file_name().unwrap(), "draft.json");
        assert_eq!(directory.file_name().unwrap(), "drafts");
        let fixture = directory.parent().unwrap();
        assert!(fixture.file_name().unwrap().to_string_lossy().starts_with("md-reader-crash-fixture-"));
        assert_eq!(fixture.parent().unwrap().canonicalize().unwrap(), std::env::temp_dir().canonicalize().unwrap());
        let record = payload(42); let raw = serde_json::to_vec(&record).unwrap();
        let bytes = serde_json::to_vec(&RecoveryEnvelope { checksum: digest(&raw), payload: record }).unwrap();
        write_durable(&path, &bytes).unwrap();
        println!("CHECKPOINT_ACK_42");
        std::io::stdout().flush().unwrap();
        // Exit this disposable test child without Rust/application cleanup.
        #[cfg(target_os = "macos")]
        unsafe { libc::_exit(72) }
        #[cfg(target_os = "windows")]
        unsafe { windows_sys::Win32::System::Threading::ExitProcess(72) }
    }

    #[test]
    fn checkpoint_survives_process_exit_after_ack() {
        let (_fixture, dir) = checkpoint_fixture("md-reader-crash-fixture");
        let path = dir.join("draft.json");
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "recovery::tests::checkpoint_child_after_ack", "--ignored", "--nocapture"])
            .env("MD_READER_RECOVERY_FIXTURE", &path).output().unwrap();
        assert_eq!(result.status.code(), Some(72));
        assert!(String::from_utf8_lossy(&result.stdout).contains("CHECKPOINT_ACK_42"));
        let restored = decode(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(restored.sequence, 42); assert_eq!(restored.draft, "# A\nchanged\n");
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "windows")]
    #[ignore = "subprocess driver; explicitly executed by interrupted_save_retains_draft_stage_and_private_copies"]
    fn interrupted_save_child() {
        let fixture = PathBuf::from(std::env::var_os("F007W_SAVE_INTERRUPT_ROOT").unwrap());
        assert_eq!(fixture.parent().unwrap().canonicalize().unwrap(), std::env::temp_dir().canonicalize().unwrap());
        let name = fixture.file_name().unwrap().to_str().unwrap();
        assert!(Uuid::parse_str(name.strip_prefix("md-save-interruption-").unwrap()).is_ok());
        let path = fixture.join("source.md");
        let original = crate::scope::open_selected(&path, false).unwrap();
        let mut record = payload(73);
        record.display_path = path.to_str().unwrap().to_owned();
        let base = record.base.clone();
        let draft = record.draft.clone();
        let drafts = fixture.join("drafts");
        ensure_private_dir(&drafts).unwrap();
        write_durable(&drafts.join("draft.json"), &encode_payload(record).unwrap()).unwrap();
        let mut copies = crate::save_copies::SafetyCopyBatch::begin_fixture(fixture.join("copies"), 1024).unwrap();
        copies.preserve("original", base.as_bytes()).unwrap();
        copies.preserve("staged", draft.as_bytes()).unwrap();
        let parent = crate::scope::open_selected(&fixture, true).unwrap();
        let phase = std::env::var("F007W_SAVE_INTERRUPT_PHASE").unwrap();
        assert!(matches!(phase.as_str(), "partial" | "complete"));
        if phase == "partial" {
            crate::platform::stage_fixture_with_writer(&parent, draft.as_bytes(), Some(&original), |file, bytes| {
                file.write_all(&bytes[..5])?;
                file.sync_all()?;
                println!("SAVE_STAGE_ACK_73");
                std::io::stdout().flush()?;
                unsafe { windows_sys::Win32::System::Threading::ExitProcess(73) }
            }).unwrap();
            unreachable!("partial stage child exits inside the real writer");
        }
        let (_name, _stage) = crate::platform::stage_document_bytes(&parent, draft.as_bytes(), Some(&original)).unwrap();
        println!("SAVE_STAGE_ACK_73");
        std::io::stdout().flush().unwrap();
        // No Rust destructors: this tests process interruption, not power loss.
        unsafe { windows_sys::Win32::System::Threading::ExitProcess(73) }
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn interrupted_save_retains_draft_stage_and_private_copies() {
        for phase in ["partial", "complete"] {
        let fixture = crate::platform::test_support::FixtureDir::new("md-save-interruption");
        let source = fixture.join("source.md");
        fs::write(&source, b"# A\nbody\n").unwrap();
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "recovery::tests::interrupted_save_child", "--ignored", "--nocapture"])
            .env("F007W_SAVE_INTERRUPT_ROOT", fixture.path())
            .env("F007W_SAVE_INTERRUPT_PHASE", phase).output().unwrap();
        assert_eq!(result.status.code(), Some(73), "{} {}", String::from_utf8_lossy(&result.stdout), String::from_utf8_lossy(&result.stderr));
        assert!(String::from_utf8_lossy(&result.stdout).contains("SAVE_STAGE_ACK_73"));
        assert_eq!(fs::read(&source).unwrap(), b"# A\nbody\n");
        let restored = read_payload(&fixture.join("drafts").join("draft.json")).unwrap().unwrap();
        assert_eq!(restored.sequence, 73);
        assert_eq!(restored.draft, "# A\nchanged\n");
        let copies = fixture.join("copies");
        let inventory = crate::save_copies::fixture_inventory(&copies).unwrap();
        assert_eq!((inventory.resolved_count, inventory.unresolved_count), (0, 2));
        for entry in fs::read_dir(&copies).unwrap() {
            let entry = entry.unwrap();
            let name = entry.file_name().to_string_lossy().into_owned();
            if name == "copies.lock" { continue; }
            let file = crate::scope::open_selected(&entry.path(), false).unwrap();
            crate::platform::storage::verify_private_file(&file).unwrap();
            let expected = if name.ends_with("-original.pending") { restored.base.as_bytes() }
                else { assert!(name.ends_with("-staged.pending")); restored.draft.as_bytes() };
            assert_eq!(fs::read(entry.path()).unwrap(), expected);
        }
        let stages: Vec<_> = fs::read_dir(fixture.path()).unwrap().map(|entry| entry.unwrap())
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(".md-reader-")).collect();
        assert_eq!(stages.len(), 1);
        let expected_stage = if phase == "partial" { &restored.draft.as_bytes()[..5] } else { restored.draft.as_bytes() };
        assert_eq!(fs::read(stages[0].path()).unwrap(), expected_stage);
        // Restart inspection preserves the interrupted artifacts for recovery.
        assert_eq!(fs::read(&source).unwrap(), restored.base.as_bytes());
        }
    }
}
