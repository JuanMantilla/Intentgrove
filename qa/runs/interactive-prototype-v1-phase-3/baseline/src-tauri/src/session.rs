use crate::recovery::private_storage_dir;
use crate::scope::{open_relative, open_selected, validate_segment, AppError, AppResult, Identity};
use crate::state::{AppState, FileSource};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, State, Window};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

pub(crate) const MAX_SESSION_BYTES: usize = 2 * 1024 * 1024;
const MAX_TABS: usize = 100;
const MAX_EXPANDED_PATHS: usize = 1024;
const MAX_PATH_BYTES: usize = 4096;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredSelection {
    pub path: String,
    pub identity: Identity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub(crate) enum StoredTabSource {
    Root { segments: Vec<String> },
    Explicit { selection: StoredSelection },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReadingAnchor {
    pub heading_id: Option<String>,
    pub offset: f64,
    pub scroll_top: f64,
    pub viewport_width: f64,
    pub viewport_height: f64,
    pub content_version: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub html_zoom: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub html_scroll_left: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredTab {
    pub key: String,
    pub source: StoredTabSource,
    pub name: String,
    pub saved_disk_version: Option<String>,
    pub anchor: ReadingAnchor,
    #[serde(default, skip_serializing_if = "is_false")]
    pub editing_active: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub recovery_owner: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TreeState {
    pub expanded: Vec<Vec<String>>,
    pub selected: Option<Vec<String>>,
    pub scroll_top: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PanelState {
    pub sidebar_open: bool,
    pub sidebar_width: f64,
    pub outline_open: bool,
    pub outline_width: f64,
    pub reading_width: f64,
    #[serde(
        default = "default_reading_font",
        skip_serializing_if = "is_default_reading_font"
    )]
    pub reading_font: String,
    #[serde(
        default = "default_reading_size",
        skip_serializing_if = "is_default_reading_size"
    )]
    pub reading_size: f64,
    #[serde(
        default = "default_reading_line_height",
        skip_serializing_if = "is_default_reading_line_height"
    )]
    pub reading_line_height: f64,
    #[serde(
        default = "default_documents_and_images_only",
        skip_serializing_if = "is_true"
    )]
    pub documents_and_images_only: bool,
    // Keep schema1's canonical checksum byte-for-byte compatible when the
    // preference is absent/default. Restore IPC advertises Margin explicitly.
    #[serde(
        default,
        skip_serializing_if = "crate::settings::WorkspaceLayout::is_margin"
    )]
    pub workspace_layout: crate::settings::WorkspaceLayout,
}

fn default_documents_and_images_only() -> bool {
    true
}
fn is_true(value: &bool) -> bool {
    *value
}

