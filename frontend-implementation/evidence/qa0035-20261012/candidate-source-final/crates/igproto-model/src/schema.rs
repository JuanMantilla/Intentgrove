use crate::{limits, *};
use schemars::{json_schema, JsonSchema, Schema, SchemaGenerator};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::borrow::Cow;

/// All V1 wire version fields use integer token 1, independently of crate semver.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Version1;
impl Serialize for Version1 {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_u32(1)
    }
}
impl<'de> Deserialize<'de> for Version1 {
    fn deserialize<D: Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        if u32::deserialize(d)? == 1 {
            Ok(Self)
        } else {
            Err(serde::de::Error::custom("unsupported V1 version"))
        }
    }
}
impl JsonSchema for Version1 {
    fn schema_name() -> Cow<'static, str> {
        "Version1".into()
    }
    fn json_schema(_: &mut SchemaGenerator) -> Schema {
        json_schema!({"type":"integer","const":1})
    }
}
// Missing metadata is optional; explicit null is prohibited.
fn present<'de, D: Deserializer<'de>, T: Deserialize<'de>>(d: D) -> Result<Option<T>, D::Error> {
    T::deserialize(d).map(Some)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "lowercase")]
pub enum SceneKind {
    Base,
    Overlay,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum Trigger {
    #[serde(rename = "CLICK")]
    Click,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(tag = "type", deny_unknown_fields)]
pub enum Action {
    // V1 execution contracts for future native sessions (no reducer in this phase).
    // Navigation history and modal overlays are separate; boolean state is retained.
    #[serde(rename = "NAVIGATE")]
    /// Base → different base; push old base, truncate oldest at history capacity 32.
    Navigate { scene: SceneId },
    #[serde(rename = "BACK")]
    /// Base only; pop history or explicit no-op when empty. No destination payload.
    Back {},
    #[serde(rename = "OPEN_OVERLAY")]
    /// Base → overlay; empty overlay stack required. V1 capacity is one.
    OpenOverlay { scene: SceneId },
    #[serde(rename = "CLOSE_OVERLAY")]
    /// Overlay only; pop top, preserving base/history. No destination payload.
    CloseOverlay {},
    #[serde(rename = "TOGGLE")]
    /// Negate this scene's declared visibility boolean; override group display inline/none.
    Toggle { target: TargetId },
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Viewport {
    #[schemars(range(min=1, max=limits::VIEWPORT_SIDE))]
    pub width: u32,
    #[schemars(range(min=1, max=limits::VIEWPORT_SIDE))]
    pub height: u32,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VisibilityState {
    pub target: TargetId,
    pub initial_visible: bool,
}

/// Scene definitions have one field declaration shared by both closed wire shapes.
macro_rules! scene {
    ($name:ident, $visual:ident, $ty:ty) => {
        #[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
        #[serde(rename_all = "camelCase", deny_unknown_fields)]
        pub struct $name {
            pub id: SceneId,
            pub kind: SceneKind,
            pub $visual: $ty,
            #[schemars(length(max=limits::STATE_PER_SCENE))]
            pub local_state: Vec<VisibilityState>,
            #[serde(
                default,
                skip_serializing_if = "Option::is_none",
                deserialize_with = "present"
            )]
            #[schemars(with = "String")]
            pub label: Option<String>,
        }
        impl SceneDefinition for $name {
            fn id(&self) -> &SceneId {
                &self.id
            }
            fn kind(&self) -> SceneKind {
                self.kind
            }
            fn local_state(&self) -> &[VisibilityState] {
                &self.local_state
            }
            fn label(&self) -> Option<&str> {
                self.label.as_deref()
            }
        }
    };
}
/// Shared semantic view; no serialization adapter or compiler dependency.
pub trait SceneDefinition {
    fn id(&self) -> &SceneId;
    fn kind(&self) -> SceneKind;
    fn local_state(&self) -> &[VisibilityState];
    fn label(&self) -> Option<&str>;
}
scene!(CompiledScene, visual, String);
scene!(SourceScene, visual_binding, VisualBinding);
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VisualBinding {
    pub source: SourceId,
    pub root_target: TargetId,
    pub bounds: Bounds,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct Bounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Interaction {
    pub id: InteractionId,
    pub scene: SceneId,
    pub target: TargetId,
    pub trigger: Trigger,
    pub action: Action,
    pub transition: Transition,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "present"
    )]
    #[schemars(with = "String")]
    pub label: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Prototype {
    pub schema_version: Version1,
    pub entry: SceneId,
    #[schemars(length(min=1,max=limits::SCENES))]
    pub scenes: Vec<CompiledScene>,
    #[schemars(length(max=limits::INTERACTIONS))]
    pub interactions: Vec<Interaction>,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PrototypeSource {
    pub source_version: Version1,
    pub prototype_id: PrototypeId,
    pub viewport: Viewport,
    pub entry: SceneId,
    pub visual_sources: Vec<VisualSource>,
    #[schemars(length(min=1,max=limits::SCENES))]
    pub scenes: Vec<SourceScene>,
    #[schemars(length(max=limits::INTERACTIONS))]
    pub interactions: Vec<Interaction>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "present"
    )]
    #[schemars(with = "String")]
    pub title: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct VisualSource {
    pub id: SourceId,
    pub path: String,
    pub sha256: String,
    pub export_profile: ExportProfile,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum ExportProfile {
    #[serde(rename = "vectorcraft-svg-v1")]
    VectorcraftSvgV1,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum Format {
    #[serde(rename = "intentgrove-prototype")]
    IntentgrovePrototype,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum Profile {
    #[serde(rename = "macos-svg-v1")]
    MacosSvgV1,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum GraphPath {
    #[serde(rename = "prototype.json")]
    PrototypeJson,
}
#[derive(
    Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize, JsonSchema,
)]
pub enum Capability {
    #[serde(rename = "arial-text-v1")]
    ArialTextV1,
    #[serde(rename = "click-v1")]
    ClickV1,
    #[serde(rename = "dissolve-v1")]
    DissolveV1,
    #[serde(rename = "navigation-v1")]
    NavigationV1,
    #[serde(rename = "overlay-v1")]
    OverlayV1,
    #[serde(rename = "png-v1")]
    PngV1,
    #[serde(rename = "svg-v1")]
    SvgV1,
    #[serde(rename = "visibility-v1")]
    VisibilityV1,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Manifest {
    pub format: Format,
    pub version: Version1,
    pub schema_version: Version1,
    pub profile: Profile,
    pub prototype_id: PrototypeId,
    pub graph: GraphPath,
    pub viewport: Viewport,
    pub capabilities: Vec<Capability>,
    pub files: Vec<FileRecord>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "present"
    )]
    #[schemars(with = "String")]
    pub title: Option<String>,
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "present"
    )]
    #[schemars(with = "Generator")]
    pub generator: Option<Generator>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct Generator {
    pub name: String,
    pub version: String,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct FileRecord {
    pub path: String,
    pub media_type: MediaType,
    pub bytes: u64,
    pub sha256: String,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, JsonSchema)]
pub enum MediaType {
    #[serde(rename = "application/json")]
    Json,
    #[serde(rename = "image/svg+xml")]
    Svg,
    #[serde(rename = "image/png")]
    Png,
}
/// Editor aid derived from these types. Semantic/reference/byte rules remain Rust validation.
pub fn generated_contracts() -> Vec<(&'static str, String)> {
    fn render<T: JsonSchema>() -> String {
        let mut schema = schemars::schema_for!(T);
        schema.insert("$comment".into(), serde_json::json!("GENERATED from igproto-model Rust types. Do not edit. Semantic/reference and UTF-8 byte limits require the Rust validator."));
        serde_json::to_string_pretty(&schema).expect("schema is serializable") + "\n"
    }
    vec![
        ("manifest-v1.schema.json", render::<Manifest>()),
        ("prototype-v1.schema.json", render::<Prototype>()),
        (
            "prototype-source-v1.schema.json",
            render::<PrototypeSource>(),
        ),
    ]
}
