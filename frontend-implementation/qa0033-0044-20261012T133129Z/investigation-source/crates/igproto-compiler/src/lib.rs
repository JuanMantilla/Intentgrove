//! Production tooling only. Package admission remains in igproto-package.
#![forbid(unsafe_code)]
pub mod export;
pub mod files;
mod jobs;
pub mod pipeline;
pub mod vectorcraft;
pub use pipeline::{compile, CompileResult};
