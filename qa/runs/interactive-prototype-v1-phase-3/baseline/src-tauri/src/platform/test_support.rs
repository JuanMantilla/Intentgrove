//! Disposable native fixtures only; never called by the application.
use std::{
    fs, io,
    path::{Path, PathBuf},
};

/// Exclusive creation, canonical temporary parent, and identity-checked cleanup.
pub(crate) struct FixtureDir {
    path: PathBuf,
    identity: crate::scope::Identity,
}
impl FixtureDir {
    pub(crate) fn new(prefix: &str) -> Self {
        let parent = fs::canonicalize(std::env::temp_dir()).unwrap();
        let path = parent.join(format!("{prefix}-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&path).unwrap();
        let identity = super::identity(&super::open_selected(&path, true).unwrap()).unwrap();
        Self { path, identity }
    }
    pub(crate) fn path(&self) -> &Path {
        &self.path
    }
}
impl AsRef<Path> for FixtureDir {
    fn as_ref(&self) -> &Path {
        &self.path
    }
}
impl std::ops::Deref for FixtureDir {
    type Target = Path;
    fn deref(&self) -> &Path {
        &self.path
    }
}
impl Drop for FixtureDir {
    fn drop(&mut self) {
        // A replaced root or a link is not the directory this fixture owns.
        if let Ok(file) = super::open_selected(&self.path, true) {
            if super::identity(&file).ok() == Some(self.identity) {
                drop(file);
                let _ = fs::remove_dir_all(&self.path);
            }
        }
    }
}

/// A directory symlink on macOS or an NTFS junction on Windows, without elevation.
pub(crate) struct DirectoryLink(PathBuf);
impl Drop for DirectoryLink {
    fn drop(&mut self) {
        #[cfg(target_os = "macos")]
        let _ = fs::remove_file(&self.0);
        #[cfg(target_os = "windows")]
        let _ = fs::remove_dir(&self.0); // unlink the junction itself, never its target
    }
}
pub(crate) fn directory_link(target: &Path, link: &Path) -> io::Result<DirectoryLink> {
    #[cfg(target_os = "macos")]
    std::os::unix::fs::symlink(target, link)?;
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
        use windows_sys::Win32::{
            Storage::FileSystem::{FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT},
            System::IO::DeviceIoControl,
        };
        let target = fs::canonicalize(target)?;
        let target = target
            .to_str()
            .and_then(|value| value.strip_prefix(r"\\?\"))
            .ok_or_else(|| {
                io::Error::new(io::ErrorKind::InvalidInput, "Expected a local drive target")
            })?;
        super::windows_path::selected(target)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidInput, error.message))?;
        let substitute: Vec<u16> = format!(r"\??\{target}").encode_utf16().collect();
        let print: Vec<u16> = target.encode_utf16().collect();
        let payload_len = 8 + (substitute.len() + print.len() + 2) * 2;
        if payload_len + 8 > 16 * 1024 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Junction target is too long",
            ));
        }
        let mut data = Vec::new();
        data.extend_from_slice(&0xA0000003u32.to_le_bytes());
        data.extend_from_slice(&(payload_len as u16).to_le_bytes());
        for field in [
            0u16,
            0,
            (substitute.len() * 2) as u16,
            ((substitute.len() + 1) * 2) as u16,
            (print.len() * 2) as u16,
        ] {
            data.extend_from_slice(&field.to_le_bytes());
        }
        for value in substitute
            .into_iter()
            .chain(Some(0))
            .chain(print)
            .chain(Some(0))
        {
            data.extend_from_slice(&value.to_le_bytes());
        }
        fs::create_dir(link)?;
        let cleanup = DirectoryLink(link.to_owned());
        let handle = fs::OpenOptions::new()
            .read(true)
            .write(true)
            .custom_flags(FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT)
            .open(link)?;
        let mut returned = 0;
        if unsafe {
            DeviceIoControl(
                handle.as_raw_handle(),
                0x000900A4,
                data.as_ptr().cast(),
                data.len() as u32,
                std::ptr::null_mut(),
                0,
                &mut returned,
                std::ptr::null_mut(),
            )
        } == 0
        {
            return Err(io::Error::last_os_error());
        }
        drop(handle);
        return Ok(cleanup);
    }
    #[cfg(target_os = "macos")]
    Ok(DirectoryLink(link.to_owned()))
}
