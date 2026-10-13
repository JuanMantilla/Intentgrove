use serde::{Deserialize, Serialize};
use std::io;

#[derive(Debug, Clone, Serialize)]
pub struct AppError {
    pub code: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub package_diagnostics: Option<igproto_package::Report>,
}

impl AppError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            package_diagnostics: None,
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;

pub fn image_format(name: &str) -> Option<&'static str> {
    let lower = name.to_ascii_lowercase();
    match lower.rsplit_once('.')?.1 {
        "png" => Some("png"),
        "jpg" | "jpeg" => Some("jpeg"),
        "gif" => Some("gif"),
        "webp" => Some("webp"),
        "svg" => Some("svg"),
        "bmp" => Some("bmp"),
        "tif" | "tiff" => Some("tiff"),
        "heic" | "heif" => Some("heif"),
        _ => None,
    }
}

pub(crate) use crate::platform::read_search_entries;
pub use crate::platform::{
    identity, open_relative, open_selected, read_page, read_snapshot_entries, size,
};

pub fn io_error(error: io::Error) -> AppError {
    let code = match error.kind() {
        io::ErrorKind::NotFound => "missing",
        io::ErrorKind::PermissionDenied => "denied",
        io::ErrorKind::AlreadyExists => "already_exists",
        _ => "io_error",
    };
    AppError::new(code, error.to_string())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Identity {
    pub device: u64,
    pub inode: u64,
}

pub fn validate_segment(segment: &str) -> AppResult<()> {
    if segment.is_empty()
        || segment == "."
        || segment == ".."
        || segment.contains('/')
        || segment.contains('\\')
        || segment.contains('\0')
    {
        return Err(AppError::new(
            "invalid_path",
            "Invalid relative path segment",
        ));
    }
    #[cfg(target_os = "windows")]
    crate::platform::validate_windows_segment(segment)?;

    Ok(())
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub name: String,
    pub kind: &'static str,
    /// Native listing identity; never accepted from or exposed to the renderer.
    #[serde(skip)]
    pub identity: Option<Identity>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryPage {
    pub entries: Vec<Entry>,
    pub next_offset: Option<usize>,
    pub snapshot_id: String,
}

pub(crate) fn excluded(name: &str) -> bool {
    matches!(
        name,
        ".git" | "node_modules" | "target" | "dist" | "build" | ".cache" | ".next"
    )
}

pub fn markdown_name(name: &str) -> bool {
    let lowered = name.to_ascii_lowercase();
    lowered.ends_with(".md") || lowered.ends_with(".markdown")
}

/// HTML is a read-only local view, never a Markdown editor input.
pub fn html_name(name: &str) -> bool {
    matches!(
        name.rsplit('.')
            .next()
            .map(str::to_ascii_lowercase)
            .as_deref(),
        Some("html" | "htm")
    )
}
pub fn document_name(name: &str) -> bool {
    markdown_name(name) || html_name(name) || prototype_name(name)
}

/// V1 routing is extension-based; ZIP contents alone never select this kind.
pub fn prototype_name(name: &str) -> bool { name.to_ascii_lowercase().ends_with(".igproto") }
