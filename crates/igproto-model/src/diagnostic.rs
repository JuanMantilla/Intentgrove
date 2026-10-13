use crate::{InteractionId, SceneId, TargetId};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Code {
    InvalidJson,
    DuplicateKey,
    JsonDepth,
    JsonLimit,
    InvalidString,
    InvalidVersion,
    UnsupportedVersion,
    ExperimentalPackageUnsupported,
    InvalidStructure,
    InvalidId,
    InvalidViewport,
    LimitExceeded,
    DuplicateScene,
    DuplicateInteraction,
    DuplicateBinding,
    DuplicateState,
    MissingScene,
    MissingSource,
    MissingTarget,
    MissingState,
    InvalidEntry,
    InvalidActionContext,
    InvalidTransition,
    InvalidVisual,
    InvalidStateTarget,
    NestedState,
    HiddenState,
    OverlayCloseRequired,
    InvalidInventory,
    DuplicateTarget,
    InvalidManifest,
    CapabilityMismatch,
    UnreachableScene,
    MissingLabel,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Stage {
    Decode,
    Model,
    Reference,
    Semantic,
    Limit,
}
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Error,
    Warning,
}

/// Stable automation code/location; prose is explanatory and may evolve.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub code: Code,
    pub severity: Severity,
    pub stage: Stage,
    /// JSON-style member path, relative to the supplied document (no host path).
    pub source_path: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene: Option<SceneId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<TargetId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interaction: Option<InteractionId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub related_identifier: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub line: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column: Option<usize>,
}
impl Diagnostic {
    pub(crate) fn error(
        code: Code,
        stage: Stage,
        path: impl Into<String>,
        message: impl Into<String>,
    ) -> Box<Self> {
        Box::new(Self {
            code,
            severity: Severity::Error,
            stage,
            source_path: path.into(),
            message: message.into(),
            scene: None,
            target: None,
            interaction: None,
            related_identifier: None,
            line: None,
            column: None,
        })
    }
}
impl std::fmt::Display for Diagnostic {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.source_path, self.message)
    }
}
impl std::error::Error for Diagnostic {}
