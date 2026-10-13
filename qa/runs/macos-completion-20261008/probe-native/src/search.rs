use crate::document::{immediate_bytes_and_version, read_document_with_file};
use crate::scope::{excluded, identity, open_relative, read_search_entries, AppError, AppResult, Identity};
use crate::state::{AppState, RootGrant};
use ignore::gitignore::{Gitignore, GitignoreBuilder};
use regex::{Regex, RegexBuilder};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{atomic::{AtomicBool, Ordering}, Arc, Mutex};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

const MAX_QUERY_BYTES: usize = 256;
const MAX_IGNORE_BYTES: usize = 64 * 1024;
const MAX_ENTRIES: u64 = 100_000;
const MAX_RESULTS: usize = 10_000;
const MAX_HITS_PER_FILE: usize = 5;

#[derive(Default)]
pub struct SearchState { active: Mutex<Option<Arc<SearchJob>>> }

impl SearchState {
    fn replace(&self, job: Arc<SearchJob>) -> AppResult<()> {
        let mut active = self.active.lock()
            .map_err(|_| AppError::new("internal", "Search state unavailable"))?;
        if let Some(previous) = active.replace(job) {
            previous.superseded.store(true, Ordering::SeqCst);
            previous.cancelled.store(true, Ordering::SeqCst);
        }
        Ok(())
    }

    fn cancel(&self, job_id: &str) -> AppResult<bool> {
        let active = self.active.lock()
            .map_err(|_| AppError::new("internal", "Search state unavailable"))?;
        if let Some(job) = active.as_ref().filter(|job| job.id == job_id) {
            job.cancelled.store(true, Ordering::SeqCst);
            Ok(true)
        } else { Ok(false) }
    }
}

struct SearchJob {
    state: AppState,
    id: String,
    root_id: String,
    generation: u64,
    query: String,
    mode: SearchMode,
    include_ignored: bool,
    scope: SearchScope,
    cancelled: AtomicBool,
    superseded: AtomicBool,
    results: Mutex<HashMap<String, SearchHit>>,
}

struct SearchScope {
    segments: Vec<String>,
    file: std::fs::File,
    identity: Identity,
}

impl SearchScope {
    fn confirm(root: &RootGrant, segments: Vec<String>) -> AppResult<Self> {
        root.verify_current()?;
        let file = open_relative(&root.file, &segments, true)?;
        let identity = identity(&file)?;
        Ok(Self { segments, file, identity })
    }

    fn verify(&self, root: &RootGrant) -> AppResult<()> {
        root.verify_current()?;
        let current = open_relative(&root.file, &self.segments, true)
            .map_err(|_| AppError::new("scope_changed", "Search folder changed; start a new search"))?;
        if identity(&current)? != self.identity {
            return Err(AppError::new("scope_changed", "Search folder changed; start a new search"));
        }
        Ok(())
    }

