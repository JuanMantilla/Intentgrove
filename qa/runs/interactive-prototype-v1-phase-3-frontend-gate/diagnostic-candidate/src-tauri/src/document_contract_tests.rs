//! Rust-only regression facade, excluded from default production builds. No IPC/control transport.
pub mod document {
    pub use crate::document::{bounded_bytes, read_document_impl};
}
pub mod refresh {
    pub use crate::refresh::{
        get_confirmed_document_impl, run_reload, RefreshCore, RefreshNotice, ReloadTarget,
        ReloadUpdate,
    };
}
pub mod state {
    pub use crate::state::AppState;
}
pub mod scope {
    pub use crate::scope::{
        identity, open_relative, open_selected, read_snapshot_entries, Identity,
    };
}
pub mod platform {
    pub use crate::platform::{identity, open_selected};
    pub mod test_support {
        pub use crate::platform::test_support::*;
    }
    pub use crate::platform::PositionalRead;
    pub fn require_editing() -> crate::scope::AppResult<()> {
        crate::platform::require_editing()
    }
    pub fn validate_editable_document(file: &std::fs::File) -> crate::scope::AppResult<()> {
        crate::platform::validate_editable_document(file)
    }
    pub mod storage {
        use crate::scope::AppResult;
        use std::{fs::File, path::Path};
        pub struct StorageLock {
            _guard: crate::platform::storage::StorageLock,
        }
        pub fn ensure_private_dir(path: &Path) -> AppResult<()> {
            crate::platform::storage::ensure_private_dir(path)
        }
        pub fn lock_private(
            path: &Path,
            code: &'static str,
            permission_code: &'static str,
        ) -> AppResult<StorageLock> {
            crate::platform::storage::lock_private(path, code, permission_code)
                .map(|guard| StorageLock { _guard: guard })
        }
        pub fn create_private_file(path: &Path) -> AppResult<File> {
            crate::platform::storage::create_private_file(path)
        }
        pub fn publish_private(stage: &Path, current: &Path) -> AppResult<()> {
            crate::platform::storage::publish_private(stage, current)
        }
        pub fn verify_private_file(file: &File) -> AppResult<()> {
            crate::platform::storage::verify_private_file(file)
        }
    }
}
