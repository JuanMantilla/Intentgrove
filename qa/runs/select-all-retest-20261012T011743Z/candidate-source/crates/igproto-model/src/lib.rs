//! Canonical, platform-neutral V1 data contracts. No file access or playback.
#![forbid(unsafe_code)]

pub mod diagnostic;
pub mod ids;
pub mod json;
pub mod limits;
pub mod schema;
pub mod transition;
pub mod validation;

pub use diagnostic::{Code, Diagnostic, Severity, Stage};
pub use ids::*;
pub use json::{decode_manifest, decode_prototype, decode_source, serialize_source};
pub use schema::*;
pub use transition::*;
pub use validation::*;
