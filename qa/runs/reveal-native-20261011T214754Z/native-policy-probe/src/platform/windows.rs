//! Windows 11/local NTFS prototype. Native execution is required before support claims.
//! Every descendant is opened from its parent handle; strings never establish containment.
use super::{windows_path, FileStamp};
use crate::scope::{
    excluded, image_format, io_error, markdown_name, validate_segment, AppError, AppResult,
    DirectoryPage, Entry, Identity,
};
use std::{
    fs::File,
    io,
    mem::{size_of, zeroed},
    os::windows::io::{AsRawHandle, FromRawHandle},
    path::Path,
};
use windows_sys::Wdk::Foundation::OBJECT_ATTRIBUTES;
use windows_sys::Wdk::Storage::FileSystem::{
    FileFsDeviceInformation, FileRenameInformation, FileRenameInformationEx, NtCreateFile,
    NtQueryVolumeInformationFile, NtSetInformationFile, FILE_CREATE, FILE_DIRECTORY_FILE,
    FILE_OPEN, FILE_OPEN_NO_RECALL, FILE_OPEN_REPARSE_POINT, FILE_RENAME_INFORMATION,
    FILE_RENAME_POSIX_SEMANTICS, FILE_RENAME_REPLACE_IF_EXISTS, FILE_SYNCHRONOUS_IO_NONALERT,
};
use windows_sys::Win32::Foundation::{
    RtlNtStatusToDosError, ERROR_NO_MORE_FILES, HANDLE, OBJ_CASE_INSENSITIVE, OBJ_DONT_REPARSE, UNICODE_STRING,
};
use windows_sys::Win32::Storage::FileSystem::*;
use windows_sys::Win32::System::IO::IO_STATUS_BLOCK;

// FILE_FS_DEVICE_INFORMATION is two ULONGs in ntifs.h. The binding places this
// small record behind unrelated Wdk_System_SystemServices; keep the ABI here
// instead of enabling that service surface for a filesystem metadata query.
#[repr(C)]
struct FsDeviceInformation {
    device_type: u32,
    characteristics: u32,
}

