//! Explicit no-follow roots; descriptor-relative traversal closes ancestor substitution.
use igproto_model::{Code, Stage};
use igproto_package::{diagnostics::error, resources::canonical_path, Control, Result};
#[cfg(unix)]
use rustix::fs::{open, openat, AtFlags, Mode, OFlags};
use std::{
    collections::BTreeSet,
    fs::File,
    io::{Read, Write},
    path::{Component, Path},
    sync::atomic::{AtomicU64, Ordering},
};
#[derive(Debug)]
pub struct ReadRoot {
    directory: File,
}
fn io_error(path: &str) -> igproto_package::Report {
    error(
        Code::InvalidVisual,
        Stage::Reference,
        path,
        "I/O/source conflict: missing, changed, symlink, special file or inaccessible path",
    )
}
impl ReadRoot {
    #[cfg(unix)]
    pub fn open(path: &Path) -> Result<Self> {
        if !path.is_absolute() {
            return Err(io_error("root"));
        }
        let mut fd = open(
            "/",
            OFlags::RDONLY | OFlags::DIRECTORY | OFlags::CLOEXEC,
            Mode::empty(),
        )
        .map_err(|_| io_error("root"))?;
        for c in path.components() {
            match c {
                Component::RootDir => (),
                Component::Normal(c) => {
                    fd = openat(
                        &fd,
                        c,
                        OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
                        Mode::empty(),
                    )
                    .map_err(|_| io_error("root"))?
                }
                _ => return Err(io_error("root")),
            }
        }
        Ok(Self {
            directory: fd.into(),
        })
    }
    #[cfg(not(unix))]
    pub fn open(_path: &Path) -> Result<Self> {
        Err(error(
            Code::InvalidVisual,
            Stage::Reference,
            "root",
            "secure filesystem adapter is currently Unix only; use in-memory providers",
        ))
    }
    #[cfg(unix)]
    fn directory(&self, path: &str) -> Result<File> {
        if !igproto_model::relative_source_path(path) {
            return Err(io_error(path));
        }
        let mut f = self.directory.try_clone().map_err(|_| io_error(path))?;
        for c in path.split('/') {
            f = openat(
                &f,
                c,
                OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
                Mode::empty(),
            )
            .map_err(|_| io_error(path))?
            .into();
        }
        Ok(f)
    }
    #[cfg(unix)]
    fn file(&self, path: &str) -> Result<File> {
        if !igproto_model::relative_source_path(path) {
            return Err(io_error(path));
        }
        let (parent, name) = path.rsplit_once('/').unwrap_or(("", path));
        let f = if parent.is_empty() {
            self.directory.try_clone().map_err(|_| io_error(path))?
        } else {
            self.directory(parent)?
        };
        let file: File = openat(
            &f,
            name,
            OFlags::RDONLY | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC,
            Mode::empty(),
        )
        .map_err(|_| io_error(path))?
        .into();
        if !file.metadata().map_err(|_| io_error(path))?.is_file() {
            return Err(io_error(path));
        }
        Ok(file)
    }
    #[cfg(not(unix))]
    fn file(&self, path: &str) -> Result<File> {
        Err(io_error(path))
    }
    pub fn read(&self, path: &str, cap: usize, control: &Control) -> Result<Vec<u8>> {
        control.check(path)?;
        let mut f = self.file(path)?;
        let before = f.metadata().map_err(|_| io_error(path))?;
        if before.len() > cap as u64 {
            return Err(error(
                Code::LimitExceeded,
                Stage::Limit,
                path,
                "input exceeds byte budget",
            ));
        }
        let mut result = Vec::new();
        let mut chunk = [0u8; 64 * 1024];
        loop {
            control.check(path)?;
            let n = f.read(&mut chunk).map_err(|_| io_error(path))?;
            if n == 0 {
                break;
            }
            if result.len() + n > cap {
                return Err(error(
                    Code::LimitExceeded,
                    Stage::Limit,
                    path,
                    "input exceeds streaming byte budget",
                ));
            }
            result.extend_from_slice(&chunk[..n]);
        }
        let after = f.metadata().map_err(|_| io_error(path))?;
        if before.len() != after.len() || before.modified().ok() != after.modified().ok() {
            return Err(io_error(path));
        }
        // Reopen through anchored no-follow traversal and compare actual file identity.
        let current = self.file(path)?.metadata().map_err(|_| io_error(path))?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            if current.dev() != before.dev()
                || current.ino() != before.ino()
                || current.ctime() != before.ctime()
                || current.ctime_nsec() != before.ctime_nsec()
            {
                return Err(io_error(path));
            }
        }
        Ok(result)
    }
    /// Hash an opaque authoring document without materializing its native format.
    /// The compiler's deadline bounds the scan; package quotas apply to exports.
    pub fn digest(&self, path: &str, control: &Control) -> Result<String> {
        use sha2::{Digest, Sha256};
        let mut f = self.file(path)?;
        let before = f.metadata().map_err(|_| io_error(path))?;
        let mut hash = Sha256::new();
        let mut bytes = 0u64;
        let mut chunk = [0u8; 65536];
        loop {
            control.check(path)?;
            let n = f.read(&mut chunk).map_err(|_| io_error(path))?;
            if n == 0 {
                break;
            }
            hash.update(&chunk[..n]);
            bytes = bytes.checked_add(n as u64).ok_or_else(|| io_error(path))?;
        }
        let after = f.metadata().map_err(|_| io_error(path))?;
        let current = self.file(path)?.metadata().map_err(|_| io_error(path))?;
        if bytes != before.len()
            || before.len() != after.len()
            || before.modified().ok() != after.modified().ok()
        {
            return Err(io_error(path));
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            if current.dev() != before.dev()
                || current.ino() != before.ino()
                || current.ctime() != before.ctime()
                || current.ctime_nsec() != before.ctime_nsec()
            {
                return Err(io_error(path));
            }
        }
        Ok(format!("{:x}", hash.finalize()))
    }
    #[cfg(unix)]
    pub fn names(&self, path: &str) -> Result<BTreeSet<String>> {
        let f = self.directory(path)?;
        let entries = rustix::fs::Dir::read_from(&f).map_err(|_| io_error(path))?;
        let mut names = BTreeSet::new();
        for entry in entries {
            let entry = entry.map_err(|_| io_error(path))?;
            let name = entry.file_name().to_str().map_err(|_| io_error(path))?;
            if matches!(name, "." | "..") {
                continue;
            }
            if names.len() >= igproto_model::limits::SCENES || !canonical_path(name) {
                return Err(io_error(path));
            }
            names.insert(name.to_string());
        }
        Ok(names)
    }
    #[cfg(not(unix))]
    pub fn names(&self, path: &str) -> Result<BTreeSet<String>> {
        Err(io_error(path))
    }
    /// Atomic publication into an explicitly selected directory; prior bytes survive failures.
    #[cfg(unix)]
    pub fn publish(&self, name: &str, bytes: &[u8], control: &Control) -> Result<()> {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        if !igproto_model::relative_source_path(name)
            || name.contains('/')
            || !name.ends_with(".igproto")
        {
            return Err(io_error(name));
        }
        let prior = match rustix::fs::statat(&self.directory, name, AtFlags::SYMLINK_NOFOLLOW) {
            Ok(s) => {
                if s.st_nlink > 1 {
                    return Err(io_error(name));
                }
                if rustix::fs::FileType::from_raw_mode(s.st_mode)
                    != rustix::fs::FileType::RegularFile
                {
                    return Err(io_error(name));
                }
                Some((s.st_dev, s.st_ino))
            }
            Err(rustix::io::Errno::NOENT) => None,
            Err(_) => return Err(io_error(name)),
        };
        control.check(name)?;
        let temp = format!(
            ".igproto-build-{}-{}.tmp",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        );
        let fd = openat(
            &self.directory,
            temp.as_str(),
            OFlags::WRONLY | OFlags::CREATE | OFlags::EXCL | OFlags::NOFOLLOW | OFlags::CLOEXEC,
            Mode::from_raw_mode(0o600),
        )
        .map_err(|_| io_error(name))?;
        let outcome = (|| {
            let mut f: File = fd.into();
            f.write_all(bytes).map_err(|_| io_error(name))?;
            f.sync_all().map_err(|_| io_error(name))?;
            control.check(name)?;
            let current = rustix::fs::statat(&self.directory, name, AtFlags::SYMLINK_NOFOLLOW)
                .ok()
                .map(|s| (s.st_dev, s.st_ino));
            if current != prior {
                return Err(io_error(name));
            }
            rustix::fs::renameat(&self.directory, temp.as_str(), &self.directory, name)
                .map_err(|_| io_error(name))?;
            Ok(())
        })();
        if outcome.is_err() {
            let _ = rustix::fs::unlinkat(&self.directory, temp.as_str(), AtFlags::empty());
        }
        outcome
    }
    #[cfg(not(unix))]
    pub fn publish(&self, name: &str, _bytes: &[u8], _control: &Control) -> Result<()> {
        Err(io_error(name))
    }
}
