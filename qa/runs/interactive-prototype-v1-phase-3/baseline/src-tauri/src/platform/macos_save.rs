use crate::scope::{io_error, AppError, AppResult};
use std::{
    ffi::CString,
    fs::File,
    io::Write,
    os::fd::{AsRawFd, FromRawFd},
};
use uuid::Uuid;
struct StageCleanup<'a> {
    parent: &'a File,
    name: &'a str,
    armed: bool,
}
impl<'a> StageCleanup<'a> {
    fn new(parent: &'a File, name: &'a str) -> Self {
        Self {
            parent,
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
            remove_stage(self.parent, self.name);
        }
    }
}

pub(crate) fn stage_bytes(parent: &File, bytes: &[u8], mode: u32) -> AppResult<(String, File)> {
    let name = format!(".md-reader-{}.tmp", Uuid::new_v4());
    let c_name = CString::new(name.as_bytes())
        .map_err(|_| AppError::new("invalid_path", "Invalid staging name"))?;
    let descriptor = unsafe {
        libc::openat(
            parent.as_raw_fd(),
            c_name.as_ptr(),
            libc::O_CREAT | libc::O_EXCL | libc::O_WRONLY | libc::O_CLOEXEC | libc::O_NOFOLLOW,
            0o600,
        )
    };
    if descriptor < 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let mut stage = unsafe { File::from_raw_fd(descriptor) };
    let mut cleanup = StageCleanup::new(parent, &name);
    if let Err(error) = stage.write_all(bytes).and_then(|_| stage.sync_all()) {
        let _ = unsafe { libc::unlinkat(parent.as_raw_fd(), c_name.as_ptr(), 0) };
        return Err(io_error(error));
    }
    let safe_mode = mode & 0o777;
    if unsafe { libc::fchmod(stage.as_raw_fd(), safe_mode as libc::mode_t) } < 0 {
        let _ = unsafe { libc::unlinkat(parent.as_raw_fd(), c_name.as_ptr(), 0) };
        return Err(io_error(std::io::Error::last_os_error()));
    }
    stage.sync_all().map_err(io_error)?;
    cleanup.disarm();
    drop(cleanup);
    Ok((name, stage))
}

pub(crate) fn remove_stage(parent: &File, name: &str) {
    if let Ok(c_name) = CString::new(name) {
        let _ = unsafe { libc::unlinkat(parent.as_raw_fd(), c_name.as_ptr(), 0) };
    }
}

pub(crate) fn rename_stage(parent: &File, stage_name: &str, target_name: &str) -> AppResult<()> {
    let from =
        CString::new(stage_name).map_err(|_| AppError::new("invalid_path", "Invalid stage"))?;
    let to =
        CString::new(target_name).map_err(|_| AppError::new("invalid_path", "Invalid target"))?;
    if unsafe {
        libc::renameat(
            parent.as_raw_fd(),
            from.as_ptr(),
            parent.as_raw_fd(),
            to.as_ptr(),
        )
    } < 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    parent.sync_all().map_err(io_error)
}

pub(crate) fn link_stage_new(parent: &File, stage_name: &str, target_name: &str) -> AppResult<()> {
    let from =
        CString::new(stage_name).map_err(|_| AppError::new("invalid_path", "Invalid stage"))?;
    let to =
        CString::new(target_name).map_err(|_| AppError::new("invalid_path", "Invalid target"))?;
    if unsafe {
        libc::linkat(
            parent.as_raw_fd(),
            from.as_ptr(),
            parent.as_raw_fd(),
            to.as_ptr(),
            0,
        )
    } < 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    remove_stage(parent, stage_name);
    parent.sync_all().map_err(io_error)
}
pub(crate) fn document_mode(file: &File) -> AppResult<u32> {
    use std::os::unix::fs::PermissionsExt;
    Ok(file.metadata().map_err(io_error)?.permissions().mode())
}