fn default_reading_font() -> String {
    "roboto".to_owned()
}
fn default_reading_size() -> f64 {
    16.0
}
fn default_reading_line_height() -> f64 {
    1.6
}
fn is_default_reading_font(value: &String) -> bool {
    value == "roboto"
}
fn is_default_reading_size(value: &f64) -> bool {
    *value == 16.0
}
fn is_default_reading_line_height(value: &f64) -> bool {
    *value == 1.6
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct WindowBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub scale_factor: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SessionPayload {
    pub schema: u32,
    pub sequence: u64,
    pub completed_at_ms: u64,
    pub exit_disposition: String,
    pub root: Option<StoredSelection>,
    pub tabs: Vec<StoredTab>,
    pub active_key: Option<String>,
    pub tree: TreeState,
    pub panel: PanelState,
    pub window: Option<WindowBounds>,
}

#[derive(Serialize, Deserialize)]
struct SessionEnvelope {
    checksum: String,
    payload: SessionPayload,
}

fn session_error(code: &'static str, message: &'static str) -> AppError {
    AppError::new(code, message)
}

fn is_false(value: &bool) -> bool {
    !*value
}

fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn bounded_path(path: &str) -> bool {
    crate::platform::bounded_record_path(path, MAX_PATH_BYTES)
}

fn valid_segments(segments: &[String]) -> bool {
    !segments.is_empty()
        && segments
            .iter()
            .all(|segment| segment.len() <= 255 && validate_segment(segment).is_ok())
        && segments.iter().map(String::len).sum::<usize>() <= MAX_PATH_BYTES
}

fn valid_anchor(anchor: &ReadingAnchor) -> bool {
    anchor
        .html_zoom
        .is_none_or(|v| v.is_finite() && (0.5..=3.0).contains(&v))
        && anchor.html_scroll_left.is_none_or(|v| v.is_finite())
        && anchor.offset.is_finite()
        && anchor.scroll_top.is_finite()
        && anchor.viewport_width.is_finite()
        && anchor.viewport_height.is_finite()
        && anchor.scroll_top >= 0.0
        && anchor.viewport_width >= 0.0
        && anchor.viewport_height >= 0.0
        && anchor
            .heading_id
            .as_ref()
            .map_or(true, |value| value.len() <= 1024)
        && anchor
            .content_version
            .as_ref()
            .map_or(true, |value| value.len() <= 256)
}

pub(crate) fn validate(payload: &SessionPayload) -> AppResult<()> {
    if payload.schema != 1
        || payload.sequence == 0
        || payload.completed_at_ms == 0
        || !matches!(payload.exit_disposition.as_str(), "running" | "normal")
        || payload.tabs.len() > MAX_TABS
        || payload.tree.expanded.len() > MAX_EXPANDED_PATHS
    {
        return Err(session_error(
            "session_corrupt",
            "Session record failed validation",
        ));
    }
    if payload.tabs.iter().any(|t| {
        crate::scope::html_name(&t.name) && (t.editing_active || t.recovery_owner.is_some())
    }) {
        return Err(session_error(
            "session_corrupt",
            "HTML tabs cannot contain edit recovery state",
        ));
    }
    if payload
        .root
        .as_ref()
        .is_some_and(|root| !bounded_path(&root.path))
        || !payload.tree.scroll_top.is_finite()
        || payload.tree.scroll_top < 0.0
        || payload
            .tree
            .expanded
            .iter()
            .any(|path| !valid_segments(path))
        || payload
            .tree
            .selected
            .as_ref()
            .is_some_and(|path| !valid_segments(path))
    {
        return Err(session_error(
            "session_corrupt",
            "Session paths are invalid",
        ));
    }
    let panel = &payload.panel;
    if !panel.sidebar_width.is_finite()
        || !panel.outline_width.is_finite()
        || !panel.reading_width.is_finite()
        || !(160.0..=800.0).contains(&panel.sidebar_width)
        || !(160.0..=800.0).contains(&panel.outline_width)
        || !(320.0..=2000.0).contains(&panel.reading_width)
        || !matches!(
            panel.reading_font.as_str(),
            "roboto" | "serif" | "sans" | "mono"
        )
        || !panel.reading_size.is_finite()
        || !(12.0..=24.0).contains(&panel.reading_size)
        || !panel.reading_line_height.is_finite()
        || !(1.3..=2.2).contains(&panel.reading_line_height)
    {
        return Err(session_error(
            "session_corrupt",
            "Session layout is invalid",
        ));
    }
    if let Some(window) = &payload.window {
        if ![
            window.x,
            window.y,
            window.width,
            window.height,
            window.scale_factor,
        ]
        .iter()
        .all(|value| value.is_finite())
            || !(320.0..=10000.0).contains(&window.width)
            || !(240.0..=10000.0).contains(&window.height)
            || !(0.5..=8.0).contains(&window.scale_factor)
        {
            return Err(session_error(
                "session_corrupt",
                "Session window is invalid",
            ));
        }
    }
    let mut keys = HashSet::new();
    for tab in &payload.tabs {
        if tab.key.is_empty()
            || tab.key.len() > 128
            || !keys.insert(&tab.key)
            || tab.name.len() > MAX_PATH_BYTES
            || !valid_anchor(&tab.anchor)
            || tab
                .saved_disk_version
                .as_ref()
                .is_some_and(|value| value.len() > 256)
            || tab
                .recovery_owner
                .as_ref()
                .is_some_and(|value| Uuid::parse_str(value).is_err())
        {
            return Err(session_error("session_corrupt", "Session tab is invalid"));
        }
        match &tab.source {
            StoredTabSource::Root { segments }
                if payload.root.is_none() || !valid_segments(segments) =>
            {
                return Err(session_error(
                    "session_corrupt",
                    "Session tab scope is invalid",
                ))
            }
            StoredTabSource::Explicit { selection } if !bounded_path(&selection.path) => {
                return Err(session_error(
                    "session_corrupt",
                    "Session file path is invalid",
                ))
            }
            _ => {}
        }
    }
    if payload
        .active_key
        .as_ref()
        .is_some_and(|key| !keys.contains(key))
    {
        return Err(session_error(
            "session_corrupt",
            "Session active tab is invalid",
        ));
    }
    Ok(())
}

fn decode(bytes: &[u8]) -> AppResult<SessionPayload> {
    if bytes.len() > MAX_SESSION_BYTES {
        return Err(session_error("session_size", "Session record is too large"));
    }
    let envelope: SessionEnvelope = serde_json::from_slice(bytes)
        .map_err(|_| session_error("session_corrupt", "Session record is invalid"))?;
    let payload_bytes = serde_json::to_vec(&envelope.payload)
        .map_err(|_| session_error("session_corrupt", "Session record is invalid"))?;
    if hash(&payload_bytes) != envelope.checksum {
        return Err(session_error(
            "session_corrupt",
            "Session checksum is invalid",
        ));
    }
    validate(&envelope.payload)?;
    Ok(envelope.payload)
}

fn encode(payload: &SessionPayload) -> AppResult<Vec<u8>> {
    validate(payload)?;
    let raw = serde_json::to_vec(payload)
        .map_err(|_| session_error("session_error", "Could not encode session"))?;
    let bytes = serde_json::to_vec(&SessionEnvelope {
        checksum: hash(&raw),
        payload: payload.clone(),
    })
    .map_err(|_| session_error("session_error", "Could not encode session"))?;
    if bytes.len() > MAX_SESSION_BYTES {
        return Err(session_error("session_size", "Session record is too large"));
    }
    Ok(bytes)
}

fn read_bounded(path: &Path) -> AppResult<Option<Vec<u8>>> {
    let file = match open_selected(path, false) {
        Ok(file) => file,
        Err(error) if error.code == "missing" => return Ok(None),
        Err(error) => return Err(error),
    };
    #[cfg(target_os = "windows")]
    crate::platform::storage::verify_private_file(&file)?;
    let mut bytes = Vec::new();
    file.take((MAX_SESSION_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|error| AppError::new("session_error", error.to_string()))?;
    Ok(Some(bytes))
}

fn record_path(dir: &Path) -> PathBuf {
    dir.join("workspace.json")
}
fn previous_path(dir: &Path) -> PathBuf {
    dir.join("workspace.previous")
}

pub(crate) fn load_at(dir: &Path) -> AppResult<Option<SessionPayload>> {
    let current = read_bounded(&record_path(dir))?;
    if let Some(bytes) = current.as_ref() {
        if let Ok(payload) = decode(bytes) {
            return Ok(Some(payload));
        }
    }
    if let Some(bytes) = read_bounded(&previous_path(dir))? {
        if let Ok(payload) = decode(&bytes) {
            return Ok(Some(payload));
        }
    }
    if current.is_some() {
        Err(session_error(
            "session_corrupt",
            "No valid session checkpoint remains",
        ))
    } else {
        Ok(None)
    }
}

fn sync_dir(dir: &Path) -> AppResult<()> {
    crate::platform::storage::sync_private_directory(dir)
}

pub(crate) fn write_at(dir: &Path, payload: &SessionPayload) -> AppResult<()> {
    let bytes = encode(payload)?;
    if let Some(current) = load_at(dir)? {
        if current.sequence >= payload.sequence {
            return Err(session_error(
                "session_stale",
                "A newer session checkpoint exists",
            ));
        }
    }
    let temp = dir.join(format!(".{}.tmp", Uuid::new_v4()));
    let mut file = crate::platform::storage::create_private_file(&temp)?;
    let result = (|| {
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|error| AppError::new("session_error", error.to_string()))?;
        let current_path = record_path(dir);
        if let Some(previous_bytes) = read_bounded(&current_path)? {
            if decode(&previous_bytes).is_ok() {
                let previous = previous_path(dir);
                match crate::platform::storage::remove_private_file(&previous) {
                    Ok(()) => {}
                    Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                    Err(error) => return Err(AppError::new("session_error", error.to_string())),
                }
                crate::platform::storage::preserve_previous(&current_path, &previous)?;
                sync_dir(dir)?;
            }
        }
        crate::platform::storage::publish_private(&temp, &current_path)?;
        sync_dir(dir)
    })();
    if result.is_err() {
        let _ = crate::platform::storage::remove_private_file(&temp);
    }
    result
}

pub(crate) fn session_dir(app: &AppHandle) -> AppResult<PathBuf> {
    private_storage_dir(app, "session")
}

pub(crate) fn now_ms() -> AppResult<u64> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| session_error("session_error", "System clock is unavailable"))?
        .as_millis() as u64)
}

