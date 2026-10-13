use crate::document::bounded_bytes;
use crate::scope::{identity, io_error, open_relative, open_selected, AppError, AppResult};
pub use crate::scope::image_format;
use crate::state::{AppState, FileGrant, FileSource, RootGrant};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::ffi::{CStr, CString};
use std::fs::File;
use std::path::PathBuf;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
const MAX_RESPONSE_BYTES: usize = 8 * 1024 * 1024;
static DECODE_LOCK: Mutex<()> = Mutex::new(());

#[cfg(target_os = "macos")]
unsafe extern "C" {
    fn md_image_xpc_decode(input: *const u8, input_length: usize, format: *const libc::c_char,
        max_dimension: u32, generation: u64, output: *mut *mut u8, output_length: *mut usize,
        width: *mut u32, height: *mut u32, still: *mut libc::c_int,
        actual: *mut *mut libc::c_char, error: *mut *mut libc::c_char) -> libc::c_int;
    fn md_image_xpc_decode_tile(input: *const u8, input_length: usize, format: *const libc::c_char,
        x: u32, y: u32, generation: u64, output: *mut *mut u8, output_length: *mut usize,
        width: *mut u32, height: *mut u32, actual: *mut *mut libc::c_char,
        error: *mut *mut libc::c_char) -> libc::c_int;
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageResponse {
    pub file_id: String,
    pub name: String,
    pub display_path: String,
    pub identity_key: String,
    pub disk_version: String,
    pub format: &'static str,
    pub mime: &'static str,
    pub width: u32,
    pub height: u32,
    pub still: bool,
    pub bytes: Vec<u8>,
}

fn stable_bytes(file: &File) -> AppResult<(Vec<u8>, String)> {
    let before = file.metadata().map_err(io_error)?;
    let first = bounded_bytes(file, MAX_IMAGE_BYTES)?;
    thread::sleep(Duration::from_millis(60));
    let second = bounded_bytes(file, MAX_IMAGE_BYTES)?;
    let after = file.metadata().map_err(io_error)?;
    if before.len() != after.len() || before.modified().ok() != after.modified().ok()
        || first != second {
        return Err(AppError::new("unstable", "Image changed while it was being read"));
    }
    let digest = Sha256::digest(&second);
    Ok((second, format!("{digest:x}")))
}

#[cfg(target_os = "macos")]
fn decode(bytes: &[u8], claimed: &'static str, max_dimension: u32, generation: u64)
    -> AppResult<(Vec<u8>, u32, u32, bool)> {
    let _guard = DECODE_LOCK.lock().map_err(|_| AppError::new("internal", "Image decoder busy"))?;
    let claimed_c = CString::new(claimed).expect("static format");
    let mut output = std::ptr::null_mut();
    let mut output_length = 0usize;
    let mut width = 0u32;
    let mut height = 0u32;
    let mut still = 0;
    let mut actual: *mut libc::c_char = std::ptr::null_mut();
    let mut error: *mut libc::c_char = std::ptr::null_mut();
    let status = unsafe { md_image_xpc_decode(bytes.as_ptr(), bytes.len(), claimed_c.as_ptr(),
        max_dimension, generation, &mut output, &mut output_length, &mut width, &mut height, &mut still,
        &mut actual, &mut error) };
    let error_text = if error.is_null() { String::new() }
        else { unsafe { CStr::from_ptr(error).to_string_lossy().into_owned() } };
    let actual_text = if actual.is_null() { String::new() }
        else { unsafe { CStr::from_ptr(actual).to_string_lossy().into_owned() } };
    if !error.is_null() { unsafe { libc::free(error.cast()) } }
    if !actual.is_null() { unsafe { libc::free(actual.cast()) } }
    if status != 0 || actual_text != claimed || output.is_null() || output_length < 24
        || output_length > MAX_RESPONSE_BYTES || width == 0 || height == 0
        || u64::from(width) * u64::from(height) > 40_000_000 {
        if !output.is_null() { unsafe { libc::free(output.cast()) } }
        let code = if status == 1 { "timeout" } else if !error_text.is_empty() {
            match error_text.as_str() {
                "over_limit" => "oversize",
                "response_limit" => "preview_limit",
                "mismatch" => "image_mismatch",
                "unsafe_or_corrupt" => "unsafe_image",
                "corrupt" => "image_corrupt",
                "invalid_decoder_response" | "invalid_request" => "invalid_decoder_response",
                _ => "image_unavailable",
            }
        } else { "invalid_decoder_response" };
        return Err(AppError::new(code, "Image could not be safely decoded"));
    }
    let png = unsafe { std::slice::from_raw_parts(output, output_length).to_vec() };
    unsafe { libc::free(output.cast()) };
    if !png.starts_with(b"\x89PNG\r\n\x1a\n") || &png[12..16] != b"IHDR" {
        return Err(AppError::new("invalid_decoder_response", "Image decoder returned invalid pixels"));
    }
    let pixel_width = u32::from_be_bytes(png[16..20].try_into().unwrap());
    let pixel_height = u32::from_be_bytes(png[20..24].try_into().unwrap());
    if pixel_width == 0 || pixel_height == 0
        || pixel_width > max_dimension || pixel_height > max_dimension {
        return Err(AppError::new("invalid_decoder_response", "Image decoder returned oversized pixels"));
    }
    Ok((png, width, height, still != 0))
}

enum PostCheck {
    Root(RootGrant, Vec<String>),
    Explicit(PathBuf, crate::scope::Identity),
}

fn verify_postcheck(state: &AppState, grant: &mut FileGrant, post_check: PostCheck,
    opened_identity: crate::scope::Identity) -> AppResult<()> {
    match post_check {
        PostCheck::Root(root, segments) => {
            root.verify_current()?;
            let current = open_relative(&root.file, &segments, false)?;
            if identity(&current)? != opened_identity {
                return Err(AppError::new("unstable", "Image changed during decode"));
            }
            if grant.identity != opened_identity {
                *grant = state.update_root_file_identity(&grant.id, opened_identity)?;
            }
        }
        PostCheck::Explicit(path, selected_identity) => {
            let current = open_selected(&path, false)?;
            if identity(&current)? != selected_identity {
                return Err(AppError::new("reselection_required", "Selected file changed; select it again"));
            }
        }
    }
    Ok(())
}

fn opened_image(state: &AppState, file: File, mut grant: FileGrant, post_check: PostCheck,
    max_dimension: u32) -> AppResult<ImageResponse> {
    let format = image_format(&grant.name)
        .ok_or_else(|| AppError::new("unsupported_type", "This is not a supported image file"))?;
    let generation = state.generation()?;
    let opened_identity = identity(&file)?;
    let (bytes, disk_version) = stable_bytes(&file)?;
    let mut dimension = max_dimension;
    let (pixels, width, height, still) = loop {
        match decode(&bytes, format, dimension, generation) {
            Ok(value) => break value,
            Err(error) if error.code == "preview_limit" && dimension > 512 => {
                dimension /= 2;
            }
            Err(error) => return Err(error),
        }
    };
    if stable_bytes(&file)?.1 != disk_version {
        return Err(AppError::new("unstable", "Image changed during decode"));
    }
    if state.generation()? != generation {
        return Err(AppError::new("cancelled", "Image selection changed during decode"));
    }
    verify_postcheck(state, &mut grant, post_check, opened_identity)?;
    Ok(ImageResponse {
        file_id: grant.id,
        name: grant.name,
        display_path: grant.display_path,
        identity_key: format!("{}:{}", opened_identity.device, opened_identity.inode),
        disk_version,
        format,
        mime: "image/png",
        width,
        height,
        still,
        bytes: pixels,
    })
}

fn open_image_file(state: &AppState, file_id: Option<&str>, root_id: Option<&str>,
    segments: Option<Vec<String>>) -> AppResult<(File, FileGrant, PostCheck)> {
    let (file, grant, post_check) = if let Some(id) = file_id {
        let grant = state.file(id)?;
        let (file, post_check) = match &grant.source {
            FileSource::Explicit { file, path } => {
                let current = open_selected(path, false)?;
                if identity(&current)? != grant.identity {
                    return Err(AppError::new("reselection_required", "Selected file changed; select it again"));
                }
                (file.try_clone().map_err(io_error)?, PostCheck::Explicit(path.clone(), grant.identity))
            }
            FileSource::Root { root_id, segments } => {
                let root = state.root(root_id)?;
                (open_relative(&root.file, segments, false)?, PostCheck::Root(root, segments.clone()))
            }
        };
        (file, grant, post_check)
    } else {
        let root_id = root_id.ok_or_else(|| AppError::new("invalid_grant", "No folder selected"))?;
        let segments = segments.ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        let name = segments.last().ok_or_else(|| AppError::new("invalid_path", "No file selected"))?;
        if image_format(name).is_none() {
            return Err(AppError::new("unsupported_type", "This is not a supported image file"));
        }
        let root = state.root(root_id)?;
        let file = open_relative(&root.file, &segments, false)?;
        let grant = state.register_root_file(&root, segments.clone(), &file)?;
        (file, grant, PostCheck::Root(root, segments))
    };
    Ok((file, grant, post_check))
}

// Refresh verifies granted bytes and identity without repeatedly decoding pixels.
// The frontend's image consumer owns decode failures and recovery.
pub(crate) fn image_fingerprint(state: &AppState, file_id: Option<&str>,
    root_id: Option<&str>, segments: Option<Vec<String>>) -> AppResult<(String, String, String)> {
    let generation = state.generation()?;
    let (file, mut grant, post_check) = open_image_file(state, file_id, root_id, segments)?;
    let opened_identity = identity(&file)?;
    let (_, version) = stable_bytes(&file)?;
    if state.generation()? != generation {
        return Err(AppError::new("cancelled", "Image selection changed during refresh"));
    }
    verify_postcheck(state, &mut grant, post_check, opened_identity)?;
    Ok((grant.id, version, format!("{}:{}", opened_identity.device, opened_identity.inode)))
}

pub fn open_image_impl(state: &AppState, file_id: Option<&str>, root_id: Option<&str>,
    segments: Option<Vec<String>>, max_dimension: u32) -> AppResult<ImageResponse> {
    let (file, grant, post_check) = open_image_file(state, file_id, root_id, segments)?;
    opened_image(state, file, grant, post_check, max_dimension.clamp(1, 4096))
}

#[tauri::command]
pub async fn open_image(state: tauri::State<'_, AppState>, file_id: Option<String>,
    root_id: Option<String>, segments: Option<Vec<String>>, max_dimension: Option<u32>)
    -> AppResult<ImageResponse> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || open_image_impl(&state, file_id.as_deref(),
        root_id.as_deref(), segments, max_dimension.unwrap_or(4096)))
        .await.map_err(|error| AppError::new("internal", error.to_string()))?
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageTileResponse {
    pub file_id: String,
    pub disk_version: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub bytes: Vec<u8>,
}

#[cfg(target_os = "macos")]
fn decode_tile(bytes: &[u8], format: &'static str, x: u32, y: u32, generation: u64)
    -> AppResult<(Vec<u8>, u32, u32)> {
    let _guard = DECODE_LOCK.lock().map_err(|_| AppError::new("internal", "Image decoder busy"))?;
    let format_c = CString::new(format).expect("static format");
    let mut output = std::ptr::null_mut();
    let mut output_length = 0usize;
    let mut width = 0u32;
    let mut height = 0u32;
    let mut actual: *mut libc::c_char = std::ptr::null_mut();
    let mut error: *mut libc::c_char = std::ptr::null_mut();
    let status = unsafe { md_image_xpc_decode_tile(bytes.as_ptr(), bytes.len(), format_c.as_ptr(),
        x, y, generation, &mut output, &mut output_length, &mut width, &mut height, &mut actual, &mut error) };
    let actual_text = if actual.is_null() { String::new() }
        else { unsafe { CStr::from_ptr(actual).to_string_lossy().into_owned() } };
    let error_text = if error.is_null() { String::new() }
        else { unsafe { CStr::from_ptr(error).to_string_lossy().into_owned() } };
    if !actual.is_null() { unsafe { libc::free(actual.cast()) } }
    if !error.is_null() { unsafe { libc::free(error.cast()) } }
    if status != 0 || actual_text != format || output.is_null() || output_length < 24
        || output_length > MAX_RESPONSE_BYTES || width == 0 || height == 0
        || width > 1024 || height > 1024 {
        if !output.is_null() { unsafe { libc::free(output.cast()) } }
        let code = if status == 1 { "timeout" } else { match error_text.as_str() {
            "mismatch" => "image_mismatch", "over_limit" => "oversize",
            "unsafe_or_corrupt" => "unsafe_image", "corrupt" => "image_corrupt",
            "invalid_decoder_response" | "invalid_request" => "invalid_decoder_response",
            _ => "image_unavailable",
        }};
        return Err(AppError::new(code, "Image tile could not be safely decoded"));
    }
    let png = unsafe { std::slice::from_raw_parts(output, output_length).to_vec() };
    unsafe { libc::free(output.cast()) };
    if !png.starts_with(b"\x89PNG\r\n\x1a\n") || &png[12..16] != b"IHDR"
        || u32::from_be_bytes(png[16..20].try_into().unwrap()) != width
        || u32::from_be_bytes(png[20..24].try_into().unwrap()) != height {
        return Err(AppError::new("invalid_decoder_response", "Image tile has invalid pixels"));
    }
    Ok((png, width, height))
}

pub fn open_image_tile_impl(state: &AppState, file_id: &str, expected_disk_version: &str,
    x: u32, y: u32) -> AppResult<ImageTileResponse> {
    if x % 1024 != 0 || y % 1024 != 0 || x > 40_000_000 || y > 40_000_000
        || expected_disk_version.len() != 64 || !expected_disk_version.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(AppError::new("invalid_path", "Invalid image tile request"));
    }
    let (file, mut grant, post_check) = open_image_file(state, Some(file_id), None, None)?;
    let format = image_format(&grant.name)
        .ok_or_else(|| AppError::new("unsupported_type", "This is not a supported image file"))?;
    let generation = state.generation()?;
    let opened_identity = identity(&file)?;
    let (bytes, disk_version) = stable_bytes(&file)?;
    if disk_version != expected_disk_version {
        return Err(AppError::new("version_changed", "Image changed before tile decode"));
    }
    let (pixels, width, height) = decode_tile(&bytes, format, x, y, generation)?;
    if stable_bytes(&file)?.1 != disk_version {
        return Err(AppError::new("unstable", "Image changed during tile decode"));
    }
    if state.generation()? != generation {
        return Err(AppError::new("cancelled", "Image selection changed during tile decode"));
    }
    verify_postcheck(state, &mut grant, post_check, opened_identity)?;
    Ok(ImageTileResponse { file_id: grant.id, disk_version, x, y, width, height, bytes: pixels })
}

#[tauri::command]
pub async fn open_image_tile(state: tauri::State<'_, AppState>, file_id: String,
    expected_disk_version: String, x: u32, y: u32) -> AppResult<ImageTileResponse> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move ||
        open_image_tile_impl(&state, &file_id, &expected_disk_version, x, y))
        .await.map_err(|error| AppError::new("internal", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn recognizes_supported_image_extensions_without_scheme_guessing() {
        for name in ["photo.JPG", "photo.jpeg", "picture.PNG", "clip.gif", "x.webp",
            "vector.svg", "bitmap.bmp", "scan.tif", "scan.tiff", "photo.heic", "photo.heif"] {
            assert!(image_format(name).is_some(), "{name}");
        }
        for name in ["x.svg.md", "x.png.exe", "x", "x.pdf"] {
            assert!(image_format(name).is_none(), "{name}");
        }
    }

    #[test]
    fn stable_image_read_is_bounded_and_does_not_modify_source() {
        let path = std::env::temp_dir().join(format!("md-reader-image-{}.png", uuid::Uuid::new_v4()));
        let mut output = File::create(&path).unwrap();
        output.write_all(b"\x89PNG\r\n\x1a\nfixture").unwrap();
        drop(output);
        let before = std::fs::read(&path).unwrap();
        let file = File::open(&path).unwrap();
        let (bytes, version) = stable_bytes(&file).unwrap();
        assert_eq!(bytes, before);
        assert_eq!(version, format!("{:x}", Sha256::digest(&before)));
        assert_eq!(std::fs::read(&path).unwrap(), before);
        drop(file);
        let oversized = File::create(&path).unwrap();
        oversized.set_len((MAX_IMAGE_BYTES + 1) as u64).unwrap();
        drop(oversized);
        assert_eq!(stable_bytes(&File::open(&path).unwrap()).unwrap_err().code, "oversize");
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn tile_rejects_stale_versions_before_decoder_and_leaves_file_unchanged() {
        let path = std::env::temp_dir().join(format!("md-reader-tile-{}.png", uuid::Uuid::new_v4()));
        let source = b"\x89PNG\r\n\x1a\nfixture";
        std::fs::write(&path, source).unwrap();
        let state = AppState::default();
        let grant = state.register_explicit_file(&path).unwrap();
        let failure = open_image_tile_impl(&state, &grant.id, &"0".repeat(64), 0, 0).unwrap_err();
        assert_eq!(failure.code, "version_changed");
        assert_eq!(std::fs::read(&path).unwrap(), source);
        assert_eq!(open_image_tile_impl(&state, &grant.id, &"0".repeat(64), 1, 0)
            .unwrap_err().code, "invalid_path");
        std::fs::remove_file(path).unwrap();
    }
}

#[cfg(target_os = "windows")]
fn decode(_: &[u8], _: &'static str, _: u32, _: u64) -> AppResult<(Vec<u8>, u32, u32, bool)> {
    Err(AppError::new("image_unavailable", "Windows image decoding awaits approval of an isolated worker"))
}
#[cfg(target_os = "windows")]
fn decode_tile(_: &[u8], _: &'static str, _: u32, _: u32, _: u64) -> AppResult<(Vec<u8>, u32, u32)> {
    Err(AppError::new("image_unavailable", "Windows image decoding awaits approval of an isolated worker"))
}
