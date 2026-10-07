use crate::recovery::private_storage_dir;
use crate::refresh::RefreshService;
use crate::scope::{identity, markdown_name, open_selected, validate_segment, AppError, AppResult, Identity};
use crate::session::now_ms;
use crate::state::{AppState, FileGrant, FileSource, GrantInfo};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const MAX_RECORD_BYTES: usize = 512 * 1024;
const MAX_PATH_BYTES: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RecentKind { Folder, Document }

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Entry {
    id: String,
    kind: RecentKind,
    path: String,
    identity: Identity,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    root_relative: Option<Vec<String>>,
    last_used_ms: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Record { schema: u32, sequence: u64, entries: Vec<Entry> }

#[derive(Serialize, Deserialize)]
struct Envelope { checksum: String, record: Record }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentItem {
    id: String,
    kind: RecentKind,
    name: String,
    parent: String,
    display_path: String,
    status: &'static str,
    last_used_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentList { items: Vec<RecentItem>, recovered_corrupt: bool }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentOpen { kind: RecentKind, grant: GrantInfo }

fn error(code: &'static str, message: impl Into<String>) -> AppError { AppError::new(code, message) }
fn hash(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
fn record_path(dir: &Path) -> PathBuf { dir.join("recents.json") }
fn previous_path(dir: &Path) -> PathBuf { dir.join("recents.previous") }

fn validate(record: &Record) -> AppResult<()> {
    if record.schema != 1 || record.sequence == 0 || record.entries.len() > 70 {
        return Err(error("recents_corrupt", "Recent list is invalid"));
    }
    let mut folders = 0;
    let mut documents = 0;
    let mut seen = std::collections::HashSet::new();
    for entry in &record.entries {
        if entry.id.is_empty() || entry.id.len() > 128 || entry.last_used_ms == 0
            || !crate::platform::bounded_record_path(&entry.path, MAX_PATH_BYTES)
            || !seen.insert(&entry.id) {
            return Err(error("recents_corrupt", "Recent entry is invalid"));
        }
        if entry.root_relative.as_ref().is_some_and(|segments| entry.kind != RecentKind::Document
            || segments.is_empty() || segments.len() > 64 || segments.iter().any(|segment|
                validate_segment(segment).is_err())
            || segments.iter().map(String::len).sum::<usize>() > MAX_PATH_BYTES) {
            return Err(error("recents_corrupt", "Recent location is invalid"));
        }
        match entry.kind { RecentKind::Folder => folders += 1, RecentKind::Document => documents += 1 }
    }
    if folders > 20 || documents > 50 { return Err(error("recents_corrupt", "Recent list exceeds limit")); }
    Ok(())
}

fn decode(bytes: &[u8]) -> AppResult<Record> {
    if bytes.len() > MAX_RECORD_BYTES { return Err(error("recents_corrupt", "Recent list is too large")); }
    let envelope: Envelope = serde_json::from_slice(bytes)
        .map_err(|_| error("recents_corrupt", "Recent list cannot be decoded"))?;
    let raw = serde_json::to_vec(&envelope.record)
        .map_err(|_| error("recents_corrupt", "Recent list cannot be encoded"))?;
    if hash(&raw) != envelope.checksum { return Err(error("recents_corrupt", "Recent list checksum failed")); }
    validate(&envelope.record)?;
    Ok(envelope.record)
}

fn encode(record: &Record) -> AppResult<Vec<u8>> {
    validate(record)?;
    let raw = serde_json::to_vec(record).map_err(|_| error("recents_error", "Could not encode recents"))?;
    let bytes = serde_json::to_vec(&Envelope { checksum: hash(&raw), record: record.clone() })
        .map_err(|_| error("recents_error", "Could not encode recents"))?;
    if bytes.len() > MAX_RECORD_BYTES { return Err(error("recents_error", "Recent list exceeds storage limit")); }
    Ok(bytes)
}

fn read_bounded(path: &Path) -> AppResult<Option<Vec<u8>>> {
    let file = match open_selected(path, false) {
        Ok(file) => file,
        Err(err) if err.code == "missing" => return Ok(None),
        Err(err) => return Err(err),
    };
    #[cfg(target_os = "windows")]
    crate::platform::storage::verify_private_file(&file)?;
    let mut bytes = Vec::new();
    file.take((MAX_RECORD_BYTES + 1) as u64).read_to_end(&mut bytes)
        .map_err(|err| error("recents_error", err.to_string()))?;
    Ok(Some(bytes))
}

fn load_at(dir: &Path) -> AppResult<(Option<Record>, bool)> {
    let current = read_bounded(&record_path(dir))?;
    if let Some(bytes) = &current { if let Ok(record) = decode(bytes) { return Ok((Some(record), false)); } }
    let previous = read_bounded(&previous_path(dir))?;
    if let Some(bytes) = &previous { if let Ok(record) = decode(bytes) { return Ok((Some(record), true)); } }
    Ok((None, current.is_some() || previous.is_some()))
}

fn lock(dir: &Path) -> AppResult<crate::platform::storage::StorageLock> {
    crate::platform::storage::lock_private(&dir.join("recents.lock"), "recents_error", "recents_permissions")
}

fn write_at(dir: &Path, record: &Record) -> AppResult<()> {
    let bytes = encode(record)?;
    let temp = dir.join(format!(".{}.tmp", Uuid::new_v4()));
    let mut file = crate::platform::storage::create_private_file(&temp)?;
    let result = (|| {
        file.write_all(&bytes).and_then(|_| file.sync_all())
            .map_err(|err| error("recents_error", err.to_string()))?;
        let current = record_path(dir);
        if let Some(current_bytes) = read_bounded(&current)? {
            if decode(&current_bytes).is_ok() {
                let previous = previous_path(dir);
                match crate::platform::storage::remove_private_file(&previous) {
                    Ok(()) => {},
                    Err(err) if err.kind() == std::io::ErrorKind::NotFound => {},
                    Err(err) => return Err(error("recents_error", err.to_string())),
                }
                crate::platform::storage::preserve_previous(&current, &previous)?;
                crate::platform::storage::sync_private_directory(dir)?;
            }
        }
        crate::platform::storage::publish_private(&temp, &current)?;
        crate::platform::storage::sync_private_directory(dir)
    })();
    if result.is_err() { let _ = crate::platform::storage::remove_private_file(&temp); }
    result
}

fn store_dir(app: &AppHandle) -> AppResult<PathBuf> { private_storage_dir(app, "recents") }

fn record_at(dir: &Path, kind: RecentKind, path: &Path, selected_identity: Identity,
    same_id: Option<&str>, root_relative: Option<Vec<String>>) -> AppResult<()> {
    let canonical = fs::canonicalize(path).map_err(|err| error("recents_error", err.to_string()))?;
    let current = open_selected(&canonical, kind == RecentKind::Folder)?;
    if identity(&current)? != selected_identity {
        return Err(error("version_changed", "Recent item changed before it could be remembered"));
    }
    let _lock = lock(dir)?;
    let (old, _) = load_at(dir)?;
    let mut record = old.unwrap_or(Record { schema: 1, sequence: 0, entries: Vec::new() });
    if same_id.is_some_and(|id| !record.entries.iter().any(|entry| entry.id == id)) {
        return Err(error("recent_missing", "Recent item was removed while opening"));
    }
    let id = same_id.map(str::to_owned).or_else(|| record.entries.iter().find(|entry|
        entry.kind == kind && entry.identity == selected_identity).map(|entry| entry.id.clone()))
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    record.entries.retain(|entry| entry.id != id && !(entry.kind == kind && entry.identity == selected_identity));
    let path = canonical.to_str().filter(|value| crate::platform::bounded_record_path(value, MAX_PATH_BYTES))
        .ok_or_else(|| error("invalid_path", "Recent path is invalid"))?;
    record.entries.insert(0, Entry { id, kind, path: path.to_owned(), identity: selected_identity, root_relative,
        last_used_ms: now_ms()? });
    let mut folders = 0;
    let mut documents = 0;
    record.entries.retain(|entry| match entry.kind {
        RecentKind::Folder => { folders += 1; folders <= 20 },
        RecentKind::Document => { documents += 1; documents <= 50 },
    });
    record.sequence = record.sequence.saturating_add(1);
    write_at(dir, &record)
}

pub(crate) fn record_folder(app: &AppHandle, state: &AppState, root_id: &str) -> AppResult<()> {
    let grant = state.root_recorded(root_id)?;
    record_at(&store_dir(app)?, RecentKind::Folder, &grant.path, grant.identity, None, None)
}

pub(crate) fn record_document(app: &AppHandle, state: &AppState, file_id: &str) -> AppResult<()> {
    let grant: FileGrant = state.file(file_id)?;
    if !markdown_name(&grant.name) { return Err(error("unsupported_type", "Only Markdown documents can be recent documents")); }
    let root_relative = match &grant.source {
        FileSource::Root { segments, .. } => Some(segments.clone()),
        FileSource::Explicit { .. } => None,
    };
    record_at(&store_dir(app)?, RecentKind::Document, Path::new(&grant.display_path),
        grant.identity, None, root_relative)
}

#[tauri::command]
pub async fn remember_recent_document(app: AppHandle, state: State<'_, AppState>,
    file_id: String) -> AppResult<()> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || record_document(&app, &state, &file_id))
        .await.map_err(|err| error("internal", err.to_string()))?
}

fn status(entry: &Entry) -> &'static str {
    match open_selected(Path::new(&entry.path), entry.kind == RecentKind::Folder) {
        Ok(file) if identity(&file).ok() == Some(entry.identity) => "available",
        Ok(_) => "replaced",
        Err(err) if err.code == "missing" => "missing",
        Err(err) if err.code == "denied" => "denied",
        Err(_) => "unavailable",
    }
}

fn item(entry: Entry) -> RecentItem {
    let path = Path::new(&entry.path);
    let item_status = status(&entry);
    RecentItem { id: entry.id, kind: entry.kind,
        name: path.file_name().map(|value| value.to_string_lossy().to_string()).unwrap_or_default(),
        parent: path.parent().map(|value| value.display().to_string()).unwrap_or_default(),
        display_path: entry.path, status: item_status, last_used_ms: entry.last_used_ms }
}

#[tauri::command]
pub async fn list_recent_items(app: AppHandle) -> AppResult<RecentList> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = store_dir(&app)?;
        let _lock = lock(&dir)?;
        let (record, recovered_corrupt) = load_at(&dir)?;
        Ok(RecentList { items: record.map_or_else(Vec::new,
            |record| record.entries.into_iter().map(item).collect()), recovered_corrupt })
    }).await.map_err(|err| error("internal", err.to_string()))?
}

