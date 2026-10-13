use crate::scope::{identity, open_selected, AppError, AppResult, Entry, Identity};
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    inner: Arc<Mutex<Registry>>,
    pub(crate) prototypes: Arc<crate::prototype::PrototypeService>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            inner: Arc::new(Mutex::new(Registry::default())),
            prototypes: Arc::default(),
        }
    }
}

#[derive(Default)]
struct Registry {
    roots: HashMap<String, RootGrant>,
    files: HashMap<String, FileGrant>,
    snapshots: HashMap<String, DirectorySnapshot>,
    cancelled: HashSet<String>,
    generation: u64,
    selection_epoch: u64,
    pending_root: Option<(String, PathBuf, Identity, u64)>,
}

#[derive(Clone)]
pub struct RootGrant {
    pub id: String,
    pub file: Arc<File>,
    pub path: PathBuf,
    pub identity: Identity,
    pub generation: u64,
}

impl RootGrant {
    pub fn verify_current(&self) -> AppResult<()> {
        let current = match open_selected(&self.path, true) {
            Ok(file) => file,
            Err(error) if matches!(error.code, "missing" | "unsupported_type") => {
                return Err(AppError::new(
                    "root_reselection_required",
                    "Selected folder changed; select it again",
                ));
            }
            Err(error) => return Err(error),
        };
        if identity(&current)? != self.identity {
            return Err(AppError::new(
                "root_reselection_required",
                "Selected folder changed; select it again",
            ));
        }
        Ok(())
    }
}

#[derive(Clone)]
pub enum FileSource {
    Root {
        root_id: String,
        segments: Vec<String>,
    },
    Explicit {
        file: Arc<File>,
        path: PathBuf,
    },
}

#[derive(Clone)]
pub struct FileGrant {
    pub id: String,
    pub source: FileSource,
    pub identity: Identity,
    pub name: String,
    pub display_path: String,
}

#[derive(Clone)]
pub struct DirectorySnapshot {
    pub id: String,
    pub root_id: String,
    pub segments: Vec<String>,
    pub generation: u64,
    pub stamp: String,
    pub entries: Arc<Vec<Entry>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrantInfo {
    pub id: String,
    pub name: String,
    pub display_path: String,
    pub generation: u64,
}

impl AppState {
    pub fn prepare_root(&self, path: &Path) -> AppResult<String> {
        let selected = open_selected(path, true)?;
        let selected_identity = identity(&selected)?;
        let token = Uuid::new_v4().to_string();
        let mut state = self.lock()?;
        state.selection_epoch = state.selection_epoch.wrapping_add(1);
        let epoch = state.selection_epoch;
        state.pending_root = Some((token.clone(), path.to_path_buf(), selected_identity, epoch));
        Ok(token)
    }

    pub fn commit_prepared_root(&self, token: &str) -> AppResult<GrantInfo> {
        let (path, expected, epoch) = {
            let mut state = self.lock()?;
            let Some((stored_token, path, identity, epoch)) = state.pending_root.take() else {
                return Err(AppError::new(
                    "invalid_grant",
                    "No folder choice is pending",
                ));
            };
            if stored_token != token {
                state.pending_root = Some((stored_token, path, identity, epoch));
                return Err(AppError::new(
                    "invalid_grant",
                    "Folder choice token is invalid",
                ));
            }
            (path, identity, epoch)
        };
        self.register_root_with_identity(&path, Some(expected), Some(epoch))
    }

    pub fn cancel_prepared_root(&self, token: &str) -> AppResult<()> {
        let mut state = self.lock()?;
        if state
            .pending_root
            .as_ref()
            .is_some_and(|(stored, ..)| stored == token)
        {
            state.pending_root = None;
        }
        Ok(())
    }
    fn lock(&self) -> AppResult<std::sync::MutexGuard<'_, Registry>> {
        self.inner
            .lock()
            .map_err(|_| AppError::new("internal", "Grant state is unavailable"))
    }

    pub fn register_root(&self, path: &Path) -> AppResult<GrantInfo> {
        self.register_root_with_identity(path, None, None)
    }

    /// Rebuild authority only from a previously native-recorded selection.
    /// The identity check and grant insertion use the same opened handle.
    pub(crate) fn restore_root(&self, path: &Path, expected: Identity) -> AppResult<GrantInfo> {
        self.register_root_with_identity(path, Some(expected), Some(0))
    }

    pub(crate) fn reopen_root(
        &self,
        path: &Path,
        expected: Identity,
        expected_epoch: u64,
    ) -> AppResult<GrantInfo> {
        self.register_root_with_identity(path, Some(expected), Some(expected_epoch))
    }

