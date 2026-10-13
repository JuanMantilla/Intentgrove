use super::{loader, Metadata};
use crate::{
    document_view::{current, LocalView},
    scope::{AppError, AppResult},
    state::{AppState, FileGrant},
};
use igproto_package::{Control, ValidatedPackage};
use serde::Serialize;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex, MutexGuard,
    },
};
pub(crate) struct PrototypeService {
    documents: Mutex<HashMap<String, PrototypeDocument>>,
    pending: AtomicUsize,
    admission_gate: Mutex<()>,
    loads: Mutex<HashMap<String, PendingLoad>>,
    accepting: AtomicBool,
}
struct PendingLoad {
    control: Control,
    owner: Option<String>,
}
impl Default for PrototypeService {
    fn default() -> Self {
        Self {
            documents: Mutex::default(),
            pending: AtomicUsize::new(0),
            admission_gate: Mutex::default(),
            loads: Mutex::default(),
            accepting: AtomicBool::new(true),
        }
    }
}
struct Admission<'a> {
    service: &'a PrototypeService,
    id: String,
    _gate: Option<MutexGuard<'a, ()>>,
}
impl Drop for Admission<'_> {
    fn drop(&mut self) {
        self.service.loads.lock().unwrap().remove(&self.id);
        self.service.pending.fetch_sub(1, Ordering::SeqCst);
    }
}
fn reserve(expanded: usize, decoded: u64) -> AppResult<()> {
    // Reserve a full production package before parsing; no duplicate archive/image inspection in the app.
    if expanded > 256 * igproto_package::limits::MIB - igproto_package::limits::EXPANDED
        || decoded > 256 * igproto_package::limits::MIB as u64 - igproto_package::limits::DECODED
    {
        Err(AppError::new(
            "prototype_limit",
            "Aggregate package reservation exceeds 256 MiB; close another prototype",
        ))
    } else {
        Ok(())
    }
}
fn reserve_documents(docs: &HashMap<String, PrototypeDocument>) -> AppResult<()> {
    let (expanded, decoded) = docs.values().fold((0, 0), |(e, d), doc| {
        let usage = doc.package.resource_usage();
        (e + usage.expanded_bytes, d + usage.decoded_png_bytes)
    });
    reserve(expanded, decoded)
}
struct PrototypeDocument {
    source: FileGrant,
    descriptor: LocalView,
    package: Arc<ValidatedPackage>,
    last_request: u64,
    reload_error: Option<AppError>,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Status {
    pub view: LocalView,
    pub changed: bool,
    pub reload_error: Option<AppError>,
}
impl PrototypeService {
    fn admit(&self, control: &Control, owner: Option<&str>) -> AppResult<Admission<'_>> {
        let mut loads = self.loads.lock().unwrap();
        if !self.accepting.load(Ordering::SeqCst) {
            return Err(AppError::new("stale_view", "Prototype documents unloaded"));
        }
        self.pending
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |n| {
                (n < 2).then_some(n + 1)
            })
            .map_err(|_| AppError::new("prototype_limit", "At most two pending prototype loads"))?;
        let id = uuid::Uuid::new_v4().to_string();
        loads.insert(
            id.clone(),
            PendingLoad {
                control: control.clone(),
                owner: owner.map(str::to_owned),
            },
        );
        drop(loads);
        let mut admission = Admission {
            service: self,
            id,
            _gate: None,
        };
        admission._gate = Some(self.admission_gate.lock().unwrap());
        control.check("admission").map_err(super::package_error)?;
        Ok(admission)
    }
    pub(crate) fn clear(&self) {
        self.stop(false);
    }
    pub(crate) fn shutdown(&self) {
        self.stop(true);
    }
    pub(crate) fn restart(&self) {
        self.clear();
        self.accepting.store(true, Ordering::SeqCst);
    }
    fn stop(&self, shutdown: bool) {
        let loads = self.loads.lock().unwrap();
        if shutdown {
            self.accepting.store(false, Ordering::SeqCst);
        }
        for load in loads.values() {
            load.control.cancel();
        }
        drop(loads);
        self.documents.lock().unwrap().clear();
    }
    pub(crate) fn has_file(&self, id: &str) -> bool {
        self.documents
            .lock()
            .unwrap()
            .values()
            .any(|d| d.source.id == id)
    }
    /// Only admitted scene/asset resources; no filesystem, URL, extraction or arbitrary archive traversal.
    #[allow(dead_code)] // Phase 4 native consumer, deliberately no IPC or scheme server in Phase 3.
    pub(crate) fn package(
        &self,
        state: &AppState,
        token: &str,
        generation: u64,
    ) -> AppResult<super::ValidatedResources> {
        let mut docs = self.documents.lock().unwrap();
        let doc = checked(&docs, token, generation)?;
        if let Err(e) = current(state, &doc.source) {
            let id = doc.source.id.clone();
            docs.remove(token);
            state.release_prototype_file(&id)?;
            return Err(e);
        }
        Ok(super::ValidatedResources(docs[token].package.clone()))
    }
}
fn checked<'a>(
    docs: &'a HashMap<String, PrototypeDocument>,
    token: &str,
    generation: u64,
) -> AppResult<&'a PrototypeDocument> {
    docs.get(token)
        .filter(|d| d.descriptor.generation == generation)
        .ok_or_else(|| AppError::new("stale_view", "Prototype document expired"))
}
pub(crate) fn open(
    state: &AppState,
    source: FileGrant,
    expected: Option<&str>,
    control: &Control,
) -> AppResult<(LocalView, bool)> {
    if !cfg!(all(target_os = "macos", target_arch = "aarch64")) {
        return Err(AppError::new(
            "prototype_platform_unsupported",
            "Prototypes require macOS arm64",
        ));
    }
    let _admission = state.prototypes.admit(control, None)?;
    current(state, &source)?;
    let identity = format!("{}:{}", source.identity.device, source.identity.inode);
    if expected.is_some_and(|v| v != identity) {
        return Err(AppError::new(
            "reselection_required",
            "Expected identity changed",
        ));
    }
    // Reserve before loading, but never hold the document registry over package I/O/validation.
    {
        let docs = state.prototypes.documents.lock().unwrap();
        reserve_documents(&docs)?;
        if docs.len() >= 4 && !docs.values().any(|d| d.descriptor.identity_key == identity) {
            return Err(AppError::new(
                "prototype_limit",
                "At most four live prototype documents",
            ));
        }
    }
    let package = loader::load(state, &source, control)?;
    let mut docs = state.prototypes.documents.lock().unwrap();
    control.check("publish").map_err(super::package_error)?;
    current(state, &source)?;
    if let Some(doc) = docs
        .values_mut()
        .find(|d| d.descriptor.identity_key == identity)
    {
        current(state, &doc.source)?;
        doc.source = state.rebind_prototype_file(&doc.source.id, &source)?;
        doc.descriptor.name = doc.source.name.clone();
        doc.descriptor.display_path = doc.source.display_path.clone();
        return Ok((doc.descriptor.clone(), false));
    }
    let metadata = Metadata {
        title: package.manifest().title.clone(),
        entry_scene: package.prototype().entry.to_string(),
        viewport: package.manifest().viewport.clone(),
        format_version: 1,
        scene_count: package.prototype().scenes.len(),
        read_only: true,
        restore_to_entry: true,
    };
    let token = uuid::Uuid::new_v4().to_string();
    let descriptor = LocalView {
        file_id: source.id.clone(),
        identity_key: identity,
        disk_version: package.sha256().into(),
        name: source.name.clone(),
        display_path: source.display_path.clone(),
        kind: "prototype",
        view_token: Some(token.clone()),
        generation: 1,
        bytes: crate::scope::size(&current(state, &source)?)?,
        extension: "igproto".into(),
        prototype: Some(metadata),
        acquired_new: false,
    };
    docs.insert(
        token,
        PrototypeDocument {
            source,
            descriptor: descriptor.clone(),
            package: Arc::new(package),
            last_request: 0,
            reload_error: None,
        },
    );
    let mut acquired = descriptor;
    acquired.acquired_new = true;
    Ok((acquired, true))
}
pub(crate) fn status(state: &AppState, token: &str, generation: u64) -> AppResult<Status> {
    let source = {
        let docs = state.prototypes.documents.lock().unwrap();
        checked(&docs, token, generation)?.source.clone()
    };
    let result = loader::fingerprint(state, &source.id);
    let mut docs = state.prototypes.documents.lock().unwrap();
    let doc = checked(&docs, token, generation)?;
    match result {
        Ok((digest, _)) => Ok(Status {
            view: doc.descriptor.clone(),
            changed: digest != doc.descriptor.disk_version,
            reload_error: doc.reload_error.clone(),
        }),
        Err(e) => {
            if current(state, &source).is_err() {
                docs.remove(token);
                state.release_prototype_file(&source.id)?;
            }
            Err(e)
        }
    }
}
pub(crate) fn reload(
    state: &AppState,
    token: &str,
    generation: u64,
    request: u64,
    control: &Control,
) -> AppResult<Status> {
    let _admission = state.prototypes.admit(control, Some(token))?;
    let source = {
        let mut docs = state.prototypes.documents.lock().unwrap();
        reserve_documents(&docs)?;
        let doc = checked(&docs, token, generation)?;
        if request <= doc.last_request {
            return Err(AppError::new("stale_request", "Reload superseded"));
        }
        let doc = docs.get_mut(token).unwrap();
        doc.last_request = request;
        doc.source.clone()
    };
    let candidate = loader::load(state, &source, control);
    let authority = current(state, &source);
    let mut docs = state.prototypes.documents.lock().unwrap();
    let doc = checked(&docs, token, generation)?;
    if doc.last_request != request {
        return Err(AppError::new("stale_request", "Reload superseded"));
    }
    if let Err(e) = authority {
        docs.remove(token);
        state.release_prototype_file(&source.id)?;
        return Err(e);
    }
    let doc = docs.get_mut(token).unwrap();
    match candidate {
        Ok(package) => {
            doc.descriptor.generation += 1;
            doc.descriptor.disk_version = package.sha256().into();
            doc.descriptor.bytes = crate::scope::size(&current(state, &source)?)?;
            let metadata = doc.descriptor.prototype.as_mut().unwrap();
            metadata.title = package.manifest().title.clone();
            metadata.entry_scene = package.prototype().entry.to_string();
            metadata.viewport = package.manifest().viewport.clone();
            metadata.scene_count = package.prototype().scenes.len();
            doc.package = Arc::new(package);
            doc.reload_error = None;
            Ok(Status {
                view: doc.descriptor.clone(),
                changed: false,
                reload_error: None,
            })
        }
        Err(e) => {
            doc.reload_error = Some(e);
            Ok(Status {
                view: doc.descriptor.clone(),
                changed: true,
                reload_error: doc.reload_error.clone(),
            })
        }
    }
}
pub(crate) fn dispose(
    state: &AppState,
    token: &str,
    generation: u64,
    release_grant: bool,
) -> AppResult<bool> {
    let mut docs = state.prototypes.documents.lock().unwrap();
    if docs
        .get(token)
        .is_none_or(|d| d.descriptor.generation < generation)
    {
        return Ok(false);
    }
    for load in state.prototypes.loads.lock().unwrap().values() {
        if load.owner.as_deref() == Some(token) {
            load.control.cancel();
        }
    }
    let doc = docs.remove(token).unwrap();
    if release_grant {
        state.release_prototype_file(&doc.source.id)?;
    }
    Ok(true)
}
#[cfg(all(test, target_os = "macos", target_arch = "aarch64"))]
#[path = "tests.rs"]
mod tests;
