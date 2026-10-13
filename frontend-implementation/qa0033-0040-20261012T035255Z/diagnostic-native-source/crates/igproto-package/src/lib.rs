//! Independent immutable V1 admission. No filesystem extraction, compiler or player.
#![forbid(unsafe_code)]
pub mod archive;
pub mod budget;
pub mod css;
pub mod diagnostics;
pub mod images;
pub mod limits;
pub mod resources;
pub mod svg;
pub mod svg_policy;
pub mod writer;
pub use diagnostics::{Report, Result};
use igproto_model::{
    Code, Diagnostic, Manifest, Prototype, Stage, TargetInventory, ValidatedPrototype,
};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
#[derive(Clone, Debug)]
pub struct Control {
    cancelled: Arc<AtomicBool>,
    deadline: Instant,
}
impl Control {
    pub fn new(duration: Duration) -> Self {
        Self {
            cancelled: Arc::new(AtomicBool::new(false)),
            deadline: Instant::now() + duration,
        }
    }
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed);
    }
    pub fn check(&self, member: &str) -> Result<()> {
        let reason = if self.cancelled.load(Ordering::Relaxed) {
            Some("cancelled")
        } else if Instant::now() > self.deadline {
            Some("deadline_exceeded")
        } else {
            None
        };
        if let Some(reason) = reason {
            let mut r = diagnostics::error(
                Code::LimitExceeded,
                Stage::Limit,
                member,
                format!("operation {reason}"),
            );
            r.diagnostics[0].related_identifier = Some(reason.into());
            Err(r)
        } else {
            Ok(())
        }
    }
}
/// Immutable admission accounting for native multi-document reservations.
#[derive(Clone, Copy, Debug)]
pub struct ResourceUsage {
    pub expanded_bytes: usize,
    pub decoded_png_bytes: u64,
}
#[derive(Debug)]
pub struct ValidatedPackage {
    manifest: Manifest,
    graph: ValidatedPrototype,
    members: BTreeMap<String, Vec<u8>>,
    inventory: TargetInventory,
    warnings: Vec<Diagnostic>,
    digest: String,
    warnings_truncated: usize,
    usage: ResourceUsage,
}
impl ValidatedPackage {
    pub fn resource_usage(&self) -> ResourceUsage {
        self.usage
    }
    pub fn manifest(&self) -> &Manifest {
        &self.manifest
    }
    pub fn prototype(&self) -> &Prototype {
        self.graph.prototype()
    }
    pub fn member(&self, path: &str) -> Option<&[u8]> {
        self.members.get(path).map(Vec::as_slice)
    }
    pub fn inventory(&self) -> &TargetInventory {
        &self.inventory
    }
    pub fn warnings_truncated(&self) -> usize {
        self.warnings_truncated
    }
    pub fn warnings(&self) -> &[Diagnostic] {
        &self.warnings
    }
    pub fn sha256(&self) -> &str {
        &self.digest
    }
}
pub fn validate(bytes: &[u8]) -> Result<ValidatedPackage> {
    validate_with_control(bytes, &Control::new(Duration::from_secs(5)))
}
pub fn validate_with_control(bytes: &[u8], control: &Control) -> Result<ValidatedPackage> {
    control.check("archive")?;
    let members = archive::read_with_control(bytes, control)?;
    let fail = |p: &str, m: &str| diagnostics::error(Code::InvalidManifest, Stage::Reference, p, m);
    let manifest = igproto_model::decode_manifest(
        members
            .get("manifest.json")
            .ok_or_else(|| fail("manifest.json", "required manifest missing"))?,
    )?;
    let expected: BTreeSet<_> = manifest
        .files
        .iter()
        .map(|f| f.path.as_str())
        .chain(std::iter::once("manifest.json"))
        .collect();
    if expected.len() != manifest.files.len() + 1
        || expected != members.keys().map(String::as_str).collect()
    {
        return Err(fail("manifest.json", "exact declared member set mismatch"));
    }
    for f in &manifest.files {
        control.check(&f.path)?;
        let b = &members[&f.path];
        if resources::media(&f.path)? != f.media_type
            || f.bytes != b.len() as u64
            || f.sha256 != resources::sha256(b)
        {
            return Err(fail(&f.path, "declared MIME/length/SHA-256 mismatch"));
        }
    }
    let prototype = igproto_model::decode_prototype(
        members
            .get("prototype.json")
            .ok_or_else(|| fail("prototype.json", "required graph missing"))?,
    )?;
    diagnostics::check(igproto_model::validate_prototype(
        &prototype,
        &manifest.viewport,
    ))?;
    let scenes: BTreeSet<_> = prototype.scenes.iter().map(|s| s.visual.as_str()).collect();
    if scenes
        != members
            .keys()
            .filter(|s| s.starts_with("scenes/"))
            .map(String::as_str)
            .collect()
    {
        return Err(fail("prototype.json", "scene member inventory mismatch"));
    }
    let mut budget = budget::PackageBudget::default();
    let asset_paths: BTreeSet<_> = members
        .keys()
        .filter(|s| s.starts_with("assets/"))
        .cloned()
        .collect();
    for path in &asset_paths {
        control.check(path)?;
        let b = &members[path];

        let info = images::validate_with_control(b, path, control)?;
        budget.png(b.len(), info.rgba_bytes)?;
        if path != &format!("assets/{}.png", resources::sha256(b)) {
            return Err(fail(path, "asset path must match its content digest"));
        }
    }
    let mut inventory = TargetInventory::default();

    let mut text = false;
    let mut warnings = Vec::new();
    for s in &prototype.scenes {
        control.check(&s.visual)?;
        let bytes = &members[&s.visual];

        let validated = svg::sanitize(
            bytes,
            &s.id,
            &manifest.viewport,
            false,
            (0., 0.),
            |href| {
                if asset_paths.contains(href) {
                    Ok(href.to_string())
                } else {
                    Err(fail(
                        &s.visual,
                        "image href must exactly match a declared packaged PNG",
                    ))
                }
            },
            control,
        )?;
        budget.scene(bytes.len(), validated.elements, validated.path_items)?;
        text |= validated.arial_text;
        inventory.scenes.insert(s.id.clone(), validated.targets);
        warnings.extend(validated.warnings);
    }
    let graph = igproto_model::validate(&prototype, &manifest.viewport, &inventory)
        .map_err(Report::from)?;
    warnings.extend_from_slice(graph.warnings());
    warnings.extend(diagnostics::check(igproto_model::validate_manifest(
        &manifest,
        &prototype,
        !asset_paths.is_empty(),
        text,
    ))?);
    let warnings_truncated = warnings.len().saturating_sub(limits::DIAGNOSTICS);
    warnings.truncate(limits::DIAGNOSTICS);
    control.check("archive")?;
    // Canonical model owns semantic validation; this type adds certified bytes/resources.
    let usage = ResourceUsage {
        expanded_bytes: members.values().map(Vec::len).sum(),
        decoded_png_bytes: budget.decoded_bytes(),
    };
    Ok(ValidatedPackage {
        usage,
        manifest,
        graph,
        members,
        inventory,
        warnings,
        digest: resources::sha256(bytes),
        warnings_truncated,
    })
}
