use crate::document::MAX_DOCUMENT_BYTES;
use crate::platform::PositionalRead;
use crate::recovery::private_storage_dir;
use crate::scope::{
    identity, io_error, markdown_name, open_relative, open_selected, size, AppError, AppResult,
    Identity,
};
use crate::state::{AppState, FileGrant, FileSource};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex,
};
use std::time::{Duration, SystemTime};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const MAX_SOURCE_BYTES: u64 = 50 * 1024 * 1024;
const WINDOW_BYTES: usize = 64 * 1024;
const MAX_COPY_BYTES: u64 = 1024 * 1024;
const INDEX_INTERVAL: u64 = 512;

#[derive(Clone, Default)]
pub struct LargeSourceState {
    snapshots: Arc<Mutex<HashMap<String, Arc<Snapshot>>>>,
    find_epoch: Arc<AtomicU64>,
    open_epoch: Arc<AtomicU64>,
}

struct Snapshot {
    id: String,
    file_id: String,
    file: File,
    path: PathBuf,
    size: u64,
    version: String,
    line_count: u64,
    sparse_lines: Vec<u64>,
    byte_line_index: Vec<(u64, u64)>,
    source_stamp: Stamp,
}

impl Drop for Snapshot {
    fn drop(&mut self) {
        let _ = crate::platform::storage::remove_private_file(&self.path);
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargeInspection {
    pub file_id: String,
    pub name: String,
    pub display_path: String,
    pub size_bytes: u64,
    pub over_limit: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LargeOpened {
    pub snapshot_id: String,
    pub file_id: String,
    pub size_bytes: u64,
    pub line_count: u64,
    pub disk_version: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotProgress {
    file_id: String,
    completed_bytes: u64,
    total_bytes: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FindProgress {
    snapshot_id: String,
    request_id: u64,
    scanned_bytes: u64,
    total_bytes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceWindow {
    pub start_byte: u64,
    pub end_byte: u64,
    pub size_bytes: u64,
    pub line_number: u64,
    pub text: String,
}

#[derive(Clone, PartialEq, Eq)]
struct Stamp {
    identity: Identity,
    len: u64,
    mtime: i64,
    mtime_nsec: i64,
    ctime: i64,
    ctime_nsec: i64,
}

fn stamp(file: &File) -> AppResult<Stamp> {
    let st = crate::platform::stamp(file)?;
    Ok(Stamp {
        identity: Identity {
            device: st.device,
            inode: st.inode,
        },
        len: st.length,
        mtime: st.modified_seconds,
        mtime_nsec: st.modified_nanos,
        ctime: st.changed_seconds,
        ctime_nsec: st.changed_nanos,
    })
}

fn selected_file(
    state: &AppState,
    file_id: Option<&str>,
    root_id: Option<&str>,
    segments: Option<Vec<String>>,
) -> AppResult<(FileGrant, File)> {
    let grant = if let Some(id) = file_id {
        state.file(id)?
    } else {
        let root = state
            .root(root_id.ok_or_else(|| AppError::new("invalid_grant", "No folder selected"))?)?;
        let segments = segments.ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        let name = segments
            .last()
            .ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        if !markdown_name(name) {
            return Err(AppError::new(
                "unsupported_type",
                "Only Markdown is eligible",
            ));
        }
        let file = open_relative(&root.file, &segments, false)?;
        state.register_root_file(&root, segments, &file)?
    };
    if !markdown_name(&grant.name) {
        return Err(AppError::new(
            "unsupported_type",
            "Only Markdown is eligible",
        ));
    }
    let file = match &grant.source {
        FileSource::Explicit { path, .. } => {
            let file = open_selected(path, false)?;
            if identity(&file)? != grant.identity {
                return Err(AppError::new(
                    "reselection_required",
                    "Selected file changed",
                ));
            }
            file
        }
        FileSource::Root { root_id, segments } => {
            let root = state.root(root_id)?;
            open_relative(&root.file, segments, false)?
        }
    };
    Ok((grant, file))
}

fn inspect_impl(
    state: &AppState,
    file_id: Option<&str>,
    root_id: Option<&str>,
    segments: Option<Vec<String>>,
) -> AppResult<LargeInspection> {
    let (grant, file) = selected_file(state, file_id, root_id, segments)?;
    let bytes = size(&file)?;
    Ok(LargeInspection {
        file_id: grant.id,
        name: grant.name,
        display_path: grant.display_path,
        size_bytes: bytes,
        over_limit: bytes > MAX_SOURCE_BYTES,
    })
}

#[tauri::command]
pub async fn inspect_large_file(
    state: tauri::State<'_, AppState>,
    file_id: Option<String>,
    root_id: Option<String>,
    segments: Option<Vec<String>>,
) -> AppResult<LargeInspection> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        inspect_impl(&state, file_id.as_deref(), root_id.as_deref(), segments)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn snapshot_into(
    dir: &std::path::Path,
    file_id: String,
    source: &File,
    cancelled: impl Fn() -> bool,
    mut progress: impl FnMut(u64, u64),
) -> AppResult<Snapshot> {
    let before = stamp(source)?;
    if before.len <= MAX_DOCUMENT_BYTES as u64 {
        return Err(AppError::new(
            "source_mode_unneeded",
            "This document fits in rich reading mode",
        ));
    }
    if before.len > MAX_SOURCE_BYTES {
        return Err(AppError::new(
            "source_limit",
            "Large source exceeds the 50 MiB limit",
        ));
    }
    let id = Uuid::new_v4().to_string();
    let path = dir.join(format!("{id}.source"));
    let mut output = crate::platform::storage::create_private_file(&path)?;
    let mut buffer = [0u8; 64 * 1024];
    let mut offset = 0u64;
    let mut hasher = Sha256::new();
    let mut carry = Vec::new();
    let mut line_count = 1u64;
    let mut sparse_lines = vec![0u64];
    let mut byte_line_index = vec![(0u64, 0u64)];
    let result = (|| -> AppResult<()> {
        while offset < before.len {
            if cancelled() {
                return Err(AppError::new(
                    "cancelled",
                    "Large source opening was cancelled",
                ));
            }
            let wanted = buffer.len().min((before.len - offset) as usize);
            let amount = source
                .read_at(&mut buffer[..wanted], offset)
                .map_err(io_error)?;
            if amount == 0 {
                return Err(AppError::new("unstable", "Source ended during snapshot"));
            }
            let chunk = &buffer[..amount];
            if chunk.contains(&0) {
                return Err(AppError::new("binary", "Source contains binary data"));
            }
            let mut utf8 = std::mem::take(&mut carry);
            utf8.extend_from_slice(chunk);
            if let Err(error) = std::str::from_utf8(&utf8) {
                if error.error_len().is_some() {
                    return Err(AppError::new("encoding", "Source is not valid UTF-8"));
                }
                carry = utf8.split_off(error.valid_up_to());
                if carry.len() > 3 {
                    return Err(AppError::new("encoding", "Invalid UTF-8 boundary"));
                }
            }
            for (index, byte) in chunk.iter().enumerate() {
                if *byte == b'\n' {
                    line_count += 1;
                    if (line_count - 1) % INDEX_INTERVAL == 0 {
                        sparse_lines.push(offset + index as u64 + 1);
                    }
                }
            }
            output.write_all(chunk).map_err(io_error)?;
            hasher.update(chunk);
            offset += amount as u64;
            if offset % (1024 * 1024) == 0 {
                byte_line_index.push((offset, line_count - 1));
            }
            if offset % (1024 * 1024) < amount as u64 || offset == before.len {
                progress(offset, before.len);
            }
        }
        if !carry.is_empty() {
            return Err(AppError::new("encoding", "Incomplete UTF-8 at end"));
        }
        output.sync_all().map_err(io_error)?;
        crate::platform::storage::sync_private_directory(dir)?;
        if stamp(source)? != before {
            return Err(AppError::new("unstable", "Source changed during snapshot"));
        }
        Ok(())
    })();
    if let Err(error) = result {
        drop(output);
        let _ = crate::platform::storage::remove_private_file(&path);
        return Err(error);
    }
    let digest = format!("{:x}", hasher.finalize());
    Ok(Snapshot {
        id,
        file_id,
        file: output,
        path,
        size: before.len,
        version: format!(
            "{}:{}:{}",
            before.identity.device, before.identity.inode, digest
        ),
        line_count,
        sparse_lines,
        byte_line_index,
        source_stamp: before,
    })
}

fn prune_orphans(dir: &std::path::Path) -> AppResult<()> {
    let now = SystemTime::now();
    let mut seen = 0usize;
    for entry in fs::read_dir(dir).map_err(io_error)? {
        seen += 1;
        if seen > 10_000 {
            return Err(AppError::new("source_storage", "Too many source snapshots"));
        }
        let entry = entry.map_err(io_error)?;
        let name = entry.file_name().to_string_lossy().into_owned();
        let Some(stem) = name.strip_suffix(".source") else {
            continue;
        };
        if Uuid::parse_str(stem).is_err() {
            continue;
        }
        let file = open_selected(&entry.path(), false)?;
        let metadata = file.metadata().map_err(io_error)?;
        crate::platform::storage::verify_private_file(&file)?;
        if metadata
            .modified()
            .ok()
            .and_then(|created| now.duration_since(created).ok())
            .is_some_and(|age| age >= Duration::from_secs(24 * 60 * 60))
        {
            crate::platform::storage::remove_private_file(&entry.path()).map_err(io_error)?;
        }
    }
    Ok(())
}

fn open_impl(
    app: &AppHandle,
    state: &AppState,
    snapshots: &LargeSourceState,
    file_id: &str,
    explicit_consent: bool,
) -> AppResult<LargeOpened> {
    if !explicit_consent {
        return Err(AppError::new(
            "consent_required",
            "Choose read-only source mode",
        ));
    }
    let (grant, file) = selected_file(state, Some(file_id), None, None)?;
    let dir = private_storage_dir(app, "large-source")?;
    prune_orphans(&dir)?;
    let epoch = snapshots.open_epoch.fetch_add(1, Ordering::SeqCst) + 1;
    let progress_id = grant.id.clone();
    let snapshot = snapshot_into(
        &dir,
        grant.id.clone(),
        &file,
        || snapshots.open_epoch.load(Ordering::SeqCst) != epoch,
        |completed_bytes, total_bytes| {
            let _ = app.emit(
                "large-source:progress",
                SnapshotProgress {
                    file_id: progress_id.clone(),
                    completed_bytes,
                    total_bytes,
                },
            );
        },
    )?;
    if snapshots.open_epoch.load(Ordering::SeqCst) != epoch {
        return Err(AppError::new(
            "cancelled",
            "Large source opening was cancelled",
        ));
    }
    let (_, fresh) = selected_file(state, Some(file_id), None, None)?;
    if stamp(&fresh)? != stamp(&file)? {
        return Err(AppError::new("unstable", "Source changed after snapshot"));
    }
    let opened = LargeOpened {
        snapshot_id: snapshot.id.clone(),
        file_id: snapshot.file_id.clone(),
        size_bytes: snapshot.size,
        line_count: snapshot.line_count,
        disk_version: snapshot.version.clone(),
    };
    let mut store = snapshots
        .snapshots
        .lock()
        .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?;
    snapshots.find_epoch.fetch_add(1, Ordering::SeqCst);
    // Only one 50 MiB snapshot is retained at a time. Closed and inactive tabs
    // keep their identity, and may request a fresh snapshot when selected.
    store.clear();
    store.insert(snapshot.id.clone(), Arc::new(snapshot));
    Ok(opened)
}

#[tauri::command]
pub fn cancel_large_open(snapshots: tauri::State<'_, LargeSourceState>) {
    snapshots.open_epoch.fetch_add(1, Ordering::SeqCst);
}

#[tauri::command]
pub async fn open_large_source(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    snapshots: tauri::State<'_, LargeSourceState>,
    file_id: String,
    explicit_consent: bool,
) -> AppResult<LargeOpened> {
    let state = state.inner().clone();
    let snapshots = snapshots.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        open_impl(&app, &state, &snapshots, &file_id, explicit_consent)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn window_at(snapshot: &Snapshot, requested: u64) -> AppResult<SourceWindow> {
    let mut start = requested.min(snapshot.size);
    if start == snapshot.size && start > 0 {
        start -= 1;
    }
    let mut bytes = vec![0u8; WINDOW_BYTES + 4];
    let mut first = [0u8; 1];
    snapshot.file.read_at(&mut first, start).map_err(io_error)?;
    while start > 0 && first[0] & 0xc0 == 0x80 {
        start -= 1;
        snapshot.file.read_at(&mut first, start).map_err(io_error)?;
    }
    let amount = snapshot.file.read_at(&mut bytes, start).map_err(io_error)?;
    bytes.truncate(amount);
    let valid_end = match std::str::from_utf8(&bytes) {
        Ok(_) => bytes.len(),
        Err(error) if error.error_len().is_none() => error.valid_up_to(),
        Err(_) => return Err(AppError::new("encoding", "Snapshot has invalid UTF-8")),
    };
    bytes.truncate(valid_end);
    let line_number = 1 + line_at(snapshot, start)?;
    Ok(SourceWindow {
        start_byte: start,
        end_byte: start + bytes.len() as u64,
        size_bytes: snapshot.size,
        line_number,
        text: String::from_utf8(bytes)
            .map_err(|_| AppError::new("encoding", "Invalid snapshot text"))?,
    })
}

fn confirm_current(state: &AppState, snapshot: &Snapshot) -> AppResult<()> {
    let (_, current) = selected_file(state, Some(&snapshot.file_id), None, None)?;
    if stamp(&current)? != snapshot.source_stamp {
        return Err(AppError::new(
            "unstable",
            "Source changed after the verified snapshot",
        ));
    }
    Ok(())
}

fn line_at(snapshot: &Snapshot, position: u64) -> AppResult<u64> {
    let partition = snapshot
        .byte_line_index
        .partition_point(|(offset, _)| *offset <= position)
        .saturating_sub(1);
    let (mut offset, mut count) = snapshot.byte_line_index[partition];
    let mut buffer = [0u8; 64 * 1024];
    while offset < position {
        let wanted = buffer.len().min((position - offset) as usize);
        let amount = snapshot
            .file
            .read_at(&mut buffer[..wanted], offset)
            .map_err(io_error)?;
        if amount == 0 {
            break;
        }
        count += buffer[..amount]
            .iter()
            .filter(|byte| **byte == b'\n')
            .count() as u64;
        offset += amount as u64;
    }
    Ok(count)
}

fn offset_for_line(snapshot: &Snapshot, line: u64) -> AppResult<u64> {
    if line == 0 || line > snapshot.line_count {
        return Err(AppError::new("invalid_line", "Line is outside this source"));
    }
    let group = ((line - 1) / INDEX_INTERVAL) as usize;
    let mut offset = snapshot.sparse_lines[group];
    let mut remaining = (line - 1) % INDEX_INTERVAL;
    let mut buffer = [0u8; 64 * 1024];
    while remaining > 0 && offset < snapshot.size {
        let amount = snapshot
            .file
            .read_at(&mut buffer, offset)
            .map_err(io_error)?;
        if amount == 0 {
            break;
        }
        for (index, byte) in buffer[..amount].iter().enumerate() {
            if *byte == b'\n' {
                remaining -= 1;
                if remaining == 0 {
                    return Ok(offset + index as u64 + 1);
                }
            }
        }
        offset += amount as u64;
    }
    if remaining == 0 {
        Ok(offset)
    } else {
        Err(AppError::new("invalid_line", "Line index is incomplete"))
    }
}

#[tauri::command]
pub async fn source_line_offset(
    state: tauri::State<'_, AppState>,
    snapshots: tauri::State<'_, LargeSourceState>,
    snapshot_id: String,
    line: u64,
) -> AppResult<u64> {
    let state = state.inner().clone();
    let snapshots = snapshots.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let snapshot = snapshots
            .snapshots
            .lock()
            .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?;
        let snapshot = snapshot
            .get(&snapshot_id)
            .cloned()
            .ok_or_else(|| AppError::new("snapshot_missing", "Large source needs reloading"))?;
        confirm_current(&state, &snapshot)?;
        offset_for_line(&snapshot, line)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn find_after(
    file: &File,
    size: u64,
    query: &[u8],
    after: u64,
    cancelled: impl Fn() -> bool,
    mut progress: impl FnMut(u64, u64),
) -> AppResult<Option<u64>> {
    if query.is_empty() || query.len() > 4096 {
        return Err(AppError::new(
            "invalid_query",
            "Find text must be 1 to 4096 bytes",
        ));
    }
    let mut prefix = vec![0usize; query.len()];
    for index in 1..query.len() {
        let mut matched = prefix[index - 1];
        while matched > 0 && query[index] != query[matched] {
            matched = prefix[matched - 1];
        }
        if query[index] == query[matched] {
            matched += 1;
        }
        prefix[index] = matched;
    }
    let mut offset = after.min(size);
    progress(0, size.saturating_sub(offset));
    let start = offset;
    let mut buffer = [0u8; WINDOW_BYTES];
    let mut matched = 0usize;
    while offset < size {
        if cancelled() {
            return Err(AppError::new("cancelled", "Source Find was cancelled"));
        }
        let wanted = buffer.len().min((size - offset) as usize);
        let amount = file
            .read_at(&mut buffer[..wanted], offset)
            .map_err(io_error)?;
        if amount == 0 {
            break;
        }
        for (index, byte) in buffer[..amount].iter().enumerate() {
            while matched > 0 && query[matched] != *byte {
                matched = prefix[matched - 1];
            }
            if query[matched] == *byte {
                matched += 1;
            }
            if matched == query.len() {
                if cancelled() {
                    return Err(AppError::new("cancelled", "Source Find was cancelled"));
                }
                return Ok(Some(offset + index as u64 + 1 - query.len() as u64));
            }
        }
        offset += amount as u64;
        if (offset - start) / (1024 * 1024) != (offset - start - amount as u64) / (1024 * 1024)
            || offset == size
        {
            progress(offset - start, size - start);
        }
    }
    if cancelled() {
        return Err(AppError::new("cancelled", "Source Find was cancelled"));
    }
    Ok(None)
}

#[tauri::command]
pub async fn find_large_source(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    snapshots: tauri::State<'_, LargeSourceState>,
    snapshot_id: String,
    query: String,
    after_offset: u64,
    request_id: u64,
) -> AppResult<Option<u64>> {
    let state = state.inner().clone();
    let snapshots = snapshots.inner().clone();
    let epoch = snapshots.find_epoch.fetch_add(1, Ordering::SeqCst) + 1;
    tauri::async_runtime::spawn_blocking(move || {
        let snapshot = {
            let store = snapshots
                .snapshots
                .lock()
                .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?;
            store
                .get(&snapshot_id)
                .cloned()
                .ok_or_else(|| AppError::new("snapshot_missing", "Large source needs reloading"))?
        };
        confirm_current(&state, &snapshot)?;
        let found = find_after(
            &snapshot.file,
            snapshot.size,
            query.as_bytes(),
            after_offset,
            || snapshots.find_epoch.load(Ordering::SeqCst) != epoch,
            |scanned_bytes, total_bytes| {
                let _ = app.emit(
                    "large-source:find_progress",
                    FindProgress {
                        snapshot_id: snapshot_id.clone(),
                        request_id,
                        scanned_bytes,
                        total_bytes,
                    },
                );
            },
        )?;
        confirm_current(&state, &snapshot)?;
        if snapshots.find_epoch.load(Ordering::SeqCst) != epoch {
            return Err(AppError::new("cancelled", "Source Find was cancelled"));
        }
        Ok(found)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub fn cancel_large_find(snapshots: tauri::State<'_, LargeSourceState>) {
    snapshots.find_epoch.fetch_add(1, Ordering::SeqCst);
}

fn copy_range(snapshot: &Snapshot, start: u64, end: u64) -> AppResult<String> {
    if end < start || end > snapshot.size || end - start > MAX_COPY_BYTES {
        return Err(AppError::new(
            "copy_limit",
            "Select no more than 1 MiB to copy",
        ));
    }
    let mut bytes = vec![0u8; (end - start) as usize];
    let mut read = 0usize;
    while read < bytes.len() {
        let amount = snapshot
            .file
            .read_at(&mut bytes[read..], start + read as u64)
            .map_err(io_error)?;
        if amount == 0 {
            return Err(AppError::new("unstable", "Snapshot ended during copy"));
        }
        read += amount;
    }
    String::from_utf8(bytes)
        .map_err(|_| AppError::new("invalid_selection", "Copy range splits a UTF-8 character"))
}

#[tauri::command]
pub async fn copy_source_selection(
    state: tauri::State<'_, AppState>,
    snapshots: tauri::State<'_, LargeSourceState>,
    snapshot_id: String,
    start_byte: u64,
    end_byte: u64,
) -> AppResult<String> {
    let state = state.inner().clone();
    let snapshots = snapshots.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let snapshot = snapshots
            .snapshots
            .lock()
            .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?
            .get(&snapshot_id)
            .cloned()
            .ok_or_else(|| AppError::new("snapshot_missing", "Large source needs reloading"))?;
        confirm_current(&state, &snapshot)?;
        let text = copy_range(&snapshot, start_byte, end_byte)?;
        confirm_current(&state, &snapshot)?;
        Ok(text)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub async fn read_source_window(
    state: tauri::State<'_, AppState>,
    snapshots: tauri::State<'_, LargeSourceState>,
    snapshot_id: String,
    offset: u64,
) -> AppResult<SourceWindow> {
    let state = state.inner().clone();
    let snapshots = snapshots.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let snapshot = snapshots
            .snapshots
            .lock()
            .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?;
        let snapshot = snapshot
            .get(&snapshot_id)
            .cloned()
            .ok_or_else(|| AppError::new("snapshot_missing", "Large source needs reloading"))?;
        confirm_current(&state, &snapshot)?;
        let window = window_at(&snapshot, offset)?;
        confirm_current(&state, &snapshot)?;
        Ok(window)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub fn close_large_source(
    snapshots: tauri::State<'_, LargeSourceState>,
    snapshot_id: String,
) -> AppResult<()> {
    let mut store = snapshots
        .snapshots
        .lock()
        .map_err(|_| AppError::new("internal", "Large source state is unavailable"))?;
    store.remove(&snapshot_id);
    snapshots.find_epoch.fetch_add(1, Ordering::SeqCst);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::OpenOptions;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::FileExt;

    #[test]
    fn snapshot_50_mib_boundary_and_utf8_windows_without_source_writes() {
        let dir = std::env::temp_dir().join(format!("md-reader-large-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let source = dir.join("large.md");
        let bytes = "é\n".repeat((MAX_DOCUMENT_BYTES / 3) + 100);
        fs::write(&source, bytes.as_bytes()).unwrap();
        let before = fs::read(&source).unwrap();
        let input = open_selected(&source, false).unwrap();
        let mut progress = Vec::new();
        let snapshot = snapshot_into(
            &dir,
            "fixture".into(),
            &input,
            || false,
            |done, total| progress.push((done, total)),
        )
        .unwrap();
        assert_eq!(
            progress.last().copied(),
            Some((snapshot.size, snapshot.size))
        );
        assert!(progress.windows(2).all(|pair| pair[0].0 < pair[1].0));
        assert_eq!(snapshot.size, before.len() as u64);
        assert_eq!(snapshot.line_count, bytes.matches('\n').count() as u64 + 1);
        assert_eq!(offset_for_line(&snapshot, 513).unwrap(), 512 * 3);
        assert_eq!(
            find_after(
                &snapshot.file,
                snapshot.size,
                "é\n".as_bytes(),
                snapshot.size - 100,
                || false,
                |_, _| {}
            )
            .unwrap(),
            Some(snapshot.size - 99)
        );
        assert_eq!(
            find_after(
                &snapshot.file,
                snapshot.size,
                &vec![b'x'; 4096],
                snapshot.size - 1,
                || false,
                |_, _| {}
            )
            .unwrap(),
            None
        );
        assert_eq!(
            find_after(
                &snapshot.file,
                snapshot.size,
                b"missing",
                0,
                || true,
                |_, _| {}
            )
            .unwrap_err()
            .code,
            "cancelled"
        );
        let mut find_progress = Vec::new();
        assert_eq!(
            find_after(
                &snapshot.file,
                snapshot.size,
                b"absent text",
                0,
                || false,
                |scanned, total| find_progress.push((scanned, total))
            )
            .unwrap(),
            None
        );
        assert_eq!(find_progress.first().copied(), Some((0, snapshot.size)));
        assert_eq!(
            find_progress.last().copied(),
            Some((snapshot.size, snapshot.size))
        );
        assert_eq!(
            find_after(
                &snapshot.file,
                snapshot.size,
                "é".as_bytes(),
                0,
                || false,
                |_, _| {}
            )
            .unwrap(),
            Some(0)
        );
        assert_eq!(
            copy_range(&snapshot, 0, MAX_COPY_BYTES + 1)
                .unwrap_err()
                .code,
            "copy_limit"
        );
        assert_eq!(copy_range(&snapshot, 0, 2).unwrap(), "é");
        assert_eq!(
            copy_range(&snapshot, 0, 1).unwrap_err().code,
            "invalid_selection"
        );
        let middle = window_at(&snapshot, 65_535).unwrap();
        assert!(middle.text.starts_with('é') || middle.text.starts_with('\n'));
        assert!(middle.end_byte <= snapshot.size);
        let end = window_at(&snapshot, snapshot.size - 10).unwrap();
        assert_eq!(end.end_byte, snapshot.size);
        assert_eq!(fs::read(&source).unwrap(), before);
        drop(snapshot);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn size_and_invalid_utf8_fail_without_leaving_snapshot() {
        let dir = std::env::temp_dir().join(format!("md-reader-large-bad-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let source = dir.join("bad.md");
        let mut bytes = vec![b'a'; MAX_DOCUMENT_BYTES + 1];
        bytes[300_000] = 0xff;
        fs::write(&source, &bytes).unwrap();
        let file = open_selected(&source, false).unwrap();
        let checks = std::cell::Cell::new(0usize);
        assert_eq!(
            snapshot_into(
                &dir,
                "cancel".into(),
                &file,
                || {
                    checks.set(checks.get() + 1);
                    checks.get() > 2
                },
                |_, _| {}
            )
            .err()
            .unwrap()
            .code,
            "cancelled"
        );
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        assert_eq!(
            snapshot_into(&dir, "bad".into(), &file, || false, |_, _| {})
                .err()
                .unwrap()
                .code,
            "encoding"
        );
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        let oversized = dir.join("over.md");
        let handle = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&oversized)
            .unwrap();
        handle.set_len(MAX_SOURCE_BYTES + 1).unwrap();
        let large = open_selected(&oversized, false).unwrap();
        assert_eq!(
            snapshot_into(&dir, "over".into(), &large, || false, |_, _| {})
                .err()
                .unwrap()
                .code,
            "source_limit"
        );
        let rich = dir.join("rich.md");
        let handle = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&rich)
            .unwrap();
        handle.set_len(MAX_DOCUMENT_BYTES as u64).unwrap();
        let eligible = open_selected(&rich, false).unwrap();
        assert_eq!(
            snapshot_into(&dir, "rich".into(), &eligible, || false, |_, _| {})
                .err()
                .unwrap()
                .code,
            "source_mode_unneeded"
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn changed_source_invalidates_verified_windows() {
        let dir = std::env::temp_dir().join(format!("md-reader-large-change-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let source = dir.join("large.md");
        fs::write(&source, vec![b'a'; MAX_DOCUMENT_BYTES + 1]).unwrap();
        let state = AppState::default();
        let root = state.register_root(&dir).unwrap();
        let (grant, input) = selected_file(
            &state,
            None,
            Some(&root.id),
            Some(vec!["large.md".to_string()]),
        )
        .unwrap();
        let snapshot = snapshot_into(&dir, grant.id, &input, || false, |_, _| {}).unwrap();
        assert!(confirm_current(&state, &snapshot).is_ok());
        let writer = OpenOptions::new().write(true).open(&source).unwrap();
        #[cfg(target_os = "macos")]
        writer.write_all_at(b"changed", 0).unwrap();
        #[cfg(target_os = "windows")]
        std::os::windows::fs::FileExt::seek_write(&writer, b"changed", 0).unwrap();
        writer.sync_all().unwrap();
        assert_eq!(
            confirm_current(&state, &snapshot).unwrap_err().code,
            "unstable"
        );
        drop(snapshot);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn fifty_mib_single_line_reaches_the_final_byte() {
        let dir = std::env::temp_dir().join(format!("md-reader-large-50m-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let source = dir.join("fifty.md");
        let mut writer = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&source)
            .unwrap();
        let block = [b'a'; 64 * 1024];
        for _ in 0..(MAX_SOURCE_BYTES as usize / block.len()) {
            writer.write_all(&block).unwrap();
        }
        writer.sync_all().unwrap();
        drop(writer);
        let input = open_selected(&source, false).unwrap();
        let snapshot = snapshot_into(&dir, "fifty".into(), &input, || false, |_, _| {}).unwrap();
        assert_eq!(snapshot.size, MAX_SOURCE_BYTES);
        assert_eq!(snapshot.line_count, 1);
        crate::platform::storage::verify_private_file(&snapshot.file).unwrap();
        assert!(snapshot.byte_line_index.len() <= 51);
        let last = window_at(&snapshot, MAX_SOURCE_BYTES - 1).unwrap();
        assert_eq!(last.end_byte, MAX_SOURCE_BYTES);
        assert_eq!(last.text, "a");
        assert_eq!(offset_for_line(&snapshot, 1).unwrap(), 0);
        drop(snapshot);
        assert_eq!(fs::metadata(&source).unwrap().len(), MAX_SOURCE_BYTES);
        fs::remove_dir_all(dir).unwrap();
    }
}
