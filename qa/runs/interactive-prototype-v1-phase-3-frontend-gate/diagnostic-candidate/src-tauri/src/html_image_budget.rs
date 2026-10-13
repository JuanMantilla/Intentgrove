//! Header/container budgets only. Actual image decoding stays in the document
//! engine's sandboxed content process; the privileged host never calls ImageIO.
use super::{err, AppResult};
fn be16(b: &[u8]) -> u32 {
    u16::from_be_bytes([b[0], b[1]]) as u32
}
fn be32(b: &[u8]) -> u32 {
    u32::from_be_bytes(b[..4].try_into().unwrap())
}
fn le16(b: &[u8]) -> u32 {
    u16::from_le_bytes([b[0], b[1]]) as u32
}
fn le24(b: &[u8]) -> u32 {
    b[0] as u32 | (b[1] as u32) << 8 | (b[2] as u32) << 16
}
fn le32(b: &[u8]) -> u32 {
    u32::from_le_bytes(b[..4].try_into().unwrap())
}
fn rejected<T>() -> AppResult<T> {
    Err(err("unsupported", "Malformed or mismatched embedded image"))
}
pub(super) fn decoded_budget(data: &[u8], mime: &str) -> AppResult<usize> {
    let (w, h, frames) = match mime {
        "image/png" => {
            if data.len() < 33
                || !data.starts_with(b"\x89PNG\r\n\x1a\n")
                || &data[12..16] != b"IHDR"
                || be32(&data[8..12]) != 13
            {
                return rejected();
            }
            let (w, h) = (be32(&data[16..20]), be32(&data[20..24]));
            let mut pos = 8;
            let mut frames = 1;
            let mut end = false;
            while pos + 12 <= data.len() {
                let len = be32(&data[pos..pos + 4]) as usize;
                let Some(next) = pos.checked_add(len + 12).filter(|end| *end <= data.len()) else {
                    return rejected();
                };
                match &data[pos + 4..pos + 8] {
                    b"acTL" => {
                        if len != 8 {
                            return rejected();
                        }
                        frames = be32(&data[pos + 8..pos + 12]);
                    }
                    b"IEND" => {
                        end = true;
                        break;
                    }
                    _ => {}
                }
                pos = next;
            }
            if !end {
                return rejected();
            }
            (w, h, frames)
        }
        "image/jpeg" => {
            if !data.starts_with(b"\xff\xd8") {
                return rejected();
            }
            let mut pos = 2;
            let mut size = None;
            while pos + 4 <= data.len() {
                if data[pos] != 255 {
                    return rejected();
                }
                while pos < data.len() && data[pos] == 255 {
                    pos += 1;
                }
                if pos >= data.len() {
                    break;
                }
                let tag = data[pos];
                pos += 1;
                if tag == 0xda || tag == 0xd9 {
                    break;
                }
                if matches!(tag, 0x01 | 0xd0..=0xd7) {
                    continue;
                }
                if pos + 2 > data.len() {
                    return rejected();
                }
                let len = be16(&data[pos..pos + 2]) as usize;
                if len < 2 || pos + len > data.len() {
                    return rejected();
                }
                if matches!(tag,0xc0..=0xc3|0xc5..=0xc7|0xc9..=0xcb|0xcd..=0xcf) {
                    if len < 8 {
                        return rejected();
                    }
                    size = Some((
                        be16(&data[pos + 5..pos + 7]),
                        be16(&data[pos + 3..pos + 5]),
                        1,
                    ));
                    break;
                }
                pos += len;
            }
            size.ok_or_else(|| err("unsupported", "JPEG dimensions unavailable"))?
        }
        "image/gif" => {
            if data.len() < 13 || !matches!(&data[..6], b"GIF87a" | b"GIF89a") {
                return rejected();
            }
            let (w, h) = (le16(&data[6..8]), le16(&data[8..10]));
            let mut pos = 13;
            let mut count = 0;
            if data[10] & 128 != 0 {
                pos += 3 * (1usize << ((data[10] & 7) + 1));
            }
            fn blocks(data: &[u8], pos: &mut usize) -> bool {
                loop {
                    if *pos >= data.len() {
                        return false;
                    }
                    let len = data[*pos] as usize;
                    *pos += 1;
                    if len == 0 {
                        return true;
                    }
                    if *pos + len > data.len() {
                        return false;
                    }
                    *pos += len;
                }
            }
            while pos < data.len() {
                match data[pos] {
                    0x3b => break,
                    0x21 => {
                        pos += 2;
                        if !blocks(data, &mut pos) {
                            return rejected();
                        }
                    }
                    0x2c => {
                        if pos + 10 > data.len() {
                            return rejected();
                        }
                        let fw = le16(&data[pos + 5..pos + 7]);
                        let fh = le16(&data[pos + 7..pos + 9]);
                        if fw > w || fh > h {
                            return rejected();
                        }
                        let packed = data[pos + 9];
                        pos += 10;
                        if packed & 128 != 0 {
                            pos += 3 * (1usize << ((packed & 7) + 1));
                        }
                        pos += 1;
                        if !blocks(data, &mut pos) {
                            return rejected();
                        }
                        count += 1;
                        if count > 100 {
                            return Err(err("image_limit", "GIF exceeds 100 frames"));
                        }
                    }
                    _ => return rejected(),
                }
            }
            (w, h, count)
        }
        "image/webp" => {
            if data.len() < 30 || &data[..4] != b"RIFF" || &data[8..12] != b"WEBP" {
                return rejected();
            }
            let mut pos = 12;
            let mut size = None;
            let mut frames = 0;
            while pos + 8 <= data.len() {
                let len = le32(&data[pos + 4..pos + 8]) as usize;
                let Some(end) = pos.checked_add(8 + len).filter(|end| *end <= data.len()) else {
                    return rejected();
                };
                let chunk = &data[pos + 8..end];
                match &data[pos..pos + 4] {
                    b"VP8X" if chunk.len() >= 10 => {
                        size = Some((1 + le24(&chunk[4..7]), 1 + le24(&chunk[7..10])))
                    }
                    b"VP8 " if size.is_none() && chunk.len() >= 10 => {
                        if &chunk[3..6] != b"\x9d\x01\x2a" {
                            return rejected();
                        }
                        size = Some((le16(&chunk[6..8]) & 0x3fff, le16(&chunk[8..10]) & 0x3fff));
                    }
                    b"VP8L" if size.is_none() && chunk.len() >= 5 => {
                        if chunk[0] != 0x2f {
                            return rejected();
                        }
                        let bits = le32(&chunk[1..5]);
                        size = Some((1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)));
                    }
                    b"ANMF" => frames += 1,
                    _ => {}
                }
                if frames > 100 {
                    return Err(err("image_limit", "WebP exceeds 100 frames"));
                }
                pos = end + (len & 1);
            }
            let (w, h) = size.ok_or_else(|| err("unsupported", "WebP dimensions unavailable"))?;
            (w, h, frames.max(1))
        }
        _ => return rejected(),
    };
    if w == 0 || h == 0 || frames == 0 || frames > 100 || u64::from(w) * u64::from(h) > 32_000_000 {
        return Err(err(
            "image_limit",
            "Embedded image exceeds 32 MP or frame budget",
        ));
    }
    let bytes = u64::from(w) * u64::from(h) * u64::from(frames) * 4;
    if bytes > 128 * 1024 * 1024 {
        return Err(err(
            "image_limit",
            "Embedded image exceeds 128 MiB decoded estimate",
        ));
    }
    Ok(bytes as usize)
}