fn entry_by_id(dir: &Path, id: &str) -> AppResult<Entry> {
    let _lock = lock(dir)?;
    let (record, _) = load_at(dir)?;
    record.and_then(|record| record.entries.into_iter().find(|entry| entry.id == id))
        .ok_or_else(|| error("recent_missing", "Recent item is no longer in the list"))
}

#[tauri::command]
pub async fn open_recent_item(app: AppHandle, state: State<'_, AppState>,
    refresh: State<'_, RefreshService>,
    entry_id: String) -> AppResult<RecentOpen> {
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let dir = store_dir(&app)?;
        let entry = entry_by_id(&dir, &entry_id)?;
        let path = Path::new(&entry.path);
        if entry.kind == RecentKind::Document && !path.file_name()
            .is_some_and(|name| markdown_name(&name.to_string_lossy())) {
            return Err(error("reselect_required", "Recent document needs reselection"));
        }
        let file = open_selected(path, entry.kind == RecentKind::Folder)
            .map_err(|_| error("reselect_required", "Recent item needs reselection"))?;
        if identity(&file)? != entry.identity {
            return Err(error("reselect_required", "Recent item changed; select it again"));
        }
        let epoch = state.selection_epoch()?;
        let grant = match entry.kind {
            RecentKind::Folder => state.reopen_root(path, entry.identity, epoch)?,
            RecentKind::Document => state.restore_explicit_file(path, entry.identity, epoch)?,
        };
        match entry.kind {
            RecentKind::Folder => { let _ = refresh.watch_root(&grant.id); },
            RecentKind::Document => { let _ = refresh.watch_explicit_file(&grant.id); },
        }
        if entry.kind == RecentKind::Folder {
            let _ = record_at(&dir, entry.kind, path, entry.identity, Some(&entry.id), None);
        }
        Ok(RecentOpen { kind: entry.kind, grant })
    }).await.map_err(|err| error("internal", err.to_string()))?
}