pub(super) fn nt_error(status: i32) -> AppError {
    let win = unsafe { RtlNtStatusToDosError(status) };
    let mut error = io_error(io::Error::from_raw_os_error(win as i32));
    if status as u32 == 0xC000050B || status as u32 == 0xC0000279 {
        error.code = "unsupported_type"; // reparse encountered / tag unresolved
    }
    error.message = format!(
        "Windows native access failed (NTSTATUS 0x{:08x}, Win32 {win})",
        status as u32
    );
    error
}
pub(super) fn native_open(
    parent: HANDLE,
    name: &str,
    access: u32,
    disposition: u32,
    attrs: u32,
    security: *const windows_sys::Win32::Security::SECURITY_DESCRIPTOR,
) -> AppResult<File> {
    native_open_options(parent, name, access, disposition, attrs, security, 0)
}
pub(super) fn native_open_options(
    parent: HANDLE,
    name: &str,
    access: u32,
    disposition: u32,
    attrs: u32,
    security: *const windows_sys::Win32::Security::SECURITY_DESCRIPTOR,
    options: u32,
) -> AppResult<File> {
    native_open_with_share(
        parent,
        name,
        access,
        disposition,
        attrs,
        security,
        options,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
    )
}
pub(super) fn native_open_with_share(
    parent: HANDLE,
    name: &str,
    access: u32,
    disposition: u32,
    attrs: u32,
    security: *const windows_sys::Win32::Security::SECURITY_DESCRIPTOR,
    options: u32,
    share: u32,
) -> AppResult<File> {
    let mut wide: Vec<u16> = name.encode_utf16().collect();
    if wide.len() > 32766 || wide.contains(&0) {
        return Err(AppError::new("invalid_path", "Invalid native path length"));
    }
    let string = UNICODE_STRING {
        Length: (wide.len() * 2) as u16,
        MaximumLength: (wide.len() * 2) as u16,
        Buffer: wide.as_mut_ptr(),
    };
    let object = OBJECT_ATTRIBUTES {
        Length: size_of::<OBJECT_ATTRIBUTES>() as u32,
        RootDirectory: parent,
        ObjectName: &string,
        // Exclusive creation uses Windows filename equivalence even if a
        // case-sensitive directory is selected. Existing traversal is unchanged.
        Attributes: OBJ_DONT_REPARSE | if disposition == FILE_CREATE { OBJ_CASE_INSENSITIVE } else { 0 },
        SecurityDescriptor: security,
        SecurityQualityOfService: std::ptr::null(),
    };
    let mut handle = std::ptr::null_mut();
    let mut status: IO_STATUS_BLOCK = unsafe { zeroed() };
    // NT rejects DIRECTORY_FILE combined with OPEN_NO_RECALL. Only exclusive
    // directory creation omits no-recall: FILE_CREATE cannot open an existing
    // object, even if one appears after the caller's metadata probe. Existing
    // directories are always opened without DIRECTORY_FILE and with no-recall.
    let recall = if disposition == FILE_CREATE && options & FILE_DIRECTORY_FILE != 0 {
        0
    } else {
        FILE_OPEN_NO_RECALL
    };
    let code = unsafe {
        NtCreateFile(
            &mut handle,
            access | 0x00100000,
            &object,
            &mut status,
            std::ptr::null(),
            attrs,
            share,
            disposition,
            FILE_SYNCHRONOUS_IO_NONALERT | FILE_OPEN_REPARSE_POINT | recall | options,
            std::ptr::null(),
            0,
        )
    };
    if code < 0 {
        return Err(nt_error(code));
    }
    // NtCreateFile was synchronous; File now owns exactly this non-inheritable handle.
    Ok(unsafe { File::from_raw_handle(handle) })
}
pub(super) fn info<T>(file: &File, class: FILE_INFO_BY_HANDLE_CLASS) -> AppResult<T> {
    let mut out: T = unsafe { zeroed() };
    if unsafe {
        GetFileInformationByHandleEx(
            file.as_raw_handle(),
            class,
            (&mut out as *mut T).cast(),
            size_of::<T>() as u32,
        )
    } == 0
    {
        return Err(io_error(io::Error::last_os_error()));
    }
    Ok(out)
}
pub(super) fn rename_file(
    file: &File,
    parent: &File,
    target: &str,
    replace: bool,
) -> AppResult<()> {
    rename_with_flags(file, parent, target, replace as u32, FileRenameInformation)
}
pub(super) fn rename_document(
    file: &File,
    parent: &File,
    target: &str,
    replace: bool,
) -> AppResult<()> {
    // Document grants retain readable handles to the old version. Ex semantics
    // permit those handles; the commit guard still requests DELETE and denies
    // concurrent write opens. No ignore-readonly/access-check-bypass flags.
    let flags = if replace {
        FILE_RENAME_REPLACE_IF_EXISTS | FILE_RENAME_POSIX_SEMANTICS
    } else {
        0
    };
    rename_with_flags(file, parent, target, flags, FileRenameInformationEx)
}
fn rename_with_flags(
    file: &File,
    parent: &File,
    target: &str,
    flags: u32,
    class: windows_sys::Wdk::Storage::FileSystem::FILE_INFORMATION_CLASS,
) -> AppResult<()> {
    checked(file, false)?;
    checked(parent, true)?;
    validate_segment(target)?;
    // Win32 FileRenameInfo rejects a held-parent relative name (native error 87).
    // The NT setter retains that anchor and normal sharing restrictions. It is
    // namespace replacement, not compare-and-swap against external writers.
    let wide: Vec<u16> = target.encode_utf16().chain(Some(0)).collect();
    let length = size_of::<FILE_RENAME_INFORMATION>() + wide.len() * 2;
    let mut buffer = vec![0u64; length.div_ceil(8)];
    let rename = buffer.as_mut_ptr().cast::<FILE_RENAME_INFORMATION>();
    unsafe {
        (*rename).Anonymous.Flags = flags;
        (*rename).RootDirectory = parent.as_raw_handle();
        (*rename).FileNameLength = ((wide.len() - 1) * 2) as u32;
        std::ptr::copy_nonoverlapping(wide.as_ptr(), (*rename).FileName.as_mut_ptr(), wide.len());
    }
    let mut status: IO_STATUS_BLOCK = unsafe { zeroed() };
    let code = unsafe {
        NtSetInformationFile(
            file.as_raw_handle(),
            &mut status,
            rename.cast(),
            length as u32,
            class,
        )
    };
    if code < 0 {
        return Err(nt_error(code));
    }
    Ok(())
}
pub(super) fn checked(file: &File, directory: bool) -> AppResult<()> {
    let tag: FILE_ATTRIBUTE_TAG_INFO = info(file, FileAttributeTagInfo)?;
    let recall = FILE_ATTRIBUTE_OFFLINE
        | FILE_ATTRIBUTE_RECALL_ON_OPEN
        | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS;
    if tag.FileAttributes & recall != 0 {
        return Err(AppError::new(
            "cloud_placeholder",
            "Cloud content requiring recall is unavailable",
        ));
    }
    if tag.FileAttributes & FILE_ATTRIBUTE_REPARSE_POINT != 0 || tag.ReparseTag != 0 {
        return Err(AppError::new(
            "unsupported_type",
            "Windows reparse points are unavailable",
        ));
    }
    let standard: FILE_STANDARD_INFO = info(file, FileStandardInfo)?;
    if standard.Directory != directory || standard.DeletePending {
        return Err(AppError::new(
            "unsupported_type",
            "Expected a regular file or directory",
        ));
    }
    let mut status: IO_STATUS_BLOCK = unsafe { zeroed() };
    let mut device: FsDeviceInformation = unsafe { zeroed() };
    let code = unsafe {
        NtQueryVolumeInformationFile(
            file.as_raw_handle(),
            &mut status,
            (&mut device as *mut FsDeviceInformation).cast(),
            size_of::<FsDeviceInformation>() as u32,
            FileFsDeviceInformation,
        )
    };
    if code < 0 {
        return Err(nt_error(code));
    }
    // FILE_DEVICE_DISK (7), FILE_REMOTE_DEVICE (0x10). Unknown devices fail closed.
    if !matches!(device.device_type, 7 | 8) || device.characteristics & 0x10 != 0 {
        return Err(AppError::new(
            "unsupported_mount",
            "Only local NTFS disks are supported",
        ));
    }
    let mut fsname = [0u16; 32];
    if unsafe {
        GetVolumeInformationByHandleW(
            file.as_raw_handle(),
            std::ptr::null_mut(),
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            fsname.as_mut_ptr(),
            fsname.len() as u32,
        )
    } == 0
    {
        return Err(io_error(io::Error::last_os_error()));
    }
    if String::from_utf16_lossy(
        &fsname[..fsname.iter().position(|&c| c == 0).unwrap_or(fsname.len())],
    ) != "NTFS"
    {
        return Err(AppError::new(
            "unsupported_mount",
            "Only local NTFS disks are supported",
        ));
    }
    Ok(())
}
fn open_child(parent: HANDLE, name: &str, directory: bool) -> AppResult<File> {
    let probe = native_open(
        parent,
        name,
        FILE_READ_ATTRIBUTES | 0x00020000,
        FILE_OPEN,
        0,
        std::ptr::null(),
    )?;
    checked(&probe, directory)?;
    let file = native_open(
        parent,
        name,
        FILE_READ_ATTRIBUTES | FILE_READ_DATA | 0x00020000,
        FILE_OPEN,
        0,
        std::ptr::null(),
    )?;
    checked(&file, directory)?;
    if identity(&probe)? != identity(&file)? {
        return Err(AppError::new(
            "reselection_required",
            "Selected object changed during access",
        ));
    }
    Ok(file)
}
pub fn open_selected(path: &Path, directory: bool) -> AppResult<File> {
    let text = path
        .to_str()
        .ok_or_else(|| AppError::new("invalid_path", "Path is not valid Unicode"))?;
    let (drive, names) = windows_path::selected(text)?;
    // Only the drive root is opened by Win32 name. There are no filesystem
    // ancestors here; OBJ_DONT_REPARSE would also reject the DOS drive's object-
    // manager alias. Every filesystem component below it uses a relative NT open.
    let wide: Vec<u16> = format!("\\\\?\\{drive}")
        .encode_utf16()
        .chain(Some(0))
        .collect();
    let handle = unsafe {
        CreateFileW(
            wide.as_ptr(),
            FILE_READ_ATTRIBUTES | FILE_LIST_DIRECTORY | 0x00020000,
            FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
            std::ptr::null(),
            OPEN_EXISTING,
            FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT | FILE_FLAG_OPEN_NO_RECALL,
            std::ptr::null_mut(),
        )
    };
    if handle == windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE {
        return Err(io_error(io::Error::last_os_error()));
    }
    let volume = unsafe { File::from_raw_handle(handle) };
    checked(&volume, true)?;
    if names.is_empty() && !directory {
        return Err(AppError::new("unsupported_type", "Select a file"));
    }
    open_relative(&volume, &names, directory)
}
pub fn open_relative(root: &File, names: &[String], directory: bool) -> AppResult<File> {
    checked(root, true)?;
    if names.len() > 128 {
        return Err(AppError::new("invalid_path", "Path is too deep"));
    }
    if names.is_empty() {
        return if directory {
            root.try_clone().map_err(io_error)
        } else {
            Err(AppError::new("invalid_path", "A file path is required"))
        };
    }
    let mut parent = root.try_clone().map_err(io_error)?;
    for (i, name) in names.iter().enumerate() {
        validate_segment(name)?;
        parent = open_child(
            parent.as_raw_handle(),
            name,
            i + 1 < names.len() || directory,
        )?;
    }
    Ok(parent)
}
pub fn identity(file: &File) -> AppResult<Identity> {
    let value: FILE_ID_INFO = info(file, FileIdInfo)?;
    if value.FileId.Identifier[8..].iter().any(|&b| b != 0) {
        return Err(AppError::new(
            "unsupported_mount",
            "This filesystem identity cannot be represented safely",
        ));
    }
    Ok(Identity {
        device: value.VolumeSerialNumber,
        inode: u64::from_le_bytes(value.FileId.Identifier[..8].try_into().unwrap()),
    })
}

