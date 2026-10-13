//! App-owned records only; never used to publish user documents.
use crate::scope::{io_error, AppError, AppResult};
use std::{fs::File, path::Path};

pub(crate) struct StorageLock {
    pub(super) file: File,
}
#[cfg(target_os = "windows")]
impl Drop for StorageLock {
    fn drop(&mut self) {
        use std::os::windows::io::AsRawHandle;
        let mut ov = unsafe { std::mem::zeroed() };
        // Closing the owned handle is the fallback if explicit release fails.
        unsafe {
            windows_sys::Win32::Storage::FileSystem::UnlockFileEx(
                self.file.as_raw_handle(),
                0,
                u32::MAX,
                u32::MAX,
                &mut ov,
            );
        }
    }
}
#[cfg(target_os = "macos")]
impl Drop for StorageLock {
    fn drop(&mut self) {
        let _ = &self.file; /* The owned handle closes and releases flock. */
    }
}
#[cfg(target_os = "macos")]
mod native {
    use super::*;
    use crate::scope::open_selected;
    use std::{
        fs::{self, DirBuilder, OpenOptions, Permissions},
        os::{
            fd::AsRawFd,
            unix::fs::{DirBuilderExt, MetadataExt, OpenOptionsExt, PermissionsExt},
        },
    };
    pub(crate) fn ensure_private_dir(path: &Path) -> AppResult<()> {
        match DirBuilder::new().mode(0o700).create(path) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {}
            Err(e) => return Err(io_error(e)),
        }
        let directory = open_selected(path, true)?;
        let metadata = directory.metadata().map_err(io_error)?;
        if metadata.uid() != unsafe { libc::geteuid() } {
            return Err(AppError::new(
                "recovery_permissions",
                "Recovery folder is not owned by this user",
            ));
        }
        if metadata.permissions().mode() & 0o777 != 0o700 {
            directory
                .set_permissions(Permissions::from_mode(0o700))
                .map_err(io_error)?;
            directory.sync_all().map_err(io_error)?;
        }
        Ok(())
    }
    pub(crate) fn create_private_file(path: &Path) -> AppResult<File> {
        OpenOptions::new()
            .read(true)
            .write(true)
            .create_new(true)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
            .open(path)
            .map_err(io_error)
    }
    pub(crate) fn verify_private_file(file: &File) -> AppResult<()> {
        let meta = file.metadata().map_err(io_error)?;
        if meta.uid() != unsafe { libc::geteuid() } || meta.permissions().mode() & 0o777 != 0o600 {
            return Err(AppError::new(
                "recovery_permissions",
                "Private record has unsafe permissions",
            ));
        }
        Ok(())
    }
    pub(crate) fn lock_private(
        path: &Path,
        code: &'static str,
        permission_code: &'static str,
    ) -> AppResult<StorageLock> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .mode(0o600)
            .custom_flags(libc::O_NOFOLLOW | libc::O_CLOEXEC)
            .open(path)
            .map_err(io_error)?;
        if file.metadata().map_err(io_error)?.permissions().mode() & 0o777 != 0o600 {
            return Err(AppError::new(
                permission_code,
                "Private lock has unsafe permissions",
            ));
        }
        if unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX) } != 0 {
            return Err(AppError::new(code, "Could not lock private records"));
        }
        Ok(StorageLock { file })
    }
    pub(crate) fn sync_private_directory(dir: &Path) -> AppResult<()> {
        File::open(dir).and_then(|f| f.sync_all()).map_err(io_error)
    }
    pub(crate) fn publish_private(from: &Path, to: &Path) -> AppResult<()> {
        fs::rename(from, to).map_err(io_error)
    }
    pub(crate) fn remove_private_file(path: &Path) -> std::io::Result<()> {
        fs::remove_file(path)
    }
    pub(crate) fn preserve_previous(from: &Path, to: &Path) -> AppResult<()> {
        fs::hard_link(from, to).map_err(io_error)
    }
}
#[cfg(target_os = "windows")]
#[path = "windows_storage.rs"]
mod native;
pub(crate) use native::*;