#[tauri::command]
pub async fn reselect_recent_item(app: AppHandle, state: State<'_, AppState>,
    refresh: State<'_, RefreshService>,
    entry_id: String) -> AppResult<Option<RecentOpen>> {
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let dir = store_dir(&app)?;
        let entry = entry_by_id(&dir, &entry_id)?;
        let selected = if entry.kind == RecentKind::Folder {
            app.dialog().file().blocking_pick_folder()
        } else {
            app.dialog().file().add_filter("Markdown", &["md", "markdown"]).blocking_pick_file()
        };
        let Some(selected) = selected else { return Ok(None); };
        let path = selected.into_path().map_err(|err| error("invalid_path", err.to_string()))?;
        if entry.kind == RecentKind::Document && !path.file_name()
            .is_some_and(|name| markdown_name(&name.to_string_lossy())) {
            return Err(error("unsupported_type", "Only Markdown documents can be selected"));
        }
        let file = open_selected(&path, entry.kind == RecentKind::Folder)?;
        let selected_identity = identity(&file)?;
        let grant = match entry.kind {
            RecentKind::Folder => state.register_root(&path)?,
            RecentKind::Document => state.register_explicit_file(&path)?,
        };
        match entry.kind {
            RecentKind::Folder => { let _ = refresh.watch_root(&grant.id); },
            RecentKind::Document => { let _ = refresh.watch_explicit_file(&grant.id); },
        }
        let _ = record_at(&dir, entry.kind, &path, selected_identity, Some(&entry.id), None);
        Ok(Some(RecentOpen { kind: entry.kind, grant }))
    }).await.map_err(|err| error("internal", err.to_string()))?
}

