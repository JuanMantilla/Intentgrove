//! Strict structural admission before a maintained ZIP decoder sees the archive.
//! These checks restrict ZIP's optional envelope; zip owns decompression/CRC.
use crate::{
    diagnostics::{error, Result},
    limits, resources,
};
use igproto_model::{Code, Stage};
use std::{
    collections::{BTreeMap, BTreeSet},
    io::{Cursor, Read},
};
fn bad(msg: &str) -> crate::Report {
    error(Code::InvalidStructure, Stage::Decode, "archive", msg)
}
fn u16le(b: &[u8], o: usize) -> Result<u16> {
    let stop = o
        .checked_add(2)
        .ok_or_else(|| bad("ZIP header offset overflow"))?;
    let s = b.get(o..stop).ok_or_else(|| bad("truncated ZIP header"))?;
    Ok(u16::from_le_bytes(s.try_into().unwrap()))
}
fn u32le(b: &[u8], o: usize) -> Result<u32> {
    let stop = o
        .checked_add(4)
        .ok_or_else(|| bad("ZIP header offset overflow"))?;
    let s = b.get(o..stop).ok_or_else(|| bad("truncated ZIP header"))?;
    Ok(u32::from_le_bytes(s.try_into().unwrap()))
}
#[derive(Debug)]
struct Member {
    name: String,
    size: u64,
    compressed: u64,
    start: usize,
    method: u16,
}
fn scan(b: &[u8]) -> Result<Vec<Member>> {
    if b.len() > limits::ARCHIVE {
        return Err(error(
            Code::LimitExceeded,
            Stage::Limit,
            "archive",
            "compressed package exceeds 32 MiB",
        ));
    }
    // V1 rejects comments, appended bytes, prepended stubs, ZIP64 and descriptors.
    let end = b
        .len()
        .checked_sub(22)
        .ok_or_else(|| bad("missing ZIP end record"))?;
    if u32le(b, end)? != 0x06054b50
        || u16le(b, end + 20)? != 0
        || u16le(b, end + 4)? != 0
        || u16le(b, end + 6)? != 0
    {
        return Err(bad(
            "single-disk ZIP without trailing payload/comment required",
        ));
    }
    let count = usize::from(u16le(b, end + 10)?);
    if count > limits::ENTRIES {
        return Err(error(
            Code::LimitExceeded,
            Stage::Limit,
            "archive",
            "entry count exceeds 162",
        ));
    }
    if u16le(b, end + 8)? as usize != count {
        return Err(bad("inconsistent ZIP counts"));
    }
    let central = u32le(b, end + 16)? as usize;
    let central_size = u32le(b, end + 12)? as usize;
    if central.checked_add(central_size) != Some(end) {
        return Err(bad("invalid central directory bounds / ZIP64"));
    }
    let mut c = central;
    let mut seen = BTreeSet::new();
    let mut ranges = Vec::new();
    let mut members = Vec::new();
    let mut expanded = 0u64;
    for _ in 0..count {
        if u32le(b, c)? != 0x02014b50 {
            return Err(bad("malformed central directory"));
        }
        let flags = u16le(b, c + 8)?;
        let method = u16le(b, c + 10)?;
        let compressed = u32le(b, c + 20)? as u64;
        let size = u32le(b, c + 24)? as u64;
        let n = usize::from(u16le(b, c + 28)?);
        if n == 0 || n > 160 {
            return Err(bad("member path exceeds canonical path length budget"));
        }
        let extra = usize::from(u16le(b, c + 30)?);
        let comment = usize::from(u16le(b, c + 32)?);
        if !(10..=20).contains(&u16le(b, c + 6)?)
            || (method == 0 && compressed != size)
            || flags & !0x0800 != 0
            || !matches!(method, 0 | 8)
            || extra != 0
            || comment != 0
            || u16le(b, c + 34)? != 0
            || compressed == u32::MAX as u64
            || size == u32::MAX as u64
        {
            return Err(bad(
                "unsupported encryption/flags/compression/extra fields/ZIP64",
            ));
        }
        let attributes = u32le(b, c + 38)?;
        let mode = attributes >> 16;
        if attributes & 0x18 != 0 || (mode & 0o170000 != 0 && mode & 0o170000 != 0o100000) {
            return Err(bad(
                "only regular files are allowed (no symlinks/devices/directories)",
            ));
        }
        let name_bytes = b
            .get(c + 46..c + 46 + n)
            .ok_or_else(|| bad("truncated name"))?;
        let name = std::str::from_utf8(name_bytes)
            .map_err(|_| bad("invalid UTF-8 member path"))?
            .to_string();
        let cap = resources::entry_limit(&name)?;
        if !seen.insert(name.to_ascii_lowercase()) {
            return Err(error(
                Code::InvalidStructure,
                Stage::Decode,
                &name,
                "duplicate/case-colliding archive member",
            ));
        }
        if size > cap as u64 || size > compressed.max(1) * limits::RATIO {
            return Err(error(
                Code::LimitExceeded,
                Stage::Limit,
                &name,
                "entry exceeds byte budget or 100:1 expansion ratio",
            ));
        }
        expanded = expanded
            .checked_add(size)
            .ok_or_else(|| bad("expanded size overflow"))?;
        if expanded > limits::EXPANDED as u64 {
            return Err(error(
                Code::LimitExceeded,
                Stage::Limit,
                "archive",
                "expanded package exceeds 128 MiB",
            ));
        }
        let l = u32le(b, c + 42)? as usize;
        if l.checked_add(30).is_none_or(|end| end > central) {
            return Err(bad("local header offset outside archive"));
        }
        if u32le(b, l)? != 0x04034b50
            || u16le(b, l + 4)? != u16le(b, c + 6)?
            || u16le(b, l + 6)? != flags
            || u16le(b, l + 8)? != method
            || u32le(b, l + 14)? != u32le(b, c + 16)?
            || u32le(b, l + 18)? as u64 != compressed
            || u32le(b, l + 22)? as u64 != size
            || u16le(b, l + 26)? as usize != n
            || u16le(b, l + 28)? != 0
            || u16le(b, l + 10)? != u16le(b, c + 12)?
            || u16le(b, l + 12)? != u16le(b, c + 14)?
        {
            return Err(bad("local/central header disagreement"));
        }
        if b.get(l + 30..l + 30 + n) != Some(name_bytes) {
            return Err(bad("local/central names differ"));
        }
        let stop = (l + 30 + n)
            .checked_add(compressed as usize)
            .ok_or_else(|| bad("member overflow"))?;
        if stop > central {
            return Err(bad("member overlaps central directory"));
        }
        ranges.push((l, stop));
        members.push(Member {
            name,
            size,
            compressed,
            start: l + 30 + n,
            method,
        });
        c += 46 + n;
    }
    if c != end {
        return Err(bad("central directory count/length disagreement"));
    }
    ranges.sort_unstable();
    let mut cursor = 0;
    for (start, stop) in ranges {
        if start != cursor {
            return Err(bad("overlapping ranges, gaps or prepended data"));
        }
        cursor = stop;
    }
    if cursor != central {
        return Err(bad("unlisted local record/trailing archive"));
    }
    Ok(members)
}
pub fn read(bytes: &[u8]) -> Result<BTreeMap<String, Vec<u8>>> {
    read_with_control(
        bytes,
        &crate::Control::new(std::time::Duration::from_secs(5)),
    )
}
pub fn read_with_control(
    bytes: &[u8],
    control: &crate::Control,
) -> Result<BTreeMap<String, Vec<u8>>> {
    control.check("archive")?;
    let members = scan(bytes)?;
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes)).map_err(|_| bad("malformed ZIP"))?;
    if zip.len() != members.len() {
        return Err(bad("ZIP decoder entry count differs"));
    }
    let mut result = BTreeMap::new();
    let mut total = 0usize;
    for (i, m) in members.into_iter().enumerate() {
        let mut f = zip
            .by_index(i)
            .map_err(|_| bad("ZIP member cannot be decoded"))?;
        if f.name() != m.name || f.size() != m.size || f.compressed_size() != m.compressed {
            return Err(bad("ZIP decoder metadata differs"));
        }
        let mut b = Vec::with_capacity(m.size as usize);
        let mut chunk = [0u8; 65536];
        if m.method == 8 {
            let data = &bytes[m.start..m.start + m.compressed as usize];
            let mut decoder = flate2::bufread::DeflateDecoder::new(Cursor::new(data));
            let mut expanded = 0u64;
            loop {
                control.check(&m.name)?;
                let n = decoder
                    .read(&mut chunk)
                    .map_err(|_| bad("invalid DEFLATE stream"))?;
                if n == 0 {
                    break;
                }
                expanded += n as u64;
                if expanded > m.size {
                    return Err(bad("DEFLATE expands beyond declared size"));
                }
            }
            if decoder.total_in() != m.compressed || expanded != m.size {
                return Err(bad(
                    "DEFLATE compressed stream length/trailing data mismatch",
                ));
            }
        }
        loop {
            control.check(&m.name)?;
            let n = f.read(&mut chunk).map_err(|_| {
                error(
                    Code::InvalidStructure,
                    Stage::Decode,
                    &m.name,
                    "member decompression/CRC failed",
                )
            })?;
            if n == 0 {
                break;
            }
            if b.len() + n > m.size as usize {
                return Err(bad("actual expanded entry exceeds declared size"));
            }
            b.extend_from_slice(&chunk[..n]);
        }
        if b.len() as u64 != m.size {
            return Err(bad("actual expanded length differs"));
        }
        total += b.len();
        if total > limits::EXPANDED {
            return Err(bad("actual expanded package exceeds budget"));
        }
        result.insert(m.name, b);
    }
    Ok(result)
}
