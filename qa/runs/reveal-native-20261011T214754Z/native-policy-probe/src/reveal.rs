//! Reveal only native-granted regular files. Renderer display paths carry no authority.
use crate::scope::{identity, open_relative, open_selected, validate_segment, AppError, AppResult};
use crate::state::{AppState, FileSource};
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum RevealTarget {
    #[serde(rename_all = "camelCase")]
    RootFile {
        root_id: String,
        segments: Vec<String>,
    },
    #[serde(rename_all = "camelCase")]
    ExplicitFile { file_id: String },
}

fn root_path(state: &AppState, root_id: &str, segments: &[String]) -> AppResult<PathBuf> {
    if segments.is_empty() || segments.len() > 128 {
        return Err(AppError::new("invalid_path", "No local file selected"));
    }
    for segment in segments {
        validate_segment(segment)?;
    }
    let root = state.root(root_id)?;
    let scoped = open_relative(&root.file, segments, false)?;
    let path = segments
        .iter()
        .fold(root.path, |path, part| path.join(part));
    // Confirm the path handed to the desktop still names the scoped file.
    if identity(&open_selected(&path, false)?)? != identity(&scoped)? {
        return Err(AppError::new(
            "reselection_required",
            "Selected file changed",
        ));
    }
    Ok(path)
}

fn resolve_path(state: &AppState, target: &RevealTarget) -> AppResult<PathBuf> {
    let path = match target {
        RevealTarget::RootFile { root_id, segments } => root_path(state, root_id, segments)?,
        RevealTarget::ExplicitFile { file_id } => {
            let grant = state.file(file_id)?;
            let path = match &grant.source {
                FileSource::Explicit { path, .. } => path.clone(),
                FileSource::Root { root_id, segments } => root_path(state, root_id, segments)?,
            };
            if identity(&open_selected(&path, false)?)? != grant.identity {
                return Err(AppError::new(
                    "reselection_required",
                    "Selected file changed; select it again",
                ));
            }
            path
        }
    };
    if !path.is_absolute() {
        return Err(AppError::new("invalid_path", "No absolute local file path"));
    }
    Ok(path)
}

#[tauri::command]
pub async fn reveal_file(state: tauri::State<'_, AppState>, target: RevealTarget) -> AppResult<()> {
    let state = state.inner().clone();
    tauri::async_runtime::spawn_blocking(move || reveal_native(&resolve_path(&state, &target)?))
        .await
        .map_err(|error| AppError::new("reveal_failed", error.to_string()))?
}

#[cfg(target_os = "macos")]
fn reveal_native(path: &std::path::Path) -> AppResult<()> {
    use std::os::unix::ffi::OsStrExt;
    extern "C" {
        fn md_reveal_file(path: *const std::ffi::c_char) -> bool;
    }
    let path = std::ffi::CString::new(path.as_os_str().as_bytes())
        .map_err(|_| AppError::new("invalid_path", "Invalid local path"))?;
    // NSWorkspace documents this operation as safe from any application thread.
    if unsafe { md_reveal_file(path.as_ptr()) } {
        Ok(())
    } else {
        Err(AppError::new(
            "reveal_failed",
            "Finder could not reveal the file",
        ))
    }
}

