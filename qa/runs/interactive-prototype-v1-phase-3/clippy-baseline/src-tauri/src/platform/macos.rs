// Darwin mechanisms extracted without changing access/enumeration policy.
use crate::scope::{
    excluded, image_format, io_error, markdown_name, validate_segment, AppError, AppResult,
    DirectoryPage, Entry, Identity,
};
use std::ffi::{CStr, CString};
use std::fs::File;
use std::io;
use std::mem::MaybeUninit;
use std::os::fd::{AsRawFd, FromRawFd};
use std::os::unix::ffi::OsStrExt;
use std::path::Path;
const SF_DATALESS_FLAG: u32 = 0x4000_0000;

fn refuse_dataless(info: &libc::stat) -> AppResult<()> {
    if info.st_flags & SF_DATALESS_FLAG != 0 {
        return Err(AppError::new(
            "cloud_placeholder",
            "Cloud placeholder content is not available locally",
        ));
    }
    Ok(())
}

fn checked_file(fd: libc::c_int, expect_dir: bool) -> AppResult<File> {
    if fd < 0 {
        return Err(io_error(io::Error::last_os_error()));
    }
    let file = unsafe { File::from_raw_fd(fd) };
    let info = stat(&file)?;
    refuse_dataless(&info)?;
    let kind = info.st_mode & libc::S_IFMT;
    if (expect_dir && kind != libc::S_IFDIR) || (!expect_dir && kind != libc::S_IFREG) {
        return Err(AppError::new(
            "unsupported_type",
            "Only regular files and directories are supported",
        ));
    }
    ensure_local(&file)?;
    Ok(file)
}

pub fn open_selected(path: &Path, directory: bool) -> AppResult<File> {
    let metadata = std::fs::symlink_metadata(path).map_err(io_error)?;
    if metadata.file_type().is_symlink() {
        return Err(AppError::new(
            "unsupported_type",
            "Symlinks are not supported",
        ));
    }
    use std::os::macos::fs::MetadataExt;
    if metadata.st_flags() & SF_DATALESS_FLAG != 0 {
        return Err(AppError::new(
            "cloud_placeholder",
            "Cloud placeholder content is not available locally",
        ));
    }
    let name = CString::new(path.as_os_str().as_bytes())
        .map_err(|_| AppError::new("invalid_path", "Path contains a NUL byte"))?;
    let flags = libc::O_RDONLY
        | libc::O_CLOEXEC
        | libc::O_NOFOLLOW
        | if directory { libc::O_DIRECTORY } else { 0 };
    checked_file(unsafe { libc::open(name.as_ptr(), flags) }, directory)
}

pub fn open_relative(root: &File, segments: &[String], directory: bool) -> AppResult<File> {
    if segments.is_empty() {
        if directory {
            return root.try_clone().map_err(io_error);
        }
        return Err(AppError::new("invalid_path", "A file path is required"));
    }
    if segments.len() > 128 {
        return Err(AppError::new("invalid_path", "Path is too deep"));
    }
    let mut parent = root.try_clone().map_err(io_error)?;
    for (index, segment) in segments.iter().enumerate() {
        validate_segment(segment)?;
        let c_name = CString::new(segment.as_bytes())
            .map_err(|_| AppError::new("invalid_path", "Invalid path segment"))?;
        let want_dir = index + 1 < segments.len() || directory;
        let mut info = MaybeUninit::<libc::stat>::uninit();
        if unsafe {
            libc::fstatat(
                parent.as_raw_fd(),
                c_name.as_ptr(),
                info.as_mut_ptr(),
                libc::AT_SYMLINK_NOFOLLOW,
            )
        } < 0
        {
            return Err(io_error(io::Error::last_os_error()));
        }
        refuse_dataless(&unsafe { info.assume_init() })?;
        let flags = libc::O_RDONLY
            | libc::O_CLOEXEC
            | libc::O_NOFOLLOW
            | if want_dir { libc::O_DIRECTORY } else { 0 };
        let next = checked_file(
            unsafe { libc::openat(parent.as_raw_fd(), c_name.as_ptr(), flags) },
            want_dir,
        )?;
        parent = next;
    }
    Ok(parent)
}

fn stat(file: &File) -> AppResult<libc::stat> {
    let mut value = MaybeUninit::<libc::stat>::uninit();
    if unsafe { libc::fstat(file.as_raw_fd(), value.as_mut_ptr()) } < 0 {
        return Err(io_error(io::Error::last_os_error()));
    }
    Ok(unsafe { value.assume_init() })
}

