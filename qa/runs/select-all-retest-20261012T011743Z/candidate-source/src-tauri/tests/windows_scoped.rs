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
    let path = fixture.0.join("Café space").join("README.MD");
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
    use platform::PositionalRead;
    let mut first = [0; 3];
    let mut second = [0; 4];
    assert_eq!(file.read_at(&mut second, 3).unwrap(), 4);
    assert_eq!(&second, b"# On");
    assert_eq!(file.read_at(&mut first, 0).unwrap(), 3);
    assert_eq!(&first, b"\xef\xbb\xbf");
    assert_eq!(file.read_at(&mut first, before.len() as u64).unwrap(), 0);
    let id = identity(&file).unwrap();
    assert_eq!(
        serde_json::from_slice::<scope::Identity>(&serde_json::to_vec(&id).unwrap()).unwrap(),
        id
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
    fs::write(path.join("outside.md"), b"outside marker").unwrap();
    // Each scan has its own cursor and continues to use the selected object
    // after the original pathname is replaced.
    for _ in 0..2 {
        let listing = read_snapshot_entries(&root, || false).unwrap();
        assert_eq!(listing.len(), 1);
        assert_eq!(listing[0].name, "a.md");
    }
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
    platform::require_editing().unwrap();
    platform::validate_editable_document(&file).unwrap();
}
#[test]
fn a_disposable_junction_cannot_escape_selection_or_become_a_root() {
    let fixture = Fixture::new();
    let root_path = fixture.0.join("root");
    let outside = fixture.0.join("outside");
    fs::create_dir(&root_path).unwrap();
    fs::create_dir(&outside).unwrap();
    fs::write(outside.join("secret.md"), b"outside marker").unwrap();
    let junction = root_path.join("junction");
    let link = platform::test_support::directory_link(&outside, &junction).unwrap();
    let root = open_selected(&root_path, true).unwrap();
    assert!(open_relative(&root, &["junction".into(), "secret.md".into()], false).is_err());
    assert!(open_selected(&junction, true).is_err());
    let listing = read_snapshot_entries(&root, || false).unwrap();
    assert_eq!(
        listing.iter().find(|e| e.name == "junction").unwrap().kind,
        "other"
    );
    drop(link);
    assert_eq!(
        fs::read(outside.join("secret.md")).unwrap(),
        b"outside marker"
    );
}

#[test]
fn extended_long_paths_keep_names_and_enumerate_from_the_held_directory() {
    let fixture = Fixture::new();
    let mut path = fs::canonicalize(&fixture.0).unwrap();
    let mut names = Vec::new();
    for index in 0..8 {
        let name = format!("Café space {index} {}", "a".repeat(30));
        path.push(&name);
        names.push(name);
        fs::create_dir(&path).unwrap();
    }
    assert!(path.as_os_str().encode_wide().count() > 260);
    fs::write(path.join("Read.MD"), b"long path marker").unwrap();
    let root = open_selected(&fixture.0, true).unwrap();
    let directory = open_relative(&root, &names, true).unwrap();
    let entries = read_snapshot_entries(&directory, || false).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].name, "Read.MD");
    names.push("Read.MD".into());
    let file = open_relative(&root, &names, false).unwrap();
    assert_eq!(
        document::bounded_bytes(&file, 100).unwrap(),
        b"long path marker"
    );
    assert_eq!(
        identity(&file).unwrap(),
        identity(&open_selected(&path.join("Read.MD"), false).unwrap()).unwrap()
    );
}

#[test]
fn locked_private_destination_preserves_current_and_stage() {
    use std::os::windows::fs::OpenOptionsExt;
    use windows_sys::Win32::Storage::FileSystem::{FILE_SHARE_READ, FILE_SHARE_WRITE};
    let fixture = Fixture::new();
    let current = fixture.0.join("current.json");
    let stage = fixture.0.join("stage.tmp");
    for (path, bytes) in [
        (&current, b"acknowledged".as_slice()),
        (&stage, b"pending".as_slice()),
    ] {
        let mut file = platform::storage::create_private_file(path).unwrap();
        file.write_all(bytes).unwrap();
        file.sync_all().unwrap();
    }
    let locked = fs::OpenOptions::new()
        .read(true)
        .share_mode(FILE_SHARE_READ | FILE_SHARE_WRITE)
        .open(&current)
        .unwrap();
    assert!(platform::storage::publish_private(&stage, &current).is_err());
    assert_eq!(fs::read(&current).unwrap(), b"acknowledged");
    assert_eq!(fs::read(&stage).unwrap(), b"pending");
    drop(locked);
    platform::storage::publish_private(&stage, &current).unwrap();
    assert_eq!(fs::read(&current).unwrap(), b"pending");
    assert!(!stage.exists());
}