#[cfg(target_os = "windows")]
fn reveal_native(path: &std::path::Path) -> AppResult<()> {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;
    #[link(name = "shell32")]
    extern "system" {
        fn SHParseDisplayName(
            name: *const u16,
            context: *const c_void,
            pidl: *mut *mut c_void,
            attributes: u32,
            result: *mut u32,
        ) -> i32;
        fn SHOpenFolderAndSelectItems(
            pidl: *const c_void,
            count: u32,
            children: *const *const c_void,
            flags: u32,
        ) -> i32;
    }
    #[link(name = "ole32")]
    extern "system" {
        fn CoInitializeEx(reserved: *const c_void, flags: u32) -> i32;
        fn CoUninitialize();
        fn CoTaskMemFree(memory: *mut c_void);
    }
    fn failure(code: i32) -> AppError {
        AppError::new(
            "reveal_failed",
            format!("File Explorer HRESULT 0x{:08X}", code as u32),
        )
    }
    let name: Vec<u16> = path.as_os_str().encode_wide().chain(Some(0)).collect();
    unsafe {
        let initialized = CoInitializeEx(std::ptr::null(), 2);
        // A Tauri pool thread may already belong to a different COM apartment.
        if initialized < 0 && initialized != 0x80010106u32 as i32 {
            return Err(failure(initialized));
        }
        let mut pidl = std::ptr::null_mut();
        let parsed = SHParseDisplayName(
            name.as_ptr(),
            std::ptr::null(),
            &mut pidl,
            0,
            std::ptr::null_mut(),
        );
        let result = if parsed < 0 {
            Err(failure(parsed))
        } else if pidl.is_null() {
            Err(AppError::new("reveal_failed", "No local Shell item"))
        } else {
            let opened = SHOpenFolderAndSelectItems(pidl, 0, std::ptr::null(), 0);
            if opened < 0 {
                Err(failure(opened))
            } else {
                Ok(())
            }
        };
        if !pidl.is_null() {
            CoTaskMemFree(pidl);
        }
        if initialized >= 0 {
            CoUninitialize();
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resolves_grants_and_special_paths_without_shell_interpretation() {
        let dir = std::env::temp_dir().join(format!("reveal space {}", uuid::Uuid::new_v4()));
        std::fs::create_dir(&dir).unwrap();
        let name = "café # $&' (draft), %.md";
        let path = dir.join(name);
        std::fs::write(&path, "fixture").unwrap();
        let state = AppState::default();
        let root = state.register_root(&dir).unwrap();
        let target = RevealTarget::RootFile {
            root_id: root.id.clone(),
            segments: vec![name.into()],
        };
        assert_eq!(resolve_path(&state, &target).unwrap(), path);
        let grant = state.register_explicit_file(&path).unwrap();
        let explicit = RevealTarget::ExplicitFile { file_id: grant.id };
        assert_eq!(resolve_path(&state, &explicit).unwrap(), path);
        for segments in [
            vec![],
            vec!["..".into(), name.into()],
            vec!["virtual://file".into()],
        ] {
            assert_eq!(
                resolve_path(
                    &state,
                    &RevealTarget::RootFile {
                        root_id: root.id.clone(),
                        segments
                    }
                )
                .unwrap_err()
                .code,
                "invalid_path"
            );
        }
        assert_eq!(
            resolve_path(
                &state,
                &RevealTarget::ExplicitFile {
                    file_id: "unsaved".into()
                }
            )
            .unwrap_err()
            .code,
            "invalid_grant"
        );
        std::fs::remove_file(&path).unwrap();
        assert_eq!(resolve_path(&state, &target).unwrap_err().code, "missing");
        assert_eq!(resolve_path(&state, &explicit).unwrap_err().code, "missing");
        std::fs::write(&path, "replacement").unwrap();
        assert_eq!(
            resolve_path(&state, &explicit).unwrap_err().code,
            "reselection_required"
        );
        std::fs::remove_file(&path).unwrap();
        std::fs::remove_dir(&dir).unwrap();
    }
    #[test]
    fn rejects_virtual_and_folder_requests() {
        assert!(serde_json::from_str::<RevealTarget>(
            r#"{"kind":"root-file","rootId":"root","segments":["file.md"]}"#
        )
        .is_ok());
        assert!(
            serde_json::from_str::<RevealTarget>(r#"{"kind":"explicit-file","fileId":"id"}"#)
                .is_ok()
        );
        for input in [
            r#"{"kind":"folder","rootId":"root","segments":[]}"#,
            r#"{"kind":"explicit-file","fileId":"id","path":"/tmp/ungranted"}"#,
        ] {
            assert!(serde_json::from_str::<RevealTarget>(input).is_err());
        }
    }
}

#[cfg(test)]
mod qa_replacement_probe {
 use super::*;
 #[test]
 fn qa_unopened_listing_replacement_must_be_rejected() {
  let dir=std::env::temp_dir().join(format!("qa-reveal-replacement-{}",uuid::Uuid::new_v4()));
  std::fs::create_dir(&dir).unwrap();
  let path=dir.join("listed.md"); std::fs::write(&path,"original").unwrap();
  let state=AppState::default(); let root=state.register_root(&dir).unwrap();
  let listed=crate::listing::list_entries_impl(&state,&root.id,vec![],0,"qa-list",None).unwrap();
  assert_eq!(listed.entries[0].name,"listed.md");
  let before=identity(&open_selected(&path,false).unwrap()).unwrap();
  std::fs::rename(&path,dir.join("original.md")).unwrap();
  std::fs::write(&path,"replacement").unwrap();
  let after=identity(&open_selected(&path,false).unwrap()).unwrap();
  assert_ne!(before,after);
  let result=resolve_path(&state,&RevealTarget::RootFile{root_id:root.id,segments:vec!["listed.md".into()]});
  println!("original_identity={:?} replacement_identity={:?} resolver_result={:?}",before,after,result);
  std::fs::remove_dir_all(&dir).unwrap();
  assert!(result.is_err(),"Unopened listed item replacement accepted by production resolver");
 }
}
