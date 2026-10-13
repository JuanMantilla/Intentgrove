use crate::export::{AssetProvider, ExportProvider};
use base64::Engine;
use igproto_model::*;
use igproto_package::{
    diagnostics::{check, error},
    resources::sha256,
    writer::{canonical_json, write},
    Control, Result,
};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provenance {
    pub scene: SceneId,
    pub visual_source: String,
    pub visual_sha256: String,
    pub export_sha256: String,
    pub export_profile: ExportProfile,
}
#[derive(Debug)]
pub struct CompileResult {
    pub bytes: Vec<u8>,
    pub sha256: String,
    pub warnings: Vec<Diagnostic>,
    pub warnings_truncated: usize,
    pub inventory: TargetInventory,
    pub provenance: Vec<Provenance>,
    pub compiler_version: &'static str,
}
pub fn compile<E: ExportProvider, A: AssetProvider>(
    source: &[u8],
    exports: &E,
    assets: &A,
    control: &Control,
) -> Result<CompileResult> {
    let _permit = crate::jobs::Permit::acquire(control)?;
    control.check("prototype.source.json")?;
    let source = decode_source(source)?;
    let mut warnings = check(validate_source(&source))?;
    let expected: BTreeSet<_> = source.scenes.iter().map(|s| s.id.clone()).collect();
    let actual = exports.scenes()?;
    if expected != actual {
        let missing: Vec<_> = expected
            .difference(&actual)
            .map(ToString::to_string)
            .collect();
        let unknown: Vec<_> = actual
            .difference(&expected)
            .map(ToString::to_string)
            .collect();
        return Err(error(
            Code::MissingScene,
            Stage::Reference,
            "scenes",
            format!("export inventory mismatch; missing {missing:?}, unknown {unknown:?}"),
        ));
    }
    exports.verify_sources(&source, control)?;
    let mut members = BTreeMap::new();
    let mut inventory = TargetInventory::default();
    let mut live_text = false;
    let mut provenance = Vec::new();
    let mut budget = igproto_package::budget::PackageBudget::default();
    let mut local_assets: BTreeMap<String, String> = BTreeMap::new();
    let mut exported_svg_bytes = 0usize;
    for s in &source.scenes {
        control.check("compile")?;
        let bytes = exports.scene(s, control)?;
        exported_svg_bytes = exported_svg_bytes.checked_add(bytes.len()).ok_or_else(|| {
            error(
                Code::LimitExceeded,
                Stage::Limit,
                "scenes",
                "export byte total overflow",
            )
        })?;
        if exported_svg_bytes > igproto_package::limits::SVG_TOTAL {
            return Err(error(
                Code::LimitExceeded,
                Stage::Limit,
                "scenes",
                "exported SVG total exceeds 32 MiB",
            ));
        }
        let v = source
            .visual_sources
            .iter()
            .find(|v| v.id == s.visual_binding.source)
            .unwrap();
        provenance.push(Provenance {
            scene: s.id.clone(),
            visual_source: v.path.clone(),
            visual_sha256: v.sha256.clone(),
            export_sha256: sha256(&bytes),
            export_profile: v.export_profile,
        });
        let normalized = igproto_package::svg::sanitize(
            &bytes,
            &s.id,
            &source.viewport,
            true,
            (s.visual_binding.bounds.x, s.visual_binding.bounds.y),
            |href| {
                control.check("assets")?;
                if let Some(path) = local_assets.get(href) {
                    return Ok(path.clone());
                }
                let png = if let Some(data) = href.strip_prefix("data:image/png;base64,") {
                    if data.len() > igproto_package::limits::PNG * 4 / 3 + 4 {
                        return Err(error(
                            Code::LimitExceeded,
                            Stage::Limit,
                            "image",
                            "base64 PNG exceeds byte cap",
                        ));
                    }
                    base64::engine::general_purpose::STANDARD
                        .decode(data)
                        .map_err(|_| {
                            error(
                                Code::InvalidVisual,
                                Stage::Decode,
                                "image",
                                "invalid PNG base64",
                            )
                        })?
                } else {
                    if !igproto_model::relative_source_path(href)
                        || href.contains('%')
                        || href.trim() != href
                    {
                        return Err(error(
                            Code::InvalidVisual,
                            Stage::Reference,
                            href,
                            "image must be explicit relative PNG or embedded static PNG",
                        ));
                    }
                    assets.png(href, control)?
                };
                let embedded_member = format!("scenes/{}.svg", s.id);
                let asset_member = if href.starts_with("data:image/png;base64,") {
                    embedded_member.as_str()
                } else {
                    href
                };
                let info =
                    igproto_package::images::validate_with_control(&png, asset_member, control)?;
                let path = format!("assets/{}.png", sha256(&png));
                if !members.contains_key(&path) {
                    budget.png(png.len(), info.rgba_bytes)?;
                    members.insert(path.clone(), png);
                }
                if members.len() > igproto_package::limits::ENTRIES {
                    return Err(error(
                        Code::LimitExceeded,
                        Stage::Limit,
                        "assets",
                        "compiler member count exceeded",
                    ));
                }
                if !href.starts_with("data:image/png;base64,") {
                    local_assets.insert(href.into(), path.clone());
                }
                Ok(path)
            },
            control,
        )?;
        budget.scene(
            normalized.bytes.len(),
            normalized.elements,
            normalized.path_items,
        )?;
        live_text |= normalized.arial_text;
        warnings.extend(normalized.warnings);
        inventory.scenes.insert(s.id.clone(), normalized.targets);
        members.insert(format!("scenes/{}.svg", s.id), normalized.bytes);
    }
    warnings.extend(check(validate_source_with_inventory(&source, &inventory))?);
    for s in &source.scenes {
        for state in &s.local_state {
            if let Some(t) = inventory.scenes[&s.id]
                .iter()
                .find(|t| t.id == state.target)
            {
                if t.display_none == state.initial_visible {
                    let mut d = error(
                        Code::InvalidInventory,
                        Stage::Semantic,
                        &format!("scenes/{}.svg", s.id),
                        format!("initialVisible overrides authored display for `{}`", t.id),
                    )
                    .diagnostics
                    .remove(0);
                    d.severity = Severity::Warning;
                    d.scene = Some(s.id.clone());
                    d.target = Some(t.id.clone());
                    warnings.push(d);
                }
            }
        }
    }
    // Inventory warnings are authoring quality only, never missing/removed identity.
    for (s, targets) in &inventory.scenes {
        for t in targets {
            let declared = source.scenes.iter().find(|v| &v.id == s).unwrap();
            if t.id != declared.visual_binding.root_target
                && !declared.local_state.iter().any(|v| v.target == t.id)
                && !source
                    .interactions
                    .iter()
                    .any(|v| &v.scene == s && v.target == t.id)
            {
                let mut d = error(
                    Code::InvalidInventory,
                    Stage::Model,
                    &format!("scenes/{s}.svg"),
                    format!("unused marker `{}` preserved in target inventory", t.id),
                )
                .diagnostics
                .remove(0);
                d.severity = Severity::Warning;
                d.scene = Some(s.clone());
                d.target = Some(t.id.clone());
                warnings.push(d);
            }
        }
    }
    let mut graph = Prototype {
        schema_version: Version1,
        entry: source.entry.clone(),
        scenes: source
            .scenes
            .iter()
            .map(|s| CompiledScene {
                id: s.id.clone(),
                kind: s.kind,
                visual: format!("scenes/{}.svg", s.id),
                local_state: s.local_state.clone(),
                label: s.label.clone(),
            })
            .collect(),
        interactions: source.interactions.clone(),
    };
    graph.scenes.sort_by(|a, b| a.id.cmp(&b.id));
    for s in &mut graph.scenes {
        s.local_state.sort_by(|a, b| a.target.cmp(&b.target));
    }
    graph.interactions.sort_by(|a, b| a.id.cmp(&b.id));
    igproto_model::validate(&graph, &source.viewport, &inventory)
        .map_err(igproto_package::Report::from)?;
    members.insert("prototype.json".into(), canonical_json(&graph)?);
    exports.verify_sources(&source, control)?;
    for (input, package_path) in &local_assets {
        let current = assets.png(input, control)?;
        if current != members[package_path] {
            return Err(error(
                Code::InvalidVisual,
                Stage::Reference,
                input,
                "I/O/source conflict: packaged PNG changed during compilation",
            ));
        }
    }
    let manifest = Manifest {
        format: Format::IntentgrovePrototype,
        version: Version1,
        schema_version: Version1,
        profile: Profile::MacosSvgV1,
        prototype_id: source.prototype_id,
        graph: GraphPath::PrototypeJson,
        viewport: source.viewport,
        capabilities: required_capabilities(
            &graph,
            members.keys().any(|s| s.starts_with("assets/")),
            live_text,
        ),
        files: members
            .iter()
            .map(|(path, b)| FileRecord {
                path: path.clone(),
                media_type: igproto_package::resources::media(path).unwrap(),
                bytes: b.len() as u64,
                sha256: sha256(b),
            })
            .collect(),
        title: source.title,
        generator: Some(Generator {
            name: "igproto-compiler".into(),
            version: env!("CARGO_PKG_VERSION").into(),
        }),
    };
    check(validate_manifest(
        &manifest,
        &graph,
        members.keys().any(|s| s.starts_with("assets/")),
        live_text,
    ))?;
    members.insert("manifest.json".into(), canonical_json(&manifest)?);
    control.check("archive")?;
    let bytes = write(&members)?;
    let validated = igproto_package::validate_with_control(&bytes, control)?;
    warnings.extend_from_slice(validated.warnings());
    warnings.sort_by_key(|d| {
        format!(
            "{:?}/{}/{:?}/{:?}/{:?}",
            d.stage, d.source_path, d.scene, d.target, d.code
        )
    });
    warnings.dedup();
    let warnings_truncated = warnings
        .len()
        .saturating_sub(igproto_package::limits::DIAGNOSTICS)
        + validated.warnings_truncated();
    warnings.truncate(igproto_package::limits::DIAGNOSTICS);
    provenance.sort_by(|a, b| a.scene.cmp(&b.scene));
    Ok(CompileResult {
        sha256: sha256(&bytes),
        bytes,
        warnings,
        inventory,
        provenance,
        compiler_version: env!("CARGO_PKG_VERSION"),
        warnings_truncated,
    })
}
