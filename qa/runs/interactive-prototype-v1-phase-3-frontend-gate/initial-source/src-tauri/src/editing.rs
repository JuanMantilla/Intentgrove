use crate::document::{immediate_bytes_and_version, read_document_impl};
#[cfg(all(test, target_os = "macos"))]
use crate::platform::stage_bytes;
use crate::platform::{
    link_document_stage_new as link_stage_new, open_document_for_commit,
    remove_document_stage as remove_stage, rename_document_stage as rename_stage,
    stage_document_bytes,
};
use crate::recovery::clear_owned_recovery;
use crate::save_copies::SafetyCopyBatch;
use crate::scope::{identity, open_relative, open_selected, validate_segment, AppError, AppResult};
use crate::state::{AppState, FileSource};
use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::borrow::Cow;
use std::collections::HashMap;
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionDescriptor {
    pub id: String,
    pub kind: String,
    pub ordinal: usize,
    pub level: Option<u8>,
    pub label: String,
    pub start_byte: usize,
    pub end_byte: usize,
    pub source_hash: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SectionsResponse {
    pub disk_version: String,
    pub sections: Vec<SectionDescriptor>,
}

#[derive(Clone)]
pub struct EditSession {
    pub id: String,
    pub file_id: String,
    pub disk_version: String,
    pub base: Vec<u8>,
    pub section: SectionDescriptor,
    pub recovery_owner: String,
    pub recovery_paths: Vec<String>,
}

#[derive(Clone, Default)]
pub struct EditingState {
    pub(crate) sessions: Arc<Mutex<HashMap<String, EditSession>>>,
    destinations: Arc<Mutex<HashMap<String, SaveDestination>>>,
    quit_allowed: Arc<std::sync::atomic::AtomicBool>,
}

impl EditingState {
    pub fn has_sessions(&self) -> bool {
        self.sessions
            .lock()
            .map(|sessions| !sessions.is_empty())
            .unwrap_or(true)
    }

    pub fn quit_allowed(&self) -> bool {
        self.quit_allowed.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn allow_quit(&self) {
        self.quit_allowed
            .store(true, std::sync::atomic::Ordering::SeqCst);
    }

    pub fn cancel_quit(&self) {
        self.quit_allowed
            .store(false, std::sync::atomic::Ordering::SeqCst);
    }

    pub fn clear_for_window_reopen(&self) -> AppResult<()> {
        self.sessions
            .lock()
            .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?
            .clear();
        self.destinations
            .lock()
            .map_err(|_| AppError::new("internal", "Save destination state is unavailable"))?
            .clear();
        self.cancel_quit();
        Ok(())
    }
}

#[derive(Clone)]
struct SaveDestination {
    session_id: String,
    path: PathBuf,
    existing_version: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginEditResponse {
    pub session_id: String,
    pub disk_version: String,
    pub section: SectionDescriptor,
    pub source: String,
    pub line_separator: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveEditResponse {
    pub disk_version: String,
    pub content: String,
    pub sections: Vec<SectionDescriptor>,
    pub recovery_cleanup_failed: bool,
    pub safety_copy_status_failed: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveAsChoice {
    pub token: String,
    pub name: String,
    pub exists: bool,
}

fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn section(
    kind: &'static str,
    ordinal: usize,
    level: Option<u8>,
    label: String,
    range: std::ops::Range<usize>,
    bytes: &[u8],
    version: &str,
) -> SectionDescriptor {
    let start = range.start;
    let end = range.end;
    let source_hash = hash(&bytes[range]);
    let id = hash(format!("{version}:{ordinal}:{start}:{end}:{source_hash}").as_bytes());
    SectionDescriptor {
        id,
        kind: kind.to_string(),
        ordinal,
        level,
        label,
        start_byte: start,
        end_byte: end,
        source_hash,
    }
}

pub(crate) fn line_separator(source: &str) -> &'static str {
    if source.contains("\r\n") {
        "\r\n"
    } else if source.contains('\r') {
        "\r"
    } else {
        "\n"
    }
}

pub fn sections_from_source(bytes: &[u8], version: &str) -> AppResult<Vec<SectionDescriptor>> {
    if bytes.contains(&0) {
        return Err(AppError::new("binary", "This file contains binary data"));
    }
    let bom = if bytes.starts_with(&[0xef, 0xbb, 0xbf]) {
        3
    } else {
        0
    };
    let source = std::str::from_utf8(&bytes[bom..])
        .map_err(|_| AppError::new("encoding", "This file is not valid UTF-8"))?;
    // pulldown-cmark treats bare CR as heading text. CR and LF occupy one byte,
    // so parsing normalized line breaks preserves every byte offset.
    let normalized = if source.contains('\r') && !source.contains("\r\n") {
        Cow::Owned(source.replace('\r', "\n"))
    } else {
        Cow::Borrowed(source)
    };
    let mut headings: Vec<(usize, u8, String)> = Vec::new();
    let mut nested = 0usize;
    let mut heading: Option<(usize, u8, String)> = None;
    for (event, range) in Parser::new_ext(&normalized, Options::all()).into_offset_iter() {
        match event {
            Event::Start(Tag::BlockQuote(_)) | Event::Start(Tag::List(_)) => nested += 1,
            Event::End(TagEnd::BlockQuote(_)) | Event::End(TagEnd::List(_)) => {
                nested = nested.saturating_sub(1);
            }
            Event::Start(Tag::Heading { level, .. }) if nested == 0 => {
                heading = Some((bom + range.start, level as u8, String::new()));
            }
            Event::Text(text) | Event::Code(text) => {
                if let Some((_, _, label)) = &mut heading {
                    label.push_str(&text);
                }
            }
            Event::End(TagEnd::Heading(_)) => {
                if let Some(entry) = heading.take() {
                    headings.push(entry);
                }
            }
            _ => {}
        }
    }
    let mut result = Vec::new();
    if headings.is_empty() {
        result.push(section(
            "whole",
            0,
            None,
            String::new(),
            bom..bytes.len(),
            bytes,
            version,
        ));
        return Ok(result);
    }
    if headings[0].0 > bom {
        result.push(section(
            "preheading",
            0,
            None,
            String::new(),
            bom..headings[0].0,
            bytes,
            version,
        ));
    }
    for (index, (start, level, label)) in headings.iter().enumerate() {
        let end = headings
            .get(index + 1)
            .map(|next| next.0)
            .unwrap_or(bytes.len());
        result.push(section(
            "heading",
            result.len(),
            Some(*level),
            label.clone(),
            *start..end,
            bytes,
            version,
        ));
    }
    Ok(result)
}

#[tauri::command]
pub async fn list_edit_sections(
    state: State<'_, AppState>,
    file_id: String,
) -> AppResult<SectionsResponse> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || list_edit_sections_impl(&state, &file_id))
        .await
        .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn list_edit_sections_impl(state: &AppState, file_id: &str) -> AppResult<SectionsResponse> {
    let response = read_document_impl(state, Some(file_id), None, None)?;
    let sections = sections_from_source(response.content.as_bytes(), &response.disk_version)?;
    Ok(SectionsResponse {
        disk_version: response.disk_version,
        sections,
    })
}

#[tauri::command]
pub async fn begin_section_edit(
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    file_id: String,
    section_id: String,
    expected_disk_version: String,
) -> AppResult<BeginEditResponse> {
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        begin_section_edit_impl(&state, &editing, file_id, section_id, expected_disk_version)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn begin_section_edit_impl(
    state: &AppState,
    editing: &EditingState,
    file_id: String,
    section_id: String,
    expected_disk_version: String,
) -> AppResult<BeginEditResponse> {
    crate::platform::require_editing()?;
    let (_, _, current) = target_parent(state, &file_id)?;
    crate::platform::validate_editable_document(&current)?;
    prepare_edit_session(state, editing, file_id, section_id, expected_disk_version)
}

// Shared policy, called by the gated entry point. Native fixtures exercise this
// policy directly without enabling production editing or the Mac-only harness.
fn prepare_edit_session(
    state: &AppState,
    editing: &EditingState,
    file_id: String,
    section_id: String,
    expected_disk_version: String,
) -> AppResult<BeginEditResponse> {
    let response = read_document_impl(state, Some(&file_id), None, None)?;
    if response.disk_version != expected_disk_version {
        return Err(AppError::new(
            "version_changed",
            "File changed before editing began",
        ));
    }
    let base = response.content.into_bytes();
    let selected = sections_from_source(&base, &response.disk_version)?
        .into_iter()
        .find(|candidate| candidate.id == section_id)
        .ok_or_else(|| AppError::new("section_changed", "Section changed before editing began"))?;
    let source = std::str::from_utf8(&base[selected.start_byte..selected.end_byte])
        .map_err(|_| AppError::new("encoding", "Section is not valid UTF-8"))?
        .to_string();
    check_separator(&base, &source)?;
    let whole_source = std::str::from_utf8(&base)
        .map_err(|_| AppError::new("encoding", "File is not valid UTF-8"))?;
    let separator = line_separator(whole_source);
    let mut sessions = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    if sessions.values().any(|session| session.file_id == file_id) {
        return Err(AppError::new(
            "draft_exists",
            "This document already has a section edit",
        ));
    }
    let session_id = Uuid::new_v4().to_string();
    sessions.insert(
        session_id.clone(),
        EditSession {
            id: session_id.clone(),
            file_id,
            disk_version: response.disk_version.clone(),
            base,
            section: selected.clone(),
            recovery_owner: session_id.clone(),
            recovery_paths: Vec::new(),
        },
    );
    Ok(BeginEditResponse {
        session_id,
        disk_version: response.disk_version,
        section: selected,
        line_separator: separator,
        source,
    })
}

#[tauri::command]
pub fn discard_section_edit(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    session_id: String,
) -> AppResult<()> {
    let mut sessions = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let grant = state.file(&session.file_id)?;
    clear_owned_recovery(&app, session, &grant.display_path)?;
    sessions
        .remove(&session_id)
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    Ok(())
}

#[tauri::command]
pub fn suspend_section_edit(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    session_id: String,
) -> AppResult<()> {
    let mut sessions = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    let session = sessions
        .get(&session_id)
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let grant = state.file(&session.file_id)?;
    if !crate::recovery::has_saved_recovery(&app, session, &grant.display_path)? {
        return Err(AppError::new(
            "recovery_error",
            "No durable edit recovery is available",
        ));
    }
    sessions.remove(&session_id);
    Ok(())
}

pub fn restore_session(
    editing: &EditingState,
    file_id: String,
    disk_version: String,
    base: Vec<u8>,
    section: SectionDescriptor,
    recovery_owner: Option<String>,
    recovery_paths: Vec<String>,
) -> AppResult<String> {
    crate::platform::require_editing()?;
    let mut sessions = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    if sessions.values().any(|session| session.file_id == file_id) {
        return Err(AppError::new(
            "draft_exists",
            "This document already has a section edit",
        ));
    }
    if section.end_byte > base.len()
        || section.start_byte > section.end_byte
        || hash(&base[section.start_byte..section.end_byte]) != section.source_hash
    {
        return Err(AppError::new(
            "section_changed",
            "Recovery section boundary is invalid",
        ));
    }
    let session_id = Uuid::new_v4().to_string();
    sessions.insert(
        session_id.clone(),
        EditSession {
            id: session_id.clone(),
            file_id,
            disk_version,
            base,
            section,
            recovery_owner: recovery_owner.unwrap_or_else(|| session_id.clone()),
            recovery_paths,
        },
    );
    Ok(session_id)
}

fn target_parent(state: &AppState, file_id: &str) -> AppResult<(File, String, File)> {
    let grant = state.file(file_id)?;
    let (parent, name) = match grant.source {
        FileSource::Root {
            root_id,
            mut segments,
        } => {
            let root = state.root(&root_id)?;
            let name = segments
                .pop()
                .ok_or_else(|| AppError::new("invalid_path", "File name is missing"))?;
            let parent = open_relative(&root.file, &segments, true)?;
            (parent, name)
        }
        FileSource::Explicit { path, .. } => {
            let name = path
                .file_name()
                .ok_or_else(|| AppError::new("invalid_path", "File name is missing"))?
                .to_string_lossy()
                .into_owned();
            let parent_path = path
                .parent()
                .ok_or_else(|| AppError::new("invalid_path", "Parent folder is missing"))?;
            (open_selected(parent_path, true)?, name)
        }
    };
    validate_segment(&name)?;
    let current = open_relative(&parent, &[name.clone()], false)?;
    Ok((parent, name, current))
}

struct StageCleanup<'a> {
    parent: &'a File,
    stage: &'a crate::platform::DocumentStage,
    name: &'a str,
    armed: bool,
}
impl<'a> StageCleanup<'a> {
    fn new(parent: &'a File, stage: &'a crate::platform::DocumentStage, name: &'a str) -> Self {
        Self {
            parent,
            stage,
            name,
            armed: true,
        }
    }
    fn disarm(&mut self) {
        self.armed = false;
    }
}
impl Drop for StageCleanup<'_> {
    fn drop(&mut self) {
        if self.armed {
            remove_stage(self.parent, self.stage, self.name);
        }
    }
}

fn destination_parent(path: &Path) -> AppResult<(File, String)> {
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| AppError::new("invalid_path", "Destination name is invalid"))?
        .to_string();
    validate_segment(&name)?;
    if !crate::scope::markdown_name(&name) {
        return Err(AppError::new(
            "unsupported_type",
            "Choose a Markdown filename",
        ));
    }
    let parent_path = path
        .parent()
        .ok_or_else(|| AppError::new("invalid_path", "Destination folder is missing"))?;
    Ok((open_selected(parent_path, true)?, name))
}

#[tauri::command]
pub async fn choose_section_save_as(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    session_id: String,
) -> AppResult<Option<SaveAsChoice>> {
    crate::platform::require_editing()?;
    let session = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?
        .get(&session_id)
        .cloned()
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let grant = state.file(&session.file_id)?;
    let suggested = grant.name.clone();
    let dialog_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .set_title("Save Markdown copy")
            .set_file_name(suggested)
            .add_filter("Markdown", &["md", "markdown"])
            .blocking_save_file()
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?;
    let path = match selected {
        None => return Ok(None),
        Some(selected) => selected
            .into_path()
            .map_err(|_| AppError::new("invalid_path", "Only local destinations are supported"))?,
    };
    if path == PathBuf::from(&grant.display_path) {
        return Err(AppError::new(
            "invalid_path",
            "Save As must use a different file",
        ));
    }
    let (parent, name) = destination_parent(&path)?;
    let existing_version = match open_relative(&parent, &[name.clone()], false) {
        Ok(file) => {
            if identity(&file)? == grant.identity {
                return Err(AppError::new(
                    "invalid_path",
                    "Save As must use a different file",
                ));
            }
            Some(immediate_bytes_and_version(&file)?.1)
        }
        Err(error) if error.code == "missing" => None,
        Err(error) => return Err(error),
    };
    let token = Uuid::new_v4().to_string();
    editing
        .destinations
        .lock()
        .map_err(|_| AppError::new("internal", "Destination state is unavailable"))?
        .insert(
            token.clone(),
            SaveDestination {
                session_id,
                path,
                existing_version: existing_version.clone(),
            },
        );
    Ok(Some(SaveAsChoice {
        token,
        name,
        exists: existing_version.is_some(),
    }))
}

#[tauri::command]
pub async fn commit_section_save_as(
    app: tauri::AppHandle,
    editing: State<'_, EditingState>,
    session_id: String,
    token: String,
    replacement: String,
    replace_existing: bool,
) -> AppResult<()> {
    crate::platform::require_editing()?;
    let editing = editing.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        commit_section_save_as_impl(
            &app,
            &editing,
            session_id,
            token,
            replacement,
            replace_existing,
        )
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn commit_section_save_as_impl(
    app: &tauri::AppHandle,
    editing: &EditingState,
    session_id: String,
    token: String,
    replacement: String,
    replace_existing: bool,
) -> AppResult<()> {
    let mut copies = if replace_existing {
        Some(SafetyCopyBatch::begin(
            app,
            crate::document::MAX_DOCUMENT_BYTES as u64,
        )?)
    } else {
        None
    };
    let result = commit_section_save_as_with_backup(
        editing,
        session_id,
        token,
        replacement,
        replace_existing,
        |_, bytes| match copies.as_mut() {
            Some(batch) => batch.preserve("save-as-original", bytes),
            None => Err(AppError::new(
                "safety_copy_error",
                "Unexpected Save As copy",
            )),
        },
    );
    if result.is_ok() {
        if let Some(batch) = copies.as_mut() {
            let _ = batch.resolve();
        }
    }
    result
}

fn commit_section_save_as_with_backup(
    editing: &EditingState,
    session_id: String,
    token: String,
    replacement: String,
    replace_existing: bool,
    mut backup: impl FnMut(&str, &[u8]) -> AppResult<()>,
) -> AppResult<()> {
    let destination = editing
        .destinations
        .lock()
        .map_err(|_| AppError::new("internal", "Destination state is unavailable"))?
        .get(&token)
        .cloned()
        .ok_or_else(|| AppError::new("invalid_destination", "Save As destination expired"))?;
    if destination.session_id != session_id {
        return Err(AppError::new(
            "invalid_destination",
            "Save As destination belongs to another edit",
        ));
    }
    let session = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?
        .get(&session_id)
        .cloned()
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let output = compose_section(&session.base, &session.section, &replacement)?;
    let (parent, name) = destination_parent(&destination.path)?;
    let current = match open_relative(&parent, &[name.clone()], false) {
        Ok(file) => Some(file),
        Err(error) if error.code == "missing" => None,
        Err(error) => return Err(error),
    };
    match (destination.existing_version.as_ref(), current.as_ref()) {
        (None, None) => {
            let (stage_name, stage) = stage_document_bytes(&parent, &output, None)?;
            let mut cleanup = StageCleanup::new(&parent, &stage, &stage_name);
            let result = link_stage_new(&parent, &stage, &stage_name, &name);
            if result.is_ok() {
                cleanup.disarm();
            }
            if result.is_err() {
                remove_stage(&parent, &stage, &stage_name);
            }
            drop(cleanup);
            drop(stage);
            result?;
        }
        (Some(expected), Some(current)) if replace_existing => {
            let (old, version) = immediate_bytes_and_version(current)?;
            if &version != expected {
                return Err(AppError::new(
                    "version_changed",
                    "Save As destination changed",
                ));
            }
            let (stage_name, stage) = stage_document_bytes(&parent, &output, Some(current))?;
            let mut cleanup = StageCleanup::new(&parent, &stage, &stage_name);
            if let Err(error) = backup(&hash(destination.path.as_os_str().as_encoded_bytes()), &old)
            {
                remove_stage(&parent, &stage, &stage_name);
                return Err(error);
            }
            let final_file = open_document_for_commit(&parent, &name)?;
            let (final_bytes, final_version) = immediate_bytes_and_version(&final_file)?;
            if final_version != version
                || final_bytes != old
                || identity(&final_file)? != identity(current)?
            {
                remove_stage(&parent, &stage, &stage_name);
                return Err(AppError::new(
                    "version_changed",
                    "Save As destination changed",
                ));
            }
            if let Err(error) = rename_stage(&parent, &stage, &stage_name, &name) {
                remove_stage(&parent, &stage, &stage_name);
                return Err(error);
            }
            cleanup.disarm();
            drop(cleanup);
            drop(stage);
        }
        (Some(_), Some(_)) => {
            return Err(AppError::new(
                "replace_confirmation",
                "Confirm replacement of this destination",
            ));
        }
        _ => {
            return Err(AppError::new(
                "version_changed",
                "Save As destination changed",
            ))
        }
    }
    let final_file = open_relative(&parent, &[name], false)?;
    if immediate_bytes_and_version(&final_file)?.0 != output {
        return Err(AppError::new(
            "save_race",
            "Destination changed during Save As",
        ));
    }
    editing
        .destinations
        .lock()
        .map_err(|_| AppError::new("internal", "Destination state is unavailable"))?
        .remove(&token);
    Ok(())
}

fn check_separator(base: &[u8], replacement: &str) -> AppResult<()> {
    let original = std::str::from_utf8(base)
        .map_err(|_| AppError::new("encoding", "File is not valid UTF-8"))?;
    let crlf = original.matches("\r\n").count();
    let bare_lf = original
        .as_bytes()
        .iter()
        .enumerate()
        .filter(|(index, byte)| {
            **byte == b'\n' && (*index == 0 || original.as_bytes()[*index - 1] != b'\r')
        })
        .count();
    let bare_cr = original
        .as_bytes()
        .windows(2)
        .filter(|pair| pair[0] == b'\r' && pair[1] != b'\n')
        .count()
        + usize::from(original.as_bytes().last() == Some(&b'\r'));
    if [crlf > 0, bare_lf > 0, bare_cr > 0]
        .iter()
        .filter(|value| **value)
        .count()
        > 1
    {
        return Err(AppError::new(
            "mixed_endings",
            "Mixed line endings cannot be edited safely",
        ));
    }
    let expected = if crlf > 0 {
        "\r\n"
    } else if bare_cr > 0 {
        "\r"
    } else {
        "\n"
    };
    if (expected == "\r\n" && replacement.replace("\r\n", "").contains(['\r', '\n']))
        || (expected == "\r" && replacement.contains('\n'))
        || (expected == "\n" && replacement.contains('\r'))
    {
        return Err(AppError::new(
            "line_endings",
            "Edited section changed the line-ending convention",
        ));
    }
    Ok(())
}

fn compose_section(
    base: &[u8],
    selected: &SectionDescriptor,
    replacement: &str,
) -> AppResult<Vec<u8>> {
    if replacement.as_bytes().contains(&0) {
        return Err(AppError::new(
            "binary",
            "The edited section contains binary data",
        ));
    }
    if selected.start_byte > selected.end_byte
        || selected.end_byte > base.len()
        || hash(&base[selected.start_byte..selected.end_byte]) != selected.source_hash
    {
        return Err(AppError::new(
            "section_changed",
            "Selected section boundary is invalid",
        ));
    }
    check_separator(base, replacement)?;
    let mut output = Vec::with_capacity(base.len() + replacement.len());
    output.extend_from_slice(&base[..selected.start_byte]);
    output.extend_from_slice(replacement.as_bytes());
    output.extend_from_slice(&base[selected.end_byte..]);
    if output.len() > crate::document::MAX_DOCUMENT_BYTES {
        return Err(AppError::new(
            "oversize",
            "Edited document exceeds the limit",
        ));
    }
    Ok(output)
}

#[tauri::command]
pub async fn save_section_edit(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    editing: State<'_, EditingState>,
    session_id: String,
    replacement: String,
) -> AppResult<SaveEditResponse> {
    crate::platform::require_editing()?;
    #[cfg(feature = "acceptance-harness")]
    let qa = crate::acceptance_harness::enter("save-section").await?;
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        save_section_edit_impl(&app, &state, &editing, session_id, replacement)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?;
    #[cfg(feature = "acceptance-harness")]
    return qa.finish(result);
    #[cfg(not(feature = "acceptance-harness"))]
    result
}

fn save_section_edit_impl(
    app: &tauri::AppHandle,
    state: &AppState,
    editing: &EditingState,
    session_id: String,
    replacement: String,
) -> AppResult<SaveEditResponse> {
    let session = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?
        .get(&session_id)
        .cloned()
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let output = compose_section(&session.base, &session.section, &replacement)?;
    let reserve = (session.base.len() + output.len() + crate::document::MAX_DOCUMENT_BYTES) as u64;
    let mut copies = SafetyCopyBatch::begin(app, reserve)?;
    let mut saved = save_section_edit_with_operations(
        state,
        editing,
        session_id,
        replacement,
        |id, bytes| {
            let role = if id.ends_with(".staged") {
                "staged"
            } else if id.ends_with(".intervening") {
                "intervening"
            } else {
                "original"
            };
            copies.preserve(role, bytes)
        },
        |display_path, session| clear_owned_recovery(app, session, display_path),
        rename_stage,
    )?;
    saved.safety_copy_status_failed = copies.resolve().is_err();
    Ok(saved)
}

// Private operations isolate app-data lookup and allow the actual transaction to
// be exercised with disposable storage and a separately scheduled writer.
fn save_section_edit_with_operations(
    state: &AppState,
    editing: &EditingState,
    session_id: String,
    replacement: String,
    mut backup: impl FnMut(&str, &[u8]) -> AppResult<()>,
    cleanup: impl FnOnce(&str, &EditSession) -> AppResult<()>,
    replace: impl FnOnce(&File, &crate::platform::DocumentStage, &str, &str) -> AppResult<()>,
) -> AppResult<SaveEditResponse> {
    let mut sessions = editing
        .sessions
        .lock()
        .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
    let session = sessions
        .get(&session_id)
        .cloned()
        .ok_or_else(|| AppError::new("invalid_session", "Edit session is missing"))?;
    let (parent, target_name, current) = target_parent(state, &session.file_id)?;
    let grant = state.file(&session.file_id)?;
    if identity(&current)? != grant.identity {
        return Err(AppError::new(
            "version_changed",
            "The file was replaced by another app",
        ));
    }
    let (original, version) = immediate_bytes_and_version(&current)?;
    if version != session.disk_version || original != session.base {
        return Err(AppError::new(
            "version_changed",
            "The file changed in another app",
        ));
    }
    let output = compose_section(&session.base, &session.section, &replacement)?;
    #[cfg(feature = "acceptance-harness")]
    crate::acceptance_harness::fixture_save_failure()?;
    let (stage_name, stage) = stage_document_bytes(&parent, &output, Some(&current))?;
    let mut stage_cleanup = StageCleanup::new(&parent, &stage, &stage_name);
    if let Err(error) = backup(&session.file_id, &original)
        .and_then(|_| backup(&format!("{}.staged", session.file_id), &output))
    {
        remove_stage(&parent, &stage, &stage_name);
        return Err(error);
    }
    let fresh = open_document_for_commit(&parent, &target_name)?;
    let (latest, latest_version) = immediate_bytes_and_version(&fresh)?;
    if identity(&fresh)? != grant.identity || latest_version != version || latest != original {
        remove_stage(&parent, &stage, &stage_name);
        return Err(AppError::new(
            "version_changed",
            "The file changed before Save completed",
        ));
    }
    if let Err(error) = replace(&parent, &stage, &stage_name, &target_name) {
        remove_stage(&parent, &stage, &stage_name);
        return Err(error);
    }
    stage_cleanup.disarm();
    drop(stage_cleanup);
    drop(stage);
    let committed = open_relative(&parent, &[target_name], false)?;
    let (actual, new_version) = immediate_bytes_and_version(&committed)?;
    if actual != output {
        let captured = backup(&format!("{}.intervening", session.file_id), &actual).is_ok();
        return Err(AppError::new(
            if captured {
                "save_race"
            } else {
                "save_race_uncaptured"
            },
            if captured {
                "The file changed during Save; captured disk, draft, and staged output are retained"
            } else {
                "The file changed during Save; the intervening version could not be captured"
            },
        ));
    }
    state.update_saved_file_identity(&session.file_id, committed)?;
    sessions.remove(&session_id);
    let recovery_cleanup_failed = cleanup(&grant.display_path, &session).is_err();
    let sections = sections_from_source(&output, &new_version)?;
    let content = String::from_utf8(output)
        .map_err(|_| AppError::new("encoding", "Edited document is not valid UTF-8"))?;
    Ok(SaveEditResponse {
        disk_version: new_version,
        content,
        sections,
        recovery_cleanup_failed,
        safety_copy_status_failed: false,
    })
}

#[cfg(test)]
pub(crate) fn save_for_recent_test(state: &AppState, file_id: &str, content: &str) -> AppResult<SaveEditResponse> {
    let editing = EditingState::default();
    let sections = list_edit_sections_impl(state, file_id)?;
    let started = begin_section_edit_impl(state, &editing, file_id.into(),
        sections.sections[0].id.clone(), sections.disk_version)?;
    save_section_edit_with_operations(state, &editing, started.session_id, content.into(),
        |_, _| Ok(()), |_, _| Ok(()), rename_stage)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scope::io_error;
    use std::fs;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::PermissionsExt;

    #[test]
    fn new_empty_file_public_section_begin_save_reopen_and_restore_lifecycle() {
        let fixture = crate::platform::test_support::FixtureDir::new("md-created-edit");
        let state = AppState::default(); let editing = EditingState::default();
        let selected = state.register_root(fixture.path()).unwrap(); let root = state.root(&selected.id).unwrap();
        let created = crate::platform::create_empty(&root.file, "created.md").unwrap();
        assert!(created.verification_error.is_none());
        let doc = read_document_impl(&state, None, Some(&root.id), Some(vec!["created.md".into()])).unwrap();
        let sections = list_edit_sections_impl(&state, &doc.file_id).unwrap();
        assert_eq!(sections.sections.len(), 1); assert_eq!(sections.sections[0].kind, "whole");
        let started = begin_section_edit_impl(&state, &editing, doc.file_id.clone(), sections.sections[0].id.clone(), doc.disk_version.clone()).unwrap();
        assert_eq!(started.source, ""); assert!(editing.has_sessions());
        // Simulate a durable recovery restore using the same source-backed span;
        // storage durability/crash tests separately exercise the actual store.
        let session = editing.sessions.lock().unwrap().remove(&started.session_id).unwrap();
        let restored = restore_session(&editing, session.file_id, session.disk_version, session.base,
            session.section, Some(session.recovery_owner), session.recovery_paths).unwrap();
        let result = save_section_edit_with_operations(&state, &editing, restored, "# First content\n\nBody\n".into(),
            |id, bytes| { std::fs::write(fixture.path().join(format!("{id}.safety")), bytes).map_err(crate::scope::io_error) },
            |_, _| Ok(()), rename_stage).unwrap();
        assert_eq!(result.content, "# First content\n\nBody\n"); assert!(!editing.has_sessions());
        assert_eq!(read_document_impl(&state, Some(&doc.file_id), None, None).unwrap().content, result.content);
        assert_eq!(std::fs::read(fixture.path().join("created.md")).unwrap(), result.content.as_bytes());
    }

    fn spans(input: &str) -> Vec<SectionDescriptor> {
        sections_from_source(input.as_bytes(), "v1").unwrap()
    }

    struct SaveFixture {
        dir: std::path::PathBuf,
        state: AppState,
        editing: EditingState,
        session_id: String,
        source: String,
        selected: SectionDescriptor,
    }

    impl SaveFixture {
        fn new(source: &str) -> Self {
            Self::with_setup(source, |_| {})
        }
        fn with_setup(source: &str, setup: impl FnOnce(&std::path::Path)) -> Self {
            let dir = std::env::temp_dir().join(format!("md-save-transaction-{}", Uuid::new_v4()));
            fs::create_dir(&dir).unwrap();
            let root_path = dir.join("root");
            fs::create_dir(&root_path).unwrap();
            fs::write(root_path.join("fixture.md"), source).unwrap();
            setup(&root_path.join("fixture.md"));
            let state = AppState::default();
            let editing = EditingState::default();
            let root = state.register_root(&root_path).unwrap();
            let document = read_document_impl(
                &state,
                None,
                Some(&root.id),
                Some(vec!["fixture.md".into()]),
            )
            .unwrap();
            let selected = sections_from_source(source.as_bytes(), &document.disk_version)
                .unwrap()
                .into_iter()
                .find(|section| section.kind == "heading")
                .unwrap();
            #[cfg(target_os = "macos")]
            let started = begin_section_edit_impl(
                &state,
                &editing,
                document.file_id,
                selected.id.clone(),
                document.disk_version,
            )
            .unwrap();
            #[cfg(target_os = "windows")]
            let started = prepare_edit_session(&state, &editing, document.file_id, selected.id.clone(), document.disk_version).unwrap();
            Self {
                dir,
                state,
                editing,
                session_id: started.session_id,
                source: source.into(),
                selected,
            }
        }
        fn path(&self) -> std::path::PathBuf {
            self.dir.join("root").join("fixture.md")
        }
        fn root_is_clean(&self) -> bool {
            fs::read_dir(self.dir.join("root")).unwrap().all(|entry| {
                !entry
                    .unwrap()
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".md-reader-")
            })
        }
        fn backup(&self, id: &str, bytes: &[u8]) -> AppResult<()> {
            fs::write(self.dir.join(format!("{id}.bak")), bytes).map_err(io_error)
        }
    }
    impl Drop for SaveFixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.dir);
        }
    }

    #[cfg(target_os = "macos")]
    fn second_writer(path: &std::path::Path, text: &str) {
        let status = std::process::Command::new("python3").args(["-c",
            "import pathlib,sys; pathlib.Path(sys.argv[1]).write_bytes(sys.argv[2].encode('utf-8'))"])
            .arg(path).arg(text).status().unwrap();
        assert!(status.success());
    }

    #[cfg(target_os = "windows")]
    fn second_writer(path: &std::path::Path, text: &str) {
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--ignored",
                "--exact",
                "editing::tests::windows_save_writer_child",
                "--nocapture",
            ])
            .env("F007W_SAVE_WRITER_PATH", path)
            .env("F007W_SAVE_WRITER_TEXT", text)
            .status()
            .unwrap();
        assert!(status.success());
    }

    #[test]
    #[cfg(target_os = "windows")]
    #[ignore = "subprocess driver; explicitly run by the competing-writer save tests"]
    fn windows_save_writer_child() {
        let path = std::path::PathBuf::from(std::env::var_os("F007W_SAVE_WRITER_PATH").unwrap());
        let relative = path.strip_prefix(std::env::temp_dir()).unwrap();
        let root = relative
            .components()
            .next()
            .unwrap()
            .as_os_str()
            .to_str()
            .unwrap();
        let id = root.strip_prefix("md-save-transaction-").unwrap();
        assert!(
            Uuid::parse_str(id).is_ok(),
            "Writer accepts only its disposable save fixture"
        );
        assert!(!relative
            .components()
            .any(|component| matches!(component, std::path::Component::ParentDir)));
        fs::write(path, std::env::var("F007W_SAVE_WRITER_TEXT").unwrap()).unwrap();
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_locked_and_readonly_saves_keep_source_draft_and_owned_cleanup() {
        use std::os::windows::{ffi::OsStrExt, fs::OpenOptionsExt};
        use windows_sys::Win32::Storage::FileSystem::{
            SetFileAttributesW, FILE_ATTRIBUTE_NORMAL, FILE_ATTRIBUTE_READONLY, FILE_SHARE_READ,
            FILE_SHARE_WRITE,
        };
        for readonly in [false, true] {
            let fixture = SaveFixture::new("# One\noriginal\n");
            let path = fixture.path();
            let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
            let lock = if readonly {
                assert_ne!(
                    unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_READONLY) },
                    0
                );
                None
            } else {
                Some(
                    fs::OpenOptions::new()
                        .read(true)
                        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
                        .open(&path)
                        .unwrap(),
                )
            };
            let result = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                "# One\nmy edit\n".into(),
                |id, bytes| fixture.backup(id, bytes),
                |_, _| Ok(()),
                rename_stage,
            );
            if readonly {
                assert_ne!(
                    unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_NORMAL) },
                    0
                );
            }
            drop(lock);
            assert!(result.is_err());
            assert_eq!(fs::read(path).unwrap(), fixture.source.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_real_save_preserves_document_metadata() {
        let fixture = SaveFixture::new("# One\r\noriginal\r\n");
        let original = crate::scope::open_selected(&fixture.path(), false).unwrap();
        let metadata = crate::platform::metadata_fingerprint(&original).unwrap();
        save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            "# One\r\nchanged\r\n".into(),
            |id, bytes| fixture.backup(id, bytes),
            |_, _| Ok(()),
            rename_stage,
        )
        .unwrap();
        let published = crate::scope::open_selected(&fixture.path(), false).unwrap();
        assert_eq!(
            crate::platform::metadata_fingerprint(&published).unwrap(),
            metadata
        );
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_denied_stage_creation_retains_original_and_pending_draft() {
        let fixture = SaveFixture::new("# One\noriginal\n");
        crate::platform::with_fixture_creation_denied(&fixture.dir.join("root"), || {
            // Changing an inheritable directory ACL legitimately updates child
            // metadata. Start this fixture's edit under the denied ACL, rather
            // than changing permissions after capturing its expected version.
            let previous = fixture
                .editing
                .sessions
                .lock()
                .unwrap()
                .remove(&fixture.session_id)
                .unwrap();
            let document =
                read_document_impl(&fixture.state, Some(&previous.file_id), None, None).unwrap();
            let section = sections_from_source(document.content.as_bytes(), &document.disk_version)
                .unwrap()
                .into_iter()
                .find(|section| section.kind == "heading")
                .unwrap();
            let started = prepare_edit_session(
                &fixture.state,
                &fixture.editing,
                previous.file_id,
                section.id,
                document.disk_version,
            )
            .unwrap();
            let error = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                started.session_id,
                "# One\nmy edit\n".into(),
                |_, _| panic!("Denied staging must stop before backup or commit"),
                |_, _| Ok(()),
                rename_stage,
            )
            .err()
            .unwrap();
            assert_eq!(error.code, "denied");
            assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        })
        .unwrap();
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_stage_handle_blocks_substitution_and_cleanup_preserves_published_bytes() {
        let fixture = crate::platform::test_support::FixtureDir::new("md-save-stage-ownership");
        let parent = crate::scope::open_selected(fixture.path(), true).unwrap();
        let (name, stage) = stage_document_bytes(&parent, b"owned stage bytes", None).unwrap();
        let stage_path = fixture.join(&name);
        assert!(fs::write(&stage_path, b"substitution").is_err());
        assert!(fs::rename(&stage_path, fixture.join("moved.tmp")).is_err());
        assert!(fs::remove_file(&stage_path).is_err());
        assert_eq!(fs::read(&stage_path).unwrap(), b"owned stage bytes");
        link_stage_new(&parent, &stage, &name, "published.md").unwrap();
        fs::write(&stage_path, b"new unrelated entry").unwrap();
        remove_stage(&parent, &stage, &name);
        assert_eq!(fs::read(&stage_path).unwrap(), b"new unrelated entry");
        assert_eq!(
            fs::read(fixture.join("published.md")).unwrap(),
            b"owned stage bytes"
        );
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_partial_stage_failure_cleans_only_owned_stage() {
        use std::io::Write;
        let fixture = SaveFixture::new("# One\noriginal\n");
        let parent = crate::scope::open_selected(&fixture.dir.join("root"), true).unwrap();
        let original = crate::scope::open_selected(&fixture.path(), false).unwrap();
        let error = crate::platform::stage_fixture_with_writer(
            &parent,
            b"# One\nchanged\n",
            Some(&original),
            |file, bytes| {
                file.write_all(&bytes[..5])?;
                Err(std::io::Error::new(
                    std::io::ErrorKind::WriteZero,
                    "injected failure after real partial stage write",
                ))
            },
        )
        .err()
        .unwrap();
        assert!(error
            .message
            .contains("injected failure after real partial stage write"));
        assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
        assert!(fixture.editing.has_sessions());
        assert!(fixture.root_is_clean());
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_open_writer_is_refused_and_post_commit_uncertainty_retains_work() {
        use std::os::windows::fs::OpenOptionsExt;
        use windows_sys::Win32::Storage::FileSystem::{
            FILE_SHARE_DELETE, FILE_SHARE_READ, FILE_SHARE_WRITE,
        };
        let fixture = SaveFixture::new("# One\noriginal\n");
        let writer = fs::OpenOptions::new()
            .write(true)
            .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE)
            .open(fixture.path())
            .unwrap();
        let error = save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            "# One\nmy edit\n".into(),
            |id, bytes| fixture.backup(id, bytes),
            |_, _| Ok(()),
            rename_stage,
        )
        .err()
        .unwrap();
        assert!(error.message.contains("Win32 32"), "{error:?}");
        assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
        assert!(fixture.editing.has_sessions());
        assert!(fixture.root_is_clean());
        drop(writer);
        let mut unrelated = None;
        let error = save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            "# One\nmy edit\n".into(),
            |id, bytes| fixture.backup(id, bytes),
            |_, _| Ok(()),
            |parent, stage, name, target| {
                rename_stage(parent, stage, name, target)?;
                let path = fixture.dir.join("root").join(name);
                fs::write(&path, b"unrelated entry after publication").unwrap();
                unrelated = Some(path);
                Err(AppError::new(
                    "save_race",
                    "injected post-commit uncertainty",
                ))
            },
        )
        .err()
        .unwrap();
        assert_eq!(error.code, "save_race");
        assert_eq!(fs::read(fixture.path()).unwrap(), b"# One\nmy edit\n");
        assert!(fixture.editing.has_sessions());
        assert_eq!(
            fs::read(unrelated.unwrap()).unwrap(),
            b"unrelated entry after publication"
        );
        let id = fixture.editing.sessions.lock().unwrap()[&fixture.session_id]
            .file_id
            .clone();
        assert_eq!(
            fs::read(fixture.dir.join(format!("{id}.bak"))).unwrap(),
            fixture.source.as_bytes()
        );
        assert_eq!(
            fs::read(fixture.dir.join(format!("{id}.staged.bak"))).unwrap(),
            b"# One\nmy edit\n"
        );
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_extra_streams_and_hard_links_are_refused_without_source_changes() {
        for stream in [false, true] {
            let mut companion = None;
            let fixture = SaveFixture::with_setup("# One\noriginal\n", |source| {
                let path = if stream {
                    let path = std::path::PathBuf::from(format!("{}:fixture", source.display()));
                    fs::write(&path, b"stream marker").unwrap();
                    path
                } else {
                    let path = source.parent().unwrap().parent().unwrap().join("linked.md");
                    fs::hard_link(source, &path).unwrap();
                    path
                };
                companion = Some(path);
            });
            let error = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                "# One\nmy edit\n".into(),
                |id, bytes| fixture.backup(id, bytes),
                |_, _| Ok(()),
                rename_stage,
            )
            .err()
            .unwrap();
            assert_eq!(error.code, "unsupported_type");
            assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
            assert_eq!(
                fs::read(companion.unwrap()).unwrap(),
                if stream {
                    b"stream marker".as_slice()
                } else {
                    fixture.source.as_bytes()
                }
            );
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    fn actual_save_as_new_destination_and_appearing_collision() {
        for collision in [false, true] {
            let fixture = SaveFixture::new("# One\noriginal\n# Two\nuntouched\n");
            let target = fixture.dir.join("new.md");
            let token = Uuid::new_v4().to_string();
            fixture.editing.destinations.lock().unwrap().insert(
                token.clone(),
                SaveDestination {
                    session_id: fixture.session_id.clone(),
                    path: target.clone(),
                    existing_version: None,
                },
            );
            if collision {
                fs::write(&target, b"newer destination").unwrap();
            }
            let result = commit_section_save_as_with_backup(
                &fixture.editing,
                fixture.session_id.clone(),
                token,
                "# One\nmy edit\n".into(),
                false,
                |_, _| panic!("New destination must not replace an existing file"),
            );
            if collision {
                assert_eq!(result.unwrap_err().code, "version_changed");
                assert_eq!(fs::read(target).unwrap(), b"newer destination");
            } else {
                result.unwrap();
                assert_eq!(
                    fs::read(target).unwrap(),
                    b"# One\nmy edit\n# Two\nuntouched\n"
                );
            }
            assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    #[cfg(target_os = "windows")]
    fn windows_stage_collision_and_parent_replacement_stay_anchored() {
        let fixture = crate::platform::test_support::FixtureDir::new("md-save-stage-parent");
        let root_path = fixture.join("root");
        fs::create_dir(&root_path).unwrap();
        let parent = crate::scope::open_selected(&root_path, true).unwrap();
        let (name, stage) = stage_document_bytes(&parent, b"staged bytes", None).unwrap();
        fs::write(root_path.join("new.md"), b"collision marker").unwrap();
        assert!(link_stage_new(&parent, &stage, &name, "new.md").is_err());
        assert_eq!(
            fs::read(root_path.join("new.md")).unwrap(),
            b"collision marker"
        );
        assert_eq!(fs::read(root_path.join(&name)).unwrap(), b"staged bytes");
        // Ordinary Windows directory rename disallows open child files. The
        // parent capability stays held after the finished stage is closed.
        drop(stage);
        fs::rename(&root_path, fixture.join("moved")).unwrap();
        fs::create_dir(&root_path).unwrap();
        fs::write(root_path.join("new.md"), b"outside marker").unwrap();
        let stage = crate::platform::reopen_fixture_stage(&parent, &name).unwrap();
        link_stage_new(&parent, &stage, &name, "published.md").unwrap();
        assert_eq!(
            fs::read(fixture.join("moved").join("published.md")).unwrap(),
            b"staged bytes"
        );
        assert!(!root_path.join("published.md").exists());
        assert_eq!(
            fs::read(root_path.join("new.md")).unwrap(),
            b"outside marker"
        );
    }

    #[test]
    fn twenty_actual_saves_preserve_unselected_bytes_bom_and_line_endings() {
        for index in 0..20 {
            let separator = ["\n", "\r\n", "\r"][index % 3];
            let source = format!("\u{feff}intro{separator}# Niño{separator}body{separator}# 二{separator}end{separator}");
            let fixture = SaveFixture::new(&source);
            let replacement = format!("# Niño{separator}edit {index}{separator}");
            let saved = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                replacement.clone(),
                |id, bytes| fixture.backup(id, bytes),
                |_, _| Ok(()),
                rename_stage,
            )
            .unwrap();
            let bytes = fs::read(fixture.path()).unwrap();
            assert_eq!(
                &bytes[..fixture.selected.start_byte],
                &source.as_bytes()[..fixture.selected.start_byte]
            );
            assert_eq!(
                &bytes[fixture.selected.start_byte + replacement.len()..],
                &source.as_bytes()[fixture.selected.end_byte..]
            );
            assert_eq!(saved.content.as_bytes(), bytes);
            assert!(!fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    fn an_external_write_before_save_or_its_final_check_keeps_the_draft() {
        for late in [false, true] {
            let fixture = SaveFixture::new("# One\noriginal\n# Two\nunchanged\n");
            let outside = "# One\nexternal\n# Two\nunchanged\n";
            if !late {
                second_writer(&fixture.path(), outside);
            }
            let mut calls = 0;
            let error = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                "# One\nmy edit\n".into(),
                |id, bytes| {
                    fixture.backup(id, bytes)?;
                    calls += 1;
                    if late && calls == 2 {
                        second_writer(&fixture.path(), outside);
                    }
                    Ok(())
                },
                |_, _| Ok(()),
                rename_stage,
            )
            .err()
            .unwrap();
            assert_eq!(error.code, "version_changed");
            assert_eq!(fs::read(fixture.path()).unwrap(), outside.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    fn a_missing_source_during_save_does_not_leave_a_staged_repository_file() {
        let fixture = SaveFixture::new("# One\noriginal\n");
        let mut calls = 0;
        let error = save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            "# One\nmy edit\n".into(),
            |id, bytes| {
                fixture.backup(id, bytes)?;
                calls += 1;
                if calls == 2 {
                    fs::remove_file(fixture.path()).unwrap();
                }
                Ok(())
            },
            |_, _| Ok(()),
            rename_stage,
        )
        .err()
        .unwrap();
        assert_eq!(error.code, "missing");
        assert!(fixture.editing.has_sessions());
        assert!(
            fixture.root_is_clean(),
            "Save left its stage in the workspace after the source disappeared"
        );
    }

    #[test]
    fn failed_backup_or_commit_keeps_original_and_pending_session() {
        for fail_backup in [false, true] {
            let fixture = SaveFixture::new("# One\noriginal\n");
            let error = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                "# One\nmy edit\n".into(),
                |id, bytes| {
                    if fail_backup {
                        Err(AppError::new("io_error", "fixture backup failure"))
                    } else {
                        fixture.backup(id, bytes)
                    }
                },
                |_, _| Ok(()),
                |_, _, _, _| Err(AppError::new("denied", "fixture commit denied")),
            )
            .err()
            .unwrap();
            assert_eq!(error.code, if fail_backup { "io_error" } else { "denied" });
            assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    fn observed_post_commit_race_retains_original_staged_and_intervening_versions() {
        let fixture = SaveFixture::new("# One\noriginal\n");
        let replacement = "# One\nmy edit\n";
        let outside = "# One\nintervening\n";
        let error = save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            replacement.into(),
            |id, bytes| fixture.backup(id, bytes),
            |_, _| Ok(()),
            |parent, stage_file, stage, target| {
                rename_stage(parent, stage_file, stage, target)?;
                second_writer(&fixture.path(), outside);
                Ok(())
            },
        )
        .err()
        .unwrap();
        assert_eq!(error.code, "save_race");
        assert!(fixture.editing.has_sessions());
        let file_id = fixture.editing.sessions.lock().unwrap()[&fixture.session_id]
            .file_id
            .clone();
        for (suffix, expected) in [
            ("", fixture.source.as_str()),
            (".staged", replacement),
            (".intervening", outside),
        ] {
            assert_eq!(
                fs::read(fixture.dir.join(format!("{file_id}{suffix}.bak"))).unwrap(),
                expected.as_bytes()
            );
        }
        assert_eq!(fs::read(fixture.path()).unwrap(), outside.as_bytes());
        assert!(fixture.root_is_clean());
    }

    #[test]
    fn an_invalid_binary_draft_is_rejected_before_any_source_write() {
        let fixture = SaveFixture::new("# One\noriginal\n");
        let error = save_section_edit_with_operations(
            &fixture.state,
            &fixture.editing,
            fixture.session_id.clone(),
            "# One\n\0\n".into(),
            |id, bytes| fixture.backup(id, bytes),
            |_, _| Ok(()),
            rename_stage,
        )
        .err()
        .unwrap();
        assert_eq!(error.code, "binary");
        assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
        assert!(fixture.editing.has_sessions());
        assert!(fixture.root_is_clean());
    }

    #[test]
    fn actual_save_as_requires_confirmation_and_rechecks_the_destination() {
        for writer_phase in 0..3 {
            let fixture = SaveFixture::new("# One\noriginal\n# Two\nuntouched\n");
            let target = fixture.dir.join("copy.md");
            fs::write(&target, b"# Existing\n").unwrap();
            let version = immediate_bytes_and_version(&open_selected(&target, false).unwrap())
                .unwrap()
                .1;
            let token = Uuid::new_v4().to_string();
            fixture.editing.destinations.lock().unwrap().insert(
                token.clone(),
                SaveDestination {
                    session_id: fixture.session_id.clone(),
                    path: target.clone(),
                    existing_version: Some(version),
                },
            );
            let replacement = "# One\nmy edit\n";
            let unconfirmed = commit_section_save_as_with_backup(
                &fixture.editing,
                fixture.session_id.clone(),
                token.clone(),
                replacement.into(),
                false,
                |id, bytes| fixture.backup(id, bytes),
            )
            .unwrap_err();
            assert_eq!(unconfirmed.code, "replace_confirmation");
            assert_eq!(fs::read(&target).unwrap(), b"# Existing\n");
            if writer_phase == 1 {
                second_writer(&target, "# External\n");
            }
            let result = commit_section_save_as_with_backup(
                &fixture.editing,
                fixture.session_id.clone(),
                token,
                replacement.into(),
                true,
                |id, bytes| {
                    fixture.backup(id, bytes)?;
                    if writer_phase == 2 {
                        second_writer(&target, "# External\n");
                    }
                    Ok(())
                },
            );
            if writer_phase == 0 {
                result.unwrap();
                assert_eq!(
                    fs::read(&target).unwrap(),
                    b"# One\nmy edit\n# Two\nuntouched\n"
                );
            } else {
                assert_eq!(result.unwrap_err().code, "version_changed");
                assert_eq!(fs::read(&target).unwrap(), b"# External\n");
            }
            assert_eq!(fs::read(fixture.path()).unwrap(), fixture.source.as_bytes());
            assert!(fixture.editing.has_sessions());
            assert!(fs::read_dir(&fixture.dir).unwrap().all(|entry| !entry
                .unwrap()
                .file_name()
                .to_string_lossy()
                .starts_with(".md-reader-")));
        }
    }

    #[test]
    fn splits_at_every_document_heading() {
        let input = "intro\r\n# One\r\nbody\r\n## Child\r\nmore\r\n# Last\r\n";
        let all = spans(input);
        assert_eq!(
            all.iter().map(|s| s.kind.as_str()).collect::<Vec<_>>(),
            vec!["preheading", "heading", "heading", "heading"]
        );
        assert_eq!(
            &input[all[1].start_byte..all[1].end_byte],
            "# One\r\nbody\r\n"
        );
        assert_eq!(
            &input[all[2].start_byte..all[2].end_byte],
            "## Child\r\nmore\r\n"
        );
        assert_eq!(all[0].start_byte, 0);
        assert_eq!(all.last().unwrap().end_byte, input.len());
    }

    #[test]
    fn ignores_fenced_and_quoted_heading_syntax() {
        let input = "# One\n```md\n# Not a section\n```\n> # Neither\n# Two\n";
        let all = spans(input);
        assert_eq!(all.len(), 2);
        assert_eq!(all[1].label, "Two");
    }

    #[test]
    fn preserves_bom_and_unicode_offsets() {
        let input = "\u{feff}😊\n# Niño\ntext\n## 二\n";
        let all = spans(input);
        assert_eq!(all[0].start_byte, 3);
        assert_eq!(
            &input.as_bytes()[all[1].start_byte..all[1].end_byte],
            "# Niño\ntext\n".as_bytes()
        );
        assert_eq!(all[2].label, "二");
    }

    #[test]
    fn heading_free_and_empty_are_one_section() {
        assert_eq!(spans("plain text").len(), 1);
        assert_eq!(spans("")[0].kind, "whole");
    }

    #[test]
    fn setext_repeated_and_list_headings_have_stable_boundaries() {
        let input = "# Same\n- item\n  # Nested\nSame\n====\n# Same\n";
        let all = spans(input);
        assert_eq!(all.len(), 3);
        assert_eq!(
            all.iter()
                .map(|section| section.label.as_str())
                .collect::<Vec<_>>(),
            vec!["Same", "Same", "Same"]
        );
        assert_eq!(
            &input[all[0].start_byte..all[0].end_byte],
            "# Same\n- item\n  # Nested\n"
        );
        assert_eq!(&input[all[1].start_byte..all[1].end_byte], "Same\n====\n");
        assert_ne!(all[0].id, all[2].id);
    }

    #[test]
    fn cr_only_file_keeps_byte_ranges_and_separator() {
        let input = "intro\r# One\rbody\r# Two\rend\r";
        let all = spans(input);
        assert_eq!(line_separator(input), "\r");
        assert_eq!(all.len(), 3);
        assert_eq!(&input[all[1].start_byte..all[1].end_byte], "# One\rbody\r");
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn rich_heading_remap_saves_only_the_original_native_span() {
        let original = "\u{feff}preamble  \n# One\nbody &amp; exact  \n# Two\nneighbour  \n";
        for replacement in [
            "### One\nchanged\n",
            "# One\n## Added\nchanged\n",
            "paragraph only\n",
            "",
        ] {
            let fixture = SaveFixture::new(original);
            let result = save_section_edit_with_operations(
                &fixture.state,
                &fixture.editing,
                fixture.session_id.clone(),
                replacement.into(),
                |id, bytes| fixture.backup(id, bytes),
                |_, _| Ok(()),
                rename_stage,
            )
            .unwrap();
            let saved = fs::read(fixture.path()).unwrap();
            let selected = &fixture.selected;
            assert_eq!(
                &saved[..selected.start_byte],
                &original.as_bytes()[..selected.start_byte]
            );
            assert_eq!(
                &saved[selected.start_byte + replacement.len()..],
                &original.as_bytes()[selected.end_byte..]
            );
            assert_eq!(result.content.as_bytes(), saved.as_slice());
            assert!(result.sections.iter().any(|section| section.label == "Two"));
            assert!(!fixture.editing.has_sessions());
            assert!(fixture.root_is_clean());
        }
    }

    #[test]
    fn edits_preserve_every_byte_outside_selected_span() {
        let cases = [
            "\u{feff}intro\r\n# One\r\nbody\r\n# Two\r\nend\r\n",
            "preamble\n# First\n## Child\n# Last\n",
            "# One\rbody\r# Two\rend\r",
            "# Empty\n# Next\n",
            "heading free",
        ];
        for input in cases {
            let bytes = input.as_bytes();
            for selected in spans(input) {
                let replacement = match line_separator(input) {
                    "\r\n" => "changed\r\n",
                    "\r" => "changed\r",
                    _ => "changed\n",
                };
                let output = compose_section(bytes, &selected, replacement).unwrap();
                assert_eq!(
                    &output[..selected.start_byte],
                    &bytes[..selected.start_byte]
                );
                assert_eq!(
                    &output[selected.start_byte + replacement.len()..],
                    &bytes[selected.end_byte..]
                );
            }
        }
    }

    #[test]
    fn rejects_mixed_endings_and_invalid_section_hash() {
        let input = "# A\r\nline\n";
        let selected = spans(input).remove(0);
        assert_eq!(
            compose_section(input.as_bytes(), &selected, "changed")
                .unwrap_err()
                .code,
            "mixed_endings"
        );
        let mut selected = spans("# A\n").remove(0);
        selected.source_hash = "wrong".to_string();
        assert_eq!(
            compose_section(b"# A\n", &selected, "changed")
                .unwrap_err()
                .code,
            "section_changed"
        );
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn staged_replacements_preserve_unselected_bytes_in_twenty_disposable_files() {
        let dir = std::env::temp_dir().join(format!("md-reader-edit-save-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let parent = open_selected(&dir, true).unwrap();
        for index in 0..20 {
            let input =
                format!("front {index}\r\n# One\r\nalpha\r\n## Two\r\nbeta\r\n# Three\r\nend\r\n");
            let target_name = format!("fixture-{index}.md");
            fs::write(dir.join(&target_name), input.as_bytes()).unwrap();
            let selected = sections_from_source(input.as_bytes(), "v1")
                .unwrap()
                .remove(index % 4);
            let replacement = format!("## Changed {index}\r\n");
            let output = compose_section(input.as_bytes(), &selected, &replacement).unwrap();
            let (stage_name, stage) = stage_bytes(&parent, &output, 0o600).unwrap();
            stage.sync_all().unwrap();
            rename_stage(&parent, &stage, &stage_name, &target_name).unwrap();
            let saved = fs::read(dir.join(&target_name)).unwrap();
            assert_eq!(saved, output);
            assert_eq!(
                &saved[..selected.start_byte],
                &input.as_bytes()[..selected.start_byte]
            );
            assert_eq!(
                &saved[selected.start_byte + replacement.len()..],
                &input.as_bytes()[selected.end_byte..]
            );
        }
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn immediate_version_detects_an_external_write_before_commit() {
        let dir = std::env::temp_dir().join(format!("md-reader-edit-race-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("fixture.md");
        fs::write(&path, b"# Original\n").unwrap();
        let parent = open_selected(&dir, true).unwrap();
        let original = open_relative(&parent, &["fixture.md".to_string()], false).unwrap();
        let (_, expected) = immediate_bytes_and_version(&original).unwrap();
        let (stage_name, stage) = stage_bytes(&parent, b"# My edit\n", 0o600).unwrap();
        fs::write(&path, b"# External\n").unwrap();
        let current = open_relative(&parent, &["fixture.md".to_string()], false).unwrap();
        let (_, actual) = immediate_bytes_and_version(&current).unwrap();
        assert_ne!(actual, expected);
        remove_stage(&parent, &stage, &stage_name);
        assert_eq!(fs::read(&path).unwrap(), b"# External\n");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn save_as_new_copy_never_overwrites_a_destination_that_appeared_later() {
        let dir = std::env::temp_dir().join(format!("md-reader-save-as-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let parent = open_selected(&dir, true).unwrap();
        let (stage_name, stage) = stage_bytes(&parent, b"# My copy\n", 0o600).unwrap();
        fs::write(dir.join("copy.md"), b"# Someone else's file\n").unwrap();
        assert!(link_stage_new(&parent, &stage, &stage_name, "copy.md").is_err());
        assert_eq!(
            fs::read(dir.join("copy.md")).unwrap(),
            b"# Someone else's file\n"
        );
        remove_stage(&parent, &stage, &stage_name);
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn staging_failure_leaves_original_untouched() {
        let dir = std::env::temp_dir().join(format!("md-reader-stage-denied-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("fixture.md");
        fs::write(&path, b"# Original\n").unwrap();
        fs::set_permissions(&dir, fs::Permissions::from_mode(0o500)).unwrap();
        let parent = open_selected(&dir, true).unwrap();
        assert!(stage_bytes(&parent, b"# My edit\n", 0o600).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"# Original\n");
        fs::set_permissions(&dir, fs::Permissions::from_mode(0o700)).unwrap();
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn existing_save_as_destination_changed_before_commit_stays_untouched() {
        let dir = std::env::temp_dir().join(format!("md-reader-existing-copy-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let parent = open_selected(&dir, true).unwrap();
        let path = dir.join("copy.md");
        fs::write(&path, b"# Existing\n").unwrap();
        let original = open_relative(&parent, &["copy.md".to_string()], false).unwrap();
        let (base, expected) = immediate_bytes_and_version(&original).unwrap();
        let (stage_name, stage) = stage_bytes(&parent, b"# My copy\n", 0o600).unwrap();
        fs::write(&path, b"# External\n").unwrap();
        let current = open_relative(&parent, &["copy.md".to_string()], false).unwrap();
        let (latest, version) = immediate_bytes_and_version(&current).unwrap();
        assert!(version != expected || latest != base);
        remove_stage(&parent, &stage, &stage_name);
        assert_eq!(fs::read(&path).unwrap(), b"# External\n");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn post_commit_external_write_is_visible_as_a_mismatch() {
        let dir = std::env::temp_dir().join(format!("md-reader-post-commit-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let parent = open_selected(&dir, true).unwrap();
        let path = dir.join("fixture.md");
        fs::write(&path, b"# Original\n").unwrap();
        let staged_output = b"# My edit\n";
        let (stage_name, stage) = stage_bytes(&parent, staged_output, 0o600).unwrap();
        rename_stage(&parent, &stage, &stage_name, "fixture.md").unwrap();
        fs::write(&path, b"# Intervening writer\n").unwrap();
        let committed = open_relative(&parent, &["fixture.md".to_string()], false).unwrap();
        assert_ne!(
            immediate_bytes_and_version(&committed).unwrap().0,
            staged_output
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
