//! Standalone read-only HTML. The document surface is NOT a Tauri webview.
use crate::{
    document::bounded_bytes,
    scope::{self, AppError, AppResult, Identity},
    state::{AppState, FileGrant, FileSource},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs::File,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, OnceLock},
    time::Instant,
};
use tauri::{Emitter, Manager};
use uuid::Uuid;

pub const MAX_HTML: usize = 4 * 1024 * 1024;
#[path = "html_image_budget.rs"]
mod image_budget;
const MAX_TOTAL: usize = 64 * 1024 * 1024;
const MAX_RESOURCES: usize = 128;

pub use crate::document_view::{LocalTarget, LocalView};
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResourceIssue {
    pub id: String,
    pub declared_url: String,
    pub kind: String,
    pub reason: String,
}
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlLocation {
    pub heading_id: Option<String>,
    pub offset: f64,
    pub scroll_top: f64,
    pub scroll_left: f64,
    pub zoom: f64,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Heading {
    pub key: String,
    pub authored_id: Option<String>,
    pub level: u8,
    pub text: String,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlState {
    pub view_token: String,
    pub generation: u64,
    pub revision: u64,
    pub request_id: u64,
    pub state: String,
    pub reason_code: Option<String>,
    pub issues: Vec<ResourceIssue>,
    pub headings: Vec<Heading>,
    pub location: HtmlLocation,
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Baseline {
    pub font: String,
    pub size: f64,
    pub line_height: f64,
}
impl Default for Baseline {
    fn default() -> Self {
        Self {
            font: "roboto".into(),
            size: 16.0,
            line_height: 1.6,
        }
    }
}
#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
#[derive(Clone)]
struct SelectedAsset {
    path: PathBuf,
    identity: Identity,
    file: Arc<File>,
    folder: bool,
}
#[derive(Clone)]
struct View {
    descriptor: LocalView,
    source: FileGrant,
    state: HtmlState,
    last_request: u64,
    assets: Vec<SelectedAsset>,
    resources: HashMap<PathBuf, (Identity, String)>,
    total: usize,
    css_bytes: usize,
    font_bytes: usize,
    resource_requests: usize,
    image_decoded: usize,
    started: Instant,
    document_loaded: bool,
    pending_links: HashMap<String, String>,
    access_requests: HashMap<String, (PathBuf, Option<String>)>,
    css_graph: HashMap<String, Vec<String>>,
    css_imports: usize,
    issue_urls: HashMap<String, String>,
    source_stamp: String,
    baseline: Baseline,
}
#[derive(Default)]
pub struct HtmlService {
    views: Mutex<HashMap<String, View>>,
    resources_gate: Mutex<()>,
    #[cfg(test)]
    read_hook: Mutex<Option<Arc<dyn Fn() + Send + Sync>>>,
}
struct Host {
    state: AppState,
    service: Arc<HtmlService>,
    app: Option<tauri::AppHandle>,
}
#[cfg(target_os = "windows")]
#[path = "html_windows.rs"]
mod windows_surface;
static HOST: OnceLock<Host> = OnceLock::new();
pub fn initialize(
    state: AppState,
    service: Arc<HtmlService>,
    app: Option<tauri::AppHandle>,
) -> AppResult<()> {
    crate::document_view::initialize(state.clone(), service.clone())?;
    HOST.set(Host {
        state,
        service,
        app,
    })
    .map_err(|_| err("internal", "HTML host already initialized"))
}
fn err(code: &'static str, message: &str) -> AppError {
    AppError::new(code, message)
}
fn host() -> AppResult<&'static Host> {
    HOST.get()
        .ok_or_else(|| err("internal", "HTML host unavailable"))
}
fn caller(window: &tauri::WebviewWindow) -> AppResult<()> {
    if window.label() != "main" {
        return Err(err("html_denied", "Only the workspace owns HTML surfaces"));
    }
    Ok(())
}
fn stamp_key(file: &File) -> AppResult<String> {
    let s = crate::platform::stamp(file)?;
    Ok(format!(
        "{}:{}:{}:{}:{}:{}:{}",
        s.device,
        s.inode,
        s.length,
        s.modified_seconds,
        s.modified_nanos,
        s.changed_seconds,
        s.changed_nanos
    ))
}
pub(crate) fn discard_unmounted(view: &LocalView) {
    if let (Some(token), Ok(h)) = (&view.view_token, host()) {
        let _ = commands::dispose_impl(&h.service, token, view.generation);
    }
}
fn key(id: Identity) -> String {
    format!("{}:{}", id.device, id.inode)
}
fn lock(service: &HtmlService) -> AppResult<std::sync::MutexGuard<'_, HashMap<String, View>>> {
    service
        .views
        .lock()
        .map_err(|_| err("internal", "HTML state unavailable"))
}
use crate::document_view::current;
#[path = "html_broker.rs"]
mod broker;
use broker::*;
#[path = "html_commands.rs"]
pub(crate) mod commands;
#[cfg(any(test, feature = "html-native-probe"))]
use commands::dispose_impl;
#[cfg(test)]
use commands::resolve_link_intent;
#[path = "html_native.rs"]
mod native;
use native::*;
pub(crate) use native::{dispose_all, hide_all};
#[cfg(all(feature = "html-native-probe", target_os = "macos"))]
#[path = "html_probe.rs"]
mod probe;
#[cfg(test)]
#[path = "html_tests.rs"]
mod tests;
pub(crate) use broker::fingerprint;
#[cfg(all(feature = "html-native-probe", target_os = "macos"))]
pub use probe::probe_run;

pub(crate) use broker::open_granted;
