# F005 research decisions

**Date:** 2026-09-29. Current `tauri.conf.json` bundles `.app` only, min macOS 14.0; cached app is thin arm64, ad-hoc signed and lacks `CFBundleDocumentTypes`. Current `lib.rs` handles custom Quit/close but no Finder Opened, Dock Reopen or DragDrop; window Destroyed stops refresh service.

| Decision | Rationale/alternative |
|---|---|
| Use native event intake with existing scope validation. | [Tauri RunEvent Opened/Reopen](https://docs.rs/tauri/latest/x86_64-apple-darwin/tauri/enum.RunEvent.html) and [WindowEvent DragDrop](https://docs.rs/tauri/latest/tauri/enum.WindowEvent.html) carry file events. Queue cold events until UI ready; feed each path to native no-follow `open_selected` and file-only grant registration. No renderer path becomes authority. |
| Declare exact document associations. | [Apple CFBundleDocumentTypes](https://developer.apple.com/documentation/bundleresources/information-property-list/cfbundledocumenttypes) in merged [Tauri Info.plist](https://v2.tauri.app/distribute/macos-application-bundle/) should cover `.md`/`.markdown` and only F006-approved image types. Verify Launch Services on minimum OS. |
| Coordinate lifecycle. | Every clean/dirty Close/Quit waits for F003C final checkpoint; dirty choices still follow F004. Dock Reopen recreates/show window and restarts refresh service ownership after last-window Destroyed. |
| Build private app and DMG, verify truthfully. | [Tauri DMG](https://v2.tauri.app/distribute/dmg/) supports local bundle. Ad-hoc signing is local evidence only; [Developer ID/notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution) require separate authorization. Inspect plist, codesign, Gatekeeper, checksums and actual mounted-DMG install. |

Host observed macOS 26.2 arm64, CLT SDK 15.5. Native display/Finder tests unavailable in current sandbox. No public distribution or paid service is authorized.