pub(crate) fn lock_store(dir: &Path) -> AppResult<crate::platform::storage::StorageLock> {
    crate::platform::storage::lock_private(
        &dir.join("workspace.lock"),
        "session_error",
        "session_permissions",
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointInput {
    sequence: u64,
    root_id: Option<String>,
    prior_root: bool,
    tabs: Vec<CheckpointTab>,
    active_key: Option<String>,
    tree: TreeState,
    panel: PanelState,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CheckpointTab {
    key: String,
    file_id: Option<String>,
    prior_key: Option<String>,
    root_segments: Option<Vec<String>>,
    anchor: ReadingAnchor,
    saved_disk_version: Option<String>,
    editing_active: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointAck {
    sequence: u64,
    completed_at_ms: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreRoot {
    id: Option<String>,
    name: String,
    display_path: String,
    generation: Option<u64>,
    error_code: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreTab {
    kind: &'static str,
    key: String,
    file_id: Option<String>,
    name: String,
    display_path: String,
    root_segments: Option<Vec<String>>,
    explicit_file: bool,
    anchor: ReadingAnchor,
    saved_disk_version: Option<String>,
    error_code: Option<&'static str>,
    editing_active: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResponse {
    sequence: u64,
    completed_at_ms: u64,
    exit_disposition: String,
    root: Option<RestoreRoot>,
    tabs: Vec<RestoreTab>,
    active_key: Option<String>,
    tree: TreeState,
    #[serde(serialize_with = "serialize_restored_panel")]
    panel: PanelState,
    window: Option<WindowBounds>,
}

// Storage omits default Margin for legacy checksum compatibility. IPC always
// includes the capability field, even for a legacy profile's default Margin.
fn serialize_restored_panel<S: serde::Serializer>(
    panel: &PanelState,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    let mut value = serde_json::to_value(panel).map_err(serde::ser::Error::custom)?;
    value["workspaceLayout"] =
        serde_json::to_value(panel.workspace_layout).map_err(serde::ser::Error::custom)?;
    value.serialize(serializer)
}

fn current_window(window: &Window) -> AppResult<Option<WindowBounds>> {
    let pos = window
        .outer_position()
        .map_err(|error| AppError::new("session_window", error.to_string()))?;
    let size = window
        .outer_size()
        .map_err(|error| AppError::new("session_window", error.to_string()))?;
    let scale_factor = window
        .scale_factor()
        .map_err(|error| AppError::new("session_window", error.to_string()))?;
    Ok(Some(WindowBounds {
        x: pos.x as f64,
        y: pos.y as f64,
        width: size.width as f64,
        height: size.height as f64,
        scale_factor,
    }))
}

fn restore_window(window: &Window, saved: &WindowBounds) -> AppResult<()> {
    use tauri::{PhysicalPosition, PhysicalSize};
    let monitors = window
        .available_monitors()
        .map_err(|error| AppError::new("session_window", error.to_string()))?;
    let Some(monitor) = monitors
        .iter()
        .find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            saved.x >= position.x as f64
                && saved.y >= position.y as f64
                && saved.x < (position.x as f64 + size.width as f64)
                && saved.y < (position.y as f64 + size.height as f64)
        })
        .or_else(|| monitors.first())
    else {
        return Ok(());
    };
    let position = &monitor.work_area().position;
    let size = &monitor.work_area().size;
    let width = saved
        .width
        .round()
        .clamp(320.0_f64.min(size.width as f64), size.width as f64) as u32;
    let height = saved
        .height
        .round()
        .clamp(240.0_f64.min(size.height as f64), size.height as f64) as u32;
    let x = saved.x.round().clamp(
        position.x as f64,
        position.x as f64 + size.width as f64 - width as f64,
    ) as i32;
    let y = saved.y.round().clamp(
        position.y as f64,
        position.y as f64 + size.height as f64 - height as f64,
    ) as i32;
    window
        .set_size(PhysicalSize::new(width, height))
        .map_err(|error| AppError::new("session_window", error.to_string()))?;
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| AppError::new("session_window", error.to_string()))
}

fn build_payload(
    app: &AppHandle,
    state: &AppState,
    window: &Window,
    input: CheckpointInput,
    previous: Option<&SessionPayload>,
    exit_disposition: &str,
) -> AppResult<SessionPayload> {
    let root = match input.root_id.as_ref() {
        Some(id) => {
            let grant = state.root_recorded(id)?;
            Some(StoredSelection {
                path: grant.path.to_string_lossy().into_owned(),
                identity: grant.identity,
            })
        }
        None if input.prior_root => previous.and_then(|record| record.root.clone()),
        None => None,
    };
    let mut tabs = Vec::with_capacity(input.tabs.len());
    for tab in input.tabs {
        if tab.editing_active
            && tab.file_id.as_ref().is_some_and(|id| {
                state
                    .file(id)
                    .is_ok_and(|g| crate::scope::html_name(&g.name))
            })
        {
            return Err(session_error(
                "unsupported_type",
                "HTML tabs never have editing or recovery state",
            ));
        }
        let recovery_owner = if tab.editing_active {
            if let Some(file_id) = &tab.file_id {
                crate::recovery::recovery_owner_at(app, &state.file(file_id)?.display_path)?
            } else {
                tab.prior_key.as_ref().and_then(|key| {
                    previous.and_then(|record| {
                        record
                            .tabs
                            .iter()
                            .find(|item| &item.key == key)
                            .and_then(|item| item.recovery_owner.clone())
                    })
                })
            }
        } else {
            None
        };
        let (source, name) = if let Some(file_id) = tab.file_id {
            let grant = state.file(&file_id)?;
            let source = match grant.source {
                FileSource::Root { root_id, segments } => {
                    if input.root_id.as_deref() != Some(root_id.as_str()) {
                        return Err(session_error(
                            "invalid_grant",
                            "Tab belongs to another folder",
                        ));
                    }
                    StoredTabSource::Root { segments }
                }
                FileSource::Explicit { path, .. } => StoredTabSource::Explicit {
                    selection: StoredSelection {
                        path: path.to_string_lossy().into_owned(),
                        identity: grant.identity,
                    },
                },
            };
            (source, grant.name)
        } else if let Some(segments) = tab.root_segments.as_ref() {
            if input.root_id.is_none() || !valid_segments(segments) {
                return Err(session_error(
                    "invalid_grant",
                    "Tab path is outside the selected folder",
                ));
            }
            (
                StoredTabSource::Root {
                    segments: segments.clone(),
                },
                segments.last().cloned().unwrap_or_default(),
            )
        } else {
            let prior_key = tab.prior_key.as_ref().ok_or_else(|| {
                session_error("invalid_grant", "Unrestored tab has no prior identity")
            })?;
            let prior = previous
                .and_then(|record| record.tabs.iter().find(|item| &item.key == prior_key))
                .ok_or_else(|| {
                    session_error("invalid_grant", "Unrestored tab is not in the session")
                })?;
            if matches!(&prior.source, StoredTabSource::Root { .. }) {
                let same_root = previous
                    .and_then(|record| record.root.as_ref())
                    .zip(root.as_ref())
                    .is_some_and(|(old, new)| old.path == new.path && old.identity == new.identity);
                if !same_root {
                    return Err(session_error(
                        "invalid_grant",
                        "Tab belongs to another folder",
                    ));
                }
            }
            (prior.source.clone(), prior.name.clone())
        };
        tabs.push(StoredTab {
            key: tab.key,
            source,
            name,
            saved_disk_version: tab.saved_disk_version,
            anchor: tab.anchor,
            editing_active: tab.editing_active,
            recovery_owner,
        });
    }
    let payload = SessionPayload {
        schema: 1,
        sequence: input.sequence,
        completed_at_ms: now_ms()?,
        exit_disposition: exit_disposition.into(),
        root,
        tabs,
        active_key: input.active_key,
        tree: input.tree,
        panel: input.panel,
        window: current_window(window)?,
    };
    validate(&payload)?;
    Ok(payload)
}

fn checkpoint_impl(
    app: &AppHandle,
    state: &AppState,
    window: &Window,
    input: CheckpointInput,
    disposition: &str,
) -> AppResult<CheckpointAck> {
    let dir = session_dir(app)?;
    let _lock = lock_store(&dir)?;
    let previous = load_at(&dir)?;
    let payload = build_payload(app, state, window, input, previous.as_ref(), disposition)?;
    write_at(&dir, &payload)?;
    Ok(CheckpointAck {
        sequence: payload.sequence,
        completed_at_ms: payload.completed_at_ms,
    })
}

#[tauri::command]
pub async fn checkpoint_workspace_session(
    app: AppHandle,
    state: State<'_, AppState>,
    window: Window,
    input: CheckpointInput,
) -> AppResult<CheckpointAck> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        checkpoint_impl(&app, &state, &window, input, "running")
    })
    .await
    .map_err(|error| AppError::new("session_error", error.to_string()))?
}

#[tauri::command]
pub async fn finish_workspace_session(
    app: AppHandle,
    state: State<'_, AppState>,
    window: Window,
    input: CheckpointInput,
) -> AppResult<CheckpointAck> {
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        checkpoint_impl(&app, &state, &window, input, "normal")
    })
    .await
    .map_err(|error| AppError::new("session_error", error.to_string()))?;
    if let Err(error) = &result {
        eprintln!(
            "finish_workspace_session failed: {}: {}",
            error.code, error.message
        );
    }
    result
}

