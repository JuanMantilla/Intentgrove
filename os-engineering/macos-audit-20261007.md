# macOS readiness audit — 2026-10-07

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

Mode: PLAN/read-only source review. Host: macOS 27.0.1 (26A434), arm64. Spec Kit remains on `specs/013-windows-desktop`; no feature selection or approval changed. No application fixes, dependency changes, signing, installation or publication performed.

## Findings

1. **Build blocker:** `src-tauri/src/settings.rs:248` unconditionally calls `.drag_and_drop(false)`. The pinned Tauri 2.11.6 implementation exposes that method only under `#[cfg(windows)]`. Current macOS `cargo check` fails with E0599. Scope the Windows window option appropriately and verify the Settings drag/drop policy on macOS.
2. **Subfolder search incomplete:** `App.tsx:3112` disables the selected-folder Search action. `FolderSearchPanel.tsx` has no scope prop or confirmed-scope handling. Native support exists; IR05-04 frontend wiring and race checks remain open.
3. **Mermaid rendering incomplete:** no Mermaid dependency or `diagram-host.ts` exists; code fences go through the current CodeBlock renderer. F002R T007/T008 remain open. The bounded per-block rendering/fallback requirement also remains open as T004. These are shared v1 gaps, not Mac-only defects. Outline/metadata/highlighting have existing implementation; task checkboxes alone are not authoritative evidence of absence.
4. **Current Mac artifacts missing:** root and release bundle contain the older `Markdown workspace.app`, and root DMG is dated October 5. The scripts/config now target `Intentgrove.app` and `Intentgrove-local.dmg`; these outputs are absent from the checked locations. Existing artifacts do not verify the latest Settings/Go/search changes.
5. **Native acceptance incomplete:** fresh macOS Settings/Go focus and shortcuts, Finder/drop, dirty Close/Quit/save failure, Dock reopen, preferences/draft restart, image refresh/security, large-file and search performance journeys remain unverified. Earlier bounded Finder/Close/Quit evidence is preserved in F005 verification; it does not cover current source.
6. **Delivery evidence incomplete:** F005 metadata, install/launch/update and full-v1 matrix tasks remain open. Minimum macOS 14.0 is configured but untested; Intel/universal support is unverified. Packaging uses ad-hoc signatures; Developer ID/notarization is outside the current private-local delivery scope.

## Checks

- **FAIL:** `cargo check --manifest-path src-tauri/Cargo.toml --locked --offline` — Settings E0599 above; also unused `read_page` import warning.
- **PASS:** `./node_modules/.bin/tsc --noEmit`.
- **PASS:** `cargo check --manifest-path src-tauri/xpc/Cargo.toml --locked --offline`.
- **NOT TESTED:** linked application build, current packaged runtime, installation and release acceptance. No new native UX pass claimed.

Next: repair the Mac compilation blocker, finish IR05-04 and bounded Mermaid work, then rebuild current Intentgrove artifacts and execute the disposable macOS acceptance matrix. Existing approval boundaries remain in force.