pub fn size(file: &File) -> AppResult<u64> {
    Ok(file.metadata().map_err(io_error)?.len())
}
pub(crate) fn stamp(file: &File) -> AppResult<FileStamp> {
    let id = identity(file)?;
    let basic: FILE_BASIC_INFO = info(file, FileBasicInfo)?;
    Ok(FileStamp {
        device: id.device,
        inode: id.inode,
        length: size(file)?,
        modified_seconds: basic.LastWriteTime,
        modified_nanos: 0,
        changed_seconds: basic.ChangeTime,
        changed_nanos: 0,
    })
}
fn entries(
    dir: &File,
    cancelled: impl Fn() -> bool,
    apply_exclusions: bool,
) -> AppResult<Vec<Entry>> {
    checked(dir, true)?;
    // An empty NT relative name reopens the held directory itself with an
    // independent cursor. "." is rejected by NT; no pathname is reconstructed.
    let scan = open_child(dir.as_raw_handle(), "", true)?;
    let mut buffer = vec![0u64; 8192]; // 64 KiB, aligned for FILE_FULL_DIR_INFO
    let mut result = Vec::new();
    let mut seen = 0;
    loop {
        if cancelled() {
            return Err(AppError::new("cancelled", "Directory listing cancelled"));
        }
        if unsafe {
            GetFileInformationByHandleEx(
                scan.as_raw_handle(),
                FileFullDirectoryInfo,
                buffer.as_mut_ptr().cast(),
                (buffer.len() * 8) as u32,
            )
        } == 0
        {
            let error = io::Error::last_os_error();
            if error.raw_os_error() == Some(ERROR_NO_MORE_FILES as i32) {
                break;
            }
            return Err(io_error(error));
        }
        let bytes =
            unsafe { std::slice::from_raw_parts(buffer.as_ptr().cast::<u8>(), buffer.len() * 8) };
        let mut offset = 0;
        loop {
            if cancelled() {
                return Err(AppError::new("cancelled", "Directory listing cancelled"));
            }
            let header = std::mem::offset_of!(FILE_FULL_DIR_INFO, FileName);
            if offset + size_of::<FILE_FULL_DIR_INFO>() > bytes.len() {
                return Err(AppError::new("io_error", "Invalid directory record"));
            }
            let record = unsafe { &*(bytes.as_ptr().add(offset).cast::<FILE_FULL_DIR_INFO>()) };
            let length = record.FileNameLength as usize;
            if length % 2 != 0 || offset + header + length > bytes.len() {
                return Err(AppError::new("io_error", "Invalid directory name"));
            }
            seen += 1;
            if seen > 100_002 {
                return Err(AppError::new(
                    "directory_limit",
                    "Directory exceeds the snapshot limit",
                ));
            }
            let wide = unsafe {
                std::slice::from_raw_parts(
                    bytes.as_ptr().add(offset + header).cast::<u16>(),
                    length / 2,
                )
            };
            if let Ok(name) = String::from_utf16(wide) {
                if name != "." && name != ".." && !(apply_exclusions && excluded(&name)) {
                    let unsafe_attrs = FILE_ATTRIBUTE_REPARSE_POINT
                        | FILE_ATTRIBUTE_OFFLINE
                        | FILE_ATTRIBUTE_RECALL_ON_OPEN
                        | FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS;
                    let kind = if record.FileAttributes & unsafe_attrs != 0
                        || windows_path::segment(&name).is_err()
                    {
                        "other"
                    } else if record.FileAttributes & FILE_ATTRIBUTE_DIRECTORY != 0 {
                        "directory"
                    } else if markdown_name(&name) {
                        "markdown"
                    } else if crate::scope::html_name(&name) {
                        "html"
                    } else if image_format(&name).is_some() {
                        "image"
                    } else {
                        "other"
                    };
                    result.push(Entry { name, kind });
                }
            }
            if record.NextEntryOffset == 0 {
                break;
            }
            let step = record.NextEntryOffset as usize;
            if step < header + length || step % 8 != 0 || offset + step >= bytes.len() {
                return Err(AppError::new("io_error", "Invalid directory offset"));
            }
            offset += step;
        }
    }
    result.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(result)
}
pub fn read_snapshot_entries(dir: &File, cancelled: impl Fn() -> bool) -> AppResult<Vec<Entry>> {
    entries(dir, cancelled, true)
}
pub(crate) fn read_search_entries(
    dir: &File,
    cancelled: impl Fn() -> bool,
) -> AppResult<Vec<Entry>> {
    entries(dir, cancelled, false)
}
pub fn read_page(
    dir: &File,
    offset: usize,
    limit: usize,
    cancelled: impl Fn() -> bool,
) -> AppResult<DirectoryPage> {
    let entries = entries(dir, cancelled, true)?;
    if offset > entries.len() {
        return Err(AppError::new("version_changed", "Directory offset expired"));
    }
    let end = offset
        .saturating_add(limit.clamp(1, 250))
        .min(entries.len());
    Ok(DirectoryPage {
        entries: entries[offset..end].to_vec(),
        next_offset: (end < entries.len()).then_some(end),
        snapshot_id: String::new(),
    })
}
