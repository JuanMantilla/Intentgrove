use crate::recovery::private_storage_dir;
use crate::scope::{io_error, open_selected, AppError, AppResult};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use uuid::Uuid;

pub const MAX_SAFETY_COPY_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_COPY_FILES: usize = 100_000;

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SafetyCopyInventory {
    pub resolved_count: u64,
    pub resolved_bytes: u64,
    pub unresolved_count: u64,
    pub unresolved_bytes: u64,
    pub used_bytes: u64,
    pub quota_bytes: u64,
}

fn lock(dir: &Path) -> AppResult<crate::platform::storage::StorageLock> {
    crate::platform::storage::lock_private(
        &dir.join("copies.lock"),
        "safety_copy_error",
        "safety_copy_permissions",
    )
}

fn inventory_at(dir: &Path) -> AppResult<SafetyCopyInventory> {
    let mut result = SafetyCopyInventory {
        quota_bytes: MAX_SAFETY_COPY_BYTES,
        ..Default::default()
    };
    let mut seen = 0;
    for entry in fs::read_dir(dir).map_err(io_error)? {
        let entry = entry.map_err(io_error)?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if name == "copies.lock" {
            continue;
        }
        seen += 1;
        if seen > MAX_COPY_FILES {
            return Err(AppError::new(
                "safety_copy_quota",
                "Too many safety-copy files",
            ));
        }
        let file = open_selected(&entry.path(), false)?;
        let metadata = file.metadata().map_err(io_error)?;
        crate::platform::storage::verify_private_file(&file)
            .map_err(|e| AppError::new("safety_copy_permissions", e.message))?;
        result.used_bytes = result
            .used_bytes
            .checked_add(metadata.len())
            .ok_or_else(|| AppError::new("safety_copy_quota", "Safety-copy size overflow"))?;
        if name.ends_with(".resolved") {
            result.resolved_count += 1;
            result.resolved_bytes += metadata.len();
        } else {
            // Legacy .bak and interrupted .pending/.tmp files are unverified.
            result.unresolved_count += 1;
            result.unresolved_bytes += metadata.len();
        }
    }
    Ok(result)
}

pub struct SafetyCopyBatch {
    dir: PathBuf,
    _lock: crate::platform::storage::StorageLock,
    id: String,
    remaining: u64,
    pending: Vec<PathBuf>,
}

impl SafetyCopyBatch {
    #[cfg(all(test, target_os = "windows"))]
    pub(crate) fn begin_fixture(dir: PathBuf, reserve_bytes: u64) -> AppResult<Self> {
        crate::platform::storage::ensure_private_dir(&dir)?;
        let guard = lock(&dir)?;
        Self::begin_locked(dir, guard, reserve_bytes)
    }
    pub fn begin(app: &AppHandle, reserve_bytes: u64) -> AppResult<Self> {
        let dir = private_storage_dir(app, "save-backups")?;
        let lock = lock(&dir)?;
        Self::begin_locked(dir, lock, reserve_bytes)
    }

    fn begin_locked(
        dir: PathBuf,
        lock: crate::platform::storage::StorageLock,
        reserve_bytes: u64,
    ) -> AppResult<Self> {
        let inventory = inventory_at(&dir)?;
        let used = inventory.used_bytes;
        if inventory.resolved_count + inventory.unresolved_count > (MAX_COPY_FILES - 3) as u64 {
            return Err(AppError::new(
                "safety_copy_quota",
                "Too many safety-copy files",
            ));
        }
        if reserve_bytes > MAX_SAFETY_COPY_BYTES.saturating_sub(used) {
            return Err(AppError::new(
                "safety_copy_quota",
                "Safety-copy storage is full",
            ));
        }
        Ok(Self {
            dir,
            _lock: lock,
            id: Uuid::new_v4().to_string(),
            remaining: reserve_bytes,
            pending: Vec::new(),
        })
    }

    pub fn preserve(&mut self, role: &str, bytes: &[u8]) -> AppResult<()> {
        if !matches!(
            role,
            "original" | "staged" | "intervening" | "save-as-original"
        ) {
            return Err(AppError::new(
                "safety_copy_error",
                "Invalid safety-copy role",
            ));
        }
        if bytes.len() as u64 > self.remaining {
            return Err(AppError::new(
                "safety_copy_quota",
                "Safety-copy reserve was exceeded",
            ));
        }
        let path = self.dir.join(format!("{}-{role}.pending", self.id));
        let mut file = crate::platform::storage::create_private_file(&path)?;
        if let Err(error) = file.write_all(bytes).and_then(|_| file.sync_all()) {
            let _ = crate::platform::storage::remove_private_file(&path);
            return Err(io_error(error));
        }
        crate::platform::storage::sync_private_directory(&self.dir)?;
        self.remaining -= bytes.len() as u64;
        self.pending.push(path);
        Ok(())
    }

