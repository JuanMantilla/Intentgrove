use crate::{limits, *};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ValidationReport {
    pub diagnostics: Vec<Diagnostic>,
}
impl ValidationReport {
    pub fn is_valid(&self) -> bool {
        !self
            .diagnostics
            .iter()
            .any(|d| d.severity == Severity::Error)
    }
    fn add(&mut self, code: Code, stage: Stage, path: impl Into<String>, msg: impl Into<String>) {
        self.diagnostics
            .push(*Diagnostic::error(code, stage, path, msg));
    }
    fn limit(&mut self, n: usize, max: usize, path: &str) {
        if n > max {
            self.add(
                Code::LimitExceeded,
                Stage::Limit,
                path,
                format!("count {n} exceeds V1 limit {max}"),
            );
        }
    }
}
/// Facts produced by the later SVG validator, never accepted directly from package JSON.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TargetKind {
    Group,
    Rendered,
    Definition,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TargetRecord {
    pub id: TargetId,
    pub kind: TargetKind,
    /// Tagged ancestors, nearest first. Untagged structural visibility is in flags below.
    pub ancestors: Vec<TargetId>,
    pub survived_sanitation: bool,
    pub ancestor_display_none: bool,
    pub ancestor_visibility_hidden: bool,
    pub visibility_hidden: bool,
    pub display_none: bool,
}
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TargetInventory {
    pub scenes: BTreeMap<SceneId, Vec<TargetRecord>>,
}
/// Immutable graph after all shared model/inventory checks. Does not certify SVG bytes.
#[derive(Debug, Clone)]
pub struct ValidatedPrototype {
    prototype: Prototype,
    viewport: Viewport,
    warnings: Vec<Diagnostic>,
}
impl ValidatedPrototype {
    pub fn prototype(&self) -> &Prototype {
        &self.prototype
    }
    pub fn viewport(&self) -> &Viewport {
        &self.viewport
    }
    pub fn warnings(&self) -> &[Diagnostic] {
        &self.warnings
    }
}