#[test]
fn private_publication_keeps_stage_identity_and_protected_permissions() {
    let fixture = Fixture::new();
    let current = fixture.0.join("current.json");
    let stage = fixture.0.join("stage.tmp");
    let mut old = platform::storage::create_private_file(&current).unwrap();
    old.write_all(b"acknowledged").unwrap();
    old.sync_all().unwrap();
    let old_id = identity(&old).unwrap();
    drop(old);
    let mut pending = platform::storage::create_private_file(&stage).unwrap();
    pending.write_all(b"pending").unwrap();
    pending.sync_all().unwrap();
    let staged_id = identity(&pending).unwrap();
    // Publication must work with an existing stage handle and a held parent,
    // unlike pathname-based ReplaceFileW's exclusive replacement-file open.
    platform::storage::publish_private(&stage, &current).unwrap();
    let published = open_selected(&current, false).unwrap();
    assert_eq!(identity(&published).unwrap(), staged_id);
    assert_ne!(identity(&published).unwrap(), old_id);
    platform::storage::verify_private_file(&published).unwrap();
    platform::storage::verify_private_file(&pending).unwrap();
    assert_eq!(
        document::bounded_bytes(&published, 100).unwrap(),
        b"pending"
    );
    assert!(!stage.exists());
}

#[test]
fn private_creation_collision_never_truncates_existing_records() {
    let fixture = Fixture::new();
    let before = identity(&open_selected(&fixture.0, true).unwrap()).unwrap();
    platform::storage::ensure_private_dir(&fixture.0).unwrap();
    assert_eq!(
        identity(&open_selected(&fixture.0, true).unwrap()).unwrap(),
        before
    );
    let path = fixture.0.join("draft.json");
    let mut file = platform::storage::create_private_file(&path).unwrap();
    file.write_all(b"acknowledged draft").unwrap();
    file.sync_all().unwrap();
    assert!(platform::storage::create_private_file(&path).is_err());
    assert_eq!(fs::read(&path).unwrap(), b"acknowledged draft");
}

#[test]
fn existing_broad_dacl_is_rejected_without_repairing_the_fixture() {
    use std::{
        os::windows::{fs::OpenOptionsExt, io::AsRawHandle},
        ptr,
    };
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::{
            Authorization::{
                ConvertStringSecurityDescriptorToSecurityDescriptorW, SetSecurityInfo,
                SDDL_REVISION_1, SE_FILE_OBJECT,
            },
            GetSecurityDescriptorDacl, DACL_SECURITY_INFORMATION,
            PROTECTED_DACL_SECURITY_INFORMATION,
        },
    };
    let fixture = Fixture::new();
    let path = fixture.0.join("broad.json");
    let mut file = platform::storage::create_private_file(&path).unwrap();
    file.write_all(b"private marker").unwrap();
    file.sync_all().unwrap();
    platform::storage::verify_private_file(&file).unwrap();
    drop(file);
    let file = fs::OpenOptions::new()
        .access_mode(0x00040000 | 0x00020000 | 0x80)
        .open(&path)
        .unwrap(); // WRITE_DAC, READ_CONTROL, FILE_READ_ATTRIBUTES
    let sddl: Vec<u16> = "D:P(A;;FA;;;WD)".encode_utf16().chain(Some(0)).collect();
    let mut descriptor = ptr::null_mut();
    assert_ne!(
        unsafe {
            ConvertStringSecurityDescriptorToSecurityDescriptorW(
                sddl.as_ptr(),
                SDDL_REVISION_1,
                &mut descriptor,
                ptr::null_mut(),
            )
        },
        0
    );
    let mut present = 0;
    let mut defaulted = 0;
    let mut dacl = ptr::null_mut();
    let decoded =
        unsafe { GetSecurityDescriptorDacl(descriptor, &mut present, &mut dacl, &mut defaulted) };
    let applied = if decoded != 0 && present != 0 {
        unsafe {
            SetSecurityInfo(
                file.as_raw_handle(),
                SE_FILE_OBJECT,
                DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION,
                ptr::null_mut(),
                ptr::null_mut(),
                dacl,
                ptr::null_mut(),
            )
        }
    } else {
        u32::MAX
    };
    unsafe {
        LocalFree(descriptor);
    }
    assert_eq!(applied, 0);
    assert_eq!(
        platform::storage::verify_private_file(&file)
            .unwrap_err()
            .code,
        "recovery_permissions"
    );
    drop(file);
    let reopened = open_selected(&path, false).unwrap();
    assert_eq!(
        platform::storage::verify_private_file(&reopened)
            .unwrap_err()
            .code,
        "recovery_permissions"
    );
    assert_eq!(fs::read(&path).unwrap(), b"private marker");
}

