# Current macOS implementation/package/readiness results — 2026-10-07

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

OS IMPLEMENT for Settings and packages; frontend IMPLEMENT for IR05-04/F002R; QA RUN; OS PLAN/VERIFY for delivery reconciliation. Same-session phases, no independent review claim. Work is **PARTIAL overall**: Mac compilation/search/package work completed, rich renderer and full native/distribution acceptance still have explicit gaps.

- Settings: guarded Windows-only window drag/drop option with cfg(windows). macOS retains Tauri interception and existing Settings-event early return, keeping workspace intake blocked. Windows option preserved; current Windows compilation/runtime NOT TESTED on this host. Mac locked offline cargo check PASS; native Settings 8 PASS. Actual Settings window/focus suppression observed; real Settings drop BLOCKED by unavailable drag source.
- IR05-04: selected folder Search, literal scope, native confirmation display and sequence/error handling implemented without native contract changes. Focused nine race tests PASS, actual packaged scoped query/open PASS. Full Windows/native scope-race/locale matrix remains open.
- F002R: bounded per-block rich subtrees/staged painting/source fallback/cancellation implemented; whole-input parser failures/performance remain partial. T007/T008 Mermaid is not implemented/enabled. See owning checkpoint for concrete configuration/dependency proof gaps and proposed amendment; task checkboxes left open.

## Actual checks

`cargo check --manifest-path src-tauri/Cargo.toml --locked --offline`: PASS on macOS 27.0.1 (26A434), arm64, Rust 1.88.0. Native library: 96 PASS, 3 ignored. Settings subset: 8 PASS. Frontend serial suite: 309 PASS, 44 files. Scope subset: 9 PASS. Rich final subset: 18 PASS. Final tsc --noEmit and production web/worker bundle PASS. Existing unused/dead-code and Vite large-chunk warnings retained.

Initial full UI run used obsolete worker mocks (3 failures); updated protocol mocks and strengthened stale/block tests. Later default-worker run passed 309 assertions but failed with unhandled `Invalid active session tab`; focused session23 and serial309 reruns PASS. QA-0007 records the unresolved intermittent error. Initial package attempt failed due unused test import; corrected. No failed attempts deleted.

## Current artifacts

`src-tauri/target/release/bundle/macos/Intentgrove.app` and `src-tauri/target/release/bundle/dmg/Intentgrove-local.dmg` created with existing scripts, offline Cargo and private ad-hoc signing. Thin arm64 main/helper, expected product 0.1.0/production ID/Markdown associations/icon/14.0 plist minimum inspected. Fonts, licenses, renderer and two workers emitted by Vite into embedded Tauri frontend assets; icon external in bundle Resources; packaged renderer and XPC PNG decode observed in separate QA candidate. Strict nested/main signatures PASS. Gatekeeper retry rejects app (exit3); no trust/security bypass. DMG initial sandbox attempt failed Device not configured; authorized auto-reviewed escalation of existing script succeeded; hdiutil verify CRC VALID. No explicit image attach/mount acceptance test performed or installation performed.

Initial candidate SHA-256 main executable: `3a6a307442e09a98e3f6646d0732d393306bb5e2383893f528a8432aa82d63f2`.
Initial/helper unchanged: `0d32ac9979d400bb9c6ed52c120b842c2db61b20e2507b6816b9c69de69ed194`.
Initial DMG: `07f97fdbe99d44917222f83021a4685d0116dbb177acdca4e8494871c1397dca`.
Source: HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` plus dirty inputs. Manifest/patch/new source files and lock/config hashes are saved in `evidence/macos-20261007/`; recorded source inputs unchanged after QA. No reproducibility claim. All older differently named artifacts untouched.

## Native acceptance and readiness

Fresh separately identified QA source candidate (not exact production executable) has 27 native ledger cases: 15 PASS, 1 FAIL, 6 BLOCKED, 5 NOT TESTED. QA-0006 misleading PNG refreshed status remains open. Finder/drop inaccessible and Dock timed out; LaunchServices reopen passed separately. Source/draft preservation observed with exact hashes, clean QA process exit verified. See `../qa/runs/macos-20261007/report.md` and department handoff.

F005 reconciliation and exact macOS14/Intel/universal/install/update procedures: `../specs/012-macos-delivery/current-readiness-20261007.md`. Only macOS27 arm64 tested; 14 minimum unverified, Intel/universal unverified/not produced. Private ad-hoc integrity is not notarized distribution or Gatekeeper approval. No dependencies installed, release credentials, notarization, Applications install, publication, commit or push. Preexisting modified state and untracked audit were preserved.

## Final reference-context follow-up

Frontend final review repaired cross-block reference-definition availability and included context in render caps. The native run stays tied to c91686db… and `source-manifest-qa-baseline.json`; it does not verify this later adjustment. Current packages are rebuilt from `source-manifest.json`; final artifact hashes/checks are in `evidence/macos-20261007/current-package-hashes.txt`. The earlier 07f97f… DMG is preserved as `Intentgrove-local-before-reference-20261007.dmg`; hashes above are the initial candidate history, not the final package. Full native acceptance of the final follow-up remains NOT TESTED.

Final current executable SHA-256 `8139d3e00ad31ee571884dba9b14a8124cc1c64905b62ab1a2ffd4e842a07f7c`; final DMG `c895c773db01d6f84902f9e43088e32c2370c2fddd247d8d09b5dc6456c00ae3`. Final strict nested signatures/DMG CRC PASS, thin arm64/product metadata retained; current Gatekeeper assessment still rejects. Helper hash unchanged. Final types and worker bundle PASS. One final broad run also exposed an accidental runnable archived test (renamed .txt) and intermittent numeric Settings Escape failure; focused Settings5 PASS. Failed attempts remain saved.

Final current serial retry: 310 tests PASS, 44 files. Final-source fresh QA follow-up: 3 focused native PASS, report ../qa/runs/macos-20261007/final-followup.md; aggregate two-candidate ledger 18 PASS/1 FAIL/6 BLOCKED/5 NOT TESTED. Full final-native coverage remains partial. Load-command inspection: main minos14.0/SDK27.0, helper minos11.0/SDK15.5. These are build metadata, not minimum-OS execution proof. Both QA processes stopped; final-source manifest unchanged after native follow-up.


## Continuation — 2026-10-08

Superseded package identities and prior results above remain historical. Current delivery: [final-source report](macos-finish-20261008-report.md); final-source QA30PASS/2FAIL/10BLOCKED, production-identifier runtime unverified. Overall acceptance incomplete.
