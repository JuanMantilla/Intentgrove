//! Group Rust command inputs without changing Tauri's existing flat IPC payloads.
//! Each field uses Tauri's own argument decoder and its original camelCase key,
//! retaining required/optional-field semantics and error attribution.
macro_rules! flat_command_args {
    ($name:ident { $($field:ident : $ty:ty => $key:literal),* $(,)? }) => {
        #[derive(Debug, serde::Serialize)]
        #[serde(rename_all = "camelCase")]
        pub(crate) struct $name { $(pub(crate) $field: $ty),* }

        impl<'de, R: tauri::Runtime> tauri::ipc::CommandArg<'de, R> for $name {
            fn from_command(command: tauri::ipc::CommandItem<'de, R>)
                -> Result<Self, tauri::ipc::InvokeError>
            {
                Ok(Self {
                    $($field: <$ty as tauri::ipc::CommandArg<'de, R>>::from_command(
                        tauri::ipc::CommandItem { key: $key, ..command }
                    )?),*
                })
            }
        }
    };
}
pub(crate) use flat_command_args;

#[cfg(all(test, feature = "settings-contract-tests", target_os = "macos"))]
mod tests {
    use serde_json::{json, Value};
    use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, INVOKE_KEY};

    #[tauri::command]
    fn set_native_menu_state(args: crate::NativeMenuArgs) -> Value {
        serde_json::to_value(args).unwrap()
    }
    #[tauri::command]
    fn checkpoint_section_edit(args: crate::recovery::CheckpointArgs) -> Value {
        serde_json::to_value(args).unwrap()
    }
    #[tauri::command]
    fn start_folder_search(args: crate::search::FolderSearchArgs) -> Value {
        serde_json::to_value(args).unwrap()
    }

    #[test]
    fn grouped_inputs_preserve_flat_ipc_fields_types_and_optional_defaults() {
        let app = mock_builder()
            .invoke_handler(tauri::generate_handler![
                set_native_menu_state,
                checkpoint_section_edit,
                start_folder_search
            ])
            .build(mock_context(noop_assets()))
            .unwrap();
        let window = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let cases = [
            (
                "set_native_menu_state",
                json!({"closeTab":true,"save":false,"find":true,"reload":false,"locale":"es",
                "back":true,"forward":false,"visited":true,"clearHistory":false,"editingOwner":true,
                "editingUndo":false,"editingRedo":true,"editingSelection":false,
                "defaultMarkdownReady":true,"newMarkdownReady":false}),
                vec![
                    "back",
                    "forward",
                    "visited",
                    "clearHistory",
                    "editingOwner",
                    "editingUndo",
                    "editingRedo",
                    "editingSelection",
                    "defaultMarkdownReady",
                    "newMarkdownReady",
                ],
            ),
            (
                "checkpoint_section_edit",
                json!({"sessionId":"session","sequence":u64::MAX,"draft":"α\r\n",
                "editorJson":{"history":[1,2]},"editorScrollTop":-0.5,"editorScrollLeft":4.25,
                "readerScrollTop":10.0}),
                vec![],
            ),
            (
                "start_folder_search",
                json!({"rootId":"root","query":"å","mode":"literal","includeIgnored":true,
                "scopeSegments":["one","two"]}),
                vec!["scopeSegments"],
            ),
        ];
        for (command, payload, optional) in cases {
            let invoke = |body| {
                get_ipc_response(
                    &window,
                    tauri::webview::InvokeRequest {
                        cmd: command.into(),
                        callback: tauri::ipc::CallbackFn(0),
                        error: tauri::ipc::CallbackFn(1),
                        // macOS custom-protocol origin, matching production local IPC.
                        url: "tauri://localhost".parse().unwrap(),
                        body,
                        headers: Default::default(),
                        invoke_key: INVOKE_KEY.into(),
                    },
                )
                .map(|body| body.deserialize::<Value>().unwrap())
            };
            assert_eq!(
                invoke(tauri::ipc::InvokeBody::Json(payload.clone())).unwrap(),
                payload
            );
            for (key, value) in payload.as_object().unwrap() {
                let mut missing = payload.clone();
                missing.as_object_mut().unwrap().remove(key);
                if optional.contains(&key.as_str()) {
                    let mut expected = payload.clone();
                    expected[key] = Value::Null;
                    assert_eq!(
                        invoke(tauri::ipc::InvokeBody::Json(missing)).unwrap(),
                        expected
                    );
                    assert_eq!(
                        invoke(tauri::ipc::InvokeBody::Json(expected.clone())).unwrap(),
                        expected
                    );
                } else {
                    let error = invoke(tauri::ipc::InvokeBody::Json(missing))
                        .unwrap_err()
                        .to_string();
                    assert!(error.contains(key), "{command}: {error}");
                }
                // Value accepts all JSON by contract; other field types must reject objects.
                if key != "editorJson" {
                    let mut invalid = payload.clone();
                    invalid[key] = json!({"invalid":value});
                    let error = invoke(tauri::ipc::InvokeBody::Json(invalid))
                        .unwrap_err()
                        .to_string();
                    assert!(error.contains(key), "{command}: {error}");
                }
            }
            let mut extra = payload.clone();
            extra["unknown"] = json!(true);
            assert_eq!(
                invoke(tauri::ipc::InvokeBody::Json(extra)).unwrap(),
                payload
            );
            assert!(invoke(tauri::ipc::InvokeBody::Json(json!({"args":payload}))).is_err());
            assert!(invoke(tauri::ipc::InvokeBody::Raw(vec![1, 2, 3])).is_err());
        }
    }
}