pub fn validate_viewport(v: &Viewport) -> ValidationReport {
    let mut r = ValidationReport::default();
    if v.width == 0
        || v.height == 0
        || v.width > limits::VIEWPORT_SIDE
        || v.height > limits::VIEWPORT_SIDE
        || u64::from(v.width) * u64::from(v.height) > limits::VIEWPORT_AREA
    {
        r.add(
            Code::InvalidViewport,
            Stage::Limit,
            "$.viewport",
            format!(
                "viewport {}×{} must have sides 1–{} and area ≤{}",
                v.width,
                v.height,
                limits::VIEWPORT_SIDE,
                limits::VIEWPORT_AREA
            ),
        );
    }
    r
}
fn text(r: &mut ValidationReport, s: &str, min: usize, max: usize, path: &str) {
    if s.len() < min || s.len() > max || s.chars().any(char::is_control) {
        r.add(
            Code::InvalidString,
            Stage::Model,
            path,
            format!("text must be {min}–{max} UTF-8 bytes without control characters"),
        );
    }
}
fn sha(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
/// Canonical authoring-file path grammar; filesystem adapters still enforce authority/identity.
pub fn relative_source_path(s: &str) -> bool {
    !s.is_empty()
        && !s.contains(['\\', ':', '\0', '?', '#'])
        && !s.chars().any(char::is_control)
        && s.split('/').all(|p| !p.is_empty() && p != "." && p != "..")
}
fn semantic<S: SceneDefinition>(
    entry: &SceneId,
    scenes: &[S],
    interactions: &[Interaction],
) -> ValidationReport {
    let mut r = ValidationReport::default();
    r.limit(scenes.len(), limits::SCENES, "$.scenes");
    r.limit(interactions.len(), limits::INTERACTIONS, "$.interactions");
    if scenes.is_empty() {
        r.add(
            Code::InvalidEntry,
            Stage::Model,
            "$.scenes",
            "at least one scene is required",
        );
    }
    let mut map = BTreeMap::new();
    let mut total_state = 0;
    for (i, s) in scenes.iter().enumerate() {
        let p = format!("$.scenes[{i}]");
        if map.insert(s.id(), s).is_some() {
            r.add(
                Code::DuplicateScene,
                Stage::Model,
                format!("{p}.id"),
                format!("duplicate scene `{}`", s.id()),
            );
        }
        r.limit(
            s.local_state().len(),
            limits::STATE_PER_SCENE,
            &format!("{p}.localState"),
        );
        total_state += s.local_state().len();
        let mut state = BTreeSet::new();
        for (j, v) in s.local_state().iter().enumerate() {
            if !state.insert(&v.target) {
                r.add(
                    Code::DuplicateState,
                    Stage::Model,
                    format!("{p}.localState[{j}].target"),
                    format!(
                        "scene `{}` repeats visibility state target `{}`",
                        s.id(),
                        v.target
                    ),
                );
                let d = r.diagnostics.last_mut().unwrap();
                d.scene = Some(s.id().clone());
                d.target = Some(v.target.clone());
            }
        }
        if let Some(label) = s.label() {
            text(&mut r, label, 0, 200, &format!("{p}.label"));
        }
    }
    r.limit(total_state, limits::STATE_TOTAL, "$.scenes.localState");
    if map.get(entry).map(|s| s.kind()) != Some(SceneKind::Base) {
        r.add(
            Code::InvalidEntry,
            Stage::Reference,
            "$.entry",
            format!("entry `{entry}` must reference an existing base scene"),
        );
    }
    let mut ids = BTreeSet::new();
    let mut bindings = BTreeSet::new();
    let mut counts = BTreeMap::<&SceneId, usize>::new();
    for (i, b) in interactions.iter().enumerate() {
        let start = r.diagnostics.len();
        let p = format!("$.interactions[{i}]");
        if !ids.insert(&b.id) {
            r.add(
                Code::DuplicateInteraction,
                Stage::Model,
                format!("{p}.id"),
                format!("duplicate interaction `{}`", b.id),
            );
        }
        if !bindings.insert((&b.scene, &b.target)) {
            r.add(
                Code::DuplicateBinding,
                Stage::Model,
                format!("{p}.target"),
                "one CLICK binding per scene/target is permitted",
            );
        }
        *counts.entry(&b.scene).or_default() += 1;
        if let Some(label) = &b.label {
            text(&mut r, label, 1, 200, &format!("{p}.label"));
        } else {
            r.add(Code::MissingLabel,Stage::Model,format!("{p}.label"),"supply or derive an intelligible accessible CLICK label before production acceptance");
            r.diagnostics.last_mut().unwrap().severity = Severity::Warning;
        }
        let source = map.get(&b.scene);
        if source.is_none() {
            r.add(
                Code::MissingScene,
                Stage::Reference,
                format!("{p}.scene"),
                format!("interaction references missing source scene `{}`", b.scene),
            );
        }
        if !matches!(b.action, Action::Navigate { .. }) && b.transition != Transition::INSTANT {
            r.add(
                Code::InvalidTransition,
                Stage::Semantic,
                format!("{p}.transition"),
                "only NAVIGATE supports DISSOLVE; this action requires INSTANT",
            );
        }
        let required_role = match &b.action {
            Action::Navigate { scene } | Action::OpenOverlay { scene } => {
                let expected = if matches!(b.action, Action::Navigate { .. }) {
                    SceneKind::Base
                } else {
                    SceneKind::Overlay
                };
                match map.get(scene) {
                    None => {
                        r.add(Code::MissingScene,Stage::Reference,format!("{p}.action.scene"),format!("scene `{}` interaction target `{}` references missing destination scene `{scene}`",b.scene,b.target));
                        r.diagnostics.last_mut().unwrap().related_identifier =
                            Some(scene.to_string());
                    }
                    Some(s) if s.kind() != expected => r.add(
                        Code::InvalidActionContext,
                        Stage::Semantic,
                        format!("{p}.action.scene"),
                        format!("destination `{scene}` must be {expected:?}"),
                    ),
                    _ => {}
                }
                if matches!(b.action, Action::Navigate { .. }) && scene == &b.scene {
                    r.add(
                        Code::InvalidActionContext,
                        Stage::Semantic,
                        format!("{p}.action.scene"),
                        "self-NAVIGATE is prohibited",
                    );
                }
                Some(SceneKind::Base)
            }
            Action::Back {} => Some(SceneKind::Base),
            Action::CloseOverlay {} => Some(SceneKind::Overlay),
            Action::Toggle { target } => {
                if let Some(s) = source {
                    if !s.local_state().iter().any(|v| &v.target == target) {
                        r.add(Code::MissingState,Stage::Reference,format!("{p}.action.target"),format!("scene `{}` interaction target `{}` references undeclared visibility state `{target}`",b.scene,b.target));
                        r.diagnostics.last_mut().unwrap().related_identifier =
                            Some(target.to_string());
                    }
                }
                None
            }
        };
        if let (Some(s), Some(role)) = (source, required_role) {
            if s.kind() != role {
                r.add(
                    Code::InvalidActionContext,
                    Stage::Semantic,
                    format!("{p}.action"),
                    format!("action requires source {role:?}, found {:?}", s.kind()),
                );
            }
        }
        for d in &mut r.diagnostics[start..] {
            d.scene = Some(b.scene.clone());
            d.target = Some(b.target.clone());
            d.interaction = Some(b.id.clone());
        }
    }
    for (scene, n) in counts {
        r.limit(
            n,
            limits::INTERACTIONS_PER_SCENE,
            &format!("$.interactions[scene={scene}]"),
        );
    }
    for s in scenes {
        if s.kind() == SceneKind::Overlay
            && !interactions
                .iter()
                .any(|b| &b.scene == s.id() && matches!(b.action, Action::CloseOverlay {}))
        {
            r.add(
                Code::OverlayCloseRequired,
                Stage::Semantic,
                format!("$.scenes[id={}].kind", s.id()),
                format!("overlay `{}` requires a CLOSE_OVERLAY binding", s.id()),
            );
        }
    }
    // User-driven navigation cycles are allowed. Report unvisited base scenes as quality warnings.
    let mut reachable = BTreeSet::from([entry.clone()]);
    loop {
        let prev = reachable.len();
        for b in interactions {
            if reachable.contains(&b.scene) {
                if let Action::Navigate { scene } = &b.action {
                    reachable.insert(scene.clone());
                }
            }
        }
        if reachable.len() == prev {
            break;
        }
    }
    for s in scenes {
        if s.kind() == SceneKind::Base && !reachable.contains(s.id()) {
            r.add(
                Code::UnreachableScene,
                Stage::Semantic,
                format!("$.scenes[id={}]", s.id()),
                format!("base scene `{}` is unreachable from entry", s.id()),
            );
            r.diagnostics.last_mut().unwrap().severity = Severity::Warning;
        }
    }
    r
}
pub fn validate_source(source: &PrototypeSource) -> ValidationReport {
    let mut r = semantic(&source.entry, &source.scenes, &source.interactions);
    r.diagnostics
        .extend(validate_viewport(&source.viewport).diagnostics);
    if let Some(s) = &source.title {
        text(&mut r, s, 1, 200, "$.title");
    }
    let mut sources = BTreeSet::new();
    for (i, v) in source.visual_sources.iter().enumerate() {
        let p = format!("$.visualSources[{i}]");
        if !sources.insert(&v.id) {
            r.add(
                Code::InvalidVisual,
                Stage::Model,
                format!("{p}.id"),
                format!("duplicate visual source `{}`", v.id),
            );
        }
        if !relative_source_path(&v.path) {
            r.add(Code::InvalidVisual,Stage::Model,format!("{p}.path"),"visual source path must be project-relative without empty/dot/parent segments or URL syntax");
        }
        if !sha(&v.sha256) {
            r.add(
                Code::InvalidVisual,
                Stage::Model,
                format!("{p}.sha256"),
                "sha256 must be 64 lowercase hexadecimal characters",
            );
        }
    }
    for (i, s) in source.scenes.iter().enumerate() {
        let p = format!("$.scenes[{i}].visualBinding");
        let v = &s.visual_binding;
        let b = &v.bounds;
        if !sources.contains(&v.source) {
            r.add(
                Code::MissingSource,
                Stage::Reference,
                format!("{p}.source"),
                format!(
                    "scene `{}` references missing visual source `{}`",
                    s.id, v.source
                ),
            );
        }
        if ![b.x, b.y, b.width, b.height].iter().all(|n| n.is_finite())
            || b.width != f64::from(source.viewport.width)
            || b.height != f64::from(source.viewport.height)
        {
            r.add(
                Code::InvalidVisual,
                Stage::Model,
                format!("{p}.bounds"),
                "bounds must be finite with width/height equal to the fixed viewport",
            );
        }
    }
    r
}
pub fn validate_prototype(prototype: &Prototype, viewport: &Viewport) -> ValidationReport {
    let mut r = semantic(&prototype.entry, &prototype.scenes, &prototype.interactions);
    r.diagnostics
        .extend(validate_viewport(viewport).diagnostics);
    for (i, s) in prototype.scenes.iter().enumerate() {
        if s.visual != format!("scenes/{}.svg", s.id) {
            r.add(
                Code::InvalidVisual,
                Stage::Model,
                format!("$.scenes[{i}].visual"),
                format!("scene `{}` visual must be `scenes/{}.svg`", s.id, s.id),
            );
        }
    }
    r
}
fn inventories<S: SceneDefinition>(
    scenes: &[S],
    interactions: &[Interaction],
    inventory: &TargetInventory,
) -> ValidationReport {
    let mut r = ValidationReport::default();
    let mut total = 0;
    for (scene, records) in &inventory.scenes {
        if !scenes.iter().any(|s| s.id() == scene) {
            r.add(
                Code::InvalidInventory,
                Stage::Reference,
                format!("$.inventory[{scene}]"),
                "inventory references undeclared scene",
            );
        }
        total += records.len();
        r.limit(
            records.len(),
            limits::TARGETS_PER_SCENE,
            &format!("$.inventory[{scene}]"),
        );
    }
    r.limit(total, limits::TARGETS_TOTAL, "$.inventory");
    for s in scenes {
        let p = format!("$.inventory[{}]", s.id());
        let Some(records) = inventory.scenes.get(s.id()) else {
            r.add(
                Code::InvalidInventory,
                Stage::Reference,
                p,
                "each scene requires a target inventory (including an empty inventory)",
            );
            continue;
        };
        let mut map = BTreeMap::new();
        for t in records {
            if map.insert(&t.id, t).is_some() {
                r.add(
                    Code::DuplicateTarget,
                    Stage::Model,
                    format!("{p}[{}]", t.id),
                    format!("scene `{}` repeats target `{}`", s.id(), t.id),
                );
            }
            if !t.survived_sanitation || t.kind == TargetKind::Definition {
                r.add(
                    Code::InvalidInventory,
                    Stage::Semantic,
                    format!("{p}[{}]", t.id),
                    "marker must survive sanitation on an ordinary rendered node",
                );
            }
        }
        for t in records {
            let mut unique = BTreeSet::new();
            for (index, a) in t.ancestors.iter().enumerate() {
                if a == &t.id || !map.contains_key(a) || !unique.insert(a) {
                    r.add(
                        Code::InvalidInventory,
                        Stage::Model,
                        format!("{p}[{}].ancestors", t.id),
                        "tagged ancestor must exist, differ from target and occur once",
                    );
                }
                if map
                    .get(a)
                    .is_some_and(|parent| parent.ancestors != t.ancestors[index + 1..])
                {
                    r.add(Code::InvalidInventory,Stage::Model,format!("{p}[{}].ancestors",t.id),"inconsistent or cyclic target ancestry; every record must list all tagged ancestors nearest first");
                }
            }
        }
        let state: BTreeMap<_, _> = s
            .local_state()
            .iter()
            .map(|v| (&v.target, v.initial_visible))
            .collect();
        for (i, v) in s.local_state().iter().enumerate() {
            let path = format!("$.scenes[id={}].localState[{i}].target", s.id());
            match map.get(&v.target) {
                None => r.add(
                    Code::MissingTarget,
                    Stage::Reference,
                    &path,
                    format!("missing state target `{}` in scene `{}`", v.target, s.id()),
                ),
                Some(t) => {
                    if t.kind != TargetKind::Group {
                        r.add(
                            Code::InvalidStateTarget,
                            Stage::Semantic,
                            &path,
                            "visibility state target must be an ordinary group",
                        );
                    }
                    if t.ancestors.iter().any(|a| state.contains_key(a)) {
                        r.add(
                            Code::NestedState,
                            Stage::Semantic,
                            &path,
                            "local-state groups must not nest",
                        );
                    }
                    if t.ancestor_display_none
                        || t.ancestor_visibility_hidden
                        || t.visibility_hidden
                        || t.ancestors.iter().any(|a| {
                            map.get(a).is_some_and(|parent| {
                                parent.display_none || parent.visibility_hidden
                            })
                        })
                    {
                        r.add(Code::HiddenState,Stage::Semantic,&path,"visibility state cannot reveal a group hidden by visibility or an authored ancestor");
                    }
                }
            }
        }
        for b in interactions.iter().filter(|b| &b.scene == s.id()) {
            if !map.contains_key(&b.target) {
                r.add(
                    Code::MissingTarget,
                    Stage::Reference,
                    format!("$.interactions[id={}].target", b.id),
                    format!(
                        "scene `{}` interaction target `{}` is missing from inventory",
                        b.scene, b.target
                    ),
                );
                let d = r.diagnostics.last_mut().unwrap();
                d.scene = Some(b.scene.clone());
                d.target = Some(b.target.clone());
                d.interaction = Some(b.id.clone());
            }
        }
        if s.kind() == SceneKind::Overlay {
            let close = interactions
                .iter()
                .filter(|b| &b.scene == s.id() && matches!(b.action, Action::CloseOverlay {}))
                .any(|b| {
                    map.get(&b.target).is_some_and(|t| {
                        !t.ancestor_display_none
                            && !t.ancestor_visibility_hidden
                            && !t.visibility_hidden
                            && state.get(&t.id).is_none_or(|visible| *visible)
                            && (!t.display_none || state.contains_key(&t.id))
                            && t.ancestors.iter().all(|a| {
                                state.get(a).is_none_or(|visible| *visible)
                                    && map.get(a).is_some_and(|t| {
                                        !t.visibility_hidden
                                            && (!t.display_none || state.contains_key(a))
                                    })
                            })
                    })
                });
            if !close {
                r.add(Code::OverlayCloseRequired,Stage::Semantic,format!("$.scenes[id={}]",s.id()),"overlay requires an initially structurally reachable CLOSE_OVERLAY control; clipping/occlusion still require native QA");
            }
        }
    }
    r
}
/// Complete shared checks with external visual facts; no SVG parsing or runtime execution.
pub fn validate(
    prototype: &Prototype,
    viewport: &Viewport,
    inventory: &TargetInventory,
) -> Result<ValidatedPrototype, ValidationReport> {
    let mut r = validate_prototype(prototype, viewport);
    r.diagnostics
        .extend(inventories(&prototype.scenes, &prototype.interactions, inventory).diagnostics);
    if !r.is_valid() {
        return Err(r);
    }
    Ok(ValidatedPrototype {
        prototype: prototype.clone(),
        viewport: viewport.clone(),
        warnings: r.diagnostics,
    })
}
pub fn validate_source_with_inventory(
    source: &PrototypeSource,
    inventory: &TargetInventory,
) -> ValidationReport {
    let mut r = validate_source(source);
    r.diagnostics
        .extend(inventories(&source.scenes, &source.interactions, inventory).diagnostics);
    for s in &source.scenes {
        if !inventory.scenes.get(&s.id).is_some_and(|records| {
            records.iter().any(|t| {
                t.id == s.visual_binding.root_target
                    && t.kind == TargetKind::Group
                    && t.survived_sanitation
            })
        }) {
            r.add(
                Code::MissingTarget,
                Stage::Reference,
                format!("$.scenes[id={}].visualBinding.rootTarget", s.id),
                "scene rootTarget must be a surviving ordinary group in this scene inventory",
            );
        }
    }
    r
}
/// Derive semantic capabilities once. PNG/text facts come from the package validator.
pub fn required_capabilities(p: &Prototype, png: bool, arial_text: bool) -> Vec<Capability> {
    let mut set = BTreeSet::from([Capability::SvgV1]);
    if !p.interactions.is_empty() {
        set.insert(Capability::ClickV1);
    }
    if p.scenes.iter().any(|s| s.kind == SceneKind::Overlay) {
        set.insert(Capability::OverlayV1);
    }
    if p.scenes.iter().any(|s| !s.local_state.is_empty()) {
        set.insert(Capability::VisibilityV1);
    }
    for b in &p.interactions {
        match b.action {
            Action::Navigate { .. } | Action::Back {} => {
                set.insert(Capability::NavigationV1);
            }
            Action::OpenOverlay { .. } | Action::CloseOverlay {} => {
                set.insert(Capability::OverlayV1);
            }
            Action::Toggle { .. } => {
                set.insert(Capability::VisibilityV1);
            }
        }
        if b.transition == Transition::DISSOLVE {
            set.insert(Capability::DissolveV1);
        }
    }
    if png {
        set.insert(Capability::PngV1);
    }
    if arial_text {
        set.insert(Capability::ArialTextV1);
    }
    set.into_iter().collect()
}
/// Only model-level metadata/inventory contracts. Bytes, SHA match, CRC and resources are Phase 2.
pub fn validate_manifest(
    m: &Manifest,
    p: &Prototype,
    png: bool,
    arial_text: bool,
) -> ValidationReport {
    let mut r = validate_viewport(&m.viewport);
    if let Some(s) = &m.title {
        text(&mut r, s, 1, 200, "$.title");
    }
    if let Some(g) = &m.generator {
        text(&mut r, &g.name, 1, 80, "$.generator.name");
        text(&mut r, &g.version, 1, 80, "$.generator.version");
    }
    if m.capabilities != required_capabilities(p, png, arial_text) {
        r.add(
            Code::CapabilityMismatch,
            Stage::Semantic,
            "$.capabilities",
            "capabilities must exactly equal the unique sorted content-derived set",
        );
    }
    let mut previous: Option<&str> = None;
    for (i, f) in m.files.iter().enumerate() {
        if previous.is_some_and(|prev| prev >= f.path.as_str()) {
            r.add(
                Code::InvalidManifest,
                Stage::Model,
                format!("$.files[{i}].path"),
                "file inventory must be sorted and unique",
            );
        }
        previous = Some(&f.path);
        if !sha(&f.sha256) {
            r.add(
                Code::InvalidManifest,
                Stage::Model,
                format!("$.files[{i}].sha256"),
                "sha256 must be 64 lowercase hexadecimal characters",
            );
        }
    }
    r
}
