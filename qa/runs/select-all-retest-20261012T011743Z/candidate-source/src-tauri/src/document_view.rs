//! Neutral native document facade. Descriptors confer no filesystem authority.
use crate::{scope::{self, AppError, AppResult}, state::{AppState, FileGrant, FileSource}};
use serde::{Deserialize, Serialize};
use std::{fs::File, sync::{Arc, Mutex, OnceLock}, collections::{HashMap, VecDeque}, time::Duration};
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalTarget { pub file_id: Option<String>, pub root_id: Option<String>, pub segments: Option<Vec<String>> }
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalView {
    pub file_id: String, pub identity_key: String, pub disk_version: String,
    pub name: String, pub display_path: String, pub kind: &'static str,
    pub view_token: Option<String>, pub generation: u64, pub bytes: u64, pub extension: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prototype: Option<crate::prototype::Metadata>,
}
pub(crate) fn kind(name: &str) -> &'static str {
    if scope::prototype_name(name) { "prototype" } else if scope::html_name(name) { "html" }
    else if scope::markdown_name(name) { "markdown" } else if scope::image_format(name).is_some() { "image" } else { "details" }
}
pub(crate) fn resolve(state: &AppState, target: LocalTarget) -> AppResult<FileGrant> {
    match (target.file_id, target.root_id, target.segments) {
        (Some(id), None, None) => state.file(&id),
        (None, Some(root), Some(parts)) => {
            let root = state.root(&root)?;
            root.verify_current()?;
            let file = scope::open_relative(&root.file, &parts, false)?;
            state.register_root_file(&root, parts, &file)
        }
        _ => Err(AppError::new("invalid_grant", "Supply exactly one native target")),
    }
}
pub(crate) fn current(state: &AppState, source: &FileGrant) -> AppResult<File> {
    let live = state.file(&source.id)?;
    if live.identity != source.identity { return Err(AppError::new("reselection_required", "Document identity changed")); }
    let file = match &live.source {
        FileSource::Root { root_id, segments } => {
            let root = state.root(root_id)?; root.verify_current()?;
            scope::open_relative(&root.file, segments, false)?
        }
        FileSource::Explicit { path, .. } => scope::open_selected(path, false)?,
    };
    if scope::identity(&file)? != source.identity { return Err(AppError::new("reselection_required", "Document identity changed")); }
    Ok(file)
}
struct Host {
    state: AppState, html: Arc<crate::html::HtmlService>,
    opens: Mutex<HashMap<String, igproto_package::Control>>, cancelled: Mutex<VecDeque<String>>,
}
static HOST: OnceLock<Host> = OnceLock::new();
pub(crate) fn initialize(state: AppState, html: Arc<crate::html::HtmlService>) -> AppResult<()> {
    HOST.set(Host { state, html, opens: Mutex::new(HashMap::new()), cancelled: Mutex::new(VecDeque::new()) })
        .map_err(|_| AppError::new("internal", "Document host already initialized"))
}
fn host() -> AppResult<&'static Host> { HOST.get().ok_or_else(|| AppError::new("internal", "Document host unavailable")) }
pub(crate) fn caller(window: &tauri::WebviewWindow) -> AppResult<()> {
    if window.label() == "main" { Ok(()) } else { Err(AppError::new("document_denied", "Only the workspace owns documents")) }
}
pub(crate) fn open_impl(state: &AppState, html: &crate::html::HtmlService, target: LocalTarget, expected: Option<&str>, control: &igproto_package::Control) -> AppResult<LocalView> {
    let grant = resolve(state, target)?;
    if scope::prototype_name(&grant.name) { crate::prototype::open(state, grant, expected, control).map(|(view,_)|view) }
    else { crate::html::open_granted(state, html, grant, expected) }
}
pub(crate) fn open_registered(state: &AppState, file_id: String) -> AppResult<LocalView> {
    open_impl(state, &host()?.html, LocalTarget { file_id: Some(file_id), root_id: None, segments: None }, None, &igproto_package::Control::new(Duration::from_secs(5)))
}
pub(crate) fn discard_unmounted(view: &LocalView) {
    if let Ok(h) = host() {
        if view.kind == "prototype" { if let Some(t) = &view.view_token { let _ = crate::prototype::dispose(&h.state, t, view.generation, false); } }
        else { crate::html::discard_unmounted(view); }
    }
}
#[tauri::command]
pub async fn open_local_view(window: tauri::WebviewWindow, target: LocalTarget, expected_identity: Option<String>, request_id: String) -> AppResult<LocalView> {
    caller(&window)?; let h = host()?;
    if request_id.is_empty() || request_id.len() > 64 { return Err(AppError::new("invalid_request", "Invalid open request ID")); }
    let control = igproto_package::Control::new(Duration::from_secs(5));
    {
    let mut opens = h.opens.lock().unwrap();
    if opens.len() >= 16 { return Err(AppError::new("document_limit", "Too many pending opens")); }
    if h.cancelled.lock().unwrap().contains(&request_id) { return Err(AppError::new("cancelled", "Open cancelled")); }
    if let Some(old) = opens.insert(request_id.clone(), control.clone()) { old.cancel(); }
    }
    let worker = control.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let grant = resolve(&h.state, target)?;
        if scope::prototype_name(&grant.name) { crate::prototype::open(&h.state, grant, expected_identity.as_deref(), &worker) }
        else { crate::html::open_granted(&h.state, &h.html, grant, expected_identity.as_deref()).map(|view| (view, true)) }
    }).await;
    h.opens.lock().unwrap().remove(&request_id);
    let result = result.map_err(|_| AppError::new("internal", "Document open task failed"))?;
    if control.check("open").is_err() {
        // Prototype open itself checks cancellation before publishing; HTML has no shared token.
        if let Ok((view, created)) = &result { if *created { discard_unmounted(view); } }
        return Err(AppError::new("cancelled", "Open cancelled or timed out"));
    }
    result.map(|(view,_)|view)
}
#[tauri::command]
pub fn cancel_html_open(window: tauri::WebviewWindow, request_id: String) -> AppResult<bool> {
    caller(&window)?; let h = host()?;
    if request_id.is_empty() || request_id.len()>64 { return Err(AppError::new("invalid_request", "Invalid request ID")); }
    let opens = h.opens.lock().unwrap(); let mut cancelled = h.cancelled.lock().unwrap();
    if cancelled.len() >= 256 { cancelled.pop_front(); } cancelled.push_back(request_id.clone());
    if let Some(c) = opens.get(&request_id) { c.cancel(); Ok(true) } else { Ok(false) }
}

pub(crate) fn cancel_all() {
    if let Ok(h)=host() { for control in h.opens.lock().unwrap().values() { control.cancel(); } }
}
