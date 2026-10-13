# F005 native entry contract

Finder `Opened` and window `DragDrop` events queue until the app window/renderer is ready, then each path goes through native no-follow type/scope validation. Successful file intake issues one file-only grant; folder intake issues one root grant after explicit drop/open action. Unsupported/denied events yield localized errors, never a broad fallback. Native menu actions call the same app commands as toolbar shortcuts. Close/Quit waits for F004 choice and F003C durable final checkpoint; Cancel/failure aborts exit. Dock Reopen recreates/shows a window, restarts its refresh ownership and displays F003C state or start view.

## Automatic file requests — 2026-10-10

Supported file previews are automatically consumed after session restoration/recovery and blocking operations settle. Existing accept_native_entry adds optional fileOnly:boolean (native Option<bool>, absent defaults false for compatibility). Automatic document requests send true; a reinspection yielding folder is rejected with unsupported_type before registering a root. File registration still opens no-follow and rejects a later directory/symlink race. Folder requests retain their explicit Open action and dirty-workspace confirmation. No broad fallback or additional capability. [Authority](../automatic-native-open-20261010/amendment.md).
