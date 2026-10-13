//! Replaceable boundary: saved, scene-scoped visual bytes, never VectorCraft NodeIds.
use igproto_model::{PrototypeSource, SceneId, SourceScene};
use igproto_package::{Control, Result};
use std::collections::BTreeSet;
pub const VECTORCRAFT_REVISION: &str = "67943857311d820c2bf08eded9ff80683393d254";
pub trait ExportProvider {
    fn scenes(&self) -> Result<BTreeSet<SceneId>>;
    fn verify_sources(&self, source: &PrototypeSource, control: &Control) -> Result<()>;
    fn scene(&self, scene: &SourceScene, control: &Control) -> Result<Vec<u8>>;
}
pub trait AssetProvider {
    fn png(&self, path: &str, control: &Control) -> Result<Vec<u8>>;
}
