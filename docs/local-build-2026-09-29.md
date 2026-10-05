# Local macOS build evidence — 2026-09-29

**Scope:** Private development build from current workspace. This is build and artifact inspection evidence, not packaged UX acceptance or a public distribution claim.

| Check | Status | Observation |
|---|---|---|
| Host/toolchain | PASS | macOS 26.2 (`Darwin 25.2.0`), arm64; macOS SDK 15.5, Command Line Tools (full Xcode unavailable); rustc 1.98.1 `aarch64-apple-darwin`, Node 20.19.6. Configured minimum macOS 14.0 is a build target, not runtime evidence. |
| UI/native regression | PASS | `npm test`: 158/158; offline `cargo test --lib`: 52 passed, 2 existing ignored. `npm run build`: PASS. |
| `.app` build | PASS | `npm run tauri build -- --bundles app` built thin arm64 bundle. Subsequent `--bundles dmg` rebuilt and ad hoc signed the app using `bundle.macOS.signingIdentity: "-"`. Cached Rust toolchain emitted `rust-objcopy` missing `libLLVM.dylib` warnings while stripping; build completed. |
| Bundle signature | PASS | `codesign --verify --deep --strict --verbose=2` reports valid on disk and designated requirement satisfied. Identifier `com.juanmantilla.markdownworkspace`, ad hoc hardened runtime, no Team ID. Mach-O SHA-256 `8d4319a9ec3e52b03772e9db267abe7114bc2e22406d7eb269f77de7ec144994`. |
| `.dmg` image | PASS | Tauri `bundle_dmg.sh` failed inside the sandbox (`Device not configured`). From a disposable staging directory containing the signed `.app` and an `/Applications` link, unsandboxed `hdiutil create` produced `src-tauri/target/release/bundle/dmg/Markdown workspace_0.1.0_aarch64.dmg`. SHA-256 `081aa3386a7f4b2d23294f23dd6a159906cf3cfc25c378817ca99986555fc55d`. `hdiutil verify`: VALID. Mounted read-only, confirmed signed thin arm64 app and Applications link, then ejected. |
| Gatekeeper | BLOCKED | `spctl --assess --type execute` returned “internal error in Code Signing subsystem.” No Gatekeeper acceptance is claimed. |
| Finder install/launch, Open With, drop, menus, Dock, Quit, session UX | NOT TESTED | The current user already has app data under this bundle ID. No production app launch or mutation of that data was performed. A disposable packaged QA environment and visible macOS interaction are required. |
| Notarization, Developer ID, Intel/universal, older macOS | NOT TESTED | No Developer ID or notarization was requested or used. No other architecture/OS was tested. |

The app/DMG paths above are local generated artifacts. No publication, commit, source document change, security-setting change or app-data cleanup occurred.

## Current F003S/F003R/F005 build pass

The table above describes an earlier artifact. The current production `.app` includes Find, Recents, Markdown Finder association, native pending Open/Drop intake, menu wiring and Dock reopen code. `npm run tauri build -- --bundles app` PASS with the same nonfatal `rust-objcopy` warning. The executable is thin arm64, SHA-256 `4035dd1f07a3106ab0542e4c5df72531f0cc2b78888204862b6f12198ebe3769`; `codesign --verify --deep --strict` PASS. `Info.plist` contains `.md`/`.markdown` Viewer association with Alternate rank. This build is ad hoc signed and not notarized.

A fresh disposable stage produced `src-tauri/target/release/bundle/dmg/Markdown workspace_0.1.0_aarch64_20260929.dmg`, SHA-256 `ac274a9c03dca4d96714cc46f47678905a138a790f259795577a9867f08e07a2`. `hdiutil verify` PASS; read-only mount showed the Applications link and an app whose executable hash matched the current `.app`; mounted `codesign --verify --deep --strict` PASS, then the image was ejected. `spctl --assess --type execute` still returned “internal error in Code Signing subsystem” (FAIL/BLOCKED by host subsystem). Visible installed launch/Finder/Drop/menu/Quit/Dock tests remain NOT TESTED. A separately identified QA build is being prepared to protect existing production app data.

## F005 cold Finder startup repair build

The prior production `.app` and DMG in the preceding section are stale after a cold Finder-open crash repair. `npm run tauri build -- --bundles app` PASS on macOS 26.2 arm64; the current ad-hoc signed production executable is thin arm64, SHA-256 `b4960ff1f44e7d46f9b4aa5c87d5f42deb8669019c4f5bde12d8116f23e5f9ad`, and `codesign --verify --deep --strict --verbose=2` PASS. The same nonfatal `rust-objcopy`/`libLLVM.dylib` strip warning occurred. A new local DMG at `src-tauri/target/release/bundle/dmg/Markdown workspace_0.1.0_aarch64_20260929_coldfix.dmg` has SHA-256 `a79aae805205361f6b4402169556c273735a59ac045f293f28bd9b7f7d8647d2`; `hdiutil verify` PASS. It has not been mounted or installed. The isolated QA app was rebuilt from this source; cold Finder-open, warm Finder-open, menu Find, clean Close/Reopen and bounded dirty draft/Quit/restore journeys passed as detailed in `specs/012-macos-delivery/verification.md`. No production bundle ID was launched, and full release acceptance remains open.

