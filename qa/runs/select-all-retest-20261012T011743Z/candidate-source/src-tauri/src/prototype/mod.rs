//! Read-only document lifecycle. No player, navigation, overlays or mutable graph state.
mod loader;
mod session;
pub(crate) mod commands;
pub(crate) use loader::fingerprint;
pub(crate) use session::{dispose, open, reload, status, PrototypeService};
use crate::scope::AppError;
use serde::Serialize;
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all="camelCase")]
pub struct Metadata {
    pub title: Option<String>, pub entry_scene: String, pub viewport: igproto_model::Viewport,
    pub format_version: u32, pub scene_count: usize, pub read_only: bool,
    /// Full restart/reload always creates a fresh Phase 4 runtime at entry; no runtime state persists.
    pub restore_to_entry: bool,
}
pub(super) fn package_error(report: igproto_package::Report) -> AppError {
    use igproto_model::{Code, Stage};
    let code = if report.diagnostics.iter().any(|d| d.code == Code::UnsupportedVersion) { "prototype_version_unsupported" }
    else if report.diagnostics.iter().any(|d| d.stage == Stage::Limit) { "prototype_limit" }
    else if report.diagnostics.iter().any(|d| d.message.contains("SHA-256") || d.message.contains("CRC")) { "prototype_integrity" }
    else { "prototype_invalid" };
    let mut error = AppError::new(code, match code {
        "prototype_version_unsupported" => "This prototype uses an unsupported version. This build supports .igproto version 1.",
        "prototype_limit" => "Prototype exceeds a package security limit.",
        "prototype_integrity" => "Prototype integrity verification failed.",
        _ => "Invalid prototype package.",
    });
    error.package_diagnostics = Some(report); error
}