#[tauri::command]
pub fn clear_workspace_session(
    app: AppHandle,
    editing: State<'_, crate::editing::EditingState>,
) -> AppResult<()> {
    if editing.has_sessions() {
        return Err(session_error(
            "draft_exists",
            "Finish open edits before clearing the session",
        ));
    }
    let dir = session_dir(&app)?;
    let _lock = lock_store(&dir)?;
    // Recovery records are removed first, so a failure cannot leave an orphaned
    // remembered workspace with an undisclosed draft cleanup failure.
    crate::recovery::clear_all_recovery(app, editing)?;
    for path in [record_path(&dir), previous_path(&dir)] {
        match crate::platform::storage::remove_private_file(&path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(AppError::new("session_error", error.to_string())),
        }
    }
    sync_dir(&dir)
}

fn selected_matches(saved: &StoredSelection, chosen: &Path, directory: bool) -> AppResult<bool> {
    let file = open_selected(chosen, directory)?;
    let chosen_identity = crate::scope::identity(&file)?;
    Ok(chosen == Path::new(&saved.path) || chosen_identity == saved.identity)
}

#[tauri::command]
pub async fn reselect_session_root(
    app: AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, crate::editing::EditingState>,
    refresh: State<'_, crate::refresh::RefreshService>,
) -> AppResult<Option<RestoreResponse>> {
    if editing.has_sessions() {
        return Err(session_error(
            "draft_exists",
            "Finish edits before replacing a folder grant",
        ));
    }
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| AppError::new("invalid_path", error.to_string()))?;
        let dir = session_dir(&app)?;
        let _lock = lock_store(&dir)?;
        let payload =
            load_at(&dir)?.ok_or_else(|| session_error("session_missing", "No session remains"))?;
        let saved = payload
            .root
            .as_ref()
            .ok_or_else(|| session_error("session_missing", "No folder was remembered"))?;
        if !selected_matches(saved, &path, true)? {
            return Err(session_error(
                "root_reselection_required",
                "Select the remembered folder or its replacement",
            ));
        }
        if path != Path::new(&saved.path) {
            for tab in &payload.tabs {
                if !tab.editing_active {
                    continue;
                }
                let StoredTabSource::Root { segments } = &tab.source else {
                    continue;
                };
                let owner = tab.recovery_owner.as_deref().ok_or_else(|| {
                    session_error("recovery_error", "Cannot safely identify this moved draft")
                })?;
                let old = Path::new(&saved.path).join(segments.join("/"));
                let new = path.join(segments.join("/"));
                crate::recovery::migrate_unloaded_owner(
                    &app,
                    &old.display().to_string(),
                    &new.display().to_string(),
                    owner,
                )?;
            }
        }
        let grant = state.register_root(&path)?;
        let _ = refresh.watch_root(&grant.id);
        let root = state.root(&grant.id)?;
        let mut tabs = Vec::with_capacity(payload.tabs.len());
        for tab in &payload.tabs {
            let (file_id, display_path, root_segments, explicit_file, error_code) = match &tab
                .source
            {
                StoredTabSource::Root { segments } => {
                    let display = path.join(segments.join("/")).to_string_lossy().into_owned();
                    match open_relative(&root.file, segments, false)
                        .and_then(|file| state.register_root_file(&root, segments.clone(), &file))
                    {
                        Ok(file) => (Some(file.id), display, Some(segments.clone()), false, None),
                        Err(error) => (
                            None,
                            display,
                            Some(segments.clone()),
                            false,
                            Some(error.code),
                        ),
                    }
                }
                StoredTabSource::Explicit { selection } => {
                    match state.restore_explicit_file(
                        Path::new(&selection.path),
                        selection.identity,
                        state.selection_epoch()?,
                    ) {
                        Ok(file) => (Some(file.id), file.display_path, None, true, None),
                        Err(error) => (None, selection.path.clone(), None, true, Some(error.code)),
                    }
                }
            };
            tabs.push(RestoreTab {
                kind: if crate::scope::html_name(&tab.name) {
                    "html"
                } else if crate::scope::image_format(&tab.name).is_some() {
                    "image"
                } else {
                    "markdown"
                },
                key: tab.key.clone(),
                file_id,
                name: tab.name.clone(),
                display_path,
                root_segments,
                explicit_file,
                anchor: tab.anchor.clone(),
                saved_disk_version: tab.saved_disk_version.clone(),
                error_code,
                editing_active: tab.editing_active,
            });
        }
        for file_id in state.explicit_file_ids()? {
            let _ = refresh.watch_explicit_file(&file_id);
        }
        Ok(Some(RestoreResponse {
            sequence: payload.sequence,
            completed_at_ms: payload.completed_at_ms,
            exit_disposition: payload.exit_disposition,
            root: Some(RestoreRoot {
                id: Some(grant.id),
                name: grant.name,
                display_path: grant.display_path,
                generation: Some(grant.generation),
                error_code: None,
            }),
            tabs,
            active_key: payload.active_key,
            tree: payload.tree,
            panel: payload.panel,
            window: payload.window,
        }))
    })
    .await
    .map_err(|error| AppError::new("session_error", error.to_string()))?
}

