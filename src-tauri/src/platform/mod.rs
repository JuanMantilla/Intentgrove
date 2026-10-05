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
pub(crate) mod storage;

#[cfg(target_os = "macos")]
mod macos_save;
#[cfg(target_os = "macos")]
pub(crate) use macos_save::*;
pub(crate) fn require_editing() -> crate::scope::AppResult<()> {
    #[cfg(target_os = "macos")]
    { Ok(()) }
    #[cfg(target_os = "windows")]
    { Err(crate::scope::AppError::new("editing_unavailable", "Windows editing awaits native safe-save and recovery verification")) }
}
#[cfg(target_os = "windows")]
pub(crate) fn stage_bytes(_: &std::fs::File, _: &[u8], _: u32) -> crate::scope::AppResult<(String, std::fs::File)> { Err(crate::scope::AppError::new("editing_unavailable", "Windows safe-save is unavailable")) }
#[cfg(target_os = "windows")]
pub(crate) fn document_mode(_: &std::fs::File) -> crate::scope::AppResult<u32> { Err(crate::scope::AppError::new("editing_unavailable", "Windows safe-save is unavailable")) }
#[cfg(target_os = "windows")]
pub(crate) fn remove_stage(_: &std::fs::File, _: &str) { /* Windows stages cannot be created while editing is disabled. */ }
#[cfg(target_os = "windows")]
pub(crate) fn rename_stage(_: &std::fs::File, _: &str, _: &str) -> crate::scope::AppResult<()> { require_editing() }
#[cfg(target_os = "windows")]
pub(crate) fn link_stage_new(_: &std::fs::File, _: &str, _: &str) -> crate::scope::AppResult<()> { require_editing() }
