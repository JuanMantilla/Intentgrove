//! Exclusive namespace creation. A successful open is the commit point;
//! subsequent errors are carried alongside the actual held identity.
use crate::scope::{identity, io_error, AppError, AppResult, Identity};
use std::fs::File;

pub(crate) struct CreatedEmpty {
    pub identity: Identity,
    pub verification_error: Option<AppError>,
}

#[cfg(target_os = "macos")]
pub(crate) fn create_empty(parent: &File, name: &str) -> AppResult<CreatedEmpty> {
    use std::{
        ffi::CString,
        os::fd::{AsRawFd, FromRawFd},
    };
    let name = CString::new(name).map_err(|_| AppError::new("invalid_filename", "Invalid name"))?;
    let fd = unsafe {
        libc::openat(
            parent.as_raw_fd(),
            name.as_ptr(),
            libc::O_CREAT | libc::O_EXCL | libc::O_RDWR | libc::O_NOFOLLOW | libc::O_CLOEXEC,
            0o600,
        )
    };
    if fd < 0 {
        let error = std::io::Error::last_os_error();
        return Err(if error.kind() == std::io::ErrorKind::AlreadyExists {
            AppError::new("already_exists", "An equivalent destination already exists")
        } else {
            io_error(error)
        });
    }
    let file = unsafe { File::from_raw_fd(fd) };
    finish(parent, file)
}

#[cfg(target_os = "windows")]
pub(crate) fn create_empty(parent: &File, name: &str) -> AppResult<CreatedEmpty> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::{
        Wdk::Storage::FileSystem::{FILE_CREATE, FILE_WRITE_THROUGH},
        Win32::Storage::FileSystem::*,
    };
    super::windows::checked(parent, true)?;
    let descriptor = super::storage::descriptor()?;
    let file = super::windows::native_open_with_share(
        parent.as_raw_handle(),
        name,
        FILE_READ_DATA | FILE_WRITE_DATA | FILE_READ_ATTRIBUTES | 0x00020000,
        FILE_CREATE,
        FILE_ATTRIBUTE_NORMAL,
        descriptor.0.cast(),
        FILE_WRITE_THROUGH,
        FILE_SHARE_READ,
    )?;
    // Never delete a published file, even if private security verification fails.
    let security_error = super::storage::verify_private_file(&file).err();
    let mut result = finish(parent, file)?;
    if security_error.is_some() {
        result.verification_error = security_error;
    }
    Ok(result)
}

fn finish(parent: &File, file: File) -> AppResult<CreatedEmpty> {
    // Identity failure after exclusive open is committed uncertainty too. Preserve
    // the OS error; callers turn this exceptional result into a committed outcome.
    let id = identity(&file).map_err(|e| AppError::new("creation_committed", e.message))?;
    let verification_error = (|| {
        file.sync_all().map_err(io_error)?;
        if file.metadata().map_err(io_error)?.len() != 0 {
            return Err(AppError::new("changed", "Created file is no longer empty"));
        }
        #[cfg(target_os = "macos")]
        parent.sync_all().map_err(io_error)?;
        #[cfg(target_os = "windows")]
        let _ = parent; // Windows does not promise directory fsync semantics.
        Ok(())
    })()
    .err();
    Ok(CreatedEmpty {
        identity: id,
        verification_error,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exclusive_create_preserves_an_existing_file_and_reports_real_identity() {
        let fixture = super::super::test_support::FixtureDir::new("md-exclusive-empty");
        let parent = crate::scope::open_selected(fixture.path(), true).unwrap();
        let created = create_empty(&parent, "empty.md").unwrap();
        assert!(created.verification_error.is_none());
        let file = crate::scope::open_relative(&parent, &["empty.md".into()], false).unwrap();
        assert_eq!(identity(&file).unwrap(), created.identity);
        std::fs::write(fixture.path().join("existing.md"), b"keep").unwrap();
        assert!(create_empty(&parent, "existing.md").is_err());
        assert_eq!(
            std::fs::read(fixture.path().join("existing.md")).unwrap(),
            b"keep"
        );
    }
}