pub fn identity(file: &File) -> AppResult<Identity> {
    let st = stat(file)?;
    Ok(Identity {
        device: st.st_dev as u64,
        inode: st.st_ino as u64,
    })
}

pub fn size(file: &File) -> AppResult<u64> {
    Ok(stat(file)?.st_size.max(0) as u64)
}

fn ensure_local(file: &File) -> AppResult<()> {
    let mut value = MaybeUninit::<libc::statfs>::uninit();
    if unsafe { libc::fstatfs(file.as_raw_fd(), value.as_mut_ptr()) } < 0 {
        return Err(io_error(io::Error::last_os_error()));
    }
    let info = unsafe { value.assume_init() };
    if info.f_flags & (libc::MNT_LOCAL as u32) == 0 {
        return Err(AppError::new(
            "unsupported_mount",
            "Network-mounted locations are not supported",
        ));
    }
    Ok(())
}

pub fn read_page(
    dir: &File,
    offset: usize,
    limit: usize,
    cancelled: impl Fn() -> bool,
) -> AppResult<DirectoryPage> {
    let limit = limit.clamp(1, 250);
    let dot = CString::new(".").expect("static path");
    let duplicate = unsafe {
        libc::openat(
            dir.as_raw_fd(),
            dot.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_CLOEXEC,
        )
    };
    if duplicate < 0 {
        return Err(io_error(io::Error::last_os_error()));
    }
    let handle = unsafe { libc::fdopendir(duplicate) };
    if handle.is_null() {
        unsafe { libc::close(duplicate) };
        return Err(io_error(io::Error::last_os_error()));
    }
    struct DirHandle(*mut libc::DIR);
    impl Drop for DirHandle {
        fn drop(&mut self) {
            unsafe {
                libc::closedir(self.0);
            }
        }
    }
    let handle = DirHandle(handle);
    let mut seen = 0usize;
    let mut entries = Vec::with_capacity(limit);
    let mut has_more = false;
    loop {
        if cancelled() {
            return Err(AppError::new("cancelled", "Directory listing cancelled"));
        }
        unsafe {
            *libc::__error() = 0;
        }
        let item = unsafe { libc::readdir(handle.0) };
        if item.is_null() {
            if unsafe { *libc::__error() } != 0 {
                return Err(io_error(io::Error::last_os_error()));
            }
            break;
        }
        let bytes = unsafe { CStr::from_ptr((*item).d_name.as_ptr()) }.to_bytes();
        let Ok(name) = std::str::from_utf8(bytes) else {
            continue;
        };
        if name == "." || name == ".." || excluded(name) {
            continue;
        }
        let c_name =
            CString::new(bytes).map_err(|_| AppError::new("invalid_path", "Invalid entry"))?;
        let mut info = MaybeUninit::<libc::stat>::uninit();
        if unsafe {
            libc::fstatat(
                dir.as_raw_fd(),
                c_name.as_ptr(),
                info.as_mut_ptr(),
                libc::AT_SYMLINK_NOFOLLOW,
            )
        } < 0
        {
            continue;
        }
        let info = unsafe { info.assume_init() };
        let file_type = info.st_mode & libc::S_IFMT;
        let kind = if file_type == libc::S_IFDIR {
            "directory"
        } else if file_type == libc::S_IFREG && markdown_name(name) {
            "markdown"
        } else if file_type == libc::S_IFREG && crate::scope::html_name(name) {
            "html"
        } else if file_type == libc::S_IFREG && image_format(name).is_some() {
            "image"
        } else {
            "other"
        };
        if seen >= offset {
            if entries.len() == limit {
                has_more = true;
                break;
            }
            entries.push(Entry {
                name: name.to_string(),
                kind,
                identity: (file_type == libc::S_IFREG).then_some(Identity {
                    device: info.st_dev as u64,
                    inode: info.st_ino,
                }),
            });
        }
        seen += 1;
    }
    Ok(DirectoryPage {
        entries,
        next_offset: has_more.then_some(offset + limit),
        snapshot_id: String::new(),
    })
}

pub fn read_snapshot_entries(dir: &File, cancelled: impl Fn() -> bool) -> AppResult<Vec<Entry>> {
    read_snapshot_entries_with_exclusions(dir, cancelled, true)
}

