//! IR-04: preference-only authority. No paths, grants, tabs or drafts cross this boundary.
use crate::scope::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::{
    collections::VecDeque,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager, State, WebviewWindow};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum Group {
    General,
    Reading,
    ProjectTree,
}
/// Shared Settings/session preference. No document or grant authority.
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum WorkspaceLayout {
    #[default]
    Margin,
    Folio,
    Atlas,
}
impl WorkspaceLayout {
    pub(crate) fn is_margin(&self) -> bool {
        *self == Self::Margin
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Preferences {
    pub language: String,
    pub appearance: String,
    pub reading_font: String,
    pub reading_size: f64,
    pub reading_line_height: f64,
    pub reading_width: f64,
    pub documents_and_images_only: bool,
    #[serde(default)]
    pub workspace_layout: WorkspaceLayout,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            language: "en".into(),
            appearance: "system".into(),
            reading_font: "roboto".into(),
            reading_size: 16.,
            reading_line_height: 1.6,
            reading_width: 760.,
            documents_and_images_only: true,
            workspace_layout: WorkspaceLayout::Margin,
        }
    }
}
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Patch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub appearance: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading_font: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading_size: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading_line_height: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reading_width: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub documents_and_images_only: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workspace_layout: Option<WorkspaceLayout>,
}
impl Patch {
    fn general(&self) -> bool {
        self.language.is_some() || self.appearance.is_some()
    }
    fn workspace(&self) -> bool {
        self.reading_font.is_some()
            || self.reading_size.is_some()
            || self.reading_line_height.is_some()
            || self.reading_width.is_some()
            || self.documents_and_images_only.is_some()
            || self.workspace_layout.is_some()
    }
    fn apply(&self, current: &Preferences) -> AppResult<Preferences> {
        if self.general() == self.workspace() {
            return Err(error(
                "settings_invalid",
                "Use one nonempty preference scope per request",
            ));
        }
        let mut next = current.clone();
        macro_rules! field {
            ($name:ident) => {
                if let Some(value) = &self.$name {
                    next.$name = value.clone();
                }
            };
        }
        field!(language);
        field!(appearance);
        field!(reading_font);
        field!(reading_size);
        field!(reading_line_height);
        field!(reading_width);
        field!(documents_and_images_only);
        field!(workspace_layout);
        if next.reading_width != current.reading_width
            && !(480. ..=1200.).contains(&next.reading_width)
        {
            return Err(error(
                "settings_invalid",
                "New reading widths must be within the control range",
            ));
        }
        validate(&next)?;
        Ok(next)
    }
}
fn validate(value: &Preferences) -> AppResult<()> {
    if !matches!(value.language.as_str(), "en" | "es")
        || !matches!(value.appearance.as_str(), "system" | "light" | "dark")
        || !matches!(
            value.reading_font.as_str(),
            "roboto" | "serif" | "sans" | "mono"
        )
        || !value.reading_size.is_finite()
        || !(12. ..=24.).contains(&value.reading_size)
        || !value.reading_line_height.is_finite()
        || !(1.3..=2.2).contains(&value.reading_line_height)
        || !value.reading_width.is_finite()
        || !(320. ..=2000.).contains(&value.reading_width)
    {
        return Err(error(
            "settings_invalid",
            "Preference value is outside its supported range",
        ));
    }
    Ok(())
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Persistence {
    Saved,
    Failed,
    Pending,
    OwnerUnavailable,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub revision: u64,
    pub activation: u64,
    pub group: Group,
    pub owner_available: bool,
    pub values: Preferences,
    pub request_id: Option<String>,
    pub persistence: Persistence,
    pub native_theme_failed: bool,
    pub retry_patch: Option<Patch>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Intent {
    pub request_id: String,
    pub revision: u64,
    pub patch: Patch,
}
struct Pending {
    intent: Intent,
    next: Preferences,
    started: Instant,
}
pub struct Coordinator {
    snapshot: Snapshot,
    pending: Option<Pending>,
    seen: VecDeque<String>,
}
impl Default for Coordinator {
    fn default() -> Self {
        Self {
            snapshot: Snapshot {
                revision: 0,
                activation: 0,
                group: Group::General,
                owner_available: false,
                values: Preferences::default(),
                request_id: None,
                persistence: Persistence::Saved,
                native_theme_failed: false,
                retry_patch: None,
            },
            pending: None,
            seen: VecDeque::new(),
        }
    }
}
impl Coordinator {
    fn expire(&mut self) {
        if self
            .pending
            .as_ref()
            .is_some_and(|p| p.started.elapsed() >= Duration::from_secs(5))
        {
            let workspace = self.pending.as_ref().unwrap().intent.patch.workspace();
            if workspace {
                self.snapshot.owner_available = false;
            }
            self.pending = None;
            self.snapshot.persistence = if workspace {
                Persistence::OwnerUnavailable
            } else {
                Persistence::Failed
            };
            self.snapshot.revision += 1;
        }
    }
    fn publish(&mut self, expected: u64, values: Preferences) -> AppResult<Snapshot> {
        self.expire();
        validate(&values)?;
        if self.pending.is_some() {
            return Err(error(
                "settings_busy",
                "A preference acknowledgment is pending",
            ));
        }
        if expected != self.snapshot.revision {
            return Err(error(
                "settings_stale",
                "Refresh the current preference revision",
            ));
        }
        let owner_returned = !self.snapshot.owner_available;
        self.snapshot.owner_available = true;
        if values != self.snapshot.values || owner_returned {
            self.snapshot.revision += 1;
            self.snapshot.values = values;
            self.snapshot.request_id = None;
            self.snapshot.persistence = Persistence::Saved;
            self.snapshot.retry_patch = None;
        }
        Ok(self.snapshot.clone())
    }
    fn request(&mut self, request_id: String, expected: u64, patch: Patch) -> AppResult<Snapshot> {
        self.expire();
        if request_id.is_empty()
            || request_id.len() > 64
            || !request_id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
        {
            return Err(error("settings_invalid", "Invalid request identifier"));
        }
        if expected != self.snapshot.revision {
            return Err(error(
                "settings_stale",
                "Refresh the current preference revision",
            ));
        }
        if self.pending.is_some() {
            return Err(error(
                "settings_busy",
                "A preference acknowledgment is pending",
            ));
        }
        if self.seen.contains(&request_id) {
            return Err(error(
                "settings_duplicate",
                "Use a new identifier for Retry",
            ));
        }
        let next = patch.apply(&self.snapshot.values)?;
        if patch.workspace() && !self.snapshot.owner_available {
            return Err(error(
                "settings_owner_unavailable",
                "The workspace preference owner is unavailable",
            ));
        }
        self.seen.push_back(request_id.clone());
        if self.seen.len() > 64 {
            self.seen.pop_front();
        }
        self.snapshot.revision += 1;
        self.snapshot.request_id = Some(request_id.clone());
        self.snapshot.persistence = Persistence::Pending;
        self.snapshot.retry_patch = Some(patch.clone());
        if patch.general() {
            self.snapshot.values = next.clone();
        }
        self.pending = Some(Pending {
            intent: Intent {
                request_id,
                revision: self.snapshot.revision,
                patch,
            },
            next,
            started: Instant::now(),
        });
        Ok(self.snapshot.clone())
    }
    fn acknowledge(
        &mut self,
        caller: &str,
        request_id: &str,
        revision: u64,
        persistence: Persistence,
    ) -> AppResult<Snapshot> {
        self.expire();
        let Some(pending) = &self.pending else {
            return Err(error("settings_stale", "No matching preference request"));
        };
        if pending.intent.request_id != request_id || pending.intent.revision != revision {
            return Err(error(
                "settings_stale",
                "Acknowledgment belongs to another revision",
            ));
        }
        let allowed = if pending.intent.patch.general() {
            "settings"
        } else {
            "main"
        };
        if caller != allowed {
            return Err(error(
                "settings_denied",
                "This window does not own preference persistence",
            ));
        }
        if !matches!(persistence, Persistence::Saved | Persistence::Failed) {
            return Err(error(
                "settings_invalid",
                "Acknowledgment must report persistence success or failure",
            ));
        }
        let pending = self.pending.take().unwrap();
        self.snapshot.values = pending.next;
        self.snapshot.persistence = persistence;
        if persistence == Persistence::Saved {
            self.snapshot.retry_patch = None;
        }
        Ok(self.snapshot.clone())
    }
    pub fn owner_closed(&mut self) {
        self.snapshot.owner_available = false;
        if self
            .pending
            .as_ref()
            .is_some_and(|p| p.intent.patch.workspace())
        {
            self.pending = None;
            self.snapshot.persistence = Persistence::OwnerUnavailable;
        }
        self.snapshot.revision += 1;
    }
}
#[derive(Default)]
pub struct SettingsState(
    pub Mutex<Coordinator>,
    #[cfg(test)] Option<std::path::PathBuf>,
);
fn error(code: &'static str, message: &'static str) -> AppError {
    AppError::new(code, message)
}
fn caller(window: &WebviewWindow, allowed: &str) -> AppResult<()> {
    if window.label() != allowed {
        return Err(error(
            "settings_denied",
            "Preference caller is not authorized",
        ));
    }
    Ok(())
}
/// Gate ALL application commands before deserialization or side effects.
pub(crate) fn command_allowed(label: &str, command: &str) -> bool {
    match label {
        "main" => !matches!(
            command,
            "get_settings_state" | "apply_settings_change" | "close_settings"
        ),
        "settings" => matches!(
            command,
            "get_settings_state"
                | "apply_settings_change"
                | "acknowledge_settings_change"
                | "close_settings"
        ),
        _ => false,
    }
}
pub(crate) fn authorize_invoke<R: tauri::Runtime>(
    invoke: tauri::ipc::Invoke<R>,
) -> Option<tauri::ipc::Invoke<R>> {
    if command_allowed(
        invoke.message.webview_ref().label(),
        invoke.message.command(),
    ) {
        return Some(invoke);
    }
    invoke.resolver.reject(error(
        "settings_denied",
        "This window has no authority for this operation",
    ));
    None
}
fn broadcast(app: &tauri::AppHandle, snapshot: &Snapshot) {
    for label in ["main", "settings"] {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.emit("settings:state", snapshot);
        }
    }
}
fn theme(app: &tauri::AppHandle, snapshot: &mut Snapshot) {
    let mode = match snapshot.values.appearance.as_str() {
        "light" => Some(tauri::Theme::Light),
        "dark" => Some(tauri::Theme::Dark),
        _ => None,
    };
    snapshot.native_theme_failed = false;
    for label in ["main", "settings"] {
        if let Some(window) = app.get_webview_window(label) {
            snapshot.native_theme_failed |= window.set_theme(mode).is_err();
        }
    }
}
#[tauri::command]
pub fn publish_workspace_preferences(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
    expected_revision: u64,
    values: Preferences,
) -> AppResult<Snapshot> {
    caller(&window, "main")?;
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    coordinator.publish(expected_revision, values)?;
    theme(window.app_handle(), &mut coordinator.snapshot);
    let snapshot = coordinator.snapshot.clone();
    drop(coordinator);
    broadcast(window.app_handle(), &snapshot);
    Ok(snapshot)
}
#[tauri::command]
pub fn get_workspace_preferences(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
) -> AppResult<Snapshot> {
    caller(&window, "main")?;
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    coordinator.expire();
    Ok(coordinator.snapshot.clone())
}
#[tauri::command]
pub fn get_settings_state(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
) -> AppResult<Snapshot> {
    caller(&window, "settings")?;
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    coordinator.expire();
    Ok(coordinator.snapshot.clone())
}
#[tauri::command]
pub fn apply_settings_change(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
    request_id: String,
    expected_revision: u64,
    patch: Patch,
) -> AppResult<Snapshot> {
    caller(&window, "settings")?;
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    coordinator.request(request_id, expected_revision, patch)?;
    let intent = coordinator.pending.as_ref().unwrap().intent.clone();
    theme(window.app_handle(), &mut coordinator.snapshot);
    let snapshot = coordinator.snapshot.clone();
    drop(coordinator);
    broadcast(window.app_handle(), &snapshot);
    if intent.patch.workspace() {
        if let Some(owner) = window.app_handle().get_webview_window("main") {
            let _ = owner.emit("settings:intent", intent);
        }
    }
    Ok(snapshot)
}
#[tauri::command]
pub fn acknowledge_settings_change(
    window: WebviewWindow,
    state: State<'_, SettingsState>,
    request_id: String,
    revision: u64,
    persistence: Persistence,
) -> AppResult<Snapshot> {
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    let snapshot = coordinator.acknowledge(window.label(), &request_id, revision, persistence)?;
    drop(coordinator);
    broadcast(window.app_handle(), &snapshot);
    Ok(snapshot)
}
pub fn show(app: &tauri::AppHandle, group: Group) -> AppResult<()> {
    let owner = app
        .get_webview_window("main")
        .ok_or_else(|| error("settings_owner_unavailable", "No workspace window"))?;
    let _ = owner.emit("settings:opening", ());
    let state = app.state::<SettingsState>();
    // Window creation occurs on the UI thread; the lock serializes concurrent entry points.
    let mut coordinator = state
        .0
        .lock()
        .map_err(|_| error("settings_error", "Preference coordinator unavailable"))?;
    coordinator.snapshot.group = group;
    coordinator.snapshot.activation += 1;
    let window = if let Some(window) = app.get_webview_window("settings") {
        window
    } else {
        let monitor = owner
            .current_monitor()
            .map_err(|_| error("settings_window_error", "Could not inspect monitor"))?;
        let (width, height, x, y) = monitor
            .map(|m| {
                let area = m.work_area();
                let scale = m.scale_factor();
                let w = monitor_dimension(area.size.width as f64 / scale - 32., 320., 800.);
                let h = monitor_dimension(area.size.height as f64 / scale - 80., 240., 720.);
                (
                    w,
                    h,
                    area.position.x as f64 / scale + 16.,
                    area.position.y as f64 / scale + 16.,
                )
            })
            .unwrap_or((800., 720., 40., 40.));
        let builder = tauri::WebviewWindowBuilder::new(
            app,
            "settings",
            tauri::WebviewUrl::App("index.html?settings".into()),
        );
        #[cfg(test)]
        let builder = if let Some(directory) = &state.1 {
            builder.data_directory(directory.clone())
        } else {
            builder
        };
        // The window-level drop switch is Windows-only. On macOS, retain
        // Tauri interception: Settings events are consumed before workspace intake.
        #[cfg(windows)]
        let builder = builder.drag_and_drop(false);
        builder
            .title("Settings — Intentgrove")
            .inner_size(width, height)
            .min_inner_size(320., 240.)
            .position(x, y)
            .resizable(true)
            .on_navigation(super::allowed_navigation)
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
            .on_download(|_, _| false)
            .build()
            .map_err(|_| error("settings_window_error", "Could not create Settings window"))?
    };
    theme(app, &mut coordinator.snapshot);
    let snapshot = coordinator.snapshot.clone();
    drop(coordinator);
    broadcast(app, &snapshot);
    window
        .show()
        .and_then(|_| window.unminimize())
        .and_then(|_| window.set_focus())
        .map_err(|_| error("settings_window_error", "Could not raise Settings window"))
}
#[tauri::command]
pub fn show_settings(window: WebviewWindow, group: Group) -> AppResult<()> {
    caller(&window, "main")?;
    show(window.app_handle(), group)
}
#[tauri::command]
pub fn close_settings(window: WebviewWindow) -> AppResult<()> {
    caller(&window, "settings")?;
    window
        .close()
        .map_err(|_| error("settings_window_error", "Could not close Settings"))
}
pub fn closed(app: &tauri::AppHandle) {
    if let Some(owner) = app.get_webview_window("main") {
        let _ = owner.show();
        let _ = owner.unminimize();
        let _ = owner.set_focus();
        let _ = owner.emit("settings:closed", ());
    }
}
/// Settings close/drop/destroy must bypass every workspace close and watcher path.
pub(crate) fn handle_window_event(window: &tauri::Window, event: &tauri::WindowEvent) -> bool {
    if window.label() != "settings" {
        return false;
    }
    if matches!(event, tauri::WindowEvent::Destroyed) {
        closed(window.app_handle());
    }
    true
}

// Preserve the former min(upper).max(lower) NaN fallback.
fn monitor_dimension(value: f64, lower: f64, upper: f64) -> f64 {
    if value.is_nan() {
        upper
    } else {
        value.clamp(lower, upper)
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn monitor_dimensions_preserve_finite_infinite_and_nan_behavior() {
        for (lower, upper) in [(320., 800.), (240., 720.)] {
            for value in [
                f64::NAN,
                f64::NEG_INFINITY,
                f64::INFINITY,
                -1.,
                0.,
                lower,
                500.,
                upper,
                900.,
            ] {
                assert_eq!(
                    super::monitor_dimension(value, lower, upper),
                    value.min(upper).max(lower)
                );
            }
        }
    }

    use super::*;
    fn owner() -> Coordinator {
        let mut c = Coordinator::default();
        c.publish(0, Preferences::default()).unwrap();
        c.snapshot.revision = 0;
        c
    }
    fn reading(size: f64) -> Patch {
        Patch {
            reading_size: Some(size),
            ..Patch::default()
        }
    }

    #[test]
    fn layout_capability_defaults_validation_failure_retry_and_owner_lifecycle() {
        let defaults = serde_json::to_value(Preferences::default()).unwrap();
        assert_eq!(defaults["workspaceLayout"], "margin");
        let mut legacy = defaults.clone();
        legacy.as_object_mut().unwrap().remove("workspaceLayout");
        assert_eq!(
            serde_json::from_value::<Preferences>(legacy)
                .unwrap()
                .workspace_layout,
            WorkspaceLayout::Margin
        );
        for value in ["unknown", "Margin", "", "../atlas"] {
            assert!(
                serde_json::from_value::<Patch>(serde_json::json!({"workspaceLayout":value}))
                    .is_err()
            );
        }
        for (index, layout) in [
            WorkspaceLayout::Margin,
            WorkspaceLayout::Folio,
            WorkspaceLayout::Atlas,
        ]
        .into_iter()
        .enumerate()
        {
            let mut c = owner();
            let patch = Patch {
                workspace_layout: Some(layout),
                ..Patch::default()
            };
            assert!(patch.workspace());
            assert!(!patch.general());
            let request = format!("layout-{index}");
            let pending = c.request(request.clone(), 0, patch.clone()).unwrap();
            assert_eq!(pending.persistence, Persistence::Pending);
            assert_eq!(pending.values.workspace_layout, WorkspaceLayout::Margin);
            assert_eq!(
                c.acknowledge("settings", &request, pending.revision, Persistence::Saved)
                    .unwrap_err()
                    .code,
                "settings_denied"
            );
            let failed = c
                .acknowledge("main", &request, pending.revision, Persistence::Failed)
                .unwrap();
            assert_eq!(failed.values.workspace_layout, layout);
            assert_eq!(failed.persistence, Persistence::Failed);
            assert_eq!(
                failed.retry_patch.as_ref().unwrap().workspace_layout,
                Some(layout)
            );
            let retry = c
                .request(format!("retry-{index}"), failed.revision, patch.clone())
                .unwrap();
            assert!(c
                .acknowledge("main", &request, pending.revision, Persistence::Saved)
                .is_err());
            let saved = c
                .acknowledge(
                    "main",
                    &format!("retry-{index}"),
                    retry.revision,
                    Persistence::Saved,
                )
                .unwrap();
            assert_eq!(saved.values.workspace_layout, layout);
            assert!(saved.retry_patch.is_none());
            let loss = c
                .request(format!("loss-{index}"), saved.revision, patch.clone())
                .unwrap();
            c.owner_closed();
            assert!(c
                .acknowledge(
                    "main",
                    &format!("loss-{index}"),
                    loss.revision,
                    Persistence::Saved
                )
                .is_err());
            assert_eq!(
                c.request(format!("closed-{index}"), c.snapshot.revision, patch)
                    .unwrap_err()
                    .code,
                "settings_owner_unavailable"
            );
            let returned = c.publish(c.snapshot.revision, saved.values).unwrap();
            assert!(returned.owner_available);
            assert_eq!(returned.values.workspace_layout, layout);
        }
    }

    #[test]
    fn validated_preference_requests_reject_unknown_keys_and_mixed_scopes() {
        for json in [
            r#"{"path":"C:\\secret"}"#,
            r#"{"rootId":"grant"}"#,
            r#"{"readingSize":"22"}"#,
            r#"{"documentsAndImagesOnly":1}"#,
        ] {
            assert!(serde_json::from_str::<Patch>(json).is_err());
        }
        for size in [f64::NAN, f64::INFINITY, 11.9, 24.1] {
            assert!(owner().request("x".into(), 0, reading(size)).is_err());
        }
        assert!(owner().request("x".into(), 0, Patch::default()).is_err());
        assert!(owner()
            .request(
                "x".into(),
                0,
                Patch {
                    language: Some("es".into()),
                    ..reading(22.)
                }
            )
            .is_err());
        assert!(owner().request("../bad".into(), 0, reading(22.)).is_err());
        for (font, height, width) in [
            ("script", 1.6, 760.),
            ("roboto", 1.2, 760.),
            ("roboto", 1.6, 1201.),
        ] {
            assert!(owner()
                .request(
                    "x".into(),
                    0,
                    Patch {
                        reading_font: Some(font.into()),
                        reading_line_height: Some(height),
                        reading_width: Some(width),
                        ..Patch::default()
                    }
                )
                .is_err());
        }
    }
    #[test]
    fn serialized_intents_and_retry_patches_never_reset_unmentioned_preferences() {
        let patch = Patch {
            documents_and_images_only: Some(false),
            ..Patch::default()
        };
        let intent = Intent {
            request_id: "tree".into(),
            revision: 1,
            patch: patch.clone(),
        };
        let value = serde_json::to_value(intent).unwrap();
        assert_eq!(
            value["patch"],
            serde_json::json!({ "documentsAndImagesOnly": false })
        );
        assert_eq!(
            serde_json::to_value(reading(22.)).unwrap(),
            serde_json::json!({ "readingSize": 22. })
        );
        let mut c = owner();
        c.request("tree".into(), 0, patch).unwrap();
        let failed = c
            .acknowledge("main", "tree", 1, Persistence::Failed)
            .unwrap();
        assert_eq!(
            serde_json::to_value(failed).unwrap()["retryPatch"],
            serde_json::json!({ "documentsAndImagesOnly": false })
        );
    }
    #[test]
    fn revisions_request_correlation_and_single_inflight_prevent_stale_overwrites() {
        let mut c = owner();
        assert_eq!(c.request("a".into(), 0, reading(22.)).unwrap().revision, 1);
        assert_eq!(
            c.snapshot.values.reading_size, 16.,
            "Unacknowledged Reading is not published as applied"
        );
        assert_eq!(
            c.request("b".into(), 0, reading(23.)).unwrap_err().code,
            "settings_stale"
        );
        assert_eq!(
            c.request("b".into(), 1, reading(23.)).unwrap_err().code,
            "settings_busy"
        );
        assert_eq!(
            c.acknowledge("settings", "a", 1, Persistence::Saved)
                .unwrap_err()
                .code,
            "settings_denied"
        );
        assert_eq!(
            c.acknowledge("main", "b", 1, Persistence::Saved)
                .unwrap_err()
                .code,
            "settings_stale"
        );
        assert_eq!(
            c.acknowledge("main", "a", 1, Persistence::Saved)
                .unwrap()
                .values
                .reading_size,
            22.
        );
        let mut local = c.snapshot.values.clone();
        local.reading_size = 20.;
        c.publish(1, local).unwrap();
        assert_eq!(
            c.request("b".into(), 1, reading(24.)).unwrap_err().code,
            "settings_stale"
        );
        assert_eq!(
            c.acknowledge("main", "a", 1, Persistence::Failed)
                .unwrap_err()
                .code,
            "settings_stale"
        );
        assert_eq!(c.snapshot.values.reading_size, 20.);
    }
    #[test]
    fn persistence_failure_retains_applied_value_and_retry_acknowledges_new_revision() {
        let mut c = owner();
        c.request("a".into(), 0, reading(22.)).unwrap();
        let failed = c.acknowledge("main", "a", 1, Persistence::Failed).unwrap();
        assert_eq!(failed.values.reading_size, 22.);
        assert_eq!(failed.persistence, Persistence::Failed);
        assert!(failed.retry_patch.is_some());
        assert_eq!(
            c.request("a".into(), 1, reading(22.)).unwrap_err().code,
            "settings_duplicate"
        );
        c.request("retry".into(), 1, failed.retry_patch.unwrap())
            .unwrap();
        let saved = c
            .acknowledge("main", "retry", 2, Persistence::Saved)
            .unwrap();
        assert_eq!(saved.values.reading_size, 22.);
        assert!(saved.retry_patch.is_none());
    }
    #[test]
    fn owner_loss_disables_reading_but_general_remains_app_scoped() {
        let mut c = owner();
        c.request("a".into(), 0, reading(22.)).unwrap();
        c.owner_closed();
        assert!(!c.snapshot.owner_available);
        assert_eq!(
            c.acknowledge("main", "a", 1, Persistence::Saved)
                .unwrap_err()
                .code,
            "settings_stale"
        );
        assert_eq!(
            c.request("b".into(), 2, reading(22.)).unwrap_err().code,
            "settings_owner_unavailable"
        );
        c.request(
            "general".into(),
            2,
            Patch {
                language: Some("es".into()),
                ..Patch::default()
            },
        )
        .unwrap();
        assert_eq!(
            c.acknowledge("main", "general", 3, Persistence::Saved)
                .unwrap_err()
                .code,
            "settings_denied"
        );
        assert_eq!(
            c.acknowledge("settings", "general", 3, Persistence::Failed)
                .unwrap()
                .values
                .language,
            "es"
        );
    }
    #[test]
    fn missing_acknowledgment_times_out_and_late_ack_cannot_rewrite_current_state() {
        let mut c = owner();
        c.request("a".into(), 0, reading(22.)).unwrap();
        c.pending.as_mut().unwrap().started = Instant::now() - Duration::from_secs(6);
        c.expire();
        assert_eq!(c.snapshot.persistence, Persistence::OwnerUnavailable);
        assert!(!c.snapshot.owner_available);
        assert_eq!(
            c.acknowledge("main", "a", 1, Persistence::Saved)
                .unwrap_err()
                .code,
            "settings_stale"
        );
        let mut applied = c.snapshot.values.clone();
        applied.reading_size = 22.;
        c.publish(2, applied).unwrap();
        assert!(c.snapshot.owner_available);
        assert_eq!(c.snapshot.revision, 3);
    }
    #[test]
    fn settings_command_inventory_is_preference_only() {
        let source = include_str!("lib.rs");
        let handler = source
            .split("tauri::generate_handler![")
            .nth(1)
            .unwrap()
            .split("];")
            .next()
            .unwrap();
        for line in handler
            .lines()
            .map(str::trim)
            .filter(|line| line.ends_with(','))
        {
            let command = line.trim_end_matches(',').rsplit("::").next().unwrap();
            if command.starts_with("#") {
                continue;
            }
            let preference = [
                "get_settings_state",
                "apply_settings_change",
                "acknowledge_settings_change",
                "close_settings",
            ]
            .contains(&command);
            assert_eq!(
                command_allowed("settings", command),
                preference,
                "{command}"
            );
            assert!(!command_allowed("other", command));
        }
        let cap: serde_json::Value =
            serde_json::from_str(include_str!("../capabilities/settings.json")).unwrap();
        assert!(
            cap["permissions"].as_array().unwrap().is_empty(),
            "Settings must not subscribe to app-wide file/search events"
        );
    }
    #[test]
    fn restored_custom_width_remains_valid_until_a_deliberate_new_width() {
        let mut c = owner();
        let restored = Preferences {
            reading_width: 1400.,
            ..Preferences::default()
        };
        c.publish(0, restored).unwrap();
        c.request(
            "size".into(),
            1,
            Patch {
                reading_size: Some(22.),
                reading_width: Some(1400.),
                ..Patch::default()
            },
        )
        .unwrap();
        assert_eq!(
            c.acknowledge("main", "size", 2, Persistence::Saved)
                .unwrap()
                .values
                .reading_width,
            1400.
        );
        assert!(c
            .request(
                "width".into(),
                2,
                Patch {
                    reading_width: Some(1500.),
                    ..Patch::default()
                }
            )
            .is_err());
    }

    #[cfg(all(feature = "settings-contract-tests", target_os = "windows"))]
    #[test]
    #[ignore = "real Windows/WebView2 window probe; run separately and serially with disposable profile"]
    fn windows_webview2_settings_singleton_and_real_ipc_denial() {
        use std::sync::{
            atomic::{AtomicBool, Ordering},
            Arc,
        };
        use tauri::{webview::PageLoadEvent, WebviewUrl};
        let fixture = crate::platform::test_support::FixtureDir::new("ir04-webview2");
        let profile = fixture.join("profile");
        crate::platform::storage::ensure_private_dir(&profile).unwrap();
        let source = include_str!("lib.rs");
        let commands: Vec<&str> = source
            .split("tauri::generate_handler![")
            .nth(1)
            .unwrap()
            .split("];")
            .next()
            .unwrap()
            .lines()
            .map(str::trim)
            .filter(|line| line.ends_with(','))
            .map(|line| line.trim_end_matches(',').rsplit("::").next().unwrap())
            .filter(|cmd| !cmd.starts_with('#') && !command_allowed("settings", cmd))
            .collect();
        let script = format!(
            r#"
          (async () => {{
            const invoke = window.__TAURI_INTERNALS__.invoke;
            try {{
              for (const cmd of {}) {{
                let denied = false;
                try {{ await invoke(cmd, {{ fileId: 'untrusted', path: 'C:\\secret' }}); }}
                catch (e) {{ denied = e?.code === 'settings_denied'; }}
                if (!denied) throw new Error('not denied: ' + cmd);
              }}
              for (const [cmd, args] of [
                ['plugin:event|listen', {{ event: 'folder-search:batch', target: {{kind:'Any'}}, handler: 1 }}],
                ['plugin:event|emit', {{ event: 'settings:intent', payload: {{}} }}],
                ['plugin:path|resolve', {{ paths: ['C:\\secret'] }}],
                ['plugin:window|close', {{ label: 'main' }}]
              ]) {{
                let denied = false;
                try {{ await invoke(cmd, args); }} catch (e) {{ denied = String(e).includes('not allowed') || String(e).includes('denied'); }}
                if (!denied) throw new Error('plugin not denied: ' + cmd);
              }}
              const s = await invoke('get_settings_state');
              if (s.group !== 'ProjectTree' || !s.ownerAvailable) throw new Error('wrong owner/group');
              const next = await invoke('apply_settings_change', {{ requestId: 'native_probe_pass', expectedRevision: s.revision, patch: {{ language: 'es' }} }});
              await invoke('acknowledge_settings_change', {{ requestId: 'native_probe_pass', revision: next.revision, persistence: 'saved' }});
              await invoke('close_settings');
            }} catch (e) {{ console.error('IR04 probe failed', e); }}
          }})();
        "#,
            serde_json::to_string(&commands).unwrap()
        );
        let mut context = tauri::generate_context!();
        context.config_mut().identifier =
            format!("com.intentgrove.ir04probe.{}", uuid::Uuid::new_v4());
        context.config_mut().build.dev_url = None;
        let passed = Arc::new(AtomicBool::new(false));
        let finished = passed.clone();
        let workspace_close = Arc::new(AtomicBool::new(false));
        let observed_close = workspace_close.clone();
        let profile_settings = profile.clone();
        let app = tauri::Builder::default()
            .any_thread()
            .manage(SettingsState(Mutex::new(owner()), Some(profile_settings)))
            .invoke_handler(|invoke: tauri::ipc::Invoke| {
                let Some(invoke) = authorize_invoke(invoke) else {
                    return true;
                };
                let handler: fn(tauri::ipc::Invoke) -> bool = tauri::generate_handler![
                    get_settings_state,
                    apply_settings_change,
                    acknowledge_settings_change,
                    close_settings
                ];
                handler(invoke)
            })
            .on_page_load(move |webview, payload| {
                if webview.label() == "settings" && payload.event() == PageLoadEvent::Finished {
                    webview.eval(&script).unwrap();
                }
            })
            .on_window_event(move |window, event| {
                if handle_window_event(window, event) {
                    return;
                }
                if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                    observed_close.store(true, Ordering::SeqCst);
                }
            })
            .setup(move |app| {
                tauri::WebviewWindowBuilder::new(
                    app,
                    "main",
                    WebviewUrl::App("ir04-empty.html".into()),
                )
                .visible(true)
                .data_directory(profile.clone())
                .build()?;
                show(app.handle(), Group::General).unwrap();
                show(app.handle(), Group::Reading).unwrap();
                show(app.handle(), Group::ProjectTree).unwrap();
                assert_eq!(app.webview_windows().len(), 2);
                assert!(
                    app.get_webview_window("settings")
                        .unwrap()
                        .inner_size()
                        .unwrap()
                        .width
                        > 0
                );
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    let deadline = Instant::now() + Duration::from_secs(25);
                    while Instant::now() < deadline {
                        let complete = {
                            let state = handle.state::<SettingsState>();
                            let c = state.0.lock().unwrap();
                            c.snapshot.request_id.as_deref() == Some("native_probe_pass")
                                && c.snapshot.persistence == Persistence::Saved
                        };
                        let closed = handle.get_webview_window("settings").is_none();
                        let focused = handle
                            .get_webview_window("main")
                            .is_some_and(|w| w.is_focused().unwrap_or(false));
                        if complete && closed && focused {
                            finished.store(true, Ordering::SeqCst);
                            handle.exit(0);
                            return;
                        }
                        std::thread::sleep(Duration::from_millis(50));
                    }
                    handle.exit(2);
                });
                Ok(())
            })
            .build(context)
            .unwrap();
        let exit = app.run_return(|_, _| {});
        assert_eq!(exit, 0, "WebView2 did not confirm real Settings IPC probes");
        assert!(passed.load(Ordering::SeqCst));
        assert!(!workspace_close.load(Ordering::SeqCst));
        println!("IR04 real Windows/WebView2: singleton, all {} application-command refusals, 4 plugin refusals, typed General request/ack, Settings close preserves workspace and restores native focus PASS", commands.len());
    }
    #[cfg(feature = "settings-contract-tests")]
    #[test]
    fn direct_tauri_ipc_probes_deny_workspace_commands_before_handler_side_effects() {
        use std::sync::{
            atomic::{AtomicUsize, Ordering},
            Arc,
        };
        use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, INVOKE_KEY};
        let calls = Arc::new(AtomicUsize::new(0));
        let observed = calls.clone();
        let app = mock_builder()
            .invoke_handler(move |invoke| {
                if let Some(invoke) = authorize_invoke(invoke) {
                    observed.fetch_add(1, Ordering::SeqCst);
                    invoke.resolver.resolve("reached");
                }
                true
            })
            .build(mock_context(noop_assets()))
            .unwrap();
        let settings = tauri::WebviewWindowBuilder::new(&app, "settings", Default::default())
            .build()
            .unwrap();
        let main = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let source = include_str!("lib.rs");
        let handler = source
            .split("tauri::generate_handler![")
            .nth(1)
            .unwrap()
            .split("];")
            .next()
            .unwrap();
        let request = |command: &str| tauri::webview::InvokeRequest {
            cmd: command.into(),
            callback: tauri::ipc::CallbackFn(0),
            error: tauri::ipc::CallbackFn(1),
            url: "http://tauri.localhost".parse().unwrap(),
            body: tauri::ipc::InvokeBody::Json(
                serde_json::json!({"fileId":"untrusted", "path":"C:\\secret"}),
            ),
            headers: Default::default(),
            invoke_key: INVOKE_KEY.into(),
        };
        let mut denied = 0;
        for line in handler
            .lines()
            .map(str::trim)
            .filter(|line| line.ends_with(','))
        {
            let command = line.trim_end_matches(',').rsplit("::").next().unwrap();
            if command.starts_with('#') || command_allowed("settings", command) {
                continue;
            }
            let result = get_ipc_response(&settings, request(command));
            assert_eq!(result.unwrap_err()["code"], "settings_denied", "{command}");
            denied += 1;
        }
        assert!(denied > 50);
        assert_eq!(calls.load(Ordering::SeqCst), 0);
        assert!(get_ipc_response(&main, request("read_document")).is_ok());
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }
}
