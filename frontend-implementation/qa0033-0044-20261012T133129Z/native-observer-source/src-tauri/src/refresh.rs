use crate::document::{read_document_impl, DocumentResponse};
use crate::listing::list_entries_impl;
use crate::scope::{validate_segment, AppError, AppResult};
use crate::state::{AppState, FileSource};
use notify::{Event, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::{HashMap, HashSet, VecDeque};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

fn file_fingerprint(state: &AppState, file_id: &str) -> AppResult<(String, String)> {
    if crate::scope::prototype_name(&state.file(file_id)?.name) {
        crate::prototype::fingerprint(state, file_id)
    } else if crate::scope::html_name(&state.file(file_id)?.name) {
        crate::html::fingerprint(state, file_id)
    } else if crate::scope::image_format(&state.file(file_id)?.name).is_some() {
        let (_, version, identity) =
            crate::image::image_fingerprint(state, Some(file_id), None, None)?;
        Ok((version, identity))
    } else {
        let document = read_document_impl(state, Some(file_id), None, None)?;
        Ok((document.disk_version, document.identity_key))
    }
}

#[derive(Clone, Debug)]
pub enum RefreshNotice {
    FileChanged {
        generation: u64,
        file_id: String,
        disk_version: String,
        identity_key: String,
        checked_at: u128,
    },
    DirectoryChanged {
        generation: u64,
        root_id: String,
        segments: Vec<String>,
        snapshot_id: String,
    },
    Uncertain {
        generation: u64,
        file_id: String,
        reason_code: &'static str,
        checked_at: u128,
    },
}

fn checked_at() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

pub struct RefreshCore {
    state: AppState,
    sender: Sender<notify::Result<Event>>,
    receiver: Receiver<notify::Result<Event>>,
    watchers: Vec<RecommendedWatcher>,
    watched_explicit_files: HashSet<String>,
    file_versions: HashMap<String, String>,
    directory_stamps: HashMap<(String, Vec<String>), String>,
    generation: u64,
}

impl RefreshCore {
    pub fn new(state: AppState) -> Self {
        let (sender, receiver) = mpsc::channel();
        Self {
            state,
            sender,
            receiver,
            watchers: Vec::new(),
            watched_explicit_files: HashSet::new(),
            file_versions: HashMap::new(),
            directory_stamps: HashMap::new(),
            generation: 0,
        }
    }

    pub fn watch_root(&mut self, root_id: &str) -> AppResult<()> {
        let root = self.state.root(root_id)?;
        if self.generation != root.generation {
            self.stop_watches();
            self.generation = root.generation;
        }
        let sender = self.sender.clone();
        let mut watcher = notify::recommended_watcher(move |event| {
            let _ = sender.send(event);
        })
        .map_err(|error| AppError::new("watch_failed", error.to_string()))?;
        watcher
            .watch(&root.path, RecursiveMode::Recursive)
            .map_err(|error| AppError::new("watch_failed", error.to_string()))?;
        if let Some(parent) = root.path.parent() {
            watcher
                .watch(parent, RecursiveMode::NonRecursive)
                .map_err(|error| AppError::new("watch_failed", error.to_string()))?;
        }
        self.watchers.push(watcher);
        Ok(())
    }

    pub fn watch_explicit_file(&mut self, file_id: &str) -> AppResult<()> {
        if self.watched_explicit_files.contains(file_id) {
            return Ok(());
        }
        let grant = self.state.file(file_id)?;
        let FileSource::Explicit { path, .. } = &grant.source else {
            return Err(AppError::new("invalid_grant", "Not a file-only selection"));
        };
        let parent = path
            .parent()
            .ok_or_else(|| AppError::new("invalid_path", "Selected file has no parent"))?;
        let sender = self.sender.clone();
        let mut watcher = notify::recommended_watcher(move |event| {
            let _ = sender.send(event);
        })
        .map_err(|error| AppError::new("watch_failed", error.to_string()))?;
        watcher
            .watch(parent, RecursiveMode::NonRecursive)
            .map_err(|error| AppError::new("watch_failed", error.to_string()))?;
        self.watchers.push(watcher);
        self.watched_explicit_files.insert(file_id.to_string());
        Ok(())
    }

    pub fn stop_watches(&mut self) {
        self.watchers.clear();
        self.watched_explicit_files.clear();
        self.file_versions.clear();
        self.directory_stamps.clear();
        while self.receiver.try_recv().is_ok() {}
    }

    pub fn wait_for_hint(&self, timeout: Duration) -> AppResult<bool> {
        match self.receiver.recv_timeout(timeout) {
            Ok(Ok(event)) => {
                // Every event, including need_rescan, triggers the same scoped reconciliation.
                let _rescan = event.need_rescan();
                std::thread::sleep(Duration::from_millis(75));
                while let Ok(result) = self.receiver.try_recv() {
                    if let Err(error) = result {
                        return Err(AppError::new("watch_failed", error.to_string()));
                    }
                }
                Ok(true)
            }
            Ok(Err(error)) => Err(AppError::new("watch_failed", error.to_string())),
            Err(RecvTimeoutError::Timeout) => Ok(false),
            Err(RecvTimeoutError::Disconnected) => {
                Err(AppError::new("watch_failed", "Watcher disconnected"))
            }
        }
    }

    fn poll_hint(&self) -> AppResult<bool> {
        let mut changed = false;
        // Bound the drain so a continuous writer cannot monopolize the scope lock.
        for _ in 0..1024 {
            match self.receiver.try_recv() {
                Ok(Ok(_)) => changed = true,
                Ok(Err(error)) => return Err(AppError::new("watch_failed", error.to_string())),
                Err(mpsc::TryRecvError::Empty) => break,
                Err(mpsc::TryRecvError::Disconnected) => {
                    return Err(AppError::new("watch_failed", "Watcher disconnected"))
                }
            }
        }
        Ok(changed)
    }

    pub fn reconcile_visible(
        &mut self,
        root_id: &str,
        open_file_ids: &[String],
        expanded_directories: &[Vec<String>],
    ) -> AppResult<Vec<RefreshNotice>> {
        self.reconcile_visible_scopes(Some(root_id), open_file_ids, expanded_directories)
    }

    pub fn reconcile_visible_scopes(
        &mut self,
        root_id: Option<&str>,
        open_file_ids: &[String],
        expanded_directories: &[Vec<String>],
    ) -> AppResult<Vec<RefreshNotice>> {
        let root = root_id.map(|id| self.state.root(id)).transpose()?;
        let generation = self.state.generation()?;
        if self.generation != generation {
            self.file_versions.clear();
            self.directory_stamps.clear();
            self.generation = generation;
        }
        let mut notices = Vec::new();
        for file_id in open_file_ids {
            let grant = self.state.file(file_id)?;
            let in_scope = match &grant.source {
                FileSource::Root { root_id: owner, .. } => root_id == Some(owner.as_str()),
                FileSource::Explicit { .. } => true,
            };
            if !in_scope {
                continue;
            }
            match file_fingerprint(&self.state, file_id) {
                Ok((disk_version, identity_key)) => {
                    let prior = self
                        .file_versions
                        .insert(file_id.clone(), disk_version.clone());
                    if prior.as_deref() != Some(disk_version.as_str()) {
                        notices.push(RefreshNotice::FileChanged {
                            generation,
                            file_id: file_id.clone(),
                            disk_version: disk_version,
                            identity_key: identity_key,
                            checked_at: checked_at(),
                        });
                    }
                }
                Err(error) => notices.push(RefreshNotice::Uncertain {
                    generation,
                    file_id: file_id.clone(),
                    reason_code: error.code,
                    checked_at: checked_at(),
                }),
            }
        }
        if let Some(root) = root {
            for segments in expanded_directories {
                let token = uuid::Uuid::new_v4().to_string();
                let page =
                    list_entries_impl(&self.state, &root.id, segments.clone(), 0, &token, None)?;
                let snapshot = self.state.snapshot(&page.snapshot_id)?;
                let key = (root.id.clone(), segments.clone());
                let prior = self.directory_stamps.insert(key, snapshot.stamp.clone());
                if prior.as_deref() != Some(snapshot.stamp.as_str()) {
                    notices.push(RefreshNotice::DirectoryChanged {
                        generation,
                        root_id: root.id.clone(),
                        segments: segments.clone(),
                        snapshot_id: page.snapshot_id,
                    });
                }
            }
        }
        Ok(notices)
    }
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum ReloadTarget {
    RootFile {
        root_id: String,
        segments: Vec<String>,
    },
    Folder {
        root_id: String,
        segments: Vec<String>,
    },
    ExplicitFile {
        file_id: String,
    },
}

#[derive(Clone, Debug)]
pub struct ReloadProgress {
    pub examined_count: usize,
    pub confirmed_count: usize,
    pub current_segments: Option<Vec<String>>,
    pub state: &'static str,
}

#[derive(Clone, Debug)]
pub enum ReloadUpdate {
    Notice(RefreshNotice),
    Status {
        target: ReloadTarget,
        state: &'static str,
    },
    Progress(ReloadProgress),
}

#[derive(Debug)]
pub struct ReloadOutcome {
    pub cancelled: bool,
    pub unchecked_segments: Vec<Vec<String>>,
    pub examined_count: usize,
    pub confirmed_count: usize,
}

fn file_in_folder(grant: &crate::state::FileGrant, root_id: &str, folder: &[String]) -> bool {
    matches!(&grant.source, FileSource::Root { root_id: owner, segments }
        if owner == root_id && segments.starts_with(folder))
}

/// Scan only a grant-authorized target. Closed files remain closed; they are never
/// included in open_file_ids and therefore never publish document content.
pub fn run_reload(
    state: &AppState,
    core: &mut RefreshCore,
    target: &ReloadTarget,
    open_file_ids: &[String],
    cancel_token: &str,
    cancelled: impl Fn() -> bool,
    mut emit: impl FnMut(ReloadUpdate),
) -> AppResult<ReloadOutcome> {
    let generation = state.generation()?;
    let mut outcome = ReloadOutcome {
        cancelled: false,
        unchecked_segments: Vec::new(),
        examined_count: 0,
        confirmed_count: 0,
    };
    let mut check_file = |file_id: &str,
                          target: &ReloadTarget,
                          emit: &mut dyn FnMut(ReloadUpdate)|
     -> AppResult<bool> {
        if cancelled() || state.generation()? != generation {
            return Err(AppError::new("cancelled", "Reload stopped"));
        }
        let (disk_version, identity_key) = file_fingerprint(state, file_id)?;
        let previous = core
            .file_versions
            .insert(file_id.to_string(), disk_version.clone());
        let changed = previous.as_deref() != Some(disk_version.as_str());
        if changed && open_file_ids.iter().any(|open| open == file_id) {
            emit(ReloadUpdate::Notice(RefreshNotice::FileChanged {
                generation,
                file_id: file_id.to_string(),
                disk_version: disk_version,
                identity_key: identity_key,
                checked_at: checked_at(),
            }));
        }
        emit(ReloadUpdate::Status {
            target: target.clone(),
            state: if previous.is_some() && changed {
                "changed"
            } else {
                "current"
            },
        });
        Ok(previous.is_some() && changed)
    };
    match target {
        ReloadTarget::ExplicitFile { file_id } => {
            let grant = state.file(file_id)?;
            if !matches!(grant.source, FileSource::Explicit { .. }) {
                return Err(AppError::new("invalid_grant", "Expected a file-only grant"));
            }
            check_file(file_id, target, &mut emit)?;
            outcome.examined_count = 1;
            outcome.confirmed_count = 1;
        }
        ReloadTarget::RootFile { root_id, segments } => {
            if segments.is_empty() {
                return Err(AppError::new("invalid_path", "File name is missing"));
            }
            for segment in segments {
                validate_segment(segment)?;
            }
            state.root(root_id)?;
            let file_id = if segments.last().is_some_and(|name| {
                crate::scope::html_name(name) || crate::scope::prototype_name(name)
            }) {
                let root = state.root(root_id)?;
                let file = crate::scope::open_relative(&root.file, segments, false)?;
                state.register_root_file(&root, segments.clone(), &file)?.id
            } else if segments
                .last()
                .is_some_and(|name| crate::scope::image_format(name).is_some())
            {
                crate::image::image_fingerprint(state, None, Some(root_id), Some(segments.clone()))?
                    .0
            } else {
                read_document_impl(state, None, Some(root_id), Some(segments.clone()))?.file_id
            };
            check_file(&file_id, target, &mut emit)?;
            outcome.examined_count = 1;
            outcome.confirmed_count = 1;
        }
        ReloadTarget::Folder { root_id, segments } => {
            for segment in segments {
                validate_segment(segment)?;
            }
            state.root(root_id)?;
            let mut queue = VecDeque::from([segments.clone()]);
            let mut checked_open = HashSet::new();
            let mut any_changed = false;
            while let Some(path) = queue.pop_front() {
                if cancelled() || state.generation()? != generation {
                    outcome.cancelled = true;
                    outcome.unchecked_segments.push(path);
                    outcome.unchecked_segments.extend(queue.drain(..));
                    break;
                }
                if outcome.examined_count >= 100_000 || queue.len() >= 4096 {
                    return Err(AppError::new(
                        "oversize",
                        "Reload scope exceeds the scan limit",
                    ));
                }
                let page =
                    match list_entries_impl(state, root_id, path.clone(), 0, cancel_token, None) {
                        Ok(page) => page,
                        Err(error) if error.code == "cancelled" => {
                            outcome.cancelled = true;
                            outcome.unchecked_segments.push(path);
                            outcome.unchecked_segments.extend(queue.drain(..));
                            break;
                        }
                        Err(error) => return Err(error),
                    };
                let snapshot = state.snapshot(&page.snapshot_id)?;
                outcome.examined_count += snapshot.entries.len() + 1;
                outcome.confirmed_count += 1;
                for entry in snapshot.entries.iter() {
                    if entry.kind == "directory" {
                        let mut child = path.clone();
                        child.push(entry.name.clone());
                        queue.push_back(child);
                    }
                }
                let stamp_key = (root_id.clone(), path.clone());
                let old_stamp = core
                    .directory_stamps
                    .insert(stamp_key, snapshot.stamp.clone());
                any_changed |= old_stamp
                    .as_deref()
                    .is_some_and(|old| old != snapshot.stamp);
                emit(ReloadUpdate::Notice(RefreshNotice::DirectoryChanged {
                    generation,
                    root_id: root_id.clone(),
                    segments: path.clone(),
                    snapshot_id: page.snapshot_id,
                }));
                for file_id in open_file_ids {
                    if checked_open.contains(file_id) {
                        continue;
                    }
                    let grant = state.file(file_id)?;
                    if file_in_folder(&grant, root_id, &path) {
                        match check_file(file_id, target, &mut emit) {
                            Ok(changed) => {
                                any_changed |= changed;
                                outcome.confirmed_count += 1;
                                checked_open.insert(file_id.clone());
                            }
                            Err(error) if error.code == "cancelled" => {
                                outcome.cancelled = true;
                                outcome.unchecked_segments.push(path.clone());
                                outcome.unchecked_segments.extend(queue.drain(..));
                                break;
                            }
                            Err(error) => emit(ReloadUpdate::Notice(RefreshNotice::Uncertain {
                                generation,
                                file_id: file_id.clone(),
                                reason_code: error.code,
                                checked_at: checked_at(),
                            })),
                        }
                    }
                }
                emit(ReloadUpdate::Progress(ReloadProgress {
                    examined_count: outcome.examined_count,
                    confirmed_count: outcome.confirmed_count,
                    current_segments: Some(path),
                    state: if outcome.cancelled {
                        "cancelled"
                    } else {
                        "running"
                    },
                }));
                if outcome.cancelled {
                    break;
                }
            }
            emit(ReloadUpdate::Status {
                target: target.clone(),
                state: if outcome.cancelled {
                    "uncertain"
                } else if any_changed {
                    "changed"
                } else {
                    "current"
                },
            });
        }
    }
    Ok(outcome)
}

#[derive(Clone, Default)]
struct VisibleState {
    generation: u64,
    root_id: Option<String>,
    open_file_ids: Vec<String>,
    expanded_directories: Vec<Vec<String>>,
}

#[derive(Clone)]
pub struct RefreshService {
    state: AppState,
    core: Arc<Mutex<RefreshCore>>,
    visible: Arc<Mutex<VisibleState>>,
    running: Arc<AtomicBool>,
    watch_failure: Arc<Mutex<Option<String>>>,
    reload_jobs: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FileChangedPayload {
    generation: u64,
    file_id: String,
    disk_version: String,
    identity_key: String,
    checked_at: u128,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryChangedPayload {
    generation: u64,
    root_id: String,
    segments: Vec<String>,
    snapshot_id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ItemStatusPayload {
    generation: u64,
    target_ref: StatusTargetRef,
    state: &'static str,
    reason_code: &'static str,
    checked_at: u128,
}

#[derive(Clone, Serialize)]
#[serde(untagged)]
enum StatusTargetRef {
    File(String),
    Folder {
        #[serde(rename = "rootId")]
        root_id: String,
        segments: Vec<String>,
    },
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct JobProgressPayload {
    generation: u64,
    job_id: String,
    examined_count: usize,
    confirmed_count: usize,
    current_segments: Option<Vec<String>>,
    state: &'static str,
}

#[derive(Serialize)]
pub struct CancelReloadResponse {
    cancelled: bool,
}

fn status_target(target: &ReloadTarget) -> StatusTargetRef {
    match target {
        ReloadTarget::ExplicitFile { file_id } => StatusTargetRef::File(file_id.clone()),
        ReloadTarget::RootFile { root_id, segments }
        | ReloadTarget::Folder { root_id, segments } => StatusTargetRef::Folder {
            root_id: root_id.clone(),
            segments: segments.clone(),
        },
    }
}

fn emit_progress(app: &AppHandle, generation: u64, job_id: &str, progress: ReloadProgress) {
    let _ = app.emit(
        "refresh:job_progress",
        JobProgressPayload {
            generation,
            job_id: job_id.to_string(),
            examined_count: progress.examined_count,
            confirmed_count: progress.confirmed_count,
            current_segments: progress.current_segments,
            state: progress.state,
        },
    );
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshJobResponse {
    job_id: String,
    generation: u64,
    accepted: bool,
}

fn emit_notices(app: &AppHandle, notices: Vec<RefreshNotice>) -> AppResult<()> {
    for notice in notices {
        match notice {
            RefreshNotice::FileChanged {
                generation,
                file_id,
                disk_version,
                identity_key,
                checked_at,
            } => app.emit(
                "refresh:file_changed",
                FileChangedPayload {
                    generation,
                    file_id,
                    disk_version,
                    identity_key,
                    checked_at,
                },
            ),
            RefreshNotice::DirectoryChanged {
                generation,
                root_id,
                segments,
                snapshot_id,
            } => app.emit(
                "refresh:directory_changed",
                DirectoryChangedPayload {
                    generation,
                    root_id,
                    segments,
                    snapshot_id,
                },
            ),
            RefreshNotice::Uncertain {
                generation,
                file_id,
                reason_code,
                checked_at,
            } => {
                let state = if matches!(
                    reason_code,
                    "missing"
                        | "denied"
                        | "unsupported_type"
                        | "root_reselection_required"
                        | "reselection_required"
                ) {
                    "unavailable"
                } else {
                    "uncertain"
                };
                app.emit(
                    "refresh:item_status",
                    ItemStatusPayload {
                        generation,
                        target_ref: StatusTargetRef::File(file_id),
                        state,
                        reason_code,
                        checked_at,
                    },
                )
            }
        }
        .map_err(|error| AppError::new("internal", error.to_string()))?;
    }
    Ok(())
}

impl RefreshService {
    pub fn new(state: AppState) -> Self {
        Self {
            core: Arc::new(Mutex::new(RefreshCore::new(state.clone()))),
            state,
            visible: Arc::new(Mutex::new(VisibleState::default())),
            running: Arc::new(AtomicBool::new(false)),
            watch_failure: Arc::new(Mutex::new(None)),
            reload_jobs: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    fn core(&self) -> AppResult<std::sync::MutexGuard<'_, RefreshCore>> {
        self.core
            .lock()
            .map_err(|_| AppError::new("internal", "Refresh state is unavailable"))
    }

    fn wait_for_worker_hint(&self) -> AppResult<bool> {
        let changed = self.core()?.poll_hint()?;
        // Wait/debounce without holding the mutex needed by picker registration and Reload.
        std::thread::sleep(Duration::from_millis(if changed { 75 } else { 300 }));
        Ok(self.core()?.poll_hint()? || changed)
    }

    pub fn start_worker(&self, app: AppHandle) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }
        let service = self.clone();
        std::thread::spawn(move || {
            while service.running.load(Ordering::SeqCst) {
                let hint = service.wait_for_worker_hint();
                match hint {
                    Ok(true) => {
                        let visible = match service.visible.lock() {
                            Ok(value) => value.clone(),
                            Err(_) => continue,
                        };
                        if service.state.generation().ok() != Some(visible.generation) {
                            continue;
                        }
                        let result = service.core().and_then(|mut core| {
                            core.reconcile_visible_scopes(
                                visible.root_id.as_deref(),
                                &visible.open_file_ids,
                                &visible.expanded_directories,
                            )
                        });
                        if let Ok(notices) = result {
                            let _ = emit_notices(&app, notices);
                        }
                    }
                    Ok(false) => {}
                    Err(_) => {
                        let visible = match service.visible.lock() {
                            Ok(value) => value.clone(),
                            Err(_) => continue,
                        };
                        if let Some(target_ref) = visible
                            .root_id
                            .or_else(|| visible.open_file_ids.first().cloned())
                        {
                            let _ = app.emit(
                                "refresh:item_status",
                                ItemStatusPayload {
                                    generation: visible.generation,
                                    target_ref: StatusTargetRef::File(target_ref),
                                    state: "uncertain",
                                    reason_code: "watch_failed",
                                    checked_at: checked_at(),
                                },
                            );
                        }
                        std::thread::sleep(Duration::from_millis(300));
                    }
                }
            }
        });
    }

    pub fn watch_root(&self, root_id: &str) -> AppResult<()> {
        let result = self.core()?.watch_root(root_id);
        if let Ok(mut failure) = self.watch_failure.lock() {
            *failure = result.as_ref().err().map(|_| root_id.to_string());
        }
        result
    }

    pub fn watch_explicit_file(&self, file_id: &str) -> AppResult<()> {
        let result = self.core()?.watch_explicit_file(file_id);
        if let Ok(mut failure) = self.watch_failure.lock() {
            *failure = result.as_ref().err().map(|_| file_id.to_string());
        }
        result
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        if let Ok(jobs) = self.reload_jobs.lock() {
            for cancelled in jobs.values() {
                cancelled.store(true, Ordering::SeqCst);
            }
        }
        if let Ok(mut core) = self.core() {
            core.stop_watches();
        }
    }

    pub fn suspend_watches(&self) {
        if let Ok(mut visible) = self.visible.lock() {
            *visible = VisibleState::default();
        }
        if let Ok(jobs) = self.reload_jobs.lock() {
            for cancelled in jobs.values() {
                cancelled.store(true, Ordering::SeqCst);
            }
        }
        if let Ok(mut core) = self.core() {
            core.stop_watches();
        }
    }

    pub fn reload_now(
        &self,
        app: AppHandle,
        target: ReloadTarget,
        request_id: String,
    ) -> AppResult<RefreshJobResponse> {
        if request_id.is_empty() || request_id.len() > 128 {
            return Err(AppError::new("invalid_request", "Invalid Reload request"));
        }
        // Validate the exact grant before accepting a job; run_reload checks it again.
        match &target {
            ReloadTarget::ExplicitFile { file_id } => {
                let grant = self.state.file(file_id)?;
                if !matches!(grant.source, FileSource::Explicit { .. }) {
                    return Err(AppError::new("invalid_grant", "Expected a file-only grant"));
                }
            }
            ReloadTarget::RootFile { root_id, segments } => {
                self.state.root(root_id)?;
                if segments.is_empty() {
                    return Err(AppError::new("invalid_path", "File name is missing"));
                }
                for segment in segments {
                    validate_segment(segment)?;
                }
            }
            ReloadTarget::Folder { root_id, segments } => {
                self.state.root(root_id)?;
                for segment in segments {
                    validate_segment(segment)?;
                }
            }
        }
        let generation = self.state.generation()?;
        let job_id = uuid::Uuid::new_v4().to_string();
        let cancel_flag = Arc::new(AtomicBool::new(false));
        self.reload_jobs
            .lock()
            .map_err(|_| AppError::new("internal", "Reload jobs unavailable"))?
            .insert(job_id.clone(), cancel_flag.clone());
        emit_progress(
            &app,
            generation,
            &job_id,
            ReloadProgress {
                examined_count: 0,
                confirmed_count: 0,
                current_segments: None,
                state: "queued",
            },
        );
        let service = self.clone();
        let worker_job_id = job_id.clone();
        std::thread::spawn(move || {
            let visible = service
                .visible
                .lock()
                .map(|value| value.clone())
                .unwrap_or_default();
            let open_files = if visible.generation == generation {
                visible.open_file_ids
            } else {
                Vec::new()
            };
            emit_progress(
                &app,
                generation,
                &worker_job_id,
                ReloadProgress {
                    examined_count: 0,
                    confirmed_count: 0,
                    current_segments: None,
                    state: "running",
                },
            );
            let result = service.core().and_then(|mut core| {
                run_reload(
                    &service.state,
                    &mut core,
                    &target,
                    &open_files,
                    &worker_job_id,
                    || {
                        cancel_flag.load(Ordering::SeqCst)
                            || service.state.is_cancelled(&worker_job_id)
                    },
                    |update| match update {
                        ReloadUpdate::Notice(notice) => {
                            let _ = emit_notices(&app, vec![notice]);
                        }
                        ReloadUpdate::Status { target, state } => {
                            let _ = app.emit(
                                "refresh:item_status",
                                ItemStatusPayload {
                                    generation,
                                    target_ref: status_target(&target),
                                    state,
                                    reason_code: "",
                                    checked_at: checked_at(),
                                },
                            );
                        }
                        ReloadUpdate::Progress(progress) => {
                            emit_progress(&app, generation, &worker_job_id, progress)
                        }
                    },
                )
            });
            match result {
                Ok(outcome) => emit_progress(
                    &app,
                    generation,
                    &worker_job_id,
                    ReloadProgress {
                        examined_count: outcome.examined_count,
                        confirmed_count: outcome.confirmed_count,
                        current_segments: outcome.unchecked_segments.first().cloned(),
                        state: if outcome.cancelled {
                            "cancelled"
                        } else {
                            "completed"
                        },
                    },
                ),
                Err(error) => {
                    let _ = app.emit(
                        "refresh:item_status",
                        ItemStatusPayload {
                            generation,
                            target_ref: status_target(&target),
                            state: "uncertain",
                            reason_code: error.code,
                            checked_at: checked_at(),
                        },
                    );
                    emit_progress(
                        &app,
                        generation,
                        &worker_job_id,
                        ReloadProgress {
                            examined_count: 0,
                            confirmed_count: 0,
                            current_segments: None,
                            state: if error.code == "cancelled" {
                                "cancelled"
                            } else {
                                "failed"
                            },
                        },
                    );
                }
            }
            if let Ok(mut jobs) = service.reload_jobs.lock() {
                jobs.remove(&worker_job_id);
            }
        });
        Ok(RefreshJobResponse {
            job_id,
            generation,
            accepted: true,
        })
    }

    pub fn cancel_reload_now(
        &self,
        job_id: &str,
        generation: u64,
    ) -> AppResult<CancelReloadResponse> {
        if generation != self.state.generation()? {
            return Ok(CancelReloadResponse { cancelled: false });
        }
        let jobs = self
            .reload_jobs
            .lock()
            .map_err(|_| AppError::new("internal", "Reload jobs unavailable"))?;
        if let Some(flag) = jobs.get(job_id) {
            flag.store(true, Ordering::SeqCst);
            self.state.cancel(job_id.to_string())?;
            Ok(CancelReloadResponse { cancelled: true })
        } else {
            Ok(CancelReloadResponse { cancelled: false })
        }
    }

    pub fn reconcile_visible_now(
        &self,
        app: &AppHandle,
        generation: u64,
        root_id: Option<String>,
        expanded_directories: Vec<Vec<String>>,
        open_file_ids: Vec<String>,
    ) -> AppResult<RefreshJobResponse> {
        if generation != self.state.generation()?
            || expanded_directories.len() > 128
            || open_file_ids.len() > 128
        {
            return Err(AppError::new("invalid_request", "Invalid refresh scope"));
        }
        if let Some(id) = &root_id {
            self.state.root(id)?;
        }
        for segments in &expanded_directories {
            for segment in segments {
                validate_segment(segment)?;
            }
        }
        for file_id in &open_file_ids {
            let grant = self.state.file(file_id)?;
            if let FileSource::Root { root_id: owner, .. } = &grant.source {
                if root_id.as_deref() != Some(owner.as_str()) {
                    return Err(AppError::new(
                        "invalid_grant",
                        "File is outside the selected folder",
                    ));
                }
            }
        }
        let visible = VisibleState {
            generation,
            root_id: root_id.clone(),
            open_file_ids: open_file_ids.clone(),
            expanded_directories: expanded_directories.clone(),
        };
        *self
            .visible
            .lock()
            .map_err(|_| AppError::new("internal", "Refresh visibility is unavailable"))? = visible;
        let notices = self.core()?.reconcile_visible_scopes(
            root_id.as_deref(),
            &open_file_ids,
            &expanded_directories,
        )?;
        emit_notices(app, notices)?;
        if let Ok(failure) = self.watch_failure.lock() {
            if let Some(target_ref) = failure.as_ref() {
                let _ = app.emit(
                    "refresh:item_status",
                    ItemStatusPayload {
                        generation,
                        target_ref: StatusTargetRef::File(target_ref.clone()),
                        state: "uncertain",
                        reason_code: "watch_failed",
                        checked_at: checked_at(),
                    },
                );
            }
        }
        Ok(RefreshJobResponse {
            job_id: uuid::Uuid::new_v4().to_string(),
            generation,
            accepted: true,
        })
    }
}

#[tauri::command]
pub async fn reload_item(
    app: AppHandle,
    service: tauri::State<'_, RefreshService>,
    target: ReloadTarget,
    request_id: String,
) -> AppResult<RefreshJobResponse> {
    service.reload_now(app, target, request_id)
}

#[tauri::command]
pub fn cancel_reload(
    service: tauri::State<'_, RefreshService>,
    job_id: String,
    generation: u64,
) -> AppResult<CancelReloadResponse> {
    service.cancel_reload_now(&job_id, generation)
}

#[tauri::command]
pub async fn reconcile_visible_state(
    app: AppHandle,
    service: tauri::State<'_, RefreshService>,
    generation: u64,
    root_id: Option<String>,
    expanded_directories: Vec<Vec<String>>,
    open_file_ids: Vec<String>,
) -> AppResult<RefreshJobResponse> {
    let service = service.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        service.reconcile_visible_now(
            &app,
            generation,
            root_id,
            expanded_directories,
            open_file_ids,
        )
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

pub fn get_confirmed_document_impl(
    state: &AppState,
    file_id: &str,
    expected_disk_version: &str,
    generation: u64,
) -> AppResult<DocumentResponse> {
    if state.generation()? != generation {
        return Err(AppError::new("version_changed", "Workspace changed"));
    }
    let document = read_document_impl(state, Some(file_id), None, None)?;
    if document.disk_version != expected_disk_version || state.generation()? != generation {
        return Err(AppError::new(
            "version_changed",
            "Disk or workspace version changed again",
        ));
    }
    Ok(document)
}

#[tauri::command]
pub async fn get_confirmed_document(
    state: tauri::State<'_, AppState>,
    file_id: String,
    expected_disk_version: String,
    generation: u64,
) -> AppResult<DocumentResponse> {
    #[cfg(feature = "acceptance-harness")]
    let qa = crate::acceptance_harness::enter("confirmed-refresh").await?;
    let state = state.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        get_confirmed_document_impl(&state, &file_id, &expected_disk_version, generation)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?;
    #[cfg(feature = "acceptance-harness")]
    return qa.finish(result);
    #[cfg(not(feature = "acceptance-harness"))]
    result
}

#[cfg(test)]
mod worker_tests {
    use super::*;

    #[test]
    fn image_refresh_uses_granted_fingerprint_and_preserves_reselection() {
        use std::fs;
        let dir =
            std::env::temp_dir().join(format!("intentgrove-refresh-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("pixel.png");
        fs::write(&path, b"first-image-bytes").unwrap();
        let state = AppState::default();
        let grant = state.register_explicit_file(&path).unwrap();
        let mut core = RefreshCore::new(state.clone());
        let first = core
            .reconcile_visible_scopes(None, &[grant.id.clone()], &[])
            .unwrap();
        assert!(matches!(&first[0], RefreshNotice::FileChanged { .. }));
        assert!(core
            .reconcile_visible_scopes(None, &[grant.id.clone()], &[])
            .unwrap()
            .is_empty());
        fs::write(&path, b"second-image-bytes").unwrap();
        assert!(matches!(
            &core
                .reconcile_visible_scopes(None, &[grant.id.clone()], &[])
                .unwrap()[0],
            RefreshNotice::FileChanged { .. }
        ));
        fs::rename(&path, dir.join("old.png")).unwrap();
        fs::write(&path, b"replacement").unwrap();
        assert!(matches!(
            &core
                .reconcile_visible_scopes(None, &[grant.id], &[])
                .unwrap()[0],
            RefreshNotice::Uncertain {
                reason_code: "reselection_required",
                ..
            }
        ));
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn idle_worker_does_not_hold_the_scope_mutex() {
        let service = RefreshService::new(AppState::default());
        let worker_service = service.clone();
        let (started_tx, started_rx) = mpsc::channel();
        let worker = std::thread::spawn(move || {
            started_tx.send(()).unwrap();
            worker_service.wait_for_worker_hint().unwrap()
        });
        started_rx.recv().unwrap();
        // During the 300 ms idle wait, folder registration must still obtain the core.
        std::thread::sleep(Duration::from_millis(40));
        let available = service.core.try_lock().is_ok();
        assert!(!worker.join().unwrap());
        assert!(available, "idle watching blocked folder registration");
    }

    #[test]
    fn a_watcher_error_reports_uncertainty_instead_of_a_confirmed_hint() {
        let core = RefreshCore::new(AppState::default());
        core.sender
            .send(Err(notify::Error::generic("fixture watcher unavailable")))
            .unwrap();
        assert_eq!(core.poll_hint().unwrap_err().code, "watch_failed");
    }
}
