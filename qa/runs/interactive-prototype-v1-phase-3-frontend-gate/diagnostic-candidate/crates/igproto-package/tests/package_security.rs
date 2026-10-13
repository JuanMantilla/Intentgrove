use igproto_model::{Code, Manifest};
use igproto_package::{archive, images, limits, resources, validate, writer};
use std::{
    collections::BTreeMap,
    io::{Cursor, Write},
};
const VALID: &[u8] =
    include_bytes!("../../../tests/fixtures/prototype/phase-2/representative-v1.igproto");
fn members() -> BTreeMap<String, Vec<u8>> {
    archive::read(VALID).unwrap()
}
fn seal(mut files: BTreeMap<String, Vec<u8>>) -> Vec<u8> {
    let mut m: Manifest = igproto_model::decode_manifest(&files["manifest.json"]).unwrap();
    m.files = files
        .iter()
        .filter(|(p, _)| p.as_str() != "manifest.json")
        .map(|(p, b)| igproto_model::FileRecord {
            path: p.clone(),
            media_type: resources::media(p).unwrap(),
            bytes: b.len() as u64,
            sha256: resources::sha256(b),
        })
        .collect();
    files.insert("manifest.json".into(), writer::canonical_json(&m).unwrap());
    writer::write(&files).unwrap()
}
fn json_edit(path: &str, edit: impl FnOnce(&mut serde_json::Value)) -> Vec<u8> {
    let mut fs = members();
    let mut json = serde_json::from_slice(&fs[path]).unwrap();
    edit(&mut json);
    fs.insert(path.into(), serde_json::to_vec(&json).unwrap());
    if path == "manifest.json" {
        writer::write(&fs).unwrap()
    } else {
        seal(fs)
    }
}
#[test]
fn valid_package_independent() {
    let p = validate(VALID).unwrap();
    assert_eq!(p.prototype().scenes.len(), 3);
    assert_eq!(p.prototype().interactions.len(), 6);
    assert!(p.warnings().is_empty());
}
#[test]
fn invalid_manifest() {
    assert!(validate(&json_edit("manifest.json", |v| v["profile"] = "unknown".into())).is_err());
}
#[test]
fn invalid_graph() {
    assert!(validate(&json_edit("prototype.json", |v| v["entry"] = "missing".into())).is_err());
}
#[test]
fn unsupported_version() {
    let e = validate(&json_edit("manifest.json", |v| v["version"] = 2.into())).unwrap_err();
    assert_eq!(e.diagnostics[0].code, Code::UnsupportedVersion);
}
#[test]
fn boolean_version() {
    assert_eq!(
        validate(&json_edit("manifest.json", |v| v["version"] = true.into()))
            .unwrap_err()
            .diagnostics[0]
            .code,
        Code::InvalidVersion
    );
}
#[test]
fn executable_action() {
    assert!(
        validate(&json_edit("prototype.json", |v| v["interactions"][0]
            ["action"] =
            serde_json::json!({"type":"SCRIPT","code":"evil()"})))
        .is_err()
    );
}
#[test]
fn graph_missing_target() {
    assert_eq!(
        validate(&json_edit("prototype.json", |v| v["interactions"][0]
            ["target"] =
            "not-there".into()))
        .unwrap_err()
        .diagnostics[0]
            .code,
        Code::MissingTarget
    );
}
#[test]
fn wrong_mime() {
    assert!(validate(&json_edit("manifest.json", |v| v["files"][0]
        ["mediaType"] =
        "application/json".into()))
    .is_err());
}
#[test]
fn wrong_hash() {
    assert!(
        validate(&json_edit("manifest.json", |v| v["files"][0]["sha256"] =
            "0".repeat(64).into()))
        .is_err()
    );
}
#[test]
fn wrong_length() {
    assert!(validate(&json_edit("manifest.json", |v| v["files"][0]["bytes"] = 0.into())).is_err());
}
#[test]
fn capability_mismatch() {
    assert_eq!(
        validate(&json_edit("manifest.json", |v| v["capabilities"] =
            serde_json::json!(["svg-v1"])))
        .unwrap_err()
        .diagnostics[0]
            .code,
        Code::CapabilityMismatch
    );
}
#[test]
fn missing_manifest() {
    let mut fs = members();
    fs.remove("manifest.json");
    assert!(validate(&writer::write(&fs).unwrap()).is_err());
}
#[test]
fn missing_graph() {
    let mut fs = members();
    fs.remove("prototype.json");
    assert!(validate(&writer::write(&fs).unwrap()).is_err());
}
#[test]
fn missing_scene() {
    let mut fs = members();
    fs.remove("scenes/settings.svg");
    assert!(validate(&writer::write(&fs).unwrap()).is_err());
}
#[test]
fn missing_asset() {
    let mut fs = members();
    let path = fs
        .keys()
        .find(|p| p.starts_with("assets/"))
        .unwrap()
        .clone();
    fs.remove(&path);
    assert!(validate(&seal(fs)).is_err());
}
#[test]
fn duplicate_json_key() {
    let mut fs = members();
    let mut bytes = fs["manifest.json"].clone();
    bytes.splice(1..1, b"\"version\":1,".iter().copied());
    fs.insert("manifest.json".into(), bytes);
    assert_eq!(
        validate(&writer::write(&fs).unwrap())
            .unwrap_err()
            .diagnostics[0]
            .code,
        Code::DuplicateKey
    );
}
#[test]
fn malicious_svg_in_package() {
    let mut fs = members();
    fs.insert("scenes/settings.svg".into(),b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"390\" height=\"844\" viewBox=\"0 0 390 844\"><script/></svg>".to_vec());
    let e = validate(&seal(fs)).unwrap_err();
    assert_eq!(e.diagnostics[0].source_path, "scenes/settings.svg");
    assert!(e.diagnostics[0].message.contains("script"));
}
#[test]
fn content_type_not_extension() {
    let mut fs = members();
    let png = fs
        .keys()
        .find(|s| s.starts_with("assets/"))
        .unwrap()
        .clone();
    fs.insert(png, b"GIF89a".to_vec());
    assert!(validate(&seal(fs)).is_err());
}
#[test]
fn undeclared_scene() {
    let mut fs = members();
    fs.insert("scenes/extra.svg".into(), fs["scenes/settings.svg"].clone());
    assert!(validate(&seal(fs)).is_err());
}
#[test]
fn invalid_png() {
    assert!(images::validate(b"\x89PNG\r\n\x1a\nbroken", "assets/image.png").is_err());
}
fn png() -> Vec<u8> {
    std::fs::read(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tests/fixtures/prototype/phase-2/representative/images/checker.png"),
    )
    .unwrap()
}
#[test]
fn valid_png() {
    let i = images::validate(&png(), "image.png").unwrap();
    assert_eq!((i.width, i.height, i.rgba_bytes), (2, 2, 16));
}
#[test]
fn png_bad_crc() {
    let mut b = png();
    b[29] ^= 1;
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_trailing_bytes() {
    let mut b = png();
    b.extend(b"evil");
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_truncated_pixels() {
    let mut b = png();
    b.truncate(b.len() - 15);
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_apng() {
    let mut b = png();
    let at = b.len() - 12;
    let mut chunk = 8u32.to_be_bytes().to_vec();
    chunk.extend(b"acTL");
    chunk.extend([0, 0, 0, 1, 0, 0, 0, 0]);
    let crc = crc32fast::hash(&chunk[4..]);
    chunk.extend(crc.to_be_bytes());
    b.splice(at..at, chunk);
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_unknown_critical() {
    let mut b = png();
    let at = b.len() - 12;
    let mut chunk = 0u32.to_be_bytes().to_vec();
    chunk.extend(b"ABCD");
    chunk.extend(crc32fast::hash(b"ABCD").to_be_bytes());
    b.splice(at..at, chunk);
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_dimension_cap() {
    let mut b = png();
    b[16..20].copy_from_slice(&4097u32.to_be_bytes());
    let crc = crc32fast::hash(&b[12..29]);
    b[29..33].copy_from_slice(&crc.to_be_bytes());
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn png_encoded_cap() {
    assert!(images::validate(&vec![0; limits::PNG + 1], "image.png").is_err());
}
// Minimal hostile-envelope constructor: fresh production tests, not POC ZIP code.
fn raw(entries: &[(&str, Vec<u8>, u32, u16, u32)]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut central = Vec::new();
    for (name, data, size, method, mode) in entries {
        let offset = out.len() as u32;
        let crc = crc32fast::hash(data);
        out.extend(0x04034b50u32.to_le_bytes());
        for n in [20u16, 0, *method, 0, 33] {
            out.extend(n.to_le_bytes());
        }
        for n in [crc, data.len() as u32, *size] {
            out.extend(n.to_le_bytes());
        }
        out.extend((name.len() as u16).to_le_bytes());
        out.extend(0u16.to_le_bytes());
        out.extend(name.as_bytes());
        out.extend(data);
        central.extend(0x02014b50u32.to_le_bytes());
        for n in [0x0314u16, 20, 0, *method, 0, 33] {
            central.extend(n.to_le_bytes());
        }
        for n in [crc, data.len() as u32, *size] {
            central.extend(n.to_le_bytes());
        }
        for n in [name.len() as u16, 0, 0, 0, 0] {
            central.extend(n.to_le_bytes());
        }
        central.extend((mode << 16).to_le_bytes());
        central.extend(offset.to_le_bytes());
        central.extend(name.as_bytes());
    }
    let offset = out.len() as u32;
    let n = central.len() as u32;
    out.extend(central);
    out.extend(0x06054b50u32.to_le_bytes());
    for n in [0u16, 0, entries.len() as u16, entries.len() as u16] {
        out.extend(n.to_le_bytes());
    }
    out.extend(n.to_le_bytes());
    out.extend(offset.to_le_bytes());
    out.extend(0u16.to_le_bytes());
    out
}
fn raw_one(name: &str) -> Vec<u8> {
    raw(&[(name, b"{}".to_vec(), 2, 0, 0o100644)])
}
macro_rules! bad_path {
    ($name:ident,$p:expr) => {
        #[test]
        fn $name() {
            assert!(archive::read(&raw_one($p)).is_err());
        }
    };
}
bad_path!(zip_traversal, "../escape");
bad_path!(zip_absolute, "/absolute/path");
bad_path!(zip_encoded_traversal, "scenes/%2e%2e.svg");
bad_path!(zip_backslash, "scenes\\home.svg");
bad_path!(zip_drive, "C:/manifest.json");
bad_path!(zip_dot, "./manifest.json");
bad_path!(zip_empty_segment, "scenes//home.svg");
bad_path!(zip_unicode, "scenes/homé.svg");
bad_path!(zip_query, "manifest.json?x");
bad_path!(zip_executable_member, "player.js");
bad_path!(zip_authoring_member, "prototype.source.json");
#[test]
fn zip_duplicate_required() {
    assert!(archive::read(&raw(&[
        ("manifest.json", b"{}".to_vec(), 2, 0, 0o100644),
        ("manifest.json", b"{}".to_vec(), 2, 0, 0o100644)
    ]))
    .is_err());
}
#[test]
fn zip_case_collision() {
    assert!(archive::read(&raw(&[
        ("scenes/home.svg", vec![], 0, 0, 0o100644),
        ("scenes/Home.svg", vec![], 0, 0, 0o100644)
    ]))
    .is_err());
}
#[test]
fn zip_symlink() {
    assert!(archive::read(&raw(&[("manifest.json", vec![], 0, 0, 0o120777)])).is_err());
}
#[test]
fn zip_device() {
    assert!(archive::read(&raw(&[("manifest.json", vec![], 0, 0, 0o020644)])).is_err());
}
#[test]
fn zip_directory() {
    assert!(archive::read(&raw(&[("manifest.json", vec![], 0, 0, 0o040755)])).is_err());
}
#[test]
fn zip_invalid_method() {
    assert!(archive::read(&raw(&[("manifest.json", vec![], 0, 12, 0o100644)])).is_err());
}
#[test]
fn zip_malformed() {
    assert!(archive::read(b"not zip").is_err());
}
#[test]
fn zip_crc_mismatch() {
    let mut b = raw_one("manifest.json");
    b[43] ^= 1;
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_header_mismatch() {
    let mut b = raw_one("manifest.json");
    b[22] ^= 1;
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_trailing_payload() {
    let mut b = raw_one("manifest.json");
    b.push(0);
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_encryption() {
    let mut b = raw_one("manifest.json");
    b[6] = 1;
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_descriptor() {
    let mut b = raw_one("manifest.json");
    b[6] = 8;
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_entry_oversize() {
    let b = raw(&[(
        "manifest.json",
        vec![0; limits::MIB / 3],
        igproto_model::limits::MANIFEST_BYTES as u32 + 1,
        8,
        0o100644,
    )]);
    assert!(archive::read(&b).unwrap_err().diagnostics[0]
        .message
        .contains("budget"));
}
#[test]
fn zip_expansion_bomb() {
    let b = raw(&[("manifest.json", vec![0], 101, 8, 0o100644)]);
    assert!(archive::read(&b).unwrap_err().diagnostics[0]
        .message
        .contains("ratio"));
}
#[test]
fn zip_aggregate_oversize() {
    let names: Vec<_> = (0..17).map(|i| format!("assets/{i:064x}.png")).collect();
    let entries: Vec<_> = names
        .iter()
        .map(|n| (n.as_str(), vec![0; 83_887], limits::PNG as u32, 8, 0o100644))
        .collect();
    let e = archive::read(&raw(&entries)).unwrap_err();
    assert!(e.diagnostics[0].message.contains("128 MiB"));
}
#[test]
fn zip_excess_entries() {
    let entries = vec![("manifest.json", vec![], 0, 0, 0o100644); limits::ENTRIES + 1];
    assert!(archive::read(&raw(&entries)).unwrap_err().diagnostics[0]
        .message
        .contains("162"));
}
#[test]
fn zip_archive_cap() {
    let bytes = vec![0; limits::ARCHIVE + 1];
    assert_eq!(
        archive::read(&bytes).unwrap_err().diagnostics[0].code,
        Code::LimitExceeded
    );
}
#[test]
fn zip_overlapping_ranges() {
    let mut b = raw(&[
        ("manifest.json", vec![], 0, 0, 0o100644),
        ("prototype.json", vec![], 0, 0, 0o100644),
    ]);
    let end = b.len() - 22;
    let c = u32::from_le_bytes(b[end + 16..end + 20].try_into().unwrap()) as usize;
    let second = c + 46 + "manifest.json".len();
    b[second + 42..second + 46].copy_from_slice(&0u32.to_le_bytes());
    assert!(archive::read(&b).is_err());
}
#[test]
fn bounded_deflate_is_supported() {
    let fs = members();
    let mut w = zip::ZipWriter::new(Cursor::new(Vec::new()));
    for (n, b) in fs {
        w.start_file(
            n,
            zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated),
        )
        .unwrap();
        w.write_all(&b).unwrap();
    }
    let b = w.finish().unwrap().into_inner();
    validate(&b).unwrap();
}
#[test]
fn package_cancellation() {
    let c = igproto_package::Control::new(std::time::Duration::from_secs(5));
    c.cancel();
    assert!(igproto_package::validate_with_control(VALID, &c).is_err());
}
#[test]
fn zip_unknown_version_needed() {
    let mut b = raw_one("manifest.json");
    b[4..6].copy_from_slice(&63u16.to_le_bytes());
    assert!(archive::read(&b).is_err());
}
#[test]
fn zip_extra_metadata() {
    let mut b = raw_one("manifest.json");
    b[28..30].copy_from_slice(&1u16.to_le_bytes());
    assert!(archive::read(&b).is_err());
}
#[test]
fn deflate_trailing_bytes() {
    let mut encoder =
        flate2::write::DeflateEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(b"{}").unwrap();
    let mut data = encoder.finish().unwrap();
    data.extend(b"junk");
    let b = raw(&[("manifest.json", data, 2, 8, 0o100644)]);
    let e = archive::read(&b).unwrap_err();
    assert!(e.diagnostics[0].message.contains("trailing"));
}
#[test]
fn zero_png_dimension() {
    let mut b = png();
    b[16..20].copy_from_slice(&0u32.to_be_bytes());
    let crc = crc32fast::hash(&b[12..29]);
    b[29..33].copy_from_slice(&crc.to_be_bytes());
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn wrong_root_viewport() {
    let mut fs = members();
    let b = String::from_utf8(fs["scenes/settings.svg"].clone())
        .unwrap()
        .replace("width=\"390\"", "width=\"391\"");
    fs.insert("scenes/settings.svg".into(), b.into_bytes());
    assert!(validate(&seal(fs)).is_err());
}
#[test]
fn preserved_attack_fixtures() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/prototype/phase-2/malicious");
    let mut count = 0;
    for p in std::fs::read_dir(root).unwrap() {
        let path = p.unwrap().path();
        if path.extension().is_some_and(|s| s == "igproto") {
            let bytes = std::fs::read(&path).unwrap();
            assert!(validate(&bytes).is_err(), "{}", path.display());
            count += 1;
        }
    }
    assert_eq!(count, 14);
}
#[test]
fn bounded_model_diagnostics() {
    let mut fs = members();
    fs.insert(
        "manifest.json".into(),
        format!(
            "{{\"version\":1,\"schemaVersion\":1,\"{}\":0}}",
            "x".repeat(2000)
        )
        .into_bytes(),
    );
    let e = validate(&writer::write(&fs).unwrap()).unwrap_err();
    assert!(e
        .diagnostics
        .iter()
        .all(|d| d.message.len() <= 1024 && d.source_path.len() <= 1024));
}
#[test]
fn png_chunk_length_overflow() {
    let mut b = png();
    b[8..12].copy_from_slice(&u32::MAX.to_be_bytes());
    assert!(images::validate(&b, "image.png").is_err());
}
#[test]
fn zip_local_offset_overflow() {
    let mut b = raw_one("manifest.json");
    let c = 45;
    b[c + 42..c + 46].copy_from_slice(&u32::MAX.to_le_bytes());
    assert!(archive::read(&b).is_err());
}
bad_path!(zip_asset_traversal, "assets/../avatar.png");
#[test]
fn embedded_local_headers_overlap_rejected() {
    let second = raw_one("prototype.json");
    let end = second.len() - 22;
    let second_c = u32::from_le_bytes(second[end + 16..end + 20].try_into().unwrap()) as usize;
    let embedded = second[..second_c].to_vec();
    let mut first = raw(&[(
        "manifest.json",
        embedded.clone(),
        embedded.len() as u32,
        0,
        0o100644,
    )]);
    let first_end = first.len() - 22;
    let first_c =
        u32::from_le_bytes(first[first_end + 16..first_end + 20].try_into().unwrap()) as usize;
    let mut record = second[second_c..end].to_vec();
    record[42..46].copy_from_slice(&43u32.to_le_bytes());
    let length = record.len();
    first.splice(first_end..first_end, record);
    let end = first.len() - 22;
    first[end + 8..end + 10].copy_from_slice(&2u16.to_le_bytes());
    first[end + 10..end + 12].copy_from_slice(&2u16.to_le_bytes());
    first[end + 12..end + 16]
        .copy_from_slice(&((first_end - first_c + length) as u32).to_le_bytes());
    let e = archive::read(&first).unwrap_err();
    assert!(e.diagnostics[0].message.contains("overlapping"));
}
