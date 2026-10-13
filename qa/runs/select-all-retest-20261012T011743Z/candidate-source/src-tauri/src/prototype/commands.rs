use crate::{document_view::caller, scope::{AppError, AppResult}, state::AppState};
use super::session::Status;
#[tauri::command]
pub async fn get_prototype_document(window: tauri::WebviewWindow, state: tauri::State<'_, AppState>, view_token: String, generation: u64) -> AppResult<Status> {
    caller(&window)?; let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || super::status(&state, &view_token, generation)).await.map_err(|_| AppError::new("internal", "Prototype status task failed"))?
}
#[tauri::command]
pub async fn reload_prototype_document(window: tauri::WebviewWindow, state: tauri::State<'_, AppState>, view_token: String, generation: u64, request_id: u64) -> AppResult<Status> {
    caller(&window)?; let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || super::reload(&state, &view_token, generation, request_id, &igproto_package::Control::new(std::time::Duration::from_secs(5)))).await.map_err(|_| AppError::new("internal", "Prototype reload task failed"))?
}
#[tauri::command]
pub fn dispose_prototype_document(window: tauri::WebviewWindow, state: tauri::State<'_, AppState>, view_token: String, generation: u64, release_grant: bool) -> AppResult<bool> {
    caller(&window)?; super::dispose(&state, &view_token, generation, release_grant)
}
