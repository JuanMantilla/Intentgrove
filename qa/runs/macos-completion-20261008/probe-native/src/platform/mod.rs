//! Narrow native mechanisms; grants and document policy remain in their consumers.
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::*;
#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
compile_error!("This workspace supports only its reviewed macOS and Windows targets");

#[derive(PartialEq, Eq)]
pub(crate) struct FileStamp {
    pub device: u64, pub inode: u64, pub length: u64,
    pub modified_seconds: i64, pub modified_nanos: i64,
    pub changed_seconds: i64, pub changed_nanos: i64,
}

pub(crate) trait PositionalRead {
    fn read_at(&self, buffer: &mut [u8], offset: u64) -> std::io::Result<usize>;
}
impl PositionalRead for std::fs::File {
    fn read_at(&self, buffer: &mut [u8], offset: u64) -> std::io::Result<usize> {
        #[cfg(target_os = "macos")]
        { std::os::unix::fs::FileExt::read_at(self, buffer, offset) }
        #[cfg(target_os = "windows")]
        { std::os::windows::fs::FileExt::seek_read(self, buffer, offset) }
    }
}
#[cfg(any(target_os = "windows", test))]
mod windows_path;

#[cfg(target_os = "windows")]
pub(crate) use windows_path::segment as validate_windows_segment;
/// Record syntax only. Callers must still reopen the path and compare identity.
pub(crate) fn bounded_record_path(path: &str, max_bytes: usize) -> bool {
    if path.is_empty() || path.len() > max_bytes || path.contains('\0') {
        return false;
    }
    #[cfg(target_os = "macos")]
    { path.starts_with('/') }
    #[cfg(target_os = "windows")]
    { windows_path::selected(path).is_ok() }
}

#[cfg(test)]
pub(crate) mod test_support;
pub(crate) mod storage;

#[cfg(target_os = "macos")]
mod macos_save;
#[cfg(target_os = "macos")]
pub(crate) use macos_save::*;
#[cfg(target_os = "macos")]
pub(crate) type DocumentStage = std::fs::File;
#[cfg(target_os = "macos")]
pub(crate) fn stage_document_bytes(parent: &std::fs::File, bytes: &[u8], source: Option<&std::fs::File>) -> crate::scope::AppResult<(String, std::fs::File)> {
    let mode = match source { Some(file) => document_mode(file)?, None => 0o600 };
    stage_bytes(parent, bytes, mode)
}
#[cfg(target_os = "windows")]
mod windows_save;
#[cfg(target_os = "macos")]
pub(crate) fn open_document_for_commit(parent: &std::fs::File, target: &str) -> crate::scope::AppResult<std::fs::File> {
    open_relative(parent, &[target.to_owned()], false)
}
#[cfg(target_os = "macos")]
pub(crate) fn rename_document_stage(parent: &std::fs::File, _stage: &DocumentStage, name: &str, target: &str) -> crate::scope::AppResult<()> {
    rename_stage(parent, name, target)
}
#[cfg(target_os = "macos")]
pub(crate) fn link_document_stage_new(parent: &std::fs::File, _stage: &DocumentStage, name: &str, target: &str) -> crate::scope::AppResult<()> {
    link_stage_new(parent, name, target)
}
#[cfg(target_os = "macos")]
pub(crate) fn remove_document_stage(parent: &std::fs::File, _stage: &DocumentStage, name: &str) {
    remove_stage(parent, name)
}
#[cfg(target_os = "windows")]
pub(crate) use windows_save::*;
pub(crate) fn require_editing() -> crate::scope::AppResult<()> {
    #[cfg(target_os = "macos")]
    { Ok(()) }
    #[cfg(target_os = "windows")]
    { Err(crate::scope::AppError::new("editing_unavailable", "Windows editing awaits native safe-save and recovery verification")) }
}
