//! Run natively on Windows 11 x64/local NTFS. No host result proves these cases.
#![cfg(target_os = "windows")]
#[path = "../src/document.rs"]
mod document;
#[path = "../src/platform/mod.rs"]
mod platform;
#[path = "../src/scope.rs"]
mod scope;
#[path = "../src/state.rs"]
mod state;
use scope::{identity, open_relative, open_selected, read_snapshot_entries};
use std::{fs, io::Write, os::windows::ffi::OsStrExt, path::PathBuf};
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self {
        let path = std::env::temp_dir().join(format!("md-windows-native-{}", uuid::Uuid::new_v4()));
        platform::storage::ensure_private_dir(&path).unwrap();
        Self(path)
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
#[test]
fn scoped_unicode_reads_are_bounded_cancellable_and_leave_source_unchanged() {
    let fixture = Fixture::new();
    fs::create_dir(fixture.0.join("Café space")).unwrap();
    let path = fixture.0.join("Café space/README.MD");
    fs::write(&path, b"\xef\xbb\xbf# One\r\nsource\r\n").unwrap();
    let before = fs::read(&path).unwrap();
    let root = open_selected(&fixture.0, true).unwrap();
    let file = open_relative(&root, &["Café space".into(), "README.MD".into()], false).unwrap();
    assert_eq!(document::bounded_bytes(&file, 100).unwrap(), before);
    assert_eq!(
        document::bounded_bytes(&file, 2).unwrap_err().code,
        "oversize"
    );
    assert_eq!(
        read_snapshot_entries(&root, || true).unwrap_err().code,
        "cancelled"
    );
    assert_eq!(
        identity(&file).unwrap(),
        identity(&open_selected(&path, false).unwrap()).unwrap()
    );
    assert_eq!(fs::read(path).unwrap(), before);
}
#[test]
fn parent_replacement_cannot_redirect_a_held_root() {
    let fixture = Fixture::new();
    let path = fixture.0.join("selected");
    fs::create_dir(&path).unwrap();
    fs::write(path.join("a.md"), b"original").unwrap();
    let root = open_selected(&path, true).unwrap();
    fs::rename(&path, fixture.0.join("moved")).unwrap();
    fs::create_dir(&path).unwrap();
    fs::write(path.join("a.md"), b"outside marker").unwrap();
    let file = open_relative(&root, &["a.md".into()], false).unwrap();
    assert_eq!(document::bounded_bytes(&file, 100).unwrap(), b"original");
    assert_ne!(
        identity(&root).unwrap(),
        identity(&open_selected(&path, true).unwrap()).unwrap()
    );
    for names in [
        vec!["..".into(), "a.md".into()],
        vec!["a.md:stream".into()],
        vec!["NUL.md".into()],
    ] {
        assert_eq!(
            open_relative(&root, &names, false).unwrap_err().code,
            "invalid_path"
        );
    }
}
#[test]
fn offline_attributes_are_rejected_before_content() {
    use windows_sys::Win32::Storage::FileSystem::{
        SetFileAttributesW, FILE_ATTRIBUTE_NORMAL, FILE_ATTRIBUTE_OFFLINE,
    };
    let fixture = Fixture::new();
    let path = fixture.0.join("offline.md");
    fs::write(&path, b"outside marker").unwrap();
    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    assert_ne!(
        unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_OFFLINE) },
        0
    );
    let outcome = open_selected(&path, false);
    // Reset only the disposable fixture's synthetic offline attribute.
    assert_ne!(
        unsafe { SetFileAttributesW(wide.as_ptr(), FILE_ATTRIBUTE_NORMAL) },
        0
    );
    assert_eq!(outcome.unwrap_err().code, "cloud_placeholder");
    assert_eq!(fs::read(path).unwrap(), b"outside marker");
}
#[test]
fn private_lock_release_and_record_publication_use_owned_handles() {
    let fixture = Fixture::new();
    let lock = fixture.0.join("fixture.lock");
    let first =
        platform::storage::lock_private(&lock, "recovery_error", "recovery_permissions").unwrap();
    assert!(
        platform::storage::lock_private(&lock, "recovery_error", "recovery_permissions").is_err()
    );
    drop(first);
    let _guard =
        platform::storage::lock_private(&lock, "recovery_error", "recovery_permissions").unwrap();
    let current = fixture.0.join("current.json");
    for value in [b"previous".as_slice(), b"latest".as_slice()] {
        let stage = fixture.0.join(format!("{}.tmp", uuid::Uuid::new_v4()));
        let mut file = platform::storage::create_private_file(&stage).unwrap();
        file.write_all(value).unwrap();
        file.sync_all().unwrap();
        platform::storage::publish_private(&stage, &current).unwrap();
        assert_eq!(fs::read(&current).unwrap(), value);
        assert!(!stage.exists());
    }
    let file = open_selected(&current, false).unwrap();
    platform::storage::verify_private_file(&file).unwrap();
    assert_eq!(
        platform::require_editing().unwrap_err().code,
        "editing_unavailable"
    );
}
#[test]
fn a_disposable_junction_cannot_escape_selection_or_become_a_root() {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
    use windows_sys::Win32::{
        Storage::FileSystem::{FILE_FLAG_BACKUP_SEMANTICS, FILE_FLAG_OPEN_REPARSE_POINT},
        System::IO::DeviceIoControl,
    };
    let fixture = Fixture::new();
    let root_path = fixture.0.join("root");
    let outside = fixture.0.join("outside");
    fs::create_dir(&root_path).unwrap();
    fs::create_dir(&outside).unwrap();
    fs::write(outside.join("secret.md"), b"outside marker").unwrap();
    let junction = root_path.join("junction");
    fs::create_dir(&junction).unwrap();
    let target = fs::canonicalize(&outside).unwrap();
    let target = target.to_str().unwrap().strip_prefix("\\\\?\\").unwrap();
    let substitute: Vec<u16> = format!("\\??\\{target}").encode_utf16().collect();
    let print: Vec<u16> = target.encode_utf16().collect();
    let mut data = Vec::new();
    data.extend_from_slice(&0xA0000003u32.to_le_bytes()); // IO_REPARSE_TAG_MOUNT_POINT
    data.extend_from_slice(&((8 + (substitute.len() + print.len() + 2) * 2) as u16).to_le_bytes());
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
    let handle = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .custom_flags(FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT)
        .open(&junction)
        .unwrap();
    let mut returned = 0;
    assert_ne!(
        unsafe {
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
        },
        0
    ); // FSCTL_SET_REPARSE_POINT
    drop(handle);
    let root = open_selected(&root_path, true).unwrap();
    assert!(open_relative(&root, &["junction".into(), "secret.md".into()], false).is_err());
    assert!(open_selected(&junction, true).is_err());
    let listing = read_snapshot_entries(&root, || false).unwrap();
    assert_eq!(
        listing.iter().find(|e| e.name == "junction").unwrap().kind,
        "other"
    );
    fs::remove_dir(&junction).unwrap(); // remove only the test-owned junction, never its target
    assert_eq!(
        fs::read(outside.join("secret.md")).unwrap(),
        b"outside marker"
    );
}
