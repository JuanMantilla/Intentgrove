use crate::recents;
use crate::refresh::RefreshService;
use crate::scope::{open_selected, AppError, AppResult};
use crate::state::{AppState, GrantInfo};
use serde::Serialize;
use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};
use uuid::Uuid;

const MAX_PENDING: usize = 32;
const MAX_PATH_BYTES: usize = 4096;

#[derive(Clone)]
pub struct NativeEntryState {
    pending: Arc<Mutex<VecDeque<NativeEntry>>>,
}

impl Default for NativeEntryState {
    fn default() -> Self {
        Self {
            pending: Arc::new(Mutex::new(VecDeque::new())),
        }
    }
}

#[derive(Clone)]
struct NativeEntry {
    id: String,
    path: PathBuf,
    source: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePreview {
    id: String,
    source: &'static str,
    name: String,
    display_path: String,
    kind: &'static str,
    error_code: Option<&'static str>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAccepted {
    kind: &'static str,
    grant: GrantInfo,
}

impl NativeEntryState {
    pub fn enqueue(&self, paths: Vec<PathBuf>, source: &'static str) -> bool {
        let Ok(mut queue) = self.pending.lock() else {
            return false;
        };
        let mut added = false;
        for path in paths.into_iter().take(MAX_PENDING) {
            if queue.len() >= MAX_PENDING {
                break;
            }
            if !path.is_absolute() || path.as_os_str().len() > MAX_PATH_BYTES {
                continue;
            }
            queue.push_back(NativeEntry {
                id: Uuid::new_v4().to_string(),
                path,
                source,
            });
            added = true;
        }
        added
    }

    fn snapshot(&self) -> AppResult<Vec<NativeEntry>> {
        Ok(self
            .pending
            .lock()
            .map_err(|_| AppError::new("internal", "Native entry queue is unavailable"))?
            .iter()
            .cloned()
            .collect())
    }

    fn take(&self, id: &str) -> AppResult<NativeEntry> {
        let mut queue = self
            .pending
            .lock()
            .map_err(|_| AppError::new("internal", "Native entry queue is unavailable"))?;
        let index = queue
            .iter()
            .position(|entry| entry.id == id)
            .ok_or_else(|| {
                AppError::new("native_entry_missing", "Incoming item is no longer pending")
            })?;
        queue.remove(index).ok_or_else(|| {
            AppError::new("native_entry_missing", "Incoming item is no longer pending")
        })
    }

    fn dismiss(&self, id: &str) -> AppResult<()> {
        let _ = self.take(id)?;
        Ok(())
    }
}

fn inspect(path: &Path) -> (&'static str, Option<&'static str>) {
    let metadata = match std::fs::symlink_metadata(path) {
        Ok(value) => value,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
            return ("unsupported", Some("missing"))
        }
        Err(err) if err.kind() == std::io::ErrorKind::PermissionDenied => {
            return ("unsupported", Some("denied"))
        }
        Err(_) => return ("unsupported", Some("io_error")),
    };
    if metadata.file_type().is_symlink() {
        return ("unsupported", Some("unsupported_type"));
    }
    let folder = metadata.is_dir();
    if !folder
        && (!metadata.is_file()
            || !path.file_name().is_some_and(|name| {
                let name = name.to_string_lossy();
                crate::scope::document_name(&name) || crate::scope::image_format(&name).is_some()
            }))
    {
        return ("unsupported", Some("unsupported_type"));
    }
    match open_selected(path, folder) {
        Ok(_) => (if folder { "folder" } else { "document" }, None),
        Err(err) => ("unsupported", Some(err.code)),
    }
}

#[tauri::command]
pub async fn list_native_entries(
    queue: State<'_, NativeEntryState>,
) -> AppResult<Vec<NativePreview>> {
    let entries = queue.snapshot()?;
    tauri::async_runtime::spawn_blocking(move || {
        entries
            .into_iter()
            .map(|entry| {
                let (kind, error_code) = inspect(&entry.path);
                NativePreview {
                    id: entry.id,
                    source: entry.source,
                    name: entry
                        .path
                        .file_name()
                        .map(|name| name.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    display_path: entry.path.display().to_string(),
                    kind,
                    error_code,
                }
            })
            .collect()
    })
    .await
    .map_err(|err| AppError::new("internal", err.to_string()))
}

// Automatic file requests cannot become root grants if the selected path
// changes into a directory after its preview was produced.
fn acceptance_kind(path: &Path, file_only: bool) -> AppResult<&'static str> {
    let (kind, problem) = inspect(path);
    if let Some(code) = problem {
        return Err(AppError::new(code, "Incoming item cannot be opened"));
    }
    if file_only && kind != "document" {
        return Err(AppError::new(
            "unsupported_type",
            "Incoming file became a folder",
        ));
    }
    Ok(kind)
}

