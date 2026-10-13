use crate::editing::EditingState;
use crate::refresh::RefreshService;
use crate::scope::{AppError, AppResult};
use crate::state::{AppState, GrantInfo};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn prepare_root_selection(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<Option<String>> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Some(selected) = app.dialog().file().blocking_pick_folder() else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| AppError::new("invalid_path", error.to_string()))?;
        state.prepare_root(&path).map(Some)
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub fn commit_root_selection(
    state: tauri::State<'_, AppState>,
    refresh: tauri::State<'_, RefreshService>,
    app: tauri::AppHandle,
    token: String,
) -> AppResult<GrantInfo> {
    let grant = state.commit_prepared_root(&token)?;
    let _ = refresh.watch_root(&grant.id);
    let _ = crate::recents::record_folder(&app, state.inner(), &grant.id);
    Ok(grant)
}

#[tauri::command]
pub fn cancel_root_selection(state: tauri::State<'_, AppState>, token: String) -> AppResult<()> {
    state.cancel_prepared_root(&token)
}

#[tauri::command]
pub async fn select_root(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    editing: tauri::State<'_, EditingState>,
    refresh: tauri::State<'_, RefreshService>,
    reselect_id: Option<String>,
) -> AppResult<Option<GrantInfo>> {
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().blocking_pick_folder();
        let Some(selected) = selected else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| AppError::new("invalid_path", error.to_string()))?;
        let grant = match reselect_id {
            Some(id) => {
                let mut sessions = editing
                    .sessions
                    .lock()
                    .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
                state.reselect_root_with(&id, &path, |files, _| {
                    for (file_id, old, new) in files {
                        if let Some(session) = sessions
                            .values_mut()
                            .find(|session| &session.file_id == file_id)
                        {
                            crate::recovery::migrate_recovery(&app, old, new, session)?;
                        }
                    }
                    Ok(())
                })?
            }
            None => state.register_root(&path)?,
        };
        let _ = refresh.watch_root(&grant.id);
        let _ = crate::recents::record_folder(&app, &state, &grant.id);
        for file_id in state.explicit_file_ids()? {
            let _ = refresh.watch_explicit_file(&file_id);
        }
        Ok(Some(grant))
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}

#[tauri::command]
pub async fn select_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    editing: tauri::State<'_, EditingState>,
    refresh: tauri::State<'_, RefreshService>,
    reselect_id: Option<String>,
) -> AppResult<Option<GrantInfo>> {
    let state = state.inner().clone();
    let editing = editing.inner().clone();
    let refresh = refresh.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app
            .dialog()
            .file()
            .add_filter(
                "Documents and images",
                &[
                    "md", "markdown", "html", "htm", "igproto", "jpg", "jpeg", "png", "gif",
                    "webp", "svg", "bmp", "tif", "tiff", "heic", "heif",
                ],
            )
            .blocking_pick_file();
        let Some(selected) = selected else {
            return Ok(None);
        };
        let path = selected
            .into_path()
            .map_err(|error| AppError::new("invalid_path", error.to_string()))?;
        let grant = match reselect_id {
            Some(id) => {
                let mut sessions = editing
                    .sessions
                    .lock()
                    .map_err(|_| AppError::new("internal", "Edit state is unavailable"))?;
                let active = sessions.values_mut().find(|session| session.file_id == id);
                let grant = state.reselect_explicit_file_with(&id, &path, |old, selected| {
                    if let Some(session) = active {
                        crate::recovery::migrate_recovery(
                            &app,
                            &old.display_path,
                            &selected.display().to_string(),
                            session,
                        )?;
                    }
                    Ok(())
                })?;
                drop(sessions);
                grant
            }
            None => state.register_explicit_file(&path)?,
        };
        let _ = refresh.watch_explicit_file(&grant.id);
        Ok(Some(grant))
    })
    .await
    .map_err(|error| AppError::new("internal", error.to_string()))?
}