fn change_at(dir: &Path, entry_id: Option<&str>, confirmed: bool) -> AppResult<()> {
    if entry_id.is_none() && !confirmed { return Err(error("confirmation_required", "Clear Recents needs confirmation")); }
    let _lock = lock(dir)?;
    let (old, _) = load_at(dir)?;
    let mut record = old.unwrap_or(Record { schema: 1, sequence: 0, entries: Vec::new() });
    if let Some(id) = entry_id { record.entries.retain(|entry| entry.id != id); }
    else { record.entries.clear(); }
    record.sequence = record.sequence.saturating_add(1);
    write_at(dir, &record)
}

#[tauri::command]
pub async fn remove_recent_item(app: AppHandle, entry_id: String) -> AppResult<()> {
    tauri::async_runtime::spawn_blocking(move || change_at(&store_dir(&app)?, Some(&entry_id), true))
        .await.map_err(|err| error("internal", err.to_string()))?
}

#[tauri::command]
pub async fn clear_recent_items(app: AppHandle, confirmed: bool) -> AppResult<()> {
    tauri::async_runtime::spawn_blocking(move || change_at(&store_dir(&app)?, None, confirmed))
        .await.map_err(|err| error("internal", err.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recorded_paths_round_trip_and_invalid_locations_are_rejected() {
        #[cfg(target_os = "macos")]
        let paths = ["/private/tmp/Café space/Read.MD", "/tmp/back\\slash.md"];
        #[cfg(target_os = "windows")]
        let paths = [r"C:\Café space\Read.MD", r"\\?\c:\Café space\Read.MD"];
        for path in paths {
            let record = Record { schema: 1, sequence: 1, entries: vec![Entry {
                id: "fixture".into(), kind: RecentKind::Document, path: path.into(),
                identity: Identity { device: u64::MAX, inode: u64::MAX - 1 },
                root_relative: None, last_used_ms: 1,
            }] };
            let decoded = decode(&encode(&record).unwrap()).unwrap();
            assert_eq!(decoded.entries[0].path, path);
            assert_eq!(decoded.entries[0].identity, record.entries[0].identity);
            let mut invalid = record.clone();
            for path in ["", "relative.md", "bad\0path"] {
                invalid.entries[0].path = path.into();
                assert!(encode(&invalid).is_err());
            }
            invalid.entries[0].path = "x".repeat(MAX_PATH_BYTES + 1);
            assert!(encode(&invalid).is_err());
            #[cfg(target_os = "macos")]
            let (prefix, separator) = ("/", "/");
            #[cfg(target_os = "windows")]
            let (prefix, separator) = ("C:\\", "\\");
            invalid.entries[0].path = format!("{prefix}{}", vec!["a".repeat(240); 16].join(separator));
            assert!(encode(&invalid).is_ok());
            invalid.entries[0].path = format!("{prefix}{}", vec!["a".repeat(240); 18].join(separator));
            assert!(encode(&invalid).is_err());
            #[cfg(target_os = "windows")]
            for path in ["/tmp/file", r"C:relative", r"\\server\share", r"\\.\pipe\x",
                r"C:\a:stream", r"C:\a\..\x", r"C:\NUL.md"] {
                invalid.entries[0].path = path.into();
                assert!(encode(&invalid).is_err(), "{path}");
            }
        }
    }

    #[test]
    fn durable_order_cap_clear_and_corrupt_fallback() {
        let dir = std::env::temp_dir().join(format!("md-reader-recents-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        for number in 0..55 {
            let path = dir.join(format!("doc-{number}.md"));
            fs::write(&path, format!("# {number}")).unwrap();
            let selected_identity = identity(&open_selected(&path, false).unwrap()).unwrap();
            record_at(&dir, RecentKind::Document, &path,
                selected_identity, None, None).unwrap();
        }
        let (record, _) = load_at(&dir).unwrap();
        let record = record.unwrap();
        assert_eq!(record.entries.len(), 50);
        assert_eq!(record.entries[0].path,
            fs::canonicalize(dir.join("doc-54.md")).unwrap().display().to_string());
        fs::write(record_path(&dir), "corrupt").unwrap();
        let (fallback, recovered) = load_at(&dir).unwrap();
        assert!(recovered);
        assert_eq!(fallback.unwrap().entries.len(), 50);
        change_at(&dir, None, true).unwrap();
        assert!(load_at(&dir).unwrap().0.unwrap().entries.is_empty());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn metadata_change_does_not_touch_selected_file() {
        let dir = std::env::temp_dir().join(format!("md-reader-recents-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let selected = dir.join("source.md");
        fs::write(&selected, "source stays untouched").unwrap();
        let selected_identity = identity(&open_selected(&selected, false).unwrap()).unwrap();
        record_at(&dir, RecentKind::Document, &selected, selected_identity, None, None).unwrap();
        let id = load_at(&dir).unwrap().0.unwrap().entries[0].id.clone();
        change_at(&dir, Some(&id), true).unwrap();
        assert_eq!(fs::read_to_string(&selected).unwrap(), "source stays untouched");
        fs::remove_dir_all(dir).unwrap();
    }
}
