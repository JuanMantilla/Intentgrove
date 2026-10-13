use crate::{
    diagnostics::{error, Result},
    limits,
};
use igproto_model::{Code, Stage};
use std::io::Cursor;
#[derive(Debug, Clone, Copy)]
pub struct PngInfo {
    pub width: u32,
    pub height: u32,
    pub rgba_bytes: u64,
}
pub fn validate(bytes: &[u8], member: &str) -> Result<PngInfo> {
    validate_with_control(
        bytes,
        member,
        &crate::Control::new(std::time::Duration::from_secs(5)),
    )
}
pub fn validate_with_control(
    bytes: &[u8],
    member: &str,
    control: &crate::Control,
) -> Result<PngInfo> {
    control.check(member)?;
    let fail = |msg: &str| error(Code::InvalidVisual, Stage::Decode, member, msg);
    if bytes.len() > limits::PNG || bytes.get(..8) != Some(b"\x89PNG\r\n\x1a\n") {
        return Err(fail("invalid PNG signature or exceeds 8 MiB"));
    }
    // Check ALL chunks, including metadata CRCs, APNG and complete IEND/trailing bytes.
    let mut offset = 8;
    let mut ended = false;
    while offset < bytes.len() {
        control.check(member)?;
        let header = bytes
            .get(offset..offset + 8)
            .ok_or_else(|| fail("truncated PNG chunk"))?;
        let n = u32::from_be_bytes(header[..4].try_into().unwrap()) as usize;
        let tag = &header[4..8];
        let end = offset
            .checked_add(
                n.checked_add(12)
                    .ok_or_else(|| fail("PNG chunk length overflow"))?,
            )
            .filter(|e| *e <= bytes.len())
            .ok_or_else(|| fail("invalid PNG chunk size"))?;
        if !tag.iter().all(u8::is_ascii_alphabetic)
            || tag[2].is_ascii_lowercase()
            || matches!(tag, b"acTL" | b"fcTL" | b"fdAT")
            || (tag[0].is_ascii_uppercase()
                && !matches!(tag, b"IHDR" | b"PLTE" | b"IDAT" | b"IEND"))
        {
            return Err(fail("APNG/unknown critical or invalid PNG chunk"));
        }
        if crc32fast::hash(&bytes[offset + 4..end - 4])
            != u32::from_be_bytes(bytes[end - 4..end].try_into().unwrap())
        {
            return Err(fail("PNG chunk CRC mismatch"));
        }
        offset = end;
        if tag == b"IEND" {
            if n != 0 || offset != bytes.len() {
                return Err(fail("invalid PNG end/trailing data"));
            }
            ended = true;
            break;
        }
    }
    if !ended {
        return Err(fail("missing PNG IEND"));
    }
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_limits(png::Limits {
        bytes: limits::DECODED as usize,
    });
    let mut reader = decoder
        .read_info()
        .map_err(|_| fail("PNG header/metadata decoding failed"))?;
    let info = reader.info();
    let (width, height) = (info.width, info.height);
    let pixels = u64::from(width) * u64::from(height);
    if width == 0
        || height == 0
        || width > 4096
        || height > 4096
        || pixels > limits::PIXELS
        || info.animation_control.is_some()
    {
        return Err(fail("PNG exceeds dimensions/pixels or is animated"));
    }
    let size = reader
        .output_buffer_size()
        .ok_or_else(|| fail("PNG allocation overflow"))?;
    // Native 16-bit RGBA can take 8 bytes/pixel; admission counts RGBA8 separately.
    if size > limits::PIXELS as usize * 8 {
        return Err(fail("PNG decoded allocation exceeds budget"));
    }
    loop {
        control.check(member)?;
        if reader
            .next_interlaced_row()
            .map_err(|_| fail("PNG pixel decoding failed"))?
            .is_none()
        {
            break;
        }
    }
    reader
        .finish()
        .map_err(|_| fail("PNG stream completion failed"))?;
    control.check(member)?;
    Ok(PngInfo {
        width,
        height,
        rgba_bytes: pixels * 4,
    })
}
