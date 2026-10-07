//! Same-directory Windows document stages. Editing stays gated in platform/mod.rs.
//! Namespace replacement is not CAS; editing.rs owns version checks and safety copies.
use super::{storage, windows::{checked, info, native_open_with_share, rename_document}};
use crate::scope::{identity, io_error, open_relative, validate_segment, AppError, AppResult};
use std::{fs::File, io::Write, mem::{offset_of, size_of}, os::windows::io::AsRawHandle, ptr};
use windows_sys::{Wdk::Storage::FileSystem::{FILE_CREATE, FILE_OPEN, FILE_WRITE_THROUGH},
    Win32::{Security::{Authorization::{GetSecurityInfo, SE_FILE_OBJECT}, *}, Storage::FileSystem::*}};

/// The exclusive file is released after the commit point, before shared policy
/// verifies the published name. Cleanup retains ownership only before commit.
pub(crate) struct DocumentStage(std::cell::RefCell<Option<File>>);

struct Security {
    allocation: storage::LocalAllocation,
    owner: Vec<u8>,
    group: Vec<u8>,
    acl: Vec<u8>,
    protected: bool,
}
fn sid_bytes(sid: *mut std::ffi::c_void) -> AppResult<Vec<u8>> {
    if sid.is_null() || unsafe { IsValidSid(sid) } == 0 {
        return Err(AppError::new("unsupported_type", "Document ownership cannot be preserved"));
    }
    let length = unsafe { GetLengthSid(sid) } as usize;
    if !(8..=68).contains(&length) {
        return Err(AppError::new("unsupported_type", "Document ownership is invalid"));
    }
    Ok(unsafe { std::slice::from_raw_parts(sid.cast::<u8>(), length) }.to_vec())
}
fn security(file: &File) -> AppResult<Security> {
    let (mut owner, mut group, mut acl, mut descriptor) = (ptr::null_mut(), ptr::null_mut(), ptr::null_mut(), ptr::null_mut());
    let result = unsafe { GetSecurityInfo(file.as_raw_handle(), SE_FILE_OBJECT,
        OWNER_SECURITY_INFORMATION | GROUP_SECURITY_INFORMATION | DACL_SECURITY_INFORMATION,
        &mut owner, &mut group, &mut acl, ptr::null_mut(), &mut descriptor) };
    if result != 0 { return Err(io_error(std::io::Error::from_raw_os_error(result as i32))); }
    let allocation = storage::LocalAllocation(descriptor);
    if acl.is_null() || unsafe { IsValidAcl(acl) } == 0 {
        return Err(AppError::new("unsupported_type", "Document DACL cannot be preserved"));
    }
    let owner = sid_bytes(owner)?;
    let group = sid_bytes(group)?;
    let length = unsafe { (*acl).AclSize } as usize;
    if length < size_of::<ACL>() { return Err(AppError::new("unsupported_type", "Invalid document DACL")); }
    let acl = unsafe { std::slice::from_raw_parts(acl.cast::<u8>(), length) }.to_vec();
    let (mut control, mut revision) = (0u16, 0u32);
    if unsafe { GetSecurityDescriptorControl(descriptor, &mut control, &mut revision) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    Ok(Security { allocation, owner, group, acl, protected: u32::from(control) & u32::from(SE_DACL_PROTECTED) != 0 })
}
fn same_security(left: &Security, right: &Security) -> bool {
    left.owner == right.owner && left.group == right.group && left.acl == right.acl && left.protected == right.protected
}
fn document_metadata(file: &File) -> AppResult<(FILE_BASIC_INFO, Security)> {
    checked(file, false)?;
    let standard: FILE_STANDARD_INFO = info(file, FileStandardInfo)?;
    let basic: FILE_BASIC_INFO = info(file, FileBasicInfo)?;
    // Replacing special streams, links, EFS/compression or unknown metadata
    // would silently discard semantics. Refuse those documents before staging.
    let supported = FILE_ATTRIBUTE_NORMAL | FILE_ATTRIBUTE_ARCHIVE | FILE_ATTRIBUTE_HIDDEN
        | FILE_ATTRIBUTE_SYSTEM | FILE_ATTRIBUTE_NOT_CONTENT_INDEXED;
    if basic.FileAttributes & FILE_ATTRIBUTE_READONLY != 0 {
        return Err(AppError::new("denied", "Read-only documents cannot be replaced"));
    }
    if standard.NumberOfLinks != 1 || basic.FileAttributes & !supported != 0 {
        return Err(AppError::new("unsupported_type", "Document links or metadata cannot be preserved safely"));
    }
    let mut streams = vec![0u64; 8192];
    if unsafe { GetFileInformationByHandleEx(file.as_raw_handle(), FileStreamInfo,
        streams.as_mut_ptr().cast(), (streams.len() * 8) as u32) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    let stream = unsafe { &*streams.as_ptr().cast::<FILE_STREAM_INFO>() };
    let header = offset_of!(FILE_STREAM_INFO, StreamName);
    let length = stream.StreamNameLength as usize;
    if stream.NextEntryOffset != 0 || length % 2 != 0 || header + length > streams.len() * 8 {
        return Err(AppError::new("unsupported_type", "Additional document streams cannot be preserved"));
    }
    let name = unsafe { std::slice::from_raw_parts(stream.StreamName.as_ptr(), length / 2) };
    if name != "::$DATA".encode_utf16().collect::<Vec<_>>().as_slice() {
        return Err(AppError::new("unsupported_type", "Additional document streams cannot be preserved"));
    }
    Ok((basic, security(file)?))
}
fn delete_owned(file: &File) -> AppResult<()> {
    let disposition = FILE_DISPOSITION_INFO { DeleteFile: true };
    if unsafe { SetFileInformationByHandle(file.as_raw_handle(), FileDispositionInfo,
        (&disposition as *const FILE_DISPOSITION_INFO).cast(), size_of::<FILE_DISPOSITION_INFO>() as u32) } == 0 {
        return Err(io_error(std::io::Error::last_os_error()));
    }
    Ok(())
}
fn stage_name(name: &str) -> AppResult<()> {
    validate_segment(name)?;
    let id = name.strip_prefix(".md-reader-").and_then(|name| name.strip_suffix(".tmp"));
    if !id.is_some_and(|id| uuid::Uuid::parse_str(id).is_ok()) {
        return Err(AppError::new("invalid_path", "Not an owned document stage"));
    }
    Ok(())
}
pub(crate) fn open_document_for_commit(parent: &File, target: &str) -> AppResult<File> {
    checked(parent, true)?;
    validate_segment(target)?;
    // Retain this guard across the final version check and publication. Fail if
    // an existing handle denies deletion or has write access, and deny new
    // writers while the old version remains linked. Reader grants stay valid.
    let file = native_open_with_share(parent.as_raw_handle(), target,
        FILE_READ_DATA | FILE_READ_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_OPEN, 0, ptr::null(), 0, FILE_SHARE_READ | FILE_SHARE_DELETE)?;
    checked(&file, false)?;
    Ok(file)
}
pub(crate) fn stage_document_bytes(parent: &File, bytes: &[u8], source: Option<&File>) -> AppResult<(String, DocumentStage)> {
    stage_with_writer(parent, bytes, source, |file, bytes| file.write_all(bytes))
}
fn stage_with_writer(parent: &File, bytes: &[u8], source: Option<&File>, write: impl FnOnce(&mut File, &[u8]) -> std::io::Result<()>) -> AppResult<(String, DocumentStage)> {
    checked(parent, true)?;
    let metadata = source.map(document_metadata).transpose()?;
    let default = if metadata.is_none() { Some(storage::descriptor()?) } else { None };
    let descriptor = match (&metadata, &default) {
        (Some((_, security)), _) => security.allocation.0,
        (_, Some(default)) => default.0,
        _ => unreachable!("a stage always has explicit security"),
    };
    let name = format!(".md-reader-{}.tmp", uuid::Uuid::new_v4());
    let mut file = native_open_with_share(parent.as_raw_handle(), &name,
        FILE_READ_DATA | FILE_WRITE_DATA | FILE_READ_ATTRIBUTES | FILE_WRITE_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_CREATE, FILE_ATTRIBUTE_NORMAL, descriptor.cast(), FILE_WRITE_THROUGH, FILE_SHARE_READ)?;
    let result = (|| {
        checked(&file, false)?;
        write(&mut file, bytes).map_err(io_error)?;
        file.sync_all().map_err(io_error)?;
        if let Some((basic, original_security)) = metadata.as_ref() {
            let preserved = FILE_BASIC_INFO { CreationTime: basic.CreationTime, LastAccessTime: basic.LastAccessTime,
                LastWriteTime: 0, ChangeTime: 0, FileAttributes: basic.FileAttributes };
            if unsafe { SetFileInformationByHandle(file.as_raw_handle(), FileBasicInfo,
                (&preserved as *const FILE_BASIC_INFO).cast(), size_of::<FILE_BASIC_INFO>() as u32) } == 0 {
                return Err(io_error(std::io::Error::last_os_error()));
            }
            let actual: FILE_BASIC_INFO = info(&file, FileBasicInfo)?;
            if actual.CreationTime != basic.CreationTime || actual.FileAttributes != basic.FileAttributes
                || !same_security(original_security, &security(&file)?) {
                return Err(AppError::new("unsupported_type", "Staged document metadata did not preserve the original"));
            }
        } else { storage::verify_private_file(&file)?; }
        file.sync_all().map_err(io_error)
    })();
    if let Err(error) = result {
        return match delete_owned(&file) {
            Ok(()) => Err(error),
            Err(cleanup) => Err(AppError::new(error.code, format!("{}; stage cleanup uncertain: {}", error.message, cleanup.message))),
        };
    }
    Ok((name, DocumentStage(std::cell::RefCell::new(Some(file)))))
}

#[cfg(test)]
pub(crate) fn stage_fixture_with_writer(parent: &File, bytes: &[u8], source: Option<&File>, write: impl FnOnce(&mut File, &[u8]) -> std::io::Result<()>) -> AppResult<(String, DocumentStage)> {
    stage_with_writer(parent, bytes, source, write)
}
pub(crate) fn remove_document_stage(parent: &File, stage: &DocumentStage, name: &str) {
    // The held exclusive stage owns deletion. Never delete a substituted entry
    // or a published document after an uncertain post-commit result.
    if stage_name(name).is_err() || checked(parent, true).is_err() { return; }
    let held = stage.0.borrow();
    let Some(stage) = held.as_ref() else { return };
    if let Ok(file) = open_relative(parent, &[name.to_owned()], false) {
        if identity(&file).ok().is_some_and(|id| identity(stage).ok() == Some(id)) {
            let _ = delete_owned(stage);
        }
    }
}
fn publish(parent: &File, stage: &DocumentStage, name: &str, target: &str, replace: bool) -> AppResult<()> {
    stage_name(name)?;
    validate_segment(target)?;
    checked(parent, true)?;
    let held = stage.0.borrow();
    let file = held.as_ref().ok_or_else(|| AppError::new("save_race", "Stage was already published"))?;
    checked(file, false)?;
    let expected = identity(file)?;
    let entry = open_relative(parent, &[name.to_owned()], false)?;
    if identity(&entry)? != expected {
        return Err(AppError::new("save_race", "Owned stage identity changed"));
    }
    drop(entry);
    file.sync_all().map_err(io_error)?;
    rename_document(file, parent, target, replace)?;
    // The rename above is the commit point. Errors below must not imply that
    // disk is unchanged; shared policy retains pending draft/safety copies.
    let result = (|| {
        file.sync_all().map_err(io_error)?;
        let current = open_relative(parent, &[target.to_owned()], false)?;
        if identity(&current)? != expected {
            return Err(AppError::new("save_race", "Published document identity changed"));
        }
        Ok(())
    })().map_err(|error: AppError| AppError::new("save_race", format!("Publication occurred; verification uncertain: {}", error.message)));
    drop(held);
    // Publication occurred even if verification failed. Never leave cleanup
    // holding a delete-capable handle to the published document.
    stage.0.borrow_mut().take();
    result
}
pub(crate) fn rename_document_stage(parent: &File, stage: &DocumentStage, name: &str, target: &str) -> AppResult<()> { publish(parent, stage, name, target, true) }
pub(crate) fn link_document_stage_new(parent: &File, stage: &DocumentStage, name: &str, target: &str) -> AppResult<()> { publish(parent, stage, name, target, false) }

#[cfg(test)]
pub(crate) fn reopen_fixture_stage(parent: &File, name: &str) -> AppResult<DocumentStage> {
    stage_name(name)?;
    let file = native_open_with_share(parent.as_raw_handle(), name,
        FILE_READ_DATA | FILE_WRITE_DATA | FILE_READ_ATTRIBUTES | 0x00020000 | 0x00010000,
        FILE_OPEN, 0, ptr::null(), 0, FILE_SHARE_READ)?;
    checked(&file, false)?;
    Ok(DocumentStage(std::cell::RefCell::new(Some(file))))
}

#[cfg(test)]
pub(crate) fn with_fixture_creation_denied<T>(path: &std::path::Path, action: impl FnOnce() -> T) -> AppResult<T> {
    use windows_sys::Win32::Security::Authorization::{ConvertSidToStringSidW,
        ConvertStringSecurityDescriptorToSecurityDescriptorW, SetSecurityInfo, SDDL_REVISION_1};
    let fixture = path.parent().ok_or_else(|| AppError::new("invalid_path", "Fixture root missing"))?;
    let name = fixture.file_name().and_then(|name| name.to_str()).unwrap_or("");
    if fixture.parent().map(std::fs::canonicalize).transpose().map_err(io_error)? != Some(std::fs::canonicalize(std::env::temp_dir()).map_err(io_error)?)
        || !name.strip_prefix("md-save-transaction-").is_some_and(|id| uuid::Uuid::parse_str(id).is_ok()) {
        return Err(AppError::new("invalid_path", "Permission test requires its disposable save fixture"));
    }
    let parent = crate::scope::open_selected(path, true)?;
    let file = native_open_with_share(parent.as_raw_handle(), "", 0x00020000 | 0x00040000,
        FILE_OPEN, 0, ptr::null(), 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE)?;
    let saved = security(&file)?;
    struct Restore { file: File, saved: Security }
    impl Drop for Restore {
        fn drop(&mut self) {
            let flags = DACL_SECURITY_INFORMATION | if self.saved.protected { PROTECTED_DACL_SECURITY_INFORMATION } else { UNPROTECTED_DACL_SECURITY_INFORMATION };
            unsafe { SetSecurityInfo(self.file.as_raw_handle(), SE_FILE_OBJECT, flags,
                ptr::null_mut(), ptr::null_mut(), self.saved.acl.as_mut_ptr().cast(), ptr::null_mut()); }
        }
    }
    let mut restore = Restore { file, saved };
    let mut sid = ptr::null_mut();
    if unsafe { ConvertSidToStringSidW(restore.saved.owner.as_mut_ptr().cast(), &mut sid) } == 0 { return Err(io_error(std::io::Error::last_os_error())); }
    let _sid = storage::LocalAllocation(sid.cast());
    let mut length = 0;
    while unsafe { *sid.add(length) } != 0 { length += 1; }
    let sid = String::from_utf16_lossy(unsafe { std::slice::from_raw_parts(sid, length) });
    // FILE_ADD_FILE is denied on this owned directory, with other access kept
    // available for assertions and restoration. Never alter a user directory.
    let sddl: Vec<u16> = format!("D:P(D;;0x00000002;;;{sid})(A;OICI;FA;;;{sid})").encode_utf16().chain(Some(0)).collect();
    let mut descriptor = ptr::null_mut();
    if unsafe { ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl.as_ptr(), SDDL_REVISION_1, &mut descriptor, ptr::null_mut()) } == 0 { return Err(io_error(std::io::Error::last_os_error())); }
    let _descriptor = storage::LocalAllocation(descriptor);
    let (mut present, mut acl, mut defaulted) = (0, ptr::null_mut(), 0);
    if unsafe { GetSecurityDescriptorDacl(descriptor, &mut present, &mut acl, &mut defaulted) } == 0 || present == 0 { return Err(AppError::new("internal", "Fixture DACL missing")); }
    let result = unsafe { SetSecurityInfo(restore.file.as_raw_handle(), SE_FILE_OBJECT,
        DACL_SECURITY_INFORMATION | PROTECTED_DACL_SECURITY_INFORMATION,
        ptr::null_mut(), ptr::null_mut(), acl, ptr::null_mut()) };
    if result != 0 { return Err(io_error(std::io::Error::from_raw_os_error(result as i32))); }
    let value = action();
    let flags = DACL_SECURITY_INFORMATION | if restore.saved.protected { PROTECTED_DACL_SECURITY_INFORMATION } else { UNPROTECTED_DACL_SECURITY_INFORMATION };
    let result = unsafe { SetSecurityInfo(restore.file.as_raw_handle(), SE_FILE_OBJECT, flags,
        ptr::null_mut(), ptr::null_mut(), restore.saved.acl.as_mut_ptr().cast(), ptr::null_mut()) };
    if result != 0 { return Err(io_error(std::io::Error::from_raw_os_error(result as i32))); }
    Ok(value)
}

#[cfg(test)]
pub(crate) fn metadata_fingerprint(file: &File) -> AppResult<(i64, u32, Vec<u8>, Vec<u8>, Vec<u8>, bool)> {
    let (basic, security) = document_metadata(file)?;
    Ok((basic.CreationTime, basic.FileAttributes, security.owner, security.group, security.acl, security.protected))
}
