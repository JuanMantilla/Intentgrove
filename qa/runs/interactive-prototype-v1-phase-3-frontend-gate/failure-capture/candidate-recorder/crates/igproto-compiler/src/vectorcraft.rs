//! Offline VectorCraft-export adapter. No process, protocol or native ID dependency.
use crate::{
    export::{AssetProvider, ExportProvider},
    files::ReadRoot,
};
use igproto_model::{Code, PrototypeSource, SceneId, SourceScene, Stage};
use igproto_package::{diagnostics::error, Control, Result};
use std::collections::BTreeSet;
/// Export root contains scenes/<logical-scene>.svg and relative PNGs.
/// Authoring root contains visualSources paths bound by the canonical source digests.
pub struct SavedExports {
    pub authoring: ReadRoot,
    pub exports: ReadRoot,
}
impl ExportProvider for SavedExports {
    fn scenes(&self) -> Result<BTreeSet<SceneId>> {
        self.exports
            .names("scenes")?
            .into_iter()
            .map(|n| {
                SceneId::new(n.strip_suffix(".svg").ok_or_else(|| {
                    error(
                        Code::InvalidVisual,
                        Stage::Reference,
                        &n,
                        "unknown export file",
                    )
                })?)
                .map_err(|d| error(Code::InvalidId, Stage::Decode, &n, d.to_string()))
            })
            .collect()
    }
    fn verify_sources(&self, s: &PrototypeSource, c: &Control) -> Result<()> {
        // Offline producers preserve the exporter warning channel; no loss warning
        // is accepted as a successful visual export in this profile.
        let warnings = self.exports.read("export.warnings.txt", 16 * 1024, c)?;
        if warnings.iter().any(|b| !b.is_ascii_whitespace()) {
            return Err(error(
                Code::InvalidVisual,
                Stage::Reference,
                "export.warnings.txt",
                "export warnings present; re-export without unsupported/unclassified degradation",
            ));
        }
        // Capture the canonical source at export time. Only visual bindings/digests
        // are compared: interaction edits do not require re-exporting artwork.
        let pinned = igproto_model::decode_source(&self.exports.read(
            "export.source.json",
            igproto_model::limits::SOURCE_BYTES,
            c,
        )?)?;
        if pinned.prototype_id != s.prototype_id
            || pinned.viewport != s.viewport
            || pinned.scenes.len() != s.scenes.len()
            || pinned.visual_sources.len() != s.visual_sources.len()
            || s.scenes.iter().any(|scene| {
                !pinned
                    .scenes
                    .iter()
                    .any(|p| p.id == scene.id && p.visual_binding == scene.visual_binding)
            })
            || s.visual_sources
                .iter()
                .any(|v| !pinned.visual_sources.contains(v))
        {
            return Err(error(Code::InvalidVisual,Stage::Reference,"export.source.json","saved export binding/digest changed; export snapshot must match source visual revision"));
        }
        for v in &s.visual_sources {
            if self.authoring.digest(&v.path, c)? != v.sha256 {
                return Err(error(
                    Code::InvalidVisual,
                    Stage::Reference,
                    &v.path,
                    "saved visual source digest changed; regenerate source/export binding",
                ));
            }
        }
        Ok(())
    }
    fn scene(&self, s: &SourceScene, c: &Control) -> Result<Vec<u8>> {
        self.exports.read(
            &format!("scenes/{}.svg", s.id),
            igproto_package::limits::SVG,
            c,
        )
    }
}
impl AssetProvider for SavedExports {
    fn png(&self, path: &str, c: &Control) -> Result<Vec<u8>> {
        if !path.to_ascii_lowercase().ends_with(".png") {
            return Err(error(
                Code::InvalidVisual,
                Stage::Reference,
                path,
                "only relative PNG input assets allowed",
            ));
        }
        self.exports.read(path, igproto_package::limits::PNG, c)
    }
}