    fn register_root_with_identity(
        &self,
        path: &Path,
        expected: Option<Identity>,
        expected_epoch: Option<u64>,
    ) -> AppResult<GrantInfo> {
        let file = open_selected(path, true)?;
        let selected_identity = identity(&file)?;
        if expected.is_some_and(|value| value != selected_identity) {
            return Err(AppError::new(
                "root_reselection_required",
                "Selected folder changed; select it again",
            ));
        }
        let id = Uuid::new_v4().to_string();
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.display().to_string());
        let mut state = self.lock()?;
        if expected_epoch.is_some_and(|value| value != state.selection_epoch) {
            return Err(AppError::new(
                "cancelled",
                "Session restore was replaced by a new selection",
            ));
        }
        state.generation = state.generation.wrapping_add(1);
        state.selection_epoch = state.selection_epoch.wrapping_add(1);
        let grant = RootGrant {
            id: id.clone(),
            file: Arc::new(file),
            path: path.to_path_buf(),
            identity: selected_identity,
            generation: state.generation,
        };
        state.roots.clear();
        state.files.clear();
        state.snapshots.clear();
        state.cancelled.clear();
        state.roots.insert(id.clone(), grant);
        let generation = state.generation;
        drop(state);
        self.prototypes.clear();
        Ok(GrantInfo {
            id,
            name,
            display_path: path.display().to_string(),
            generation,
        })
    }

    pub fn register_explicit_file(&self, path: &Path) -> AppResult<GrantInfo> {
        self.register_explicit_file_with_identity(path, None, None)
    }

    pub(crate) fn restore_explicit_file(
        &self,
        path: &Path,
        expected: Identity,
        expected_epoch: u64,
    ) -> AppResult<GrantInfo> {
        self.register_explicit_file_with_identity(path, Some(expected), Some(expected_epoch))
    }

    fn register_explicit_file_with_identity(
        &self,
        path: &Path,
        expected: Option<Identity>,
        expected_epoch: Option<u64>,
    ) -> AppResult<GrantInfo> {
        let file = open_selected(path, false)?;
        self.register_opened_explicit_file(path, file, expected, expected_epoch)
    }

    /// A deliberate local link grants only the already validated target handle.
    pub(crate) fn register_linked_file(&self, path: &Path, file: File) -> AppResult<GrantInfo> {
        self.register_opened_explicit_file(path, file, None, None)
    }

    fn register_opened_explicit_file(
        &self,
        path: &Path,
        file: File,
        expected: Option<Identity>,
        expected_epoch: Option<u64>,
    ) -> AppResult<GrantInfo> {
        let identity = identity(&file)?;
        if expected.is_some_and(|value| value != identity) {
            return Err(AppError::new(
                "reselection_required",
                "Selected file changed; select it again",
            ));
        }
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.display().to_string());
        let display_path = path.display().to_string();
        let mut state = self.lock()?;
        if expected_epoch.is_some_and(|value| value != state.selection_epoch) {
            return Err(AppError::new(
                "cancelled",
                "Session restore was replaced by a new selection",
            ));
        }
        state.selection_epoch = state.selection_epoch.wrapping_add(1);
        if let Some(existing) = state.files.values().find(|grant| {
            grant.identity == identity && matches!(grant.source, FileSource::Explicit { .. })
        }) {
            return Ok(GrantInfo {
                id: existing.id.clone(),
                name: existing.name.clone(),
                display_path: existing.display_path.clone(),
                generation: state.generation,
            });
        }
        let id = Uuid::new_v4().to_string();
        let grant = FileGrant {
            id: id.clone(),
            source: FileSource::Explicit {
                file: Arc::new(file),
                path: path.to_path_buf(),
            },
            identity,
            name: name.clone(),
            display_path: display_path.clone(),
        };
        state.files.insert(id.clone(), grant);
        Ok(GrantInfo {
            id,
            name,
            display_path,
            generation: state.generation,
        })
    }

    /// Called only after a new native picker choice, never from a watcher path.
    pub fn reselect_root(&self, previous_id: &str, path: &Path) -> AppResult<GrantInfo> {
        self.reselect_root_with(previous_id, path, |_, _| Ok(()))
    }

    pub fn reselect_root_with(
        &self,
        previous_id: &str,
        path: &Path,
        before_commit: impl FnOnce(&[(String, String, String)], &Path) -> AppResult<()>,
    ) -> AppResult<GrantInfo> {
        let file = open_selected(path, true)?;
        let selected_identity = identity(&file)?;
        let mut registry = self.lock()?;
        let previous = registry
            .roots
            .get(previous_id)
            .ok_or_else(|| AppError::new("invalid_grant", "Folder selection has expired"))?;
        if path != previous.path && selected_identity != previous.identity {
            return Err(AppError::new(
                "root_reselection_required",
                "Select the original folder or its replacement",
            ));
        }
        let moved_files: Vec<_> = registry
            .files
            .values()
            .filter_map(|grant| {
                let FileSource::Root { root_id, segments } = &grant.source else {
                    return None;
                };
                if root_id != previous_id {
                    return None;
                }
                let mut destination = path.to_path_buf();
                for segment in segments {
                    destination.push(segment);
                }
                Some((
                    grant.id.clone(),
                    grant.display_path.clone(),
                    destination.display().to_string(),
                ))
            })
            .collect();
        before_commit(&moved_files, path)?;
        let id = Uuid::new_v4().to_string();
        registry.generation = registry.generation.wrapping_add(1);
        registry.selection_epoch = registry.selection_epoch.wrapping_add(1);
        let generation = registry.generation;
        registry.roots.clear();
        registry.roots.insert(
            id.clone(),
            RootGrant {
                id: id.clone(),
                file: Arc::new(file),
                path: path.to_path_buf(),
                identity: selected_identity,
                generation,
            },
        );
        for grant in registry.files.values_mut() {
            if let FileSource::Root { root_id, segments } = &mut grant.source {
                if root_id == previous_id {
                    *root_id = id.clone();
                    let mut location = path.to_path_buf();
                    for segment in segments {
                        location.push(segment);
                    }
                    grant.display_path = location.display().to_string();
                }
            }
        }
        registry.snapshots.clear();
        registry.cancelled.clear();
        Ok(GrantInfo {
            id,
            name: path
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.display().to_string()),
            display_path: path.display().to_string(),
            generation,
        })
    }

    /// Reauthorize only this file from a picker, keeping sibling access absent.
    pub fn reselect_explicit_file(&self, id: &str, path: &Path) -> AppResult<GrantInfo> {
        self.reselect_explicit_file_with(id, path, |_, _| Ok(()))
    }

    /// Run durable recovery migration after validating the picker selection but
    /// before publishing the new grant. A failed migration leaves the old grant.
    pub fn reselect_explicit_file_with(
        &self,
        id: &str,
        path: &Path,
        before_commit: impl FnOnce(&FileGrant, &Path) -> AppResult<()>,
    ) -> AppResult<GrantInfo> {
        let file = open_selected(path, false)?;
        let selected_identity = identity(&file)?;
        let mut registry = self.lock()?;
        let grant = registry
            .files
            .get_mut(id)
            .ok_or_else(|| AppError::new("invalid_grant", "File selection has expired"))?;
        let FileSource::Explicit {
            path: previous_path,
            ..
        } = &grant.source
        else {
            return Err(AppError::new(
                "invalid_grant",
                "Expected a file-only selection",
            ));
        };
        if path != previous_path && selected_identity != grant.identity {
            return Err(AppError::new(
                "reselection_required",
                "Select the original file or its replacement",
            ));
        }
        before_commit(grant, path)?;
        grant.source = FileSource::Explicit {
            file: Arc::new(file),
            path: path.to_path_buf(),
        };
        grant.identity = selected_identity;
        grant.name = path
            .file_name()
            .map(|name| name.to_string_lossy().into_owned())
            .unwrap_or_default();
        grant.display_path = path.display().to_string();
        let name = grant.name.clone();
        let display_path = grant.display_path.clone();
        registry.selection_epoch = registry.selection_epoch.wrapping_add(1);
        Ok(GrantInfo {
            id: id.to_string(),
            name,
            display_path,
            generation: registry.generation,
        })
    }

    pub fn explicit_file_ids(&self) -> AppResult<Vec<String>> {
        Ok(self
            .lock()?
            .files
            .values()
            .filter(|grant| matches!(grant.source, FileSource::Explicit { .. }))
            .map(|grant| grant.id.clone())
            .collect())
    }

    pub fn root(&self, id: &str) -> AppResult<RootGrant> {
        let root = self
            .lock()?
            .roots
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::new("invalid_grant", "Folder selection has expired"))?;
        root.verify_current()?;
        Ok(root)
    }

    /// Return an existing native-issued selection for session metadata without
    /// treating its current path as an automatically renewed grant.
    pub(crate) fn root_recorded(&self, id: &str) -> AppResult<RootGrant> {
        self.lock()?
            .roots
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::new("invalid_grant", "Folder selection has expired"))
    }

    pub fn file(&self, id: &str) -> AppResult<FileGrant> {
        self.lock()?
            .files
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::new("invalid_grant", "File selection has expired"))
    }

    pub fn update_root_file_identity(&self, id: &str, current: Identity) -> AppResult<FileGrant> {
        let mut state = self.lock()?;
        let grant = state
            .files
            .get_mut(id)
            .ok_or_else(|| AppError::new("invalid_grant", "File selection has expired"))?;
        if !matches!(&grant.source, FileSource::Root { .. }) {
            return Err(AppError::new(
                "invalid_grant",
                "Not a folder file selection",
            ));
        }
        grant.identity = current;
        Ok(grant.clone())
    }

    pub fn update_saved_file_identity(&self, id: &str, current: File) -> AppResult<FileGrant> {
        let new_identity = identity(&current)?;
        let mut state = self.lock()?;
        let grant = state
            .files
            .get_mut(id)
            .ok_or_else(|| AppError::new("invalid_grant", "File selection has expired"))?;
        grant.identity = new_identity;
        if let FileSource::Explicit { file, .. } = &mut grant.source {
            *file = Arc::new(current);
        }
        Ok(grant.clone())
    }

    pub fn register_root_file(
        &self,
        root: &RootGrant,
        segments: Vec<String>,
        file: &File,
    ) -> AppResult<FileGrant> {
        root.verify_current()?;
        let identity = identity(file)?;
        let name = segments
            .last()
            .cloned()
            .ok_or_else(|| AppError::new("invalid_path", "File name is missing"))?;
        let display_path = root.path.join(segments.join("/")).display().to_string();
        let mut state = self.lock()?;
        if state.generation != root.generation || !state.roots.contains_key(&root.id) {
            return Err(AppError::new("version_changed", "Folder selection changed"));
        }
        if let Some(existing) = state.files.values_mut().find(|grant| {
            matches!(&grant.source, FileSource::Root { root_id, segments: old_segments } if root_id == &root.id && old_segments == &segments)
        }) {
            existing.identity = identity;
            return Ok(existing.clone());
        }
        if let Some(existing) = state.files.values().find(|grant| {
            grant.identity == identity
                && matches!(&grant.source, FileSource::Root { root_id, .. } if root_id == &root.id)
        }) {
            return Ok(existing.clone());
        }
        let id = Uuid::new_v4().to_string();
        let grant = FileGrant {
            id: id.clone(),
            source: FileSource::Root {
                root_id: root.id.clone(),
                segments,
            },
            identity,
            name,
            display_path,
        };
        state.files.insert(id, grant.clone());
        Ok(grant)
    }

    pub fn cancel(&self, token: String) -> AppResult<()> {
        let mut state = self.lock()?;
        if state.cancelled.len() > 128 {
            state.cancelled.clear();
        }
        state.cancelled.insert(token);
        Ok(())
    }

    pub fn is_cancelled(&self, token: &str) -> bool {
        self.inner
            .lock()
            .map(|state| state.cancelled.contains(token))
            .unwrap_or(true)
    }

    pub fn generation(&self) -> AppResult<u64> {
        Ok(self.lock()?.generation)
    }

    pub(crate) fn selection_epoch(&self) -> AppResult<u64> {
        Ok(self.lock()?.selection_epoch)
    }

    pub(crate) fn clear_for_window_reopen(&self) -> AppResult<()> {
        self.prototypes.clear();
        *self.lock()? = Registry::default();
        Ok(())
    }

    pub(crate) fn release_prototype_file(&self, id: &str) -> AppResult<()> {
        let mut registry = self.lock()?;
        if registry.files.get(id).is_some_and(|g| crate::scope::prototype_name(&g.name)) { registry.files.remove(id); }
        Ok(())
    }

    pub fn store_snapshot(
        &self,
        root: &RootGrant,
        segments: Vec<String>,
        stamp: String,
        entries: Vec<Entry>,
    ) -> AppResult<DirectorySnapshot> {
        let mut state = self.lock()?;
        if state.generation != root.generation || !state.roots.contains_key(&root.id) {
            return Err(AppError::new("version_changed", "Folder selection changed"));
        }
        let total: usize = state
            .snapshots
            .values()
            .map(|item| item.entries.len())
            .sum();
        if state.snapshots.len() >= 64 || total.saturating_add(entries.len()) > 100_000 {
            state.snapshots.clear();
        }
        let id = Uuid::new_v4().to_string();
        let snapshot = DirectorySnapshot {
            id: id.clone(),
            root_id: root.id.clone(),
            segments,
            generation: root.generation,
            stamp,
            entries: Arc::new(entries),
        };
        state.snapshots.insert(id, snapshot.clone());
        Ok(snapshot)
    }

    pub fn snapshot(&self, id: &str) -> AppResult<DirectorySnapshot> {
        self.lock()?
            .snapshots
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::new("version_changed", "Directory snapshot expired"))
    }
}