pub(crate) fn read_search_entries(
    dir: &File,
    cancelled: impl Fn() -> bool,
) -> AppResult<Vec<Entry>> {
    read_snapshot_entries_with_exclusions(dir, cancelled, false)
}

fn read_snapshot_entries_with_exclusions(
    dir: &File,
    cancelled: impl Fn() -> bool,
    apply_exclusions: bool,
) -> AppResult<Vec<Entry>> {
    let dot = CString::new(".").expect("static path");
    let duplicate = unsafe {
        libc::openat(
            dir.as_raw_fd(),
            dot.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_CLOEXEC,
        )
    };
    if duplicate < 0 {
        return Err(io_error(io::Error::last_os_error()));
    }
    let handle = unsafe { libc::fdopendir(duplicate) };
    if handle.is_null() {
        unsafe { libc::close(duplicate) };
        return Err(io_error(io::Error::last_os_error()));
    }
    struct DirHandle(*mut libc::DIR);
    impl Drop for DirHandle {
        fn drop(&mut self) {
            unsafe { libc::closedir(self.0) };
        }
    }
    let handle = DirHandle(handle);
    let mut entries = Vec::new();
    loop {
        if cancelled() {
            return Err(AppError::new("cancelled", "Directory listing cancelled"));
        }
        unsafe { *libc::__error() = 0 };
        let item = unsafe { libc::readdir(handle.0) };
        if item.is_null() {
            if unsafe { *libc::__error() } != 0 {
                return Err(io_error(io::Error::last_os_error()));
            }
            break;
        }
        let bytes = unsafe { CStr::from_ptr((*item).d_name.as_ptr()) }.to_bytes();
        let Ok(name) = std::str::from_utf8(bytes) else {
            continue;
        };
        if name == "." || name == ".." || (apply_exclusions && excluded(name)) {
            continue;
        }
        let c_name =
            CString::new(bytes).map_err(|_| AppError::new("invalid_path", "Invalid entry"))?;
        let mut info = MaybeUninit::<libc::stat>::uninit();
        if unsafe {
            libc::fstatat(
                dir.as_raw_fd(),
                c_name.as_ptr(),
                info.as_mut_ptr(),
                libc::AT_SYMLINK_NOFOLLOW,
            )
        } < 0
        {
            continue;
        }
        let info = unsafe { info.assume_init() };
        let file_type = info.st_mode & libc::S_IFMT;
        let kind = if file_type == libc::S_IFDIR {
            "directory"
        } else if file_type == libc::S_IFREG && markdown_name(name) {
            "markdown"
        } else if file_type == libc::S_IFREG && crate::scope::html_name(name) {
            "html"
        } else if file_type == libc::S_IFREG && image_format(name).is_some() {
            "image"
        } else {
            "other"
        };
        entries.push(Entry {
            name: name.to_string(),
            kind,
            identity: (file_type == libc::S_IFREG).then_some(Identity {
                device: info.st_dev as u64,
                inode: info.st_ino,
            }),
        });
        if entries.len() > 100_000 {
            return Err(AppError::new(
                "directory_limit",
                "Directory exceeds the snapshot limit",
            ));
        }
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn rejects_dataless_metadata_before_content_open() {
        let mut info: libc::stat = unsafe { std::mem::zeroed() };
        info.st_flags = SF_DATALESS_FLAG;
        assert_eq!(
            refuse_dataless(&info).unwrap_err().code,
            "cloud_placeholder"
        );
        info.st_flags = 0;
        assert!(refuse_dataless(&info).is_ok());
    }

    #[test]
    fn vanished_root_and_symlink_cycle_do_not_hang_listing() {
        let base = std::env::temp_dir().join(format!("md-reader-cycle-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("README.md"), b"# Here").unwrap();
        symlink(&base, base.join("cycle")).unwrap();
        let root = open_selected(&base, true).unwrap();
        assert_eq!(
            open_relative(&root, &["cycle".into()], true)
                .unwrap_err()
                .code,
            "io_error"
        );
        std::fs::remove_dir_all(&base).unwrap();
        let page = read_page(&root, 0, 200, || false).unwrap();
        assert!(page.entries.is_empty());
    }
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::Arc;
    use std::time::{Duration, Instant};

    #[test]
    fn rejects_unsafe_segments() {
        for value in ["", ".", "..", "../x", "a/b", "a\\b", "x\0y"] {
            assert!(validate_segment(value).is_err());
        }
        assert!(validate_segment("café space.md").is_ok());
    }

    #[test]
    fn never_follows_a_symlink_out_of_a_selected_root() {
        let base = std::env::temp_dir().join(format!("md-reader-scope-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(base.join("root")).unwrap();
        std::fs::write(base.join("secret.md"), b"secret").unwrap();
        symlink(base.join("secret.md"), base.join("root").join("link.md")).unwrap();
        let root = open_selected(&base.join("root"), true).unwrap();
        let error = open_relative(&root, &["link.md".into()], false).unwrap_err();
        assert!(matches!(error.code, "io_error" | "unsupported_type"));
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn pages_a_directory_without_sharing_cursor_state() {
        let base = std::env::temp_dir().join(format!("md-reader-page-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        std::fs::write(base.join("one.md"), b"one").unwrap();
        std::fs::write(base.join("two.md"), b"two").unwrap();
        let dir = open_selected(&base, true).unwrap();
        let first = read_page(&dir, 0, 1, || false).unwrap();
        let second = read_page(&dir, 1, 1, || false).unwrap();
        assert_eq!(first.entries.len(), 1);
        assert_eq!(second.entries.len(), 1);
        assert_ne!(first.entries[0].name, second.entries[0].name);
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    fn includes_documentation_dot_directories_and_excludes_dependency_trees() {
        let base = std::env::temp_dir().join(format!("md-reader-filter-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(base.join(".github")).unwrap();
        std::fs::create_dir_all(base.join(".git")).unwrap();
        std::fs::create_dir_all(base.join("node_modules")).unwrap();
        std::fs::write(base.join("README.MARKDOWN"), b"# Guide").unwrap();
        let dir = open_selected(&base, true).unwrap();
        let page = read_page(&dir, 0, 200, || false).unwrap();
        let names: Vec<_> = page
            .entries
            .iter()
            .map(|entry| entry.name.as_str())
            .collect();
        assert!(names.contains(&".github"));
        assert!(names.contains(&"README.MARKDOWN"));
        assert!(!names.contains(&".git"));
        assert!(!names.contains(&"node_modules"));
        std::fs::remove_dir_all(base).unwrap();
    }

    #[test]
    #[ignore = "measured 25,000-entry fixture; run explicitly for acceptance evidence"]
    fn measures_large_folder_first_page_and_cancellation() {
        let base = std::env::temp_dir().join(format!("md-reader-large-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&base).unwrap();
        for index in 0..25_000 {
            std::fs::write(base.join(format!("file-{index:05}.md")), b"# Fixture").unwrap();
        }
        let dir = open_selected(&base, true).unwrap();
        let start = Instant::now();
        let first = read_page(&dir, 0, 200, || false).unwrap();
        let first_ms = start.elapsed().as_millis();
        assert_eq!(first.entries.len(), 200);
        assert!(first.next_offset.is_some());
        println!("25k first page: {first_ms} ms");

        let mut cancellation_ms = Vec::new();
        for _ in 0..10 {
            let flag = Arc::new(AtomicBool::new(false));
            let worker_flag = Arc::clone(&flag);
            let worker_dir = dir.try_clone().unwrap();
            let started = Instant::now();
            let worker = std::thread::spawn(move || {
                read_page(&worker_dir, 24_900, 200, || {
                    worker_flag.load(Ordering::Relaxed)
                })
            });
            std::thread::sleep(Duration::from_millis(2));
            flag.store(true, Ordering::Relaxed);
            let outcome = worker.join().unwrap();
            match outcome {
                Err(error) => assert_eq!(error.code, "cancelled"),
                Ok(_) => panic!("listing completed before cancellation was acknowledged"),
            }
            cancellation_ms.push(started.elapsed().as_millis());
        }
        println!("25k cancellation acknowledgement (10 runs, ms): {cancellation_ms:?}");
        std::fs::remove_dir_all(base).unwrap();
    }
}

use super::FileStamp;
use std::os::unix::fs::MetadataExt;
pub(crate) fn stamp(file: &File) -> AppResult<FileStamp> {
    let metadata = file.metadata().map_err(io_error)?;
    Ok(FileStamp {
        device: metadata.dev(),
        inode: metadata.ino(),
        length: metadata.len(),
        modified_seconds: metadata.mtime(),
        modified_nanos: metadata.mtime_nsec(),
        changed_seconds: metadata.ctime(),
        changed_nanos: metadata.ctime_nsec(),
    })
}