#[tauri::command]
pub async fn accept_native_entry(
    app: AppHandle,
    queue: State<'_, NativeEntryState>,
    state: State<'_, AppState>,
    refresh: State<'_, RefreshService>,
    entry_id: String,
    file_only: Option<bool>,
) -> AppResult<NativeAccepted> {
    let entry = queue.take(&entry_id)?;
    let state = state.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let kind = acceptance_kind(&entry.path, file_only.unwrap_or(false))?;
        let grant = if kind == "folder" {
            state.register_root(&entry.path)?
        } else {
            state.register_explicit_file(&entry.path)?
        };
        if kind == "folder" {
            let _ = refresh.watch_root(&grant.id);
            let _ = recents::record_folder(&app, &state, &grant.id);
        } else {
            let _ = refresh.watch_explicit_file(&grant.id);
        }
        Ok(NativeAccepted { kind, grant })
    })
    .await
    .map_err(|err| AppError::new("internal", err.to_string()))?
}

#[tauri::command]
pub fn dismiss_native_entry(queue: State<'_, NativeEntryState>, entry_id: String) -> AppResult<()> {
    queue.dismiss(&entry_id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn supported_native_files_include_markdown_html_and_all_existing_image_formats() {
        let dir = std::env::temp_dir().join(format!("md-reader-native-types-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        for extension in [
            "md", "markdown", "html", "htm", "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp",
            "tif", "tiff", "heic", "heif", "PNG",
        ] {
            let path = dir.join(format!("selected.{extension}"));
            fs::write(&path, "disposable validation fixture; decoding is separate").unwrap();
            assert_eq!(
                acceptance_kind(&path, true).unwrap(),
                "document",
                "{extension}"
            );
        }
        let unsupported = dir.join("other.txt");
        fs::write(&unsupported, "unsupported").unwrap();
        assert_eq!(
            acceptance_kind(&unsupported, true).unwrap_err().code,
            "unsupported_type"
        );
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn automatic_file_acceptance_rejects_a_path_replaced_by_a_directory() {
        let dir = std::env::temp_dir().join(format!("md-reader-native-race-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("read.md");
        fs::write(&path, "# Safe").unwrap();
        assert_eq!(acceptance_kind(&path, true).unwrap(), "document");
        fs::remove_file(&path).unwrap();
        fs::create_dir(&path).unwrap();
        assert_eq!(
            acceptance_kind(&path, true).unwrap_err().code,
            "unsupported_type"
        );
        assert_eq!(acceptance_kind(&path, false).unwrap(), "folder");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    #[cfg(target_os = "macos")]
    fn preview_rejects_symlink_and_unsupported_file_without_grant() {
        let dir = std::env::temp_dir().join(format!("md-reader-native-test-{}", Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        fs::write(dir.join("read.md"), "# Safe").unwrap();
        fs::write(dir.join("other.txt"), "do not open").unwrap();
        std::os::unix::fs::symlink(dir.join("read.md"), dir.join("link.md")).unwrap();
        assert_eq!(inspect(&dir.join("read.md")), ("document", None));
        assert_eq!(inspect(&dir.join("other.txt")).1, Some("unsupported_type"));
        assert_eq!(inspect(&dir.join("link.md")).1, Some("unsupported_type"));
        let queue = NativeEntryState::default();
        assert!(queue.enqueue(vec![dir.join("read.md")], "drop"));
        let pending = queue.snapshot().unwrap();
        assert_eq!(pending.len(), 1);
        queue.dismiss(&pending[0].id).unwrap();
        assert!(queue.snapshot().unwrap().is_empty());
        fs::remove_dir_all(dir).unwrap();
    }
}