    pub fn resolve(&mut self) -> AppResult<()> {
        for path in self.pending.drain(..) {
            let target = path.with_extension("resolved");
            crate::platform::storage::publish_private(&path, &target)?;
        }
        crate::platform::storage::sync_private_directory(&self.dir)
    }
}

#[cfg(all(test, target_os = "windows"))]
pub(crate) fn fixture_inventory(dir: &Path) -> AppResult<SafetyCopyInventory> {
    let _guard = lock(dir)?;
    inventory_at(dir)
}

#[tauri::command]
pub async fn list_safety_copies(app: AppHandle) -> AppResult<SafetyCopyInventory> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = private_storage_dir(&app, "save-backups")?;
        let _lock = lock(&dir)?;
        inventory_at(&dir)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

fn clear_resolved_at(dir: &Path) -> AppResult<SafetyCopyInventory> {
    // Validate the full inventory before deleting anything. A malicious or
    // damaged entry must not cause a partial cleanup of verified copies.
    inventory_at(dir)?;
    let mut resolved = Vec::new();
    for entry in fs::read_dir(dir).map_err(io_error)? {
        let entry = entry.map_err(io_error)?;
        if !entry.file_name().to_string_lossy().ends_with(".resolved") {
            continue;
        }
        let file = open_selected(&entry.path(), false)?;
        crate::platform::storage::verify_private_file(&file)
            .map_err(|e| AppError::new("safety_copy_permissions", e.message))?;
        resolved.push(entry.path());
    }
    for path in resolved {
        crate::platform::storage::remove_private_file(&path).map_err(io_error)?;
    }
    crate::platform::storage::sync_private_directory(dir)?;
    inventory_at(dir)
}

#[tauri::command]
pub async fn clear_resolved_safety_copies(
    app: AppHandle,
    confirmed: bool,
) -> AppResult<SafetyCopyInventory> {
    if !confirmed {
        return Err(AppError::new(
            "confirmation_required",
            "Confirm clearing resolved safety copies",
        ));
    }
    tauri::async_runtime::spawn_blocking(move || {
        let dir = private_storage_dir(&app, "save-backups")?;
        let _lock = lock(&dir)?;
        clear_resolved_at(&dir)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(target_os = "macos")]
    use std::os::unix::fs::PermissionsExt;

    fn fixture() -> PathBuf {
        let dir = std::env::temp_dir().join(format!("md-reader-safety-copies-{}", Uuid::new_v4()));
        #[cfg(target_os = "macos")]
        fs::create_dir(&dir).unwrap();
        #[cfg(target_os = "windows")]
        crate::platform::storage::ensure_private_dir(&dir).unwrap();
        dir
    }

    #[test]
    fn over_budget_stops_before_copy_and_leaves_existing_data() {
        let dir = fixture();
        fs::write(dir.join("legacy.bak"), b"existing").unwrap();
        #[cfg(target_os = "macos")]
        let _ = fs::set_permissions(dir.join("legacy.bak"), fs::Permissions::from_mode(0o600));
        let guard = lock(&dir).unwrap();
        assert_eq!(
            SafetyCopyBatch::begin_locked(dir.clone(), guard, MAX_SAFETY_COPY_BYTES)
                .err()
                .unwrap()
                .code,
            "safety_copy_quota"
        );
        assert_eq!(fs::read(dir.join("legacy.bak")).unwrap(), b"existing");
        fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn only_resolved_copies_clear_and_legacy_pending_survive() {
        let dir = fixture();
        let guard = lock(&dir).unwrap();
        let mut batch = SafetyCopyBatch::begin_locked(dir.clone(), guard, 32).unwrap();
        batch.preserve("original", b"original").unwrap();
        batch.preserve("staged", b"staged").unwrap();
        batch.resolve().unwrap();
        drop(batch);
        fs::write(dir.join("old.bak"), b"legacy").unwrap();
        fs::write(dir.join("race.pending"), b"race").unwrap();
        for name in ["old.bak", "race.pending"] {
            #[cfg(target_os = "macos")]
            fs::set_permissions(dir.join(name), fs::Permissions::from_mode(0o600)).unwrap();
        }
        let before = inventory_at(&dir).unwrap();
        assert_eq!((before.resolved_count, before.unresolved_count), (2, 2));
        let after = clear_resolved_at(&dir).unwrap();
        assert_eq!((after.resolved_count, after.unresolved_count), (0, 2));
        assert_eq!(fs::read(dir.join("old.bak")).unwrap(), b"legacy");
        assert_eq!(fs::read(dir.join("race.pending")).unwrap(), b"race");
        fs::remove_dir_all(dir).unwrap();
    }
}
