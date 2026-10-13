use super::{loader, Metadata};
use crate::{document_view::{current, LocalView}, scope::{AppError, AppResult}, state::{AppState, FileGrant}};
use igproto_package::{Control, ValidatedPackage};
use std::{collections::HashMap, sync::{Arc, Mutex}};
use serde::Serialize;
#[derive(Default)]
pub(crate) struct PrototypeService { documents: Mutex<HashMap<String, PrototypeDocument>> }
struct PrototypeDocument { source: FileGrant, descriptor: LocalView, package: Arc<ValidatedPackage>, last_request: u64, reload_error: Option<AppError> }
#[derive(Clone, Serialize)]
#[serde(rename_all="camelCase")]
pub(crate) struct Status { pub view: LocalView, pub changed: bool, pub reload_error: Option<AppError> }
impl PrototypeService {
    pub(crate) fn clear(&self) { self.documents.lock().unwrap().clear(); }
    /// Only admitted scene/asset resources; no filesystem, URL, extraction or arbitrary archive traversal.
    #[allow(dead_code)] // Phase 4 native consumer, deliberately no IPC or scheme server in Phase 3.
    pub(crate) fn package(&self, state: &AppState, token: &str, generation: u64) -> AppResult<Arc<ValidatedPackage>> {
        let mut docs = self.documents.lock().unwrap();
        let doc = checked(&docs, token, generation)?;
        if let Err(e) = current(state, &doc.source) { docs.remove(token); return Err(e); }
        Ok(docs[token].package.clone())
    }
}
fn checked<'a>(docs: &'a HashMap<String, PrototypeDocument>, token: &str, generation: u64) -> AppResult<&'a PrototypeDocument> {
    docs.get(token).filter(|d| d.descriptor.generation == generation).ok_or_else(|| AppError::new("stale_view", "Prototype document expired"))
}
pub(crate) fn open(state: &AppState, source: FileGrant, expected: Option<&str>, control: &Control) -> AppResult<(LocalView, bool)> {
    if !cfg!(all(target_os="macos", target_arch="aarch64")) { return Err(AppError::new("prototype_platform_unsupported", "Prototypes require macOS arm64")); }
    current(state, &source)?;
    let identity = format!("{}:{}", source.identity.device, source.identity.inode);
    if expected.is_some_and(|v| v != identity) { return Err(AppError::new("reselection_required", "Expected identity changed")); }
    // Bound admission and retained memory to four packages. Duplicate opens reuse the same immutable session.
    let mut docs = state.prototypes.documents.lock().unwrap();
    if let Some(doc) = docs.values_mut().find(|d| d.descriptor.identity_key == identity) {
        current(state, &doc.source)?;
        // Reopen is a new trust boundary even when focusing an existing document.
        let _candidate = loader::load(state, &source, control)?;
        control.check("open").map_err(super::package_error)?;
        doc.source = source.clone();
        doc.descriptor.file_id = source.id.clone();
        return Ok((doc.descriptor.clone(), false));
    }
    if docs.len() >= 4 { return Err(AppError::new("prototype_limit", "At most four live prototype documents")); }
    let package = loader::load(state, &source, control)?;
    control.check("publish").map_err(super::package_error)?;
    let metadata = Metadata { title: package.manifest().title.clone(), entry_scene: package.prototype().entry.to_string(), viewport: package.manifest().viewport.clone(), format_version: 1, scene_count: package.prototype().scenes.len(), read_only: true, restore_to_entry: true };
    let token = uuid::Uuid::new_v4().to_string();
    let descriptor = LocalView { file_id: source.id.clone(), identity_key: identity, disk_version: package.sha256().into(), name: source.name.clone(), display_path: source.display_path.clone(), kind: "prototype", view_token: Some(token.clone()), generation: 1, bytes: crate::scope::size(&current(state, &source)?)?, extension: "igproto".into(), prototype: Some(metadata) };
    docs.insert(token, PrototypeDocument { source, descriptor: descriptor.clone(), package: Arc::new(package), last_request: 0, reload_error: None });
    Ok((descriptor, true))
}
pub(crate) fn status(state: &AppState, token: &str, generation: u64) -> AppResult<Status> {
    let mut docs = state.prototypes.documents.lock().unwrap();
    let doc = checked(&docs, token, generation)?;
    let result = loader::fingerprint(state, &doc.source.id);
    match result {
        Ok((digest,_)) => Ok(Status { view: doc.descriptor.clone(), changed: digest != doc.descriptor.disk_version, reload_error: doc.reload_error.clone() }),
        Err(e) => {
            if current(state, &doc.source).is_err() { docs.remove(token); }
            Err(e)
        }
    }
}
pub(crate) fn reload(state: &AppState, token: &str, generation: u64, request: u64, control: &Control) -> AppResult<Status> {
    let source = {
        let mut docs = state.prototypes.documents.lock().unwrap();
        let doc = checked(&docs, token, generation)?;
        if request <= doc.last_request { return Err(AppError::new("stale_request", "Reload superseded")); }
        let doc = docs.get_mut(token).unwrap(); doc.last_request=request; doc.source.clone()
    };
    let candidate = loader::load(state, &source, control);
    let authority = current(state, &source);
    let mut docs = state.prototypes.documents.lock().unwrap();
    let doc = checked(&docs, token, generation)?;
    if doc.last_request != request { return Err(AppError::new("stale_request", "Reload superseded")); }
    if let Err(e) = authority { docs.remove(token); return Err(e); }
    let doc = docs.get_mut(token).unwrap();
    match candidate {
        Ok(package) => {
            doc.descriptor.generation += 1;
            doc.descriptor.disk_version = package.sha256().into();
            doc.descriptor.bytes = crate::scope::size(&current(state, &source)?)?;
            let metadata = doc.descriptor.prototype.as_mut().unwrap();
            metadata.title=package.manifest().title.clone(); metadata.entry_scene=package.prototype().entry.to_string(); metadata.viewport=package.manifest().viewport.clone(); metadata.scene_count=package.prototype().scenes.len();
            doc.package=Arc::new(package); doc.reload_error=None;
            Ok(Status { view: doc.descriptor.clone(), changed: false, reload_error: None })
        }
        Err(e) => { doc.reload_error=Some(e); Ok(Status { view: doc.descriptor.clone(), changed: true, reload_error: doc.reload_error.clone() }) }
    }
}
pub(crate) fn dispose(state: &AppState, token: &str, generation: u64, release_grant: bool) -> AppResult<bool> {
    let mut docs = state.prototypes.documents.lock().unwrap();
    if docs.get(token).is_none_or(|d| d.descriptor.generation < generation) { return Ok(false); }
    let doc = docs.remove(token).unwrap();
    if release_grant { state.release_prototype_file(&doc.source.id)?; }
    Ok(true)
}
#[cfg(all(test, target_os="macos", target_arch="aarch64"))]
#[path="tests.rs"]
mod tests;
