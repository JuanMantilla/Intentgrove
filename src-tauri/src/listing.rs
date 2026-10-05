use crate::scope::{
    open_relative, read_snapshot_entries, AppError, AppResult, DirectoryPage,
};
use crate::state::{AppState, DirectorySnapshot};
use std::fs::File;


fn directory_stamp(dir: &File) -> AppResult<String> {
    let st = crate::platform::stamp(dir)?;
    Ok(format!("{}:{}:{}:{}:{}:{}", st.device, st.inode, st.modified_seconds,
        st.modified_nanos, st.changed_seconds, st.changed_nanos))
}

fn page(snapshot: &DirectorySnapshot, offset: usize) -> AppResult<DirectoryPage> {
    if offset > snapshot.entries.len() {
        return Err(AppError::new(
            "version_changed",
            "Directory page offset expired",
        ));
    }
    let end = offset.saturating_add(200).min(snapshot.entries.len());
    Ok(DirectoryPage {
        entries: snapshot.entries[offset..end].to_vec(),
        next_offset: (end < snapshot.entries.len()).then_some(end),
        snapshot_id: snapshot.id.clone(),
    })
}

pub fn list_entries_impl(
    state: &AppState,
    root_id: &str,
    segments: Vec<String>,
    offset: usize,
    token: &str,
    snapshot_id: Option<&str>,
) -> AppResult<DirectoryPage> {
    if token.len() > 128 || token.is_empty() || offset > 1_000_000 {
        return Err(AppError::new("invalid_request", "Invalid listing request"));
    }
    let root = state.root(root_id)?;
    let dir = open_relative(&root.file, &segments, true)?;
    if let Some(id) = snapshot_id {
        let snapshot = state.snapshot(id)?;
        if snapshot.root_id != root.id
            || snapshot.segments != segments
            || snapshot.generation != root.generation
            || snapshot.stamp != directory_stamp(&dir)?
        {
            return Err(AppError::new(
                "version_changed",
                "Directory changed during paging",
            ));
        }
        root.verify_current()?;
        return page(&snapshot, offset);
    }
    if offset != 0 {
        return Err(AppError::new(
            "version_changed",
            "A new directory snapshot is required",
        ));
    }
    let before = directory_stamp(&dir)?;
    let entries = read_snapshot_entries(&dir, || state.is_cancelled(token))?;
    let after = directory_stamp(&dir)?;
    root.verify_current()?;
    if before != after {
        return Err(AppError::new(
            "version_changed",
            "Directory changed during snapshot",
        ));
    }
    let snapshot = state.store_snapshot(&root, segments, after, entries)?;
    page(&snapshot, 0)
}

#[tauri::command]
pub async fn list_entries(
    state: tauri::State<'_, AppState>,
    root_id: String,
    segments: Vec<String>,
    offset: usize,
    token: String,
    snapshot_id: Option<String>,
) -> AppResult<DirectoryPage> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        list_entries_impl(
            &state,
            &root_id,
            segments,
            offset,
            &token,
            snapshot_id.as_deref(),
        )
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub fn cancel_listing(state: tauri::State<'_, AppState>, token: String) -> AppResult<()> {
    if token.len() > 128 || token.is_empty() {
        return Err(AppError::new("invalid_request", "Invalid listing token"));
    }
    state.cancel(token)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn sorted_snapshot_pages_and_rejects_stale_token() {
        let base =
            std::env::temp_dir().join(format!("md-reader-snapshot-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&base).unwrap();
        for index in (0..202).rev() {
            fs::write(base.join(format!("file-{index:03}.md")), b"# Fixture").unwrap();
        }
        let state = AppState::default();
        let root = state.register_root(&base).unwrap();
        let first = list_entries_impl(&state, &root.id, vec![], 0, "first", None).unwrap();
        assert_eq!(first.entries.len(), 200);
        assert_eq!(first.entries[0].name, "file-000.md");
        assert_eq!(first.next_offset, Some(200));
        let second = list_entries_impl(
            &state,
            &root.id,
            vec![],
            200,
            "second",
            Some(&first.snapshot_id),
        )
        .unwrap();
        assert_eq!(second.entries.len(), 2);
        assert_eq!(second.entries[1].name, "file-201.md");
        assert_eq!(second.snapshot_id, first.snapshot_id);
        fs::write(base.join("file-202.md"), b"# New").unwrap();
        let stale = list_entries_impl(
            &state,
            &root.id,
            vec![],
            200,
            "third",
            Some(&first.snapshot_id),
        )
        .unwrap_err();
        assert_eq!(stale.code, "version_changed");
        fs::remove_dir_all(base).unwrap();
    }
}