    fn open(&self, root: &RootGrant, segments: &[String], directory: bool) -> AppResult<std::fs::File> {
        if segments.len() > 128 {
            return Err(AppError::new("invalid_path", "Path is too deep"));
        }
        self.verify(root)?;
        let relative = segments.strip_prefix(self.segments.as_slice())
            .ok_or_else(|| AppError::new("invalid_path", "Result is outside the confirmed search scope"))?;
        open_relative(&self.file, relative, directory)
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum SearchMode { Name, Content, Both }

impl SearchMode {
    fn parse(value: &str) -> AppResult<Self> {
        match value {
            "name" => Ok(Self::Name),
            "content" => Ok(Self::Content),
            "both" => Ok(Self::Both),
            _ => Err(AppError::new("invalid_request", "Unknown search mode")),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    id: String,
    segments: Vec<String>,
    path: String,
    line: u64,
    start_byte: u64,
    end_byte: u64,
    context: String,
    kind: &'static str,
    ignored: bool,
    version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchStarted { job_id: String, generation: u64, scope_segments: Vec<String> }

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchBatch {
    job_id: String,
    generation: u64,
    results: Vec<SearchHit>,
    scanned: u64,
    skipped: u64,
    matched: u64,
    status: &'static str,
    error_code: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenSearchHit {
    document: crate::document::DocumentResponse,
    line: u64,
    ordinal: Option<usize>,
    changed: bool,
    match_moved: bool,
}

impl SearchJob {
    fn check_root(&self) -> AppResult<()> {
        let root = self.state.root_recorded(&self.root_id)?;
        if root.generation != self.generation {
            Err(AppError::new("invalid_grant", "Search root changed"))
        } else { Ok(()) }
    }

    fn check_open(&self) -> AppResult<()> {
        self.check_root()?;
        if self.superseded.load(Ordering::SeqCst) {
            Err(AppError::new("invalid_grant", "Search result expired"))
        } else { Ok(()) }
    }
    fn check(&self) -> AppResult<()> {
        self.check_root()?;
        if self.cancelled.load(Ordering::SeqCst) {
            Err(AppError::new("cancelled", "Folder search stopped"))
        } else { Ok(()) }
    }
}

fn search_regex(query: &str) -> AppResult<Regex> {
    RegexBuilder::new(&regex::escape(query)).case_insensitive(true)
        .size_limit(1024 * 1024).dfa_size_limit(1024 * 1024).build()
        .map_err(|_| AppError::new("invalid_query", "Search query is unsupported"))
}

fn scoped_ignore(root: &RootGrant, segments: &[String], skipped: &mut u64) -> Option<Arc<Gitignore>> {
    let mut ignore_segments = segments.to_vec();
    ignore_segments.push(".gitignore".into());
    let file = match open_relative(&root.file, &ignore_segments, false) {
        Ok(file) => file,
        Err(error) if error.code == "missing" => return None,
        Err(_) => { *skipped += 1; return None; }
    };
    if file.metadata().ok().map_or(true, |meta| meta.len() > MAX_IGNORE_BYTES as u64) {
        *skipped += 1; return None;
    }
    let bytes = match crate::document::bounded_bytes(&file, MAX_IGNORE_BYTES) {
        Ok(value) => value,
        Err(_) => { *skipped += 1; return None; }
    };
    let text = match std::str::from_utf8(&bytes) {
        Ok(value) => value,
        Err(_) => { *skipped += 1; return None; }
    };
    // The synthetic path is used only by the glob matcher. No ignore-library
    // filesystem walker or file-loading method receives the selected path.
    let mut relative = PathBuf::from("scoped-root");
    for segment in segments { relative.push(segment); }
    let mut builder = GitignoreBuilder::new(&relative);
    for line in text.lines() {
        if builder.add_line(None, line).is_err() { *skipped += 1; }
    }
    match builder.build() {
        Ok(matcher) => Some(Arc::new(matcher)),
        Err(_) => { *skipped += 1; None }
    }
}

fn ignored_by(matchers: &[Arc<Gitignore>], segments: &[String], is_dir: bool) -> bool {
    let mut path = PathBuf::from("scoped-root");
    for segment in segments { path.push(segment); }
    let mut ignored = false;
    for matcher in matchers {
        let matched = matcher.matched(&path, is_dir);
        if matched.is_ignore() { ignored = true; }
        else if matched.is_whitelist() { ignored = false; }
    }
    ignored
}

fn short_context(text: &str, position: usize) -> String {
    let start = text[..position].rfind('\n').map_or(0, |value| value + 1);
    let end = text[position..].find('\n').map_or(text.len(), |value| position + value);
    let line = text[start..end].trim();
    if line.chars().count() <= 180 { return line.to_string(); }
    let column = text[start..position].chars().count();
    let skip = column.saturating_sub(60);
    let excerpt: String = line.chars().skip(skip).take(180).collect();
    format!("{}{}{}", if skip > 0 { "…" } else { "" }, excerpt,
        if skip + 180 < line.chars().count() { "…" } else { "" })
}

struct Scan<'a> {
    root: &'a RootGrant,
    job: &'a SearchJob,
    matcher: &'a Regex,
    batch: SearchBatch,
    emit: &'a mut dyn FnMut(SearchBatch),
    limited: bool,
}

impl Scan<'_> {
    fn flush(&mut self, status: &'static str, error_code: Option<&'static str>) {
        let mut results = std::mem::take(&mut self.batch.results);
        let invalid = self.job.check_root().and_then(|_| self.job.scope.verify(self.root)).err();
        if invalid.is_some() { results.clear(); }
        let (status, error_code) = invalid.map_or((status, error_code), |error| ("partial", Some(error.code)));
        (self.emit)(SearchBatch { results, status, error_code, ..self.batch.clone() });
    }

    fn push(&mut self, hit: SearchHit) -> AppResult<()> {
        self.job.check()?;
        self.job.scope.open(self.root, &hit.segments, false)?;
        let mut stored = self.job.results.lock()
            .map_err(|_| AppError::new("internal", "Search results unavailable"))?;
        if stored.len() >= MAX_RESULTS {
            self.limited = true;
            return Err(AppError::new("result_limit", "Search result limit reached"));
        }
        stored.insert(hit.id.clone(), hit.clone());
        drop(stored);
        self.batch.matched += 1;
        self.batch.results.push(hit);
        if self.batch.results.len() >= 32 { self.flush("searching", None); }
        Ok(())
    }

    fn file(&mut self, segments: &[String], name: &str, ignored: bool) -> AppResult<()> {
        self.job.check()?;
        let file = match self.job.scope.open(self.root, segments, false) {
            Ok(file) => file,
            Err(error) if matches!(error.code, "scope_changed" | "root_reselection_required" | "invalid_grant") => return Err(error),
            Err(_) => { self.batch.skipped += 1; return Ok(()); }
        };
        let bytes_and_version = match immediate_bytes_and_version(&file) {
            Ok(value) => value,
            Err(_) => { self.batch.skipped += 1; return Ok(()); }
        };
        self.job.check()?;
        let (bytes, version) = bytes_and_version;
        if bytes.contains(&0) { self.batch.skipped += 1; return Ok(()); }
        let text = match String::from_utf8(bytes) {
            Ok(value) => value,
            Err(_) => { self.batch.skipped += 1; return Ok(()); }
        };
        let path = segments.join("/");
        if self.job.mode != SearchMode::Content
            && name.to_lowercase().contains(&self.job.query.to_lowercase()) {
            self.push(SearchHit { id: Uuid::new_v4().to_string(), segments: segments.to_vec(),
                path: path.clone(), line: 1, start_byte: 0, end_byte: 0,
                context: name.to_string(), kind: "name",
                ignored, version: version.clone() })?;
        }
        if self.job.mode != SearchMode::Name {
            for found in self.matcher.find_iter(&text).take(MAX_HITS_PER_FILE) {
                self.job.check()?;
                self.push(SearchHit { id: Uuid::new_v4().to_string(), segments: segments.to_vec(),
                    path: path.clone(), line: text[..found.start()].bytes().filter(|b| *b == b'\n').count() as u64 + 1,
                    start_byte: found.start() as u64, end_byte: found.end() as u64,
                    context: short_context(&text, found.start()), kind: "content",
                    ignored, version: version.clone() })?;
            }
        }
        Ok(())
    }

    fn directory(&mut self, segments: Vec<String>, inherited: &[Arc<Gitignore>]) -> AppResult<()> {
        self.job.check()?;
        self.root.verify_current()?;
        let dir = self.job.scope.open(self.root, &segments, true)?;
        let mut skipped = 0;
        let mut matchers = inherited.to_vec();
        if let Some(matcher) = scoped_ignore(self.root, &segments, &mut skipped) {
            matchers.push(matcher);
        }
        self.batch.skipped += skipped;
        let entries = read_search_entries(&dir, || self.job.cancelled.load(Ordering::SeqCst))?;
        for entry in entries {
            self.job.check()?;
            self.batch.scanned += 1;
            if self.batch.scanned > MAX_ENTRIES {
                self.limited = true;
                return Err(AppError::new("entry_limit", "Search entry limit reached"));
            }
            let mut path = segments.clone();
            path.push(entry.name.clone());
            let ignored = excluded(&entry.name)
                || ignored_by(&matchers, &path, entry.kind == "directory");
            if ignored && !self.job.include_ignored { continue; }
            match entry.kind {
                "directory" => {
                    match self.directory(path, &matchers) {
                        Ok(()) => {},
                        Err(error) if matches!(error.code, "cancelled" | "result_limit" | "entry_limit"
                            | "root_reselection_required" | "invalid_grant" | "scope_changed") => return Err(error),
                        Err(_) => self.batch.skipped += 1,
                    }
                },
                "markdown" => self.file(&path, &entry.name, ignored)?,
                _ => self.batch.skipped += 1,
            }
            if self.batch.scanned % 64 == 0 { self.flush("searching", None); }
        }
        Ok(())
    }
}

fn scan_root(root: &RootGrant, job: &SearchJob, emit: &mut dyn FnMut(SearchBatch)) {
    let matcher = match search_regex(&job.query) {
        Ok(value) => value,
        Err(error) => {
            emit(SearchBatch { job_id: job.id.clone(), generation: job.generation,
                results: vec![], scanned: 0, skipped: 0, matched: 0,
                status: "partial", error_code: Some(error.code) });
            return;
        }
    };
    let mut scan = Scan { root, job, matcher: &matcher, emit, limited: false,
        batch: SearchBatch { job_id: job.id.clone(), generation: job.generation,
            results: vec![], scanned: 0, skipped: 0, matched: 0,
            status: "searching", error_code: None } };
    // Load ancestor rules in the same order as a root traversal. An ignored
    // ancestor remains pruned unless includeIgnored was explicitly requested.
    let result = (|| {
        let mut inherited = Vec::new();
        for depth in 0..job.scope.segments.len() {
            job.check()?;
            job.scope.verify(root)?;
            if let Some(matcher) = scoped_ignore(root, &job.scope.segments[..depth], &mut scan.batch.skipped) {
                inherited.push(matcher);
            }
            let path = &job.scope.segments[..=depth];
            if !job.include_ignored && (path.iter().any(|name| excluded(name)) || ignored_by(&inherited, path, true)) {
                return Ok(());
            }
        }
        scan.directory(job.scope.segments.clone(), &inherited)?;
        job.scope.verify(root)
    })();
    match result {
        Ok(()) => scan.flush("complete", None),
        Err(error) if error.code == "cancelled" => scan.flush("stopped", None),
        Err(error) => scan.flush("partial", Some(error.code)),
    }
}

#[tauri::command]
pub async fn start_folder_search(app: AppHandle, state: tauri::State<'_, AppState>,
    searches: tauri::State<'_, SearchState>, root_id: String, query: String,
    mode: String, include_ignored: bool, scope_segments: Option<Vec<String>>) -> AppResult<SearchStarted> {
    let query = query.trim().to_string();
    if query.is_empty() || query.len() > MAX_QUERY_BYTES {
        return Err(AppError::new("invalid_query", "Search text must be 1 to 256 bytes"));
    }
    let mode = SearchMode::parse(&mode)?;
    let root = state.root(&root_id)?;
    let scope = SearchScope::confirm(&root, scope_segments.unwrap_or_default())?;
    let job = Arc::new(SearchJob { state: state.inner().clone(), id: Uuid::new_v4().to_string(), root_id,
        generation: root.generation, query, mode, include_ignored, scope,
        cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false), results: Mutex::new(HashMap::new()) });
    searches.replace(job.clone())?;
    let started = SearchStarted { job_id: job.id.clone(), generation: job.generation,
        scope_segments: job.scope.segments.clone() };
    tauri::async_runtime::spawn_blocking(move || scan_root(&root, &job,
        &mut |batch| { let _ = app.emit("folder-search:batch", batch); }));
    Ok(started)
}

#[tauri::command]
pub fn cancel_folder_search(searches: tauri::State<'_, SearchState>, job_id: String) -> AppResult<bool> {
    searches.cancel(&job_id)
}

fn open_hit_impl(state: &AppState, job: &SearchJob, hit: SearchHit) -> AppResult<OpenSearchHit> {
    let root = state.root(&job.root_id)?;
    if root.generation != job.generation {
        return Err(AppError::new("invalid_grant", "Search root changed"));
    }
    job.check_open()?;
    let file = job.scope.open(&root, &hit.segments, false)?;
    let document = read_document_with_file(state, None, Some(&job.root_id), Some(hit.segments), Some(file))?;
    job.scope.verify(&root)?;
    job.check_open()?;
    let changed = document.disk_version != hit.version;
    let mut best: Option<(usize, u64, u64)> = None;
    if hit.kind == "content" {
        let mut prior = 0usize;
        let mut line = 1u64;
        for (ordinal, found) in search_regex(&job.query)?.find_iter(&document.content)
            .take(MAX_RESULTS).enumerate() {
            line += document.content.as_bytes()[prior..found.start()].iter()
                .filter(|byte| **byte == b'\n').count() as u64;
            prior = found.start();
            let distance = line.abs_diff(hit.line);
            if best.map_or(true, |(_, _, current)| distance < current) {
                best = Some((ordinal, line, distance));
            }
            if distance == 0 { break; }
        }
    }
    let match_moved = hit.kind == "content" && changed && best.is_none();
    let line = best.map(|(_, line, _)| line).unwrap_or(1);
    let ordinal = best.map(|(ordinal, _, _)| ordinal);
    job.scope.verify(&root)?;
    job.check_open()?;
    Ok(OpenSearchHit { document, line, ordinal, changed, match_moved })
}

#[tauri::command]
pub async fn open_search_hit(state: tauri::State<'_, AppState>,
    searches: tauri::State<'_, SearchState>, job_id: String,
    result_id: String) -> AppResult<OpenSearchHit> {
    let state = state.inner().clone();
    let job = searches.active.lock()
        .map_err(|_| AppError::new("internal", "Search state unavailable"))?
        .as_ref().filter(|job| job.id == job_id).cloned()
        .ok_or_else(|| AppError::new("invalid_grant", "Search result expired"))?;
    let hit = job.results.lock()
        .map_err(|_| AppError::new("internal", "Search results unavailable"))?
        .get(&result_id).cloned()
        .ok_or_else(|| AppError::new("invalid_request", "Unknown search result"))?;
    tauri::async_runtime::spawn_blocking(move || open_hit_impl(&state, &job, hit))
        .await.map_err(|error| AppError::new("internal", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::symlink;

    fn fixture() -> (PathBuf, AppState, RootGrant) {
        let dir = std::env::temp_dir().join(format!("md-reader-search-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        (dir, state, root)
    }

    fn scoped_job(state: &AppState, root: &RootGrant, segments: &[&str], include_ignored: bool) -> SearchJob {
        SearchJob { state: state.clone(), id: Uuid::new_v4().to_string(), root_id: root.id.clone(), generation: root.generation,
            query: "needle".into(), mode: SearchMode::Both, include_ignored,
            scope: SearchScope::confirm(root, segments.iter().map(|s| s.to_string()).collect()).unwrap(),
            cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false), results: Mutex::new(HashMap::new()) }
    }

    #[test]
    fn subtree_preserves_ancestor_rules_and_cannot_open_sibling_hits() {
        let dir = crate::platform::test_support::FixtureDir::new("ir05-subtree");
        fs::create_dir_all(dir.join("notes/deep")).unwrap();
        fs::write(dir.join("sibling.md"), "needle").unwrap();
        fs::write(dir.join(".gitignore"), "notes/deep/secret.md\n").unwrap();
        fs::write(dir.join("notes/.gitignore"), "deep/hidden.md\n").unwrap();
        fs::write(dir.join("notes/deep/visible.md"), "needle").unwrap();
        fs::write(dir.join("notes/deep/secret.md"), "needle").unwrap();
        fs::write(dir.join("notes/deep/hidden.md"), "needle").unwrap();
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        let job = scoped_job(&state, &root, &["notes", "deep"], false);
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        let hits: Vec<_> = batches.iter().flat_map(|batch| &batch.results).collect();
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].path, "notes/deep/visible.md");
        assert_eq!(open_hit_impl(&state, &job, hits[0].clone()).unwrap().document.content, "needle");
        let mut forged = hits[0].clone();
        forged.segments = vec!["sibling.md".into()];
        assert_eq!(open_hit_impl(&state, &job, forged).err().unwrap().code, "invalid_path");
        let include = scoped_job(&state, &root, &["notes", "deep"], true);
        let mut batches = Vec::new();
        scan_root(&root, &include, &mut |batch| batches.push(batch));
        let hits: Vec<_> = batches.iter().flat_map(|batch| &batch.results).collect();
        assert_eq!(hits.len(), 3);
        assert_eq!(hits.iter().filter(|hit| hit.ignored).count(), 2);
        fs::write(dir.join("notes/deep/.gitignore"), "!secret.md\n").unwrap();
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        assert_eq!(batches.last().unwrap().matched, 2);
        fs::write(dir.join(".gitignore"), "notes/\n").unwrap();
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        assert_eq!(batches.last().unwrap().matched, 0);
        assert_eq!(batches.last().unwrap().status, "complete");
    }

    #[test]
    fn scope_validation_rejects_traversal_files_and_reparse_points() {
        let dir = crate::platform::test_support::FixtureDir::new("ir05-validation");
        let outside = crate::platform::test_support::FixtureDir::new("ir05-outside");
        fs::write(outside.join("private.md"), "needle").unwrap();
        fs::write(dir.join("file.md"), "needle").unwrap();
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        for segment in ["..", ".", "", "a/b", "a\\b", "\0"] {
            assert_eq!(SearchScope::confirm(&root, vec![segment.into()]).err().unwrap().code, "invalid_path");
        }
        assert!(SearchScope::confirm(&root, vec!["file.md".into()]).is_err());
        assert!(SearchScope::confirm(&root, vec!["missing".into()]).is_err());
        assert!(SearchScope::confirm(&root, vec!["deep".into(); 129]).is_err());
        let link = crate::platform::test_support::directory_link(&outside, &dir.join("escape")).unwrap();
        assert!(SearchScope::confirm(&root, vec!["escape".into()]).is_err());
        let internal = crate::platform::test_support::directory_link(&dir, &dir.join("internal")).unwrap();
        assert!(SearchScope::confirm(&root, vec!["internal".into()]).is_err());
        assert_eq!(fs::read(outside.join("private.md")).unwrap(), b"needle");
        drop(internal); drop(link);
    }

    #[test]
    fn replacement_job_rejects_old_open_and_late_cancel_preserves_new_job() {
        let dir = crate::platform::test_support::FixtureDir::new("ir05-job-ownership");
        fs::write(dir.join("visible.md"), "needle").unwrap();
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        let searches = SearchState::default();
        let first = Arc::new(scoped_job(&state, &root, &[], false));
        searches.replace(first.clone()).unwrap();
        let mut batches = Vec::new();
        scan_root(&root, &first, &mut |batch| batches.push(batch));
        let hit = batches.iter().flat_map(|batch| &batch.results).next().unwrap().clone();
        // Failed scope validation occurs before replace, leaving the current job usable.
        assert!(SearchScope::confirm(&root, vec!["..".into()]).is_err());
        assert!(open_hit_impl(&state, &first, hit.clone()).is_ok());
        let second = Arc::new(scoped_job(&state, &root, &[], false));
        searches.replace(second.clone()).unwrap();
        assert_eq!(open_hit_impl(&state, &first, hit).err().unwrap().code, "invalid_grant");
        assert!(!searches.cancel(&first.id).unwrap());
        assert!(!second.cancelled.load(Ordering::SeqCst));
        assert!(searches.cancel(&second.id).unwrap());
        let mut batches = Vec::new();
        scan_root(&root, &second, &mut |batch| batches.push(batch));
        assert_eq!(batches.last().unwrap().status, "stopped");
    }

    #[test]
    fn scope_replacement_between_batches_stops_scan_without_emitting_new_hits() {
        let dir = crate::platform::test_support::FixtureDir::new("ir05-stream-replacement");
        fs::create_dir(dir.join("notes")).unwrap();
        for n in 0..70 { fs::write(dir.join(format!("notes/{n}.md")), "needle").unwrap(); }
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        let job = scoped_job(&state, &root, &["notes"], false);
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| {
            // Result flushes occur while a file is held; Windows correctly
            // denies moving its parent then. The progress flush is between files.
            if batch.scanned == 64 && batch.results.is_empty() && batch.status == "searching" {
                fs::rename(dir.join("notes"), dir.join("old-notes")).unwrap();
                fs::create_dir(dir.join("notes")).unwrap();
                fs::write(dir.join("notes/replacement.md"), "needle").unwrap();
            }
            batches.push(batch);
        });
        assert_eq!(batches.len(), 4);
        assert_eq!(batches[0].results.len(), 32);
        assert_eq!(batches[1].results.len(), 32);
        assert!(batches[3].results.is_empty());
        assert_eq!(batches[3].status, "partial");
        assert_eq!(batches[3].error_code, Some("scope_changed"));
        assert_eq!(open_hit_impl(&state, &job, batches[0].results[0].clone()).err().unwrap().code, "scope_changed");
    }

    #[test]
    fn replaced_scope_invalidates_emission_and_open_but_stop_keeps_partial_hits_openable() {
        let dir = crate::platform::test_support::FixtureDir::new("ir05-replacement");
        fs::create_dir(dir.join("notes")).unwrap();
        fs::write(dir.join("notes/visible.md"), "needle").unwrap();
        let state = AppState::default();
        let info = state.register_root(&dir).unwrap();
        let root = state.root(&info.id).unwrap();
        let job = scoped_job(&state, &root, &["notes"], false);
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        let hit = batches.iter().flat_map(|batch| &batch.results).next().unwrap().clone();
        job.cancelled.store(true, Ordering::SeqCst);
        assert!(open_hit_impl(&state, &job, hit.clone()).is_ok());
        job.superseded.store(true, Ordering::SeqCst);
        assert_eq!(open_hit_impl(&state, &job, hit.clone()).err().unwrap().code, "invalid_grant");
        job.superseded.store(false, Ordering::SeqCst);
        job.cancelled.store(false, Ordering::SeqCst);
        fs::rename(dir.join("notes"), dir.join("old-notes")).unwrap();
        fs::create_dir(dir.join("notes")).unwrap();
        fs::write(dir.join("notes/visible.md"), "replacement needle").unwrap();
        assert_eq!(open_hit_impl(&state, &job, hit).err().unwrap().code, "scope_changed");
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        assert!(batches.iter().all(|batch| batch.results.is_empty()));
        assert_eq!(batches.last().unwrap().error_code, Some("scope_changed"));
        assert_eq!(batches.last().unwrap().status, "partial");
    }

    #[test]
    fn scoped_ignore_and_content_are_bounded_and_do_not_follow_links() {
        let (dir, state, root) = fixture();
        fs::create_dir(dir.join("notes")).unwrap();
        fs::write(dir.join(".gitignore"), "notes/secret.md\n").unwrap();
        let original = b"# Needle\nOther needle\n";
        fs::write(dir.join("notes/visible.md"), original).unwrap();
        fs::write(dir.join("notes/secret.md"), "# Needle\n").unwrap();
        let outside = crate::platform::test_support::FixtureDir::new("md-reader-search-outside");
        let outside_file = outside.path().join("outside.md");
        fs::write(&outside_file, "# Needle\n").unwrap();
        #[cfg(target_os = "macos")]
        symlink(&outside_file, dir.join("notes/link.md")).unwrap();
        #[cfg(target_os = "windows")]
        let junction = crate::platform::test_support::directory_link(outside.path(), &dir.join("notes/link")).unwrap();
        let job = SearchJob { state: state.clone(), id: "job".into(), root_id: root.id.clone(),
            generation: root.generation, query: "needle".into(), mode: SearchMode::Both,
            include_ignored: false, scope: SearchScope::confirm(&root, vec![]).unwrap(), cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false),
            results: Mutex::new(HashMap::new()) };
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        let hits: Vec<_> = batches.iter().flat_map(|batch| &batch.results).collect();
        assert_eq!(hits.len(), 2);
        assert!(hits.iter().all(|hit| hit.path == "notes/visible.md"));
        assert_eq!(batches.last().unwrap().status, "complete");
        assert_eq!(fs::read(dir.join("notes/visible.md")).unwrap(), original);
        let include = SearchJob { state: state.clone(), id: "include".into(), root_id: root.id.clone(),
            generation: root.generation, query: "needle".into(), mode: SearchMode::Both,
            include_ignored: true, scope: SearchScope::confirm(&root, vec![]).unwrap(), cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false),
            results: Mutex::new(HashMap::new()) };
        let mut included = Vec::new();
        scan_root(&root, &include, &mut |batch| included.push(batch));
        let ignored_hits: Vec<_> = included.iter().flat_map(|batch| &batch.results)
            .filter(|hit| hit.path == "notes/secret.md").collect();
        assert_eq!(ignored_hits.len(), 1);
        assert!(ignored_hits[0].ignored);
        assert!(included.iter().flat_map(|batch| &batch.results)
            .all(|hit| hit.path != "notes/link.md" && !hit.path.starts_with("notes/link/")));
        fs::write(dir.join("notes/visible.md"), b"# Changed\n").unwrap();
        let opened = open_hit_impl(&state, &job, hits[0].clone()).unwrap();
        assert!(opened.changed && opened.match_moved);
        assert_eq!(opened.document.content, "# Changed\n");
        job.cancelled.store(true, Ordering::SeqCst);
        let mut stopped = Vec::new();
        scan_root(&root, &job, &mut |batch| stopped.push(batch));
        assert_eq!(stopped.last().unwrap().status, "stopped");
        #[cfg(target_os = "windows")]
        drop(junction);
        assert_eq!(fs::read(outside_file).unwrap(), b"# Needle\n");
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn nested_whitelist_and_root_switch_invalidate_old_hits() {
        let (dir, state, root) = fixture();
        fs::create_dir(dir.join("notes")).unwrap();
        fs::write(dir.join(".gitignore"), "notes/secret.md\n").unwrap();
        fs::write(dir.join("notes/.gitignore"), "!secret.md\n").unwrap();
        fs::write(dir.join("notes/secret.md"), "needle\n").unwrap();
        let job = SearchJob { state: state.clone(), id: "job".into(), root_id: root.id.clone(),
            generation: root.generation, query: "needle".into(), mode: SearchMode::Content,
            include_ignored: false, scope: SearchScope::confirm(&root, vec![]).unwrap(), cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false),
            results: Mutex::new(HashMap::new()) };
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        let hit = batches.iter().flat_map(|batch| &batch.results).next().unwrap().clone();
        assert_eq!(hit.path, "notes/secret.md");
        assert!(!hit.ignored);
        let other = std::env::temp_dir().join(format!("md-reader-search-other-{}", Uuid::new_v4()));
        fs::create_dir(&other).unwrap();
        state.register_root(&other).unwrap();
        assert_eq!(open_hit_impl(&state, &job, hit).err().unwrap().code, "invalid_grant");
        let mut expired = Vec::new();
        scan_root(&root, &job, &mut |batch| expired.push(batch));
        assert_eq!(expired.last().unwrap().status, "partial");
        assert_eq!(expired.last().unwrap().error_code, Some("invalid_grant"));
        assert!(expired.iter().all(|batch| batch.results.is_empty()));
        fs::remove_dir_all(other).unwrap();
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[ignore = "25,000 disposable files and cancellation timing; run explicitly for F003F evidence"]
    fn twenty_five_thousand_entry_scan_and_stop() {
        use std::time::{Duration, Instant};
        let (dir, state, root) = fixture();
        for number in 0..25_000 {
            let name = if number < 5_000 {
                format!("{number:05}.md")
            } else { format!("{number:05}.txt") };
            let content: &[u8] = if number < 5_000 && number % 1_000 == 0 {
                b"# Needle\n"
            } else { b"# Other\n" };
            fs::write(dir.join(name), content).unwrap();
        }
        let job = Arc::new(SearchJob { state: state.clone(), id: "large".into(), root_id: root.id.clone(),
            generation: root.generation, query: "needle".into(), mode: SearchMode::Content,
            include_ignored: false, scope: SearchScope::confirm(&root, vec![]).unwrap(), cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false),
            results: Mutex::new(HashMap::new()) });
        let started = Instant::now();
        let mut batches = Vec::new();
        scan_root(&root, &job, &mut |batch| batches.push(batch));
        let elapsed = started.elapsed();
        let final_batch = batches.last().unwrap();
        assert_eq!(final_batch.status, "complete");
        assert_eq!(final_batch.scanned, 25_000);
        assert_eq!(final_batch.matched, 5);
        assert_eq!(final_batch.skipped, 20_000);
        println!("F003F 25k complete scan: {:?}", elapsed);
        let mut stop_times = Vec::new();
        for trial in 0..10 {
            let stop_job = Arc::new(SearchJob { state: state.clone(), id: format!("stop-{trial}"),
                root_id: root.id.clone(), generation: root.generation,
                query: "needle".into(), mode: SearchMode::Content,
                include_ignored: false, scope: SearchScope::confirm(&root, vec![]).unwrap(), cancelled: AtomicBool::new(false), superseded: AtomicBool::new(false),
                results: Mutex::new(HashMap::new()) });
            let root_clone = root.clone();
            let job_clone = stop_job.clone();
            let handle = std::thread::spawn(move || {
                let mut events = Vec::new();
                scan_root(&root_clone, &job_clone, &mut |batch| events.push(batch));
                events.last().unwrap().status.to_string()
            });
            std::thread::sleep(Duration::from_millis(10));
            let stop = Instant::now();
            stop_job.cancelled.store(true, Ordering::SeqCst);
            let status = handle.join().unwrap();
            let stop_time = stop.elapsed();
            assert_eq!(status, "stopped");
            stop_times.push(stop_time);
        }
        println!("F003F 25k worker stop trials: {:?}", stop_times);
        assert!(stop_times.iter().filter(|time| **time <= Duration::from_millis(250)).count() >= 9);
        fs::remove_dir_all(dir).unwrap();
    }
}
