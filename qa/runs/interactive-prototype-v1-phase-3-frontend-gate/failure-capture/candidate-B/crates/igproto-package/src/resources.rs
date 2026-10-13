use crate::diagnostics::{error, Result};
use igproto_model::{Code, MediaType, SceneId, Stage};
use sha2::{Digest, Sha256};
pub fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
pub fn canonical_path(path: &str) -> bool {
    !path.is_empty()
        && path.len() <= 160
        && path.is_ascii()
        && !path.starts_with('/')
        && path
            .split('/')
            .all(|s| !s.is_empty() && s != "." && s != "..")
        && path
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, b'/' | b'-' | b'_' | b'.'))
}
pub fn media(path: &str) -> Result<MediaType> {
    let invalid = || {
        error(
            Code::InvalidVisual,
            Stage::Reference,
            path,
            "path is not a canonical V1 member",
        )
    };
    if !canonical_path(path) {
        return Err(invalid());
    }
    if matches!(path, "manifest.json" | "prototype.json") {
        return Ok(MediaType::Json);
    }
    if let Some(id) = path
        .strip_prefix("scenes/")
        .and_then(|s| s.strip_suffix(".svg"))
    {
        SceneId::new(id).map_err(|_| invalid())?;
        return Ok(MediaType::Svg);
    }
    if let Some(hash) = path
        .strip_prefix("assets/")
        .and_then(|s| s.strip_suffix(".png"))
    {
        if hash.len() == 64
            && hash
                .bytes()
                .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
        {
            return Ok(MediaType::Png);
        }
    }
    Err(invalid())
}
pub fn entry_limit(path: &str) -> Result<usize> {
    Ok(match media(path)? {
        MediaType::Json if path == "manifest.json" => igproto_model::limits::MANIFEST_BYTES,
        MediaType::Json => igproto_model::limits::GRAPH_BYTES,
        MediaType::Svg => crate::limits::SVG,
        MediaType::Png => crate::limits::PNG,
    })
}