#[test]
fn case_sensitive_fixture_keeps_distinct_names_and_identities() {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
    use windows_sys::Win32::Storage::FileSystem::{
        FileCaseSensitiveInfo, SetFileInformationByHandle, FILE_CASE_SENSITIVE_INFO,
        FILE_FLAG_BACKUP_SEMANTICS, FILE_READ_ATTRIBUTES, FILE_WRITE_ATTRIBUTES,
    };
    let fixture = Fixture::new();
    let directory = fixture.0.join("case-sensitive");
    fs::create_dir(&directory).unwrap();
    let handle = fs::OpenOptions::new()
        .access_mode(FILE_READ_ATTRIBUTES | FILE_WRITE_ATTRIBUTES)
        .custom_flags(FILE_FLAG_BACKUP_SEMANTICS)
        .open(&directory)
        .unwrap();
    let info = FILE_CASE_SENSITIVE_INFO { Flags: 1 }; // FILE_CS_FLAG_CASE_SENSITIVE_DIR
                                                      // Only this empty disposable directory is changed; never alter host policy.
    assert_ne!(
        unsafe {
            SetFileInformationByHandle(
                handle.as_raw_handle(),
                FileCaseSensitiveInfo,
                (&info as *const FILE_CASE_SENSITIVE_INFO).cast(),
                std::mem::size_of_val(&info) as u32,
            )
        },
        0,
        "Case-sensitive fixture unavailable: {}",
        std::io::Error::last_os_error()
    );
    drop(handle);
    fs::write(directory.join("Read.md"), b"upper").unwrap();
    fs::write(directory.join("read.md"), b"lower").unwrap();
    let root = open_selected(&directory, true).unwrap();
    let upper = open_relative(&root, &["Read.md".into()], false).unwrap();
    let lower = open_relative(&root, &["read.md".into()], false).unwrap();
    assert_ne!(identity(&upper).unwrap(), identity(&lower).unwrap());
    assert_eq!(document::bounded_bytes(&upper, 100).unwrap(), b"upper");
    assert_eq!(document::bounded_bytes(&lower, 100).unwrap(), b"lower");
    assert_eq!(
        read_snapshot_entries(&root, || false)
            .unwrap()
            .iter()
            .map(|entry| entry.name.as_str())
            .collect::<Vec<_>>(),
        ["Read.md", "read.md"]
    );
}

#[test]
#[ignore = "subprocess driver; executed explicitly by private_locks_serialize_processes_and_release_after_exit"]
fn storage_lock_child() {
    let path =
        PathBuf::from(std::env::var_os("F007W_LOCK_FIXTURE").expect("parent fixture required"));
    assert_eq!(path.file_name().unwrap(), "fixture.lock");
    let dir = path.parent().unwrap();
    assert!(dir
        .file_name()
        .unwrap()
        .to_string_lossy()
        .starts_with("md-windows-native-"));
    assert_eq!(
        dir.parent().unwrap().canonicalize().unwrap(),
        std::env::temp_dir().canonicalize().unwrap()
    );
    let lock = platform::storage::lock_private(&path, "recovery_error", "recovery_permissions");
    match std::env::var("F007W_LOCK_MODE").unwrap().as_str() {
        "contended" => {
            assert!(lock.is_err());
            println!("LOCK_CONTENDED");
        }
        "exit" => {
            let _guard = lock.unwrap();
            println!("LOCK_ACK");
            std::io::stdout().flush().unwrap();
            // Kill only this disposable test child, without Rust destructors.
            unsafe { windows_sys::Win32::System::Threading::ExitProcess(73) }
        }
        _ => panic!("Unknown child fixture mode"),
    }
}

#[test]
fn private_locks_serialize_processes_and_release_after_exit() {
    let fixture = Fixture::new();
    let path = fixture.0.join("fixture.lock");
    let child = |mode: &str| {
        std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "storage_lock_child", "--ignored", "--nocapture"])
            .env("F007W_LOCK_FIXTURE", &path)
            .env("F007W_LOCK_MODE", mode)
            .output()
            .unwrap()
    };
    let guard =
        platform::storage::lock_private(&path, "recovery_error", "recovery_permissions").unwrap();
    let result = child("contended");
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert!(String::from_utf8_lossy(&result.stdout).contains("LOCK_CONTENDED"));
    drop(guard);
    let result = child("exit");
    assert_eq!(result.status.code(), Some(73));
    assert!(String::from_utf8_lossy(&result.stdout).contains("LOCK_ACK"));
    let _released =
        platform::storage::lock_private(&path, "recovery_error", "recovery_permissions").unwrap();
}
