# Native development provenance

Status: **NATIVE_PREPARATION_BLOCKED — capture target capability unavailable**. Engineering VERIFY + app-screenshots only; no designer skill invoked. Build/launch succeeded; UI/capture verification did not.

## Source and host — P-01

Repository `/Users/juanmantilla/projects/personal/md-reader`; HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` with existing uncommitted changes. Exact status and 130 source/input SHA256 fingerprints: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-before.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-before.json). After launch/before stopping: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-after.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-after.json). **Zero fingerprint changes** across the build/runtime pass. Inputs include tracked/untracked source, native manifests/lock/config/capabilities/build script, frontend package/lock/config/entry/assets. Existing dirty changes included; no clean checkout/reset/stash performed. Generated outputs and existing external caches are not a fully hermetic dependency snapshot.

Host: macOS 27.0.1 (26A434), Apple Silicon; Node v20.19.6, Rust/cargo 1.88.0, Tauri CLI 2.11.5, Vite 8.3.1. App version 0.1.0 is metadata, not source provenance.

## Verified safe launch plan — P-02

Documented base workflow: `/Users/juanmantilla/projects/personal/md-reader/docs/workflow.md` (`npm run tauri dev`); actual `/Users/juanmantilla/projects/personal/md-reader/package.json`, `/Users/juanmantilla/projects/personal/md-reader/vite.config.ts` and `/Users/juanmantilla/projects/personal/md-reader/src-tauri/tauri.conf.json` define Vite/native development.

Supported CLI merge overlay: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/runtime-overlay.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/runtime-overlay.json), unique identifier `com.juanmantilla.intentgrove.nativevalidation.r20261010210040`, main-window incognito true and distinct validation window title; other baseline settings preserved (1280×820, min640×480). No tracked application configuration or manifest edited.

Storage verification from actual local source/dependencies:

- `/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recovery.rs:82` private_storage_dir uses Tauri app_data_dir. Session, recents, recovery and safety-copy callers use this private root; their file locks are inside the same identified root.
- Installed Tauri 2.11.6 path resolver `/Users/juanmantilla/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-2.11.6/src/path/desktop.rs:247` appends configured identifier to data_dir. Actual fresh runtime root appeared at `/Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.nativevalidation.r20261010210040`, mode0700. Only this synthetic profile's metadata was inspected (source-after.json).
- Preferences/locale are localStorage (`src/app/appearance.ts`, `src/app/App.tsx`); some reading/tree preferences persist through native session. Main incognito maps through installed Tauri runtime to Wry, and `/Users/juanmantilla/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/wry-0.55.1/src/wkwebview/mod.rs:235` selects WKWebsiteDataStore::nonPersistentDataStore. Thus main WebView browser data is ephemeral; native app files have the unique profile root. No HOME/XDG/profile-flag assumption.
- `src-tauri/src/settings.rs:552` dynamically creates a separate Settings WebView with no production incognito inheritance. **Settings was never opened**, including via menus. Required theme/language actions are exposed on the isolated main window. Isolation assessment is bounded to this main-window Markdown capture plan; it does not certify a settings/HTML/auxiliary-WebView session.
- Actual Builder/plugins and native paths inspected: no single-instance plugin, distributed IPC redirect or workspace global lock found. Session/recents/draft locks are profile-specific. The default-Markdown consent lock is separate and used by that private consent flow, which was not invoked; a loose debug executable is not an eligible production consent bundle.
- Documents/edits were to be restricted to `/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/fixtures/`. Fixtures created, none opened or edited because capture binding failed. No real application/session/preferences/recent files/documents accessed.

## Build execution — P-03

One local development workflow with a corrected binary-selection invocation:

1. `npm run build` — **PASS**, exit0: `tsc --noEmit && vite build`; generated local dist assets. Vite reported a chunk-size warning, no error. This uses installed dependencies and does not perform package installation.
2. Initial `CARGO_NET_OFFLINE=true npm_config_offline=true npm run tauri dev -- --no-watch --config /Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/runtime-overlay.json` — stopped exit101 **before native compilation**: cargo could not choose between `md_reader` and `html-native-probe`. Its Vite process exited; no manifest/default-run edit made.
3. Corrected invocation:

```sh
CARGO_NET_OFFLINE=true npm_config_offline=true npm run tauri dev -- --no-watch --config /Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/runtime-overlay.json -- --bin md_reader --offline --locked
```

**PASS native compilation:** actual DevCommand `cargo run --bin md_reader --offline --locked --no-default-features --color always --`; compiler `Finished dev profile [unoptimized + debuginfo] in 19.00s`, then `Running target/debug/md_reader`. Four unused/dead-code warnings; no fixes applied. This was a correction within the authorized development workflow, not release packaging. No fetching/installing/toolchain update.

Executable `/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/debug/md_reader`; SHA256 `0f76efdbd3fa1270bb7024d8d1fd0acbd85266471c406de3c3a5af4a6d241ff1`. **Unbundled debug/development runtime**, no new .app bundle/installer/signing/release packaging. Existing build target/cache reused; generated debug/dist outputs updated.

## Runtime connection and limitation — P-04

Native PID8686, parent8510 (Tauri CLI), started2026-10-10 21:01:03 local. CLI/npm PID8497/8510; Vite serving PID8665, cwd `/Users/juanmantilla/projects/personal/md-reader`; listener127.0.0.1:5173. Configured native origin `http://localhost:5173` allowed by current native debug navigation gate. WebKit networking PID8839 had an established connection to the task's Vite listener, and appeared with this launch (recorded process/network data in source-after.json).

Connection basis: native compile explicitly used this source path and overlay; exact source fingerprints remained unchanged; fresh task process launched that output; server cwd and WebKit connection tied development serving to this worktree. **No visual/native WebView inspection was possible**, so this record does not certify the loaded UI's intended state, font settling, window dimensions or exact DOM/source response. No hot-reload changes recorded. Native code watching disabled; frontend HMR active without observed source changes.

Installed app PID5266 `/Applications/Intentgrove.app/Contents/MacOS/md_reader` remained running with its original start time. It was not selected in Computer Use or manipulated.

## Capture capability and stop — B-01

Computer Use inventory did not expose the unbundled task runtime. `cua.getApp('/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/debug/md_reader')` returned **Invalid app**. One supported recovery using `com.juanmantilla.intentgrove.nativevalidation.r20261010210040` also returned **Invalid app**. No bound target, accessibility tree or original window image was obtained. Neither error reported an automatic approval rejection. No shell/native UI automation bypass, browser substitute or old bundle reuse.

Task native PID8686 identity checked, then SIGTERM sent under task authorization; CLI returned exit0 and its Vite server exited. Installed PID5266 left running. Development binaries, synthetic profile and fixtures retained; no cleanup.

**Missing capability:** native automation/capture binding to the unbundled executable/PID. Alternatively, a separately agreed documented development .app wrapper mechanism would be needed for the app-only capture tool; none was fabricated or assumed authorized. This is not a missing local-build approval or dependency.