#[tauri::command]
pub async fn reselect_session_file(
    app: AppHandle,
    state: State<'_, AppState>,
    refresh: State<'_, crate::refresh::RefreshService>,
    key: String,
) -> AppResult<Option<crate::state::GrantInfo>> {
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app
            .dialog()
            .file()
            .add_filter(
                "Documents and images",
                &[
                    "md", "markdown", "html", "htm", "jpg", "jpeg", "png", "gif", "webp", "svg",
                    "bmp", "tif", "tiff", "heic", "heif",
                ],
            )
            .blocking_pick_file()
        else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| AppError::new("invalid_path", error.to_string()))?;
        let dir = session_dir(&app)?;
        let _lock = lock_store(&dir)?;
        let payload =
            load_at(&dir)?.ok_or_else(|| session_error("session_missing", "No session remains"))?;
        let tab = payload
            .tabs
            .iter()
            .find(|tab| tab.key == key)
            .ok_or_else(|| session_error("session_missing", "No file selection was remembered"))?;
        let StoredTabSource::Explicit { selection: saved } = &tab.source else {
            return Err(session_error(
                "session_missing",
                "No file selection was remembered",
            ));
        };
        if !selected_matches(saved, &path, false)? {
            return Err(session_error(
                "reselection_required",
                "Select the remembered file or its replacement",
            ));
        }
        if tab.editing_active && path != Path::new(&saved.path) {
            let owner = tab.recovery_owner.as_deref().ok_or_else(|| {
                session_error("recovery_error", "Cannot safely identify this moved draft")
            })?;
            crate::recovery::migrate_unloaded_owner(
                &app,
                &saved.path,
                &path.display().to_string(),
                owner,
            )?;
        }
        let grant = state.register_explicit_file(&path)?;
        let _ = refresh.watch_explicit_file(&grant.id);
        Ok(Some(grant))
    })
    .await
    .map_err(|error| AppError::new("session_error", error.to_string()))?
}

fn restore_impl(app: &AppHandle, state: &AppState) -> AppResult<Option<RestoreResponse>> {
    // A late response must never replace a workspace already chosen this run.
    if state.selection_epoch()? != 0 {
        return Err(session_error("session_busy", "A workspace is already open"));
    }
    let dir = session_dir(app)?;
    let _lock = lock_store(&dir)?;
    let Some(payload) = load_at(&dir)? else {
        return Ok(None);
    };
    let root = payload.root.as_ref().map(|saved| {
        match state.restore_root(Path::new(&saved.path), saved.identity) {
            Ok(grant) => RestoreRoot {
                id: Some(grant.id),
                name: grant.name,
                display_path: grant.display_path,
                generation: Some(grant.generation),
                error_code: None,
            },
            Err(error) => RestoreRoot {
                id: None,
                name: Path::new(&saved.path)
                    .file_name()
                    .map(|item| item.to_string_lossy().into_owned())
                    .unwrap_or_else(|| saved.path.clone()),
                display_path: saved.path.clone(),
                generation: None,
                error_code: Some(error.code),
            },
        }
    });
    let mut restore_epoch = if root.as_ref().and_then(|item| item.id.as_ref()).is_some() {
        1
    } else {
        0
    };
    if state.selection_epoch()? != restore_epoch {
        return Err(session_error(
            "cancelled",
            "Session restore was replaced by a new selection",
        ));
    }
    let restored_root = root
        .as_ref()
        .and_then(|item| item.id.as_ref())
        .and_then(|id| state.root(id).ok());
    let mut tabs = Vec::with_capacity(payload.tabs.len());
    for tab in &payload.tabs {
        let (file_id, display_path, root_segments, explicit_file, error_code) = match &tab.source {
            StoredTabSource::Root { segments } => {
                let display = payload
                    .root
                    .as_ref()
                    .map(|item| {
                        Path::new(&item.path)
                            .join(segments.join("/"))
                            .to_string_lossy()
                            .into_owned()
                    })
                    .unwrap_or_default();
                let result = restored_root
                    .as_ref()
                    .ok_or_else(|| {
                        session_error("root_reselection_required", "Folder needs reselection")
                    })
                    .and_then(|root| {
                        open_relative(&root.file, segments, false).and_then(|file| {
                            state.register_root_file(root, segments.clone(), &file)
                        })
                    });
                match result {
                    Ok(grant) => (Some(grant.id), display, Some(segments.clone()), false, None),
                    Err(error) => (
                        None,
                        display,
                        Some(segments.clone()),
                        false,
                        Some(error.code),
                    ),
                }
            }
            StoredTabSource::Explicit { selection } => {
                match state.restore_explicit_file(
                    Path::new(&selection.path),
                    selection.identity,
                    restore_epoch,
                ) {
                    Ok(grant) => {
                        restore_epoch = restore_epoch.wrapping_add(1);
                        (Some(grant.id), grant.display_path, None, true, None)
                    }
                    Err(error) if error.code == "cancelled" => return Err(error),
                    Err(error) => (None, selection.path.clone(), None, true, Some(error.code)),
                }
            }
        };
        tabs.push(RestoreTab {
            kind: if crate::scope::html_name(&tab.name) {
                "html"
            } else if crate::scope::image_format(&tab.name).is_some() {
                "image"
            } else {
                "markdown"
            },
            key: tab.key.clone(),
            file_id,
            name: tab.name.clone(),
            display_path,
            root_segments,
            explicit_file,
            anchor: tab.anchor.clone(),
            saved_disk_version: tab.saved_disk_version.clone(),
            error_code,
            editing_active: tab.editing_active,
        });
    }
    if state.selection_epoch()? != restore_epoch {
        return Err(session_error(
            "cancelled",
            "Session restore was replaced by a new selection",
        ));
    }
    Ok(Some(RestoreResponse {
        sequence: payload.sequence,
        completed_at_ms: payload.completed_at_ms,
        exit_disposition: payload.exit_disposition,
        root,
        tabs,
        active_key: payload.active_key,
        tree: payload.tree,
        panel: payload.panel,
        window: payload.window,
    }))
}

