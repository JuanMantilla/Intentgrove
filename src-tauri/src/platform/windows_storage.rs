//! Protected current-user NTFS records. Native locking/restart/durability remain unverified.
use super::*;
use crate::platform::windows::{checked, native_open, native_open_options, native_open_with_share};
use crate::scope::{identity, open_selected};
use std::{
    io::{Read, Write},
    mem::{size_of, zeroed},
    os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle},
    ptr,
};
use windows_sys::Wdk::Storage::FileSystem::{
    FILE_CREATE, FILE_DIRECTORY_FILE, FILE_OPEN, FILE_OPEN_IF, FILE_WRITE_THROUGH,
};
use windows_sys::Win32::{
    Foundation::*,
    Security::{Authorization::*, *},
    Storage::FileSystem::*,
    System::{Threading::*, IO::OVERLAPPED},
};

struct LocalAllocation(*mut std::ffi::c_void);
impl Drop for LocalAllocation {
    fn drop(&mut self) {
        if !self.0.is_null() {
            unsafe {
                LocalFree(self.0);
            }
        }
    }
}
fn user_sid() -> AppResult<Vec<u8>> {
    let mut token = ptr::null_mut();
    if unsafe { OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let token = unsafe { OwnedHandle::from_raw_handle(token) };
    let mut length = 0;
    unsafe {
        GetTokenInformation(
            token.as_raw_handle(),
            TokenUser,
            ptr::null_mut(),
            0,
            &mut length,
        );
    }
    if length == 0 || length > 65536 {
        return Err(AppError::new(
            "recovery_permissions",
            "Could not inspect current user",
        ));
    }
    let mut storage = vec![0usize; (length as usize).div_ceil(size_of::<usize>())];
    if unsafe {
        GetTokenInformation(
            token.as_raw_handle(),
            TokenUser,
            storage.as_mut_ptr().cast(),
            length,
            &mut length,
        )
    } == 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let user = unsafe { &*(storage.as_ptr().cast::<TOKEN_USER>()) };
    let length = unsafe { GetLengthSid(user.User.Sid) } as usize;
    Ok(unsafe { std::slice::from_raw_parts(user.User.Sid.cast::<u8>(), length) }.to_vec())
}
fn descriptor() -> AppResult<LocalAllocation> {
    let sid = user_sid()?;
    let mut sid_text = ptr::null_mut();
    if unsafe { ConvertSidToStringSidW(sid.as_ptr().cast_mut().cast(), &mut sid_text) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let _sid_text = LocalAllocation(sid_text.cast());
    let mut len = 0;
    while unsafe { *sid_text.add(len) } != 0 {
        len += 1;
    }
    let sid_text = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(sid_text, len) });
    let sddl: Vec<u16> = format!("O:{sid_text}D:P(A;OICI;FA;;;{sid_text})")
        .encode_utf16()
        .chain(Some(0))
        .collect();
    let mut sd = ptr::null_mut();
    if unsafe {
        ConvertStringSecurityDescriptorToSecurityDescriptorW(
            sddl.as_ptr(),
            SDDL_REVISION_1,
            &mut sd,
            ptr::null_mut(),
        )
    } == 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    Ok(LocalAllocation(sd))
}
fn verify_private(file: &File, directory: bool) -> AppResult<()> {
    checked(file, directory)?;
    let sid = user_sid()?;
    let mut owner = ptr::null_mut();
    let mut acl = ptr::null_mut();
    let mut sd = ptr::null_mut();
    let result = unsafe {
        GetSecurityInfo(
            file.as_raw_handle(),
            SE_FILE_OBJECT,
            OWNER_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
            &mut owner,
            ptr::null_mut(),
            &mut acl,
            ptr::null_mut(),
            &mut sd,
        )
    };
    if result != 0 {
        return Err(io_error(std::io::Error::from_raw_os_error(result as i32)));
    }
    let _sd = LocalAllocation(sd);
    if owner.is_null()
        || acl.is_null()
        || unsafe { EqualSid(owner, sid.as_ptr().cast_mut().cast()) } == 0
    {
        return Err(AppError::new(
            "recovery_permissions",
            "Private records must be owned by this user with a restricted DACL",
        ));
    }
    let mut control = 0;
    let mut revision = 0;
    if unsafe { GetSecurityDescriptorControl(sd, &mut control, &mut revision) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    // File ACEs may inherit only from a protected current-user parent. Directories
    // created here are always protected; no existing broad DACL is silently repaired.
    if directory && control & SE_DACL_PROTECTED == 0 {
        return Err(AppError::new(
            "recovery_permissions",
            "Private directory DACL is not protected",
        ));
    }
    let mut details: ACL_SIZE_INFORMATION = unsafe { zeroed() };
    if unsafe {
        GetAclInformation(
            acl,
            (&mut details as *mut ACL_SIZE_INFORMATION).cast(),
            size_of::<ACL_SIZE_INFORMATION>() as u32,
            AclSizeInformation,
        )
    } == 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    if details.AceCount == 0 {
        return Err(AppError::new(
            "recovery_permissions",
            "Private DACL has no current-user grant",
        ));
    }
    for i in 0..details.AceCount {
        let mut ace = ptr::null_mut();
        if unsafe { GetAce(acl, i, &mut ace) } == 0 {
            return Err(io_error(std::io::Error::last_os_error()));
        }
        let header = unsafe { &*(ace.cast::<ACE_HEADER>()) };
        let sid_offset = std::mem::offset_of!(ACCESS_ALLOWED_ACE, SidStart);
        if header.AceType != ACCESS_ALLOWED_ACE_TYPE as u8
            || (header.AceSize as usize) < sid_offset + 8
            || header.AceFlags & INHERIT_ONLY_ACE as u8 != 0
        {
            return Err(AppError::new(
                "recovery_permissions",
                "Private DACL has an unsupported ACE",
            ));
        }
        let allowed = unsafe { &*(ace.cast::<ACCESS_ALLOWED_ACE>()) };
        let ace_sid = (&allowed.SidStart as *const u32).cast_mut().cast();
        if unsafe { IsValidSid(ace_sid) } == 0
            || unsafe { GetLengthSid(ace_sid) } as usize > header.AceSize as usize - sid_offset
            || unsafe { EqualSid(ace_sid, sid.as_ptr().cast_mut().cast()) } == 0
            || allowed.Mask & FILE_ALL_ACCESS != FILE_ALL_ACCESS
        {
            return Err(AppError::new(
                "recovery_permissions",
                "Private DACL grants unexpected access",
            ));
        }
    }
    Ok(())
}
fn parent_name(path: &Path) -> AppResult<(File, String)> {
    let parent = open_selected(
        path.parent()
            .ok_or_else(|| AppError::new("invalid_path", "Private parent is missing"))?,
        true,
    )?;
    verify_private(&parent, true)?;
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| AppError::new("invalid_path", "Private name is invalid"))?
        .to_owned();
    crate::scope::validate_segment(&name)?;
    Ok((parent, name))
}
pub(crate) fn ensure_private_dir(path: &Path) -> AppResult<()> {
    let parent = open_selected(
        path.parent()
            .ok_or_else(|| AppError::new("invalid_path", "Storage parent missing"))?,
        true,
    )?;
    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| AppError::new("invalid_path", "Invalid storage name"))?;
    crate::scope::validate_segment(name)?;
    let sd = descriptor()?;
    let file = native_open_options(
        parent.as_raw_handle(),
        name,
        FILE_READ_ATTRIBUTES | 0x00020000,
        FILE_OPEN_IF,
        FILE_ATTRIBUTE_DIRECTORY,
        sd.0.cast(),
        FILE_DIRECTORY_FILE,
    )?;
    verify_private(&file, true)
}
pub(crate) fn create_private_file(path: &Path) -> AppResult<File> {
    let (parent, name) = parent_name(path)?;
    let sd = descriptor()?;
    let file = native_open_options(
        parent.as_raw_handle(),
        &name,
        FILE_READ_DATA | FILE_WRITE_DATA | FILE_READ_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_CREATE,
        FILE_ATTRIBUTE_NORMAL,
        sd.0.cast(),
        FILE_WRITE_THROUGH,
    )?;
    verify_private_file(&file)?;
    Ok(file)
}
pub(crate) fn verify_private_file(file: &File) -> AppResult<()> {
    verify_private(file, false)
}
pub(crate) fn lock_private(
    path: &Path,
    code: &'static str,
    permission_code: &'static str,
) -> AppResult<StorageLock> {
    let (parent, name) = parent_name(path)?;
    let sd = descriptor()?;
    let file = native_open_with_share(
        parent.as_raw_handle(),
        &name,
        FILE_GENERIC_READ | FILE_GENERIC_WRITE,
        FILE_OPEN_IF,
        FILE_ATTRIBUTE_NORMAL,
        sd.0.cast(),
        0,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
    )?;
    verify_private_file(&file).map_err(|e| AppError::new(permission_code, e.message))?;
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(2);
    loop {
        let mut ov: OVERLAPPED = unsafe { zeroed() };
        if unsafe {
            LockFileEx(
                file.as_raw_handle(),
                LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY,
                0,
                u32::MAX,
                u32::MAX,
                &mut ov,
            )
        } != 0
        {
            break;
        }
        let error = std::io::Error::last_os_error();
        if error.raw_os_error() != Some(ERROR_LOCK_VIOLATION as i32)
            || std::time::Instant::now() >= deadline
        {
            return Err(AppError::new(
                code,
                format!("Private storage is busy: {error}"),
            ));
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    }
    Ok(StorageLock { file })
}
pub(crate) fn sync_private_directory(dir: &Path) -> AppResult<()> {
    // Windows has no Unix directory-fsync guarantee. Publication below flushes
    // the file handle before/after rename; this verifies the private directory.
    let file = open_selected(dir, true)?;
    verify_private(&file, true)
}
pub(crate) fn publish_private(from: &Path, to: &Path) -> AppResult<()> {
    if from.parent() != to.parent() {
        return Err(AppError::new(
            "invalid_path",
            "Private publication must stay in one directory",
        ));
    }
    let (parent, name) = parent_name(from)?;
    let target = to
        .file_name()
        .and_then(|s| s.to_str())
        .ok_or_else(|| AppError::new("invalid_path", "Invalid record name"))?;
    crate::scope::validate_segment(target)?;
    let file = native_open(
        parent.as_raw_handle(),
        &name,
        FILE_READ_DATA | FILE_WRITE_DATA | FILE_READ_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_OPEN,
        0,
        ptr::null(),
    )?;
    verify_private_file(&file)?;
    file.sync_all().map_err(io_error)?;
    let id = identity(&file)?;
    let wide: Vec<u16> = target.encode_utf16().chain(Some(0)).collect();
    let header = std::mem::offset_of!(FILE_RENAME_INFO, FileName);
    let length = header + wide.len() * 2;
    let mut buffer = vec![
        0u64;
        length
            .div_ceil(8)
            .max(size_of::<FILE_RENAME_INFO>().div_ceil(8))
    ];
    let info = buffer.as_mut_ptr().cast::<FILE_RENAME_INFO>();
    unsafe {
        (*info).Anonymous.ReplaceIfExists = 1;
        (*info).RootDirectory = parent.as_raw_handle();
        (*info).FileNameLength = ((wide.len() - 1) * 2) as u32;
        ptr::copy_nonoverlapping(wide.as_ptr(), (*info).FileName.as_mut_ptr(), wide.len());
    }
    if unsafe {
        SetFileInformationByHandle(
            file.as_raw_handle(),
            FileRenameInfo,
            info.cast(),
            length as u32,
        )
    } == 0
    {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let verify = (|| {
        file.sync_all().map_err(io_error)?;
        let current = crate::scope::open_relative(&parent, &[target.to_owned()], false)?;
        if identity(&current)? != id {
            return Err(AppError::new(
                "recovery_error",
                "Record changed after publication",
            ));
        }
        verify_private_file(&current)
    })();
    verify.map_err(|e| {
        AppError::new(
            "recovery_error",
            format!(
                "Private publication occurred; verification uncertain: {}",
                e.message
            ),
        )
    })
}
pub(crate) fn preserve_previous(from: &Path, to: &Path) -> AppResult<()> {
    let input = open_selected(from, false)?;
    verify_private_file(&input)?;
    let mut bytes = Vec::new();
    input
        .take(32 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(io_error)?;
    if bytes.len() > 32 * 1024 * 1024 {
        return Err(AppError::new(
            "recovery_size",
            "Private checkpoint is too large",
        ));
    }
    let mut output = create_private_file(to)?;
    output
        .write_all(&bytes)
        .and_then(|_| output.sync_all())
        .map_err(io_error)
}

pub(crate) fn remove_private_file(path: &Path) -> std::io::Result<()> {
    fn as_io(error: AppError) -> std::io::Error {
        let kind = match error.code {
            "missing" => std::io::ErrorKind::NotFound,
            "denied" | "recovery_permissions" => std::io::ErrorKind::PermissionDenied,
            _ => std::io::ErrorKind::Other,
        };
        std::io::Error::new(kind, error.message)
    }
    let (parent, name) = parent_name(path).map_err(as_io)?;
    let file = native_open(
        parent.as_raw_handle(),
        &name,
        FILE_READ_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_OPEN,
        0,
        ptr::null(),
    )
    .map_err(as_io)?;
    verify_private_file(&file).map_err(as_io)?;
    let info = FILE_DISPOSITION_INFO { DeleteFile: 1 };
    if unsafe {
        SetFileInformationByHandle(
            file.as_raw_handle(),
            FileDispositionInfo,
            (&info as *const FILE_DISPOSITION_INFO).cast(),
            size_of::<FILE_DISPOSITION_INFO>() as u32,
        )
    } == 0
    {
        return Err(std::io::Error::last_os_error());
    }
    // Deletion applies to the opened object when this owned handle closes.
    Ok(())
}
