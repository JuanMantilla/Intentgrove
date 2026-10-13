//! Read-only document lifecycle. No player, navigation, overlays or mutable graph state.
pub(crate) mod commands;
mod loader;
mod session;
use crate::scope::AppError;
pub(crate) use loader::fingerprint;
use serde::Serialize;
pub(crate) use session::{dispose, open, reload, status, PrototypeService};
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metadata {
    pub title: Option<String>,
    pub entry_scene: String,
    pub viewport: igproto_model::Viewport,
    pub format_version: u32,
    pub scene_count: usize,
    pub read_only: bool,
    /// Full restart/reload always creates a fresh Phase 4 runtime at entry; no runtime state persists.
    pub restore_to_entry: bool,
}
pub(super) fn package_error(report: igproto_package::Report) -> AppError {
    use igproto_model::{Code, Stage};
    let code = if report
        .diagnostics
        .iter()
        .any(|d| d.code == Code::UnsupportedVersion)
    {
        "prototype_version_unsupported"
    } else if report.diagnostics.iter().any(|d| d.stage == Stage::Limit) {
        "prototype_limit"
    } else if report
        .diagnostics
        .iter()
        .any(|d| d.message.contains("SHA-256") || d.message.contains("CRC"))
    {
        "prototype_integrity"
    } else {
        "prototype_invalid"
    };
    let mut error = AppError::new(code, match code {
        "prototype_version_unsupported" => "This prototype uses an unsupported version. This build supports .igproto version 1.",
        "prototype_limit" => "Prototype exceeds a package security limit.",
        "prototype_integrity" => "Prototype integrity verification failed.",
        _ => "Invalid prototype package.",
    });
    error.package_diagnostics = Some(report);
    error
}

/// Immutable Phase 4 input. No ZIP traversal, paths, URLs or host-resource access.
#[derive(Clone)]
pub(crate) struct ValidatedResources(std::sync::Arc<igproto_package::ValidatedPackage>);
#[allow(dead_code)] // Reserved native consumer boundary; Phase 3 deliberately supplies no player.
impl ValidatedResources {
    pub(crate) fn manifest(&self) -> &igproto_model::Manifest {
        self.0.manifest()
    }
    pub(crate) fn graph(&self) -> &igproto_model::Prototype {
        self.0.prototype()
    }
    pub(crate) fn sha256(&self) -> &str {
        self.0.sha256()
    }
    pub(crate) fn scene(&self, id: &igproto_model::SceneId) -> Option<&[u8]> {
        self.0
            .prototype()
            .scenes
            .iter()
            .find(|s| &s.id == id)
            .and_then(|s| self.0.member(&s.visual))
    }
    pub(crate) fn asset(&self, digest: &str) -> Option<&[u8]> {
        if digest.len() != 64
            || !digest
                .bytes()
                .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        {
            return None;
        }
        self.0.member(&format!("assets/{digest}.png"))
    }
    #[cfg(test)]
    pub(super) fn weak(&self) -> std::sync::Weak<igproto_package::ValidatedPackage> {
        std::sync::Arc::downgrade(&self.0)
    }
}
