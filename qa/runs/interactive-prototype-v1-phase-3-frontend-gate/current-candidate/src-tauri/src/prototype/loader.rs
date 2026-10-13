//! Native handles only; no ZIP parsing, extraction, decoding or sanitizing here.
use crate::{
    document::bounded_bytes,
    document_view::current,
    scope::{AppError, AppResult},
    state::{AppState, FileGrant},
};
use igproto_package::{Control, ValidatedPackage};
use sha2::{Digest, Sha256};
fn read_snapshot(
    state: &AppState,
    source: &FileGrant,
) -> AppResult<(Vec<u8>, crate::platform::FileStamp)> {
    let file = current(state, source)?;
    let before = crate::platform::stamp(&file)?;
    let bytes = bounded_bytes(&file, igproto_package::limits::ARCHIVE).map_err(|e| {
        if e.code == "oversize" {
            AppError::new(
                "prototype_limit",
                "Prototype exceeds the 32 MiB package limit",
            )
        } else {
            e
        }
    })?;
    let after = current(state, source)?;
    if before != crate::platform::stamp(&after)? {
        return Err(AppError::new(
            "changed",
            "Prototype changed while reading; retry",
        ));
    }
    Ok((bytes, before))
}
pub(super) fn load(
    state: &AppState,
    source: &FileGrant,
    control: &Control,
) -> AppResult<ValidatedPackage> {
    control.check("read").map_err(super::package_error)?;
    let (bytes, stamp) = read_snapshot(state, source)?;
    let package =
        igproto_package::validate_with_control(&bytes, control).map_err(super::package_error)?;
    if stamp != crate::platform::stamp(&current(state, source)?)? {
        return Err(AppError::new(
            "changed",
            "Prototype changed during validation; retry",
        ));
    }
    Ok(package)
}
/// Refresh reads/fingerprints only. External changes never replace a validated snapshot.
pub(crate) fn fingerprint(state: &AppState, file_id: &str) -> AppResult<(String, String)> {
    let source = state.file(file_id)?;
    let (bytes, _) = read_snapshot(state, &source)?;
    Ok((
        format!("{:x}", Sha256::digest(bytes)),
        format!("{}:{}", source.identity.device, source.identity.inode),
    ))
}