## Current F004/F003L/F003F source build

The preceding hashes are historical. `npm test -- --run` PASS 184/184; offline locked native library tests PASS 73 with 3 ignored; `npm run tauri build -- --bundles app` PASS on macOS 26.2 arm64, including the web production build. The thin arm64 production app executable SHA-256 is `ceaeac4038451d96569e0ea88c179480d7fd77077d601e8904928d2c3f015f3b`; `codesign --verify --deep --strict` PASS. It is ad hoc signed without Developer ID/notarization. The nonfatal `rust-objcopy` missing `libLLVM.dylib` warning persists.

Tauri's fancy DMG script failed inside the managed build environment. A disposable stage with the current signed app and `/Applications` link produced `src-tauri/target/release/bundle/dmg/Markdown-workspace-current-source-2026-09-29.dmg`, SHA-256 `63cd6b52ff0b9a4cc90983dd5eefaf1503c30fbef1949a04620d60dedc952874`. `hdiutil verify` PASS; read-only mounting showed the link and matching app executable, mounted `codesign --verify --deep --strict` PASS, and the image was ejected. No production app-data path was opened or cleared. Earlier isolated QA apps showed no accessible window in this session, so current packaged UI and Finder acceptance remain BLOCKED/NOT TESTED. F006 image viewing and F002R rich reading completion are still unimplemented; this artifact is a development build, not a complete product release.

## Current F002R subset source build

The previous artifacts are historical. The latest source adds bounded YAML metadata, shared heading IDs and outline, bundled Roboto/Mono and native session-backed reading settings. `npm test -- --run` PASS 190/190; locked offline `cargo test --lib` PASS 74 with 3 ignored; production worker bundle PASS. `npm run tauri build -- --bundles app` PASS with the existing nonfatal `rust-objcopy`/missing `libLLVM.dylib` warning. The thin arm64 app is ad hoc signed; `codesign --verify --deep --strict` PASS. Executable SHA-256: `86e55c12e4f70f378566001978c07cf0d53bd91a11d5284961ebf67fc1d898b0`.

Fresh `src-tauri/target/release/bundle/dmg/Markdown-workspace-current-source-2026-09-29-v2.dmg` SHA-256: `52e157a569e2e6eba6dcf976bc3d17fc2fb791971a0d3ae68fc5ce3f0b37e09e`. `hdiutil verify` PASS. A read-only mount had the same executable hash, a valid strict app signature and `/Applications` link; the image was ejected. This artifact remains a development build: F002R Mermaid/code/per-block performance and all F006 work are open, and packaged visible UX acceptance remains BLOCKED/NOT TESTED.

## Current F002R code-token build

The v2 artifact is historical. This build adds a bounded local syntax-token worker, plain fallback and exact fenced-source Copy. Full UI suite PASS 194/194; native suite remains 74 PASS, 3 ignored; production Markdown/code worker bundle PASS. `npm run tauri build -- --bundles app` PASS with the same nonfatal `rust-objcopy` warning. The thin arm64 app is ad hoc signed and strict verification passes. Executable SHA-256: `565e2e29dff0c3ff8c050dd9dcdf41a829d565bcc221d2c71fc7d1e856570ffb`.

`src-tauri/target/release/bundle/dmg/Markdown-workspace-current-source-2026-09-29-v3.dmg` SHA-256: `a6103705867e62b8c6610f8283adf7166a3503288e0910f8c76e5ea894212925`. `hdiutil verify` PASS; read-only mount showed the matching executable hash, strict valid app signature and `/Applications` link, then was ejected. This is a development artifact pending Mermaid/per-block/F006 implementation and packaged UX acceptance.

## Current v4 outline-state repair build

The v3 artifact is historical. The latest one-line outline tab-state fix passed the full 194-test UI suite; native code did not change after the 74-pass run. `npm run tauri build -- --bundles app` PASS; strict app signature PASS. Current thin arm64 executable SHA-256: `b61bfc5864c0474caf0eef3501d12428a8422c71465598aaa7127184cd5236f4`.

`src-tauri/target/release/bundle/dmg/Markdown-workspace-current-source-2026-09-29-v4.dmg` SHA-256: `3c034dc6657fe148ebd1212720c0a17c27e48ae7c001968a7007fc2269125d8d`. `hdiutil verify` PASS; read-only mount showed the matching executable hash, strict app signature and `/Applications` link, then was ejected. This remains an ad hoc signed development artifact, with F002R/F006 work and visible packaged acceptance open.

## Current subtle-motion build

The v4 DMG remains historical. [Motion implementation and verification](animation-implementation-2026-09-29.md) records the current arm64 `.app` and separately named local DMG, checksums, passing signature/image checks, and visual QA limits. No production app data was opened.