#[tauri::command]
pub async fn load_workspace_session(
    app: AppHandle,
    state: State<'_, AppState>,
    refresh: State<'_, crate::refresh::RefreshService>,
    window: Window,
) -> AppResult<Option<RestoreResponse>> {
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    let restored = tauri::async_runtime::spawn_blocking(move || restore_impl(&app, &state))
        .await
        .map_err(|error| AppError::new("session_error", error.to_string()))??;
    if let Some(saved) = restored.as_ref() {
        if let Some(root_id) = saved.root.as_ref().and_then(|root| root.id.as_ref()) {
            let _ = refresh.watch_root(root_id);
        }
        for tab in &saved.tabs {
            if tab.explicit_file {
                if let Some(file_id) = tab.file_id.as_ref() {
                    let _ = refresh.watch_explicit_file(file_id);
                }
            }
        }
    }
    if let Some(bounds) = restored.as_ref().and_then(|saved| saved.window.as_ref()) {
        let _ = restore_window(&window, bounds);
    }
    Ok(restored)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scope::identity;
    use crate::state::AppState;
    use std::fs;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::symlink;

    fn sample(sequence: u64) -> SessionPayload {
        SessionPayload {
            schema: 1,
            sequence,
            completed_at_ms: 1234,
            exit_disposition: "running".into(),
            root: Some(StoredSelection {
                path: std::env::temp_dir().join("fixture").display().to_string(),
                identity: Identity {
                    device: 1,
                    inode: 2,
                },
            }),
            tabs: vec![StoredTab {
                key: "one".into(),
                source: StoredTabSource::Root {
                    segments: vec!["README.md".into()],
                },
                name: "README.md".into(),
                saved_disk_version: None,
                anchor: ReadingAnchor {
                    heading_id: None,
                    offset: 0.0,
                    scroll_top: 10.0,
                    viewport_width: 800.0,
                    viewport_height: 600.0,
                    content_version: None,
                    html_zoom: None,
                    html_scroll_left: None,
                },
                editing_active: false,
                recovery_owner: None,
            }],
            active_key: Some("one".into()),
            tree: TreeState {
                expanded: vec![],
                selected: None,
                scroll_top: 0.0,
            },
            panel: PanelState {
                sidebar_open: true,
                sidebar_width: 260.0,
                outline_open: false,
                outline_width: 220.0,
                reading_width: 760.0,
                reading_font: default_reading_font(),
                reading_size: default_reading_size(),
                reading_line_height: default_reading_line_height(),
                documents_and_images_only: true,
                workspace_layout: crate::settings::WorkspaceLayout::Margin,
            },
            window: None,
        }
    }

    #[test]
    fn workspace_layout_durable_roundtrip_legacy_checksum_and_failed_write() {
        use crate::settings::WorkspaceLayout;
        let dir = std::env::temp_dir().join(format!("intentgrove-layout-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        assert!(load_at(&dir).unwrap().is_none());
        let mut payload = sample(1);
        payload.tabs[0].editing_active = true;
        payload.tabs[0].recovery_owner = Some(Uuid::new_v4().to_string());
        let original = serde_json::to_value(&payload).unwrap();
        // Exact pre-extension schema1 bytes: default serialization must not
        // insert a field and invalidate the original checksum.
        let legacy = encode(&payload).unwrap();
        assert!(!String::from_utf8_lossy(&legacy).contains("workspaceLayout"));
        fs::write(record_path(&dir), &legacy).unwrap();
        assert_eq!(
            load_at(&dir).unwrap().unwrap().panel.workspace_layout,
            WorkspaceLayout::Margin
        );
        for layout in [
            WorkspaceLayout::Folio,
            WorkspaceLayout::Atlas,
            WorkspaceLayout::Margin,
        ] {
            payload.sequence += 1;
            payload.panel.workspace_layout = layout;
            write_at(&dir, &payload).unwrap();
            // Fresh read/decode through the real platform storage adapter.
            let restored = load_at(&dir).unwrap().unwrap();
            assert_eq!(restored.panel.workspace_layout, layout);
            let mut neutral = restored.clone();
            neutral.sequence = 1;
            neutral.panel.workspace_layout = WorkspaceLayout::Margin;
            assert_eq!(serde_json::to_value(neutral).unwrap(), original);
            #[derive(Serialize)]
            struct Wire<'a> {
                #[serde(serialize_with = "serialize_restored_panel")]
                panel: &'a PanelState,
            }
            let wire = serde_json::to_value(Wire {
                panel: &restored.panel,
            })
            .unwrap();
            assert_eq!(
                wire["panel"]["workspaceLayout"],
                serde_json::to_value(layout).unwrap()
            );
        }
        // A real adapter failure cannot replace the completed checkpoint.
        fs::remove_file(previous_path(&dir)).unwrap();
        fs::create_dir(previous_path(&dir)).unwrap();
        payload.sequence += 1;
        payload.panel.workspace_layout = WorkspaceLayout::Atlas;
        assert!(write_at(&dir, &payload).is_err());
        assert_eq!(
            load_at(&dir).unwrap().unwrap().panel.workspace_layout,
            WorkspaceLayout::Margin
        );
        fs::remove_dir(previous_path(&dir)).unwrap();
        write_at(&dir, &payload).unwrap();
        assert_eq!(
            load_at(&dir).unwrap().unwrap().panel.workspace_layout,
            WorkspaceLayout::Atlas
        );
        let raw = String::from_utf8(encode(&payload).unwrap()).unwrap();
        assert!(decode(raw.replace("\"atlas\"", "\"unknown\"").as_bytes()).is_err());
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn recorded_selection_paths_are_bounded_without_rewriting() {
        #[cfg(target_os = "macos")]
        let paths = ["/private/tmp/Café space/Read.MD", "/tmp/back\\slash.md"];
        #[cfg(target_os = "windows")]
        let paths = [r"C:\Café space\Read.MD", r"\\?\c:\Café space\Read.MD"];
        for path in paths {
            let mut payload = sample(1);
            payload.root.as_mut().unwrap().path = path.into();
            payload.tabs[0].source = StoredTabSource::Explicit {
                selection: StoredSelection {
                    path: path.into(),
                    identity: Identity {
                        device: u64::MAX,
                        inode: u64::MAX - 1,
                    },
                },
            };
            let decoded = decode(&encode(&payload).unwrap()).unwrap();
            assert_eq!(decoded.root.unwrap().path, path);
            let StoredTabSource::Explicit { selection } = &decoded.tabs[0].source else {
                panic!("explicit selection lost")
            };
            assert_eq!(selection.path, path);
            assert_eq!(selection.identity.inode, u64::MAX - 1);
        }
        for path in ["", "relative.md", "bad\0path"] {
            assert!(!bounded_path(path));
        }
        assert!(!bounded_path(&"x".repeat(MAX_PATH_BYTES + 1)));
        #[cfg(target_os = "macos")]
        let (prefix, separator) = ("/", "/");
        #[cfg(target_os = "windows")]
        let (prefix, separator) = ("C:\\", "\\");
        let within_bound = format!("{prefix}{}", vec!["a".repeat(240); 16].join(separator));
        assert!(bounded_path(&within_bound));
        let above_bound = format!("{prefix}{}", vec!["a".repeat(240); 18].join(separator));
        assert!(!bounded_path(&above_bound));
        #[cfg(target_os = "windows")]
        for path in [
            "/tmp/file",
            r"C:relative",
            r"\\server\share",
            r"\\.\pipe\x",
            r"C:\a:stream",
            r"C:\a\..\x",
            r"C:\NUL.md",
        ] {
            let mut payload = sample(1);
            payload.root.as_mut().unwrap().path = path.into();
            assert!(encode(&payload).is_err(), "{path}");
        }
    }

    #[test]
    fn rejects_bad_scope_and_layout() {
        let mut state = sample(1);
        state.tabs[0].source = StoredTabSource::Root {
            segments: vec!["..".into()],
        };
        assert!(validate(&state).is_err());
        state.tabs[0].source = StoredTabSource::Root {
            segments: vec!["README.md".into()],
        };
        state.panel.sidebar_width = f64::NAN;
        assert!(validate(&state).is_err());
    }

    #[test]
    fn reading_settings_are_bounded_and_older_panels_restore_defaults() {
        let mut state = sample(1);
        state.panel.reading_font = "serif".into();
        state.panel.reading_size = 18.0;
        state.panel.reading_line_height = 1.8;
        assert!(validate(&state).is_ok());
        assert_eq!(
            decode(&encode(&state).unwrap()).unwrap().panel.reading_font,
            "serif"
        );
        state.panel.reading_font = "script".into();
        assert!(validate(&state).is_err());
        state.panel.reading_font = "roboto".into();
        state.panel.reading_size = 25.0;
        assert!(validate(&state).is_err());
        state.panel.reading_size = 16.0;
        state.panel.reading_line_height = f64::NAN;
        assert!(validate(&state).is_err());

        let raw = serde_json::to_vec(&sample(2)).unwrap();
        assert!(!String::from_utf8_lossy(&raw).contains("readingFont"));
        let bytes = serde_json::to_vec(&serde_json::json!({
            "checksum": hash(&raw), "payload": serde_json::from_slice::<serde_json::Value>(&raw).unwrap()
        })).unwrap();
        let restored = decode(&bytes).unwrap();
        assert_eq!(restored.panel.reading_font, "roboto");
        assert_eq!(restored.panel.reading_size, 16.0);
        assert_eq!(restored.panel.reading_line_height, 1.6);
        assert!(restored.panel.documents_and_images_only);
    }

    #[test]
    fn tree_filter_roundtrip_is_backward_compatible_and_preserves_workspace_and_drafts() {
        let mut payload = sample(3);
        payload.tabs[0].editing_active = true;
        payload.tabs[0].recovery_owner = Some(Uuid::new_v4().to_string());
        payload.tree.expanded = vec![vec!["docs".into()]];
        let original = serde_json::to_value(&payload).unwrap();
        assert!(original["panel"].get("documentsAndImagesOnly").is_none());
        let legacy = decode(&encode(&payload).unwrap()).unwrap();
        assert!(legacy.panel.documents_and_images_only);
        payload.panel.documents_and_images_only = false;
        let mut restored = decode(&encode(&payload).unwrap()).unwrap();
        assert!(!restored.panel.documents_and_images_only);
        restored.panel.documents_and_images_only = true;
        assert_eq!(serde_json::to_value(&restored).unwrap(), original);
        // Bool type is enforced even when an attacker recomputes the checksum.
        let mut malformed = original.clone();
        malformed["panel"]["documentsAndImagesOnly"] = "true".into();
        let raw = serde_json::to_vec(&malformed).unwrap();
        let envelope = serde_json::to_vec(
            &serde_json::json!({ "checksum": hash(&raw), "payload": malformed }),
        )
        .unwrap();
        assert!(decode(&envelope).is_err());
    }

    #[test]
    fn saved_draft_owner_survives_session_serialization() {
        let mut state = sample(1);
        let owner = Uuid::new_v4().to_string();
        state.tabs[0].editing_active = true;
        state.tabs[0].recovery_owner = Some(owner.clone());
        let encoded = encode(&state).unwrap();
        let decoded = decode(&encoded).unwrap();
        assert_eq!(
            decoded.tabs[0].recovery_owner.as_deref(),
            Some(owner.as_str())
        );
    }

    #[test]
    fn prior_valid_checkpoint_survives_corrupt_current() {
        let dir = std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        write_at(&dir, &sample(1)).unwrap();
        write_at(&dir, &sample(2)).unwrap();
        fs::write(record_path(&dir), b"invalid").unwrap();
        assert_eq!(load_at(&dir).unwrap().unwrap().sequence, 1);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn stale_sequence_never_replaces_current() {
        let dir = std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        write_at(&dir, &sample(3)).unwrap();
        assert_eq!(
            write_at(&dir, &sample(2)).unwrap_err().code,
            "session_stale"
        );
        assert_eq!(load_at(&dir).unwrap().unwrap().sequence, 3);
        fs::remove_dir_all(dir).unwrap();
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_private_initialization_precedes_webview_directory_creation() {
        let fixture = crate::platform::test_support::FixtureDir::new("qa0003-window-storage");
        let base = fixture.join("app-local");
        crate::platform::storage::ensure_private_dir(&base).unwrap();
        let dir = base.join("session");
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        // Tauri prepare_webview creates this same directory with create_dir_all.
        // It must be a no-op after our protected first creation.
        fs::create_dir_all(&base).unwrap();
        crate::platform::storage::ensure_private_dir(&base).unwrap();
        let mut payload = sample(1);
        {
            let _lock = lock_store(&dir).unwrap();
            write_at(&dir, &payload).unwrap();
        }
        payload.sequence = 2;
        payload.exit_disposition = "normal".into();
        {
            let _lock = lock_store(&dir).unwrap();
            write_at(&dir, &payload).unwrap();
        }
        // Reopen the store as on restart; normal disposition is acknowledged
        // only after publication. A corrupt latest record retains running state.
        let restored = load_at(&dir).unwrap().unwrap();
        assert_eq!(restored.sequence, 2);
        assert_eq!(restored.exit_disposition, "normal");
        fs::write(record_path(&dir), b"invalid").unwrap();
        let prior = load_at(&dir).unwrap().unwrap();
        assert_eq!(prior.sequence, 1);
        assert_eq!(prior.exit_disposition, "running");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn windows_webview_created_directory_is_rejected_without_acl_or_record_repair() {
        let fixture = crate::platform::test_support::FixtureDir::new("qa0003-inherited-storage");
        let base = fixture.join("app-local");
        // Reproduce the original ordering: runtime creates an inherited-DACL
        // directory before private_storage_dir attempts to claim it.
        fs::create_dir_all(&base).unwrap();
        let marker = base.join("existing-record");
        fs::write(&marker, b"preserve unsafe profile evidence").unwrap();
        for _ in 0..2 {
            let error = crate::platform::storage::ensure_private_dir(&base).unwrap_err();
            assert_eq!(error.code, "recovery_permissions");
            assert_eq!(error.message, "Private directory DACL is not protected");
        }
        assert_eq!(
            fs::read(&marker).unwrap(),
            b"preserve unsafe profile evidence"
        );
        assert!(!base.join("session").exists());
    }

    #[test]
    fn saved_selection_identity_cannot_authorize_replacement() {
        let dir = std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        let root_id = identity(&open_selected(&dir, true).unwrap()).unwrap();
        let file_path = dir.join("README.md");
        fs::write(&file_path, b"# first").unwrap();
        let file_id = identity(&open_selected(&file_path, false).unwrap()).unwrap();
        let grants = AppState::default();
        assert!(grants.restore_root(&dir, root_id).is_ok());
        assert!(grants
            .restore_explicit_file(&file_path, file_id, grants.selection_epoch().unwrap())
            .is_ok());
        fs::remove_file(&file_path).unwrap();
        fs::write(&file_path, b"# different").unwrap();
        assert_eq!(
            grants
                .restore_explicit_file(&file_path, file_id, grants.selection_epoch().unwrap())
                .err()
                .unwrap()
                .code,
            "reselection_required"
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn prepared_folder_rejects_replacement_and_competing_selection() {
        let fixture =
            std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&fixture).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&fixture).unwrap();
        let first = fixture.join("first");
        let second = fixture.join("second");
        #[cfg(target_os = "macos")]
        fs::create_dir(&first).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&first).unwrap();
        #[cfg(target_os = "macos")]
        fs::create_dir(&second).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&second).unwrap();
        let state = AppState::default();
        let token = state.prepare_root(&first).unwrap();
        state.register_root(&second).unwrap();
        assert_eq!(
            state.commit_prepared_root(&token).err().unwrap().code,
            "cancelled"
        );
        let token = state.prepare_root(&first).unwrap();
        fs::rename(&first, fixture.join("old")).unwrap();
        #[cfg(target_os = "macos")]
        fs::create_dir(&first).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&first).unwrap();
        assert_eq!(
            state.commit_prepared_root(&token).err().unwrap().code,
            "root_reselection_required"
        );
        fs::remove_dir_all(fixture).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn prepared_folder_rejects_symlink_and_root_file_escape() {
        let fixture =
            std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&fixture).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&fixture).unwrap();
        let root = fixture.join("root");
        #[cfg(target_os = "macos")]
        fs::create_dir(&root).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&root).unwrap();
        symlink(&root, fixture.join("alias")).unwrap();
        let state = AppState::default();
        assert!(state.prepare_root(&fixture.join("alias")).is_err());
        let grant = state.register_root(&root).unwrap();
        symlink(&fixture, root.join("outside")).unwrap();
        assert!(open_relative(
            &state.root(&grant.id).unwrap().file,
            &["outside".into(), "anything.md".into()],
            false
        )
        .is_err());
        fs::remove_dir_all(fixture).unwrap();
    }

    #[test]
    fn serialized_writers_keep_monotonic_sequence() {
        let fixture =
            std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&fixture).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&fixture).unwrap();
        write_at(&fixture, &sample(1)).unwrap();
        let first = fixture.clone();
        let second = fixture.clone();
        let a = std::thread::spawn(move || {
            let _lock = lock_store(&first).unwrap();
            write_at(&first, &sample(2))
        });
        let b = std::thread::spawn(move || {
            let _lock = lock_store(&second).unwrap();
            write_at(&second, &sample(2))
        });
        let outcomes = [a.join().unwrap(), b.join().unwrap()];
        assert_eq!(outcomes.iter().filter(|result| result.is_ok()).count(), 1);
        assert_eq!(load_at(&fixture).unwrap().unwrap().sequence, 2);
        fs::remove_dir_all(fixture).unwrap();
    }

    #[test]
    fn one_hundred_durable_checkpoints_retain_latest_without_temp_files() {
        let fixture =
            std::env::temp_dir().join(format!("md-reader-session-test-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&fixture).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&fixture).unwrap();
        for sequence in 1..=100 {
            let _lock = lock_store(&fixture).unwrap();
            write_at(&fixture, &sample(sequence)).unwrap();
        }
        assert_eq!(load_at(&fixture).unwrap().unwrap().sequence, 100);
        assert!(fs::read_dir(&fixture).unwrap().all(|entry| {
            !entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .ends_with(".tmp")
        }));
        fs::remove_dir_all(fixture).unwrap();
    }
    #[test]
    fn html_anchor_roundtrip_defaults_zoom_and_rejects_recovery() {
        let mut payload = sample(1);
        payload.tabs[0].name = "guide.HTML".into();
        payload.tabs[0].anchor.html_zoom = Some(1.5);
        payload.tabs[0].anchor.html_scroll_left = Some(42.0);
        let bytes = serde_json::to_vec(&payload).unwrap();
        let restored: SessionPayload = serde_json::from_slice(&bytes).unwrap();
        validate(&restored).unwrap();
        assert_eq!(restored.tabs[0].anchor.html_zoom, Some(1.5));
        payload.tabs[0].editing_active = true;
        assert!(validate(&payload).is_err());
        payload.tabs[0].editing_active = false;
        payload.tabs[0].anchor.html_zoom = Some(99.0);
        assert!(validate(&payload).is_err());
        let original = sample(1);
        let bytes = serde_json::to_vec(&original).unwrap();
        let restored: SessionPayload = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(restored.tabs[0].anchor.html_zoom, None);
    }
}
