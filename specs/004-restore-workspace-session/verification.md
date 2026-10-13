# F003C verification ledger

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Build under work:** 2026-09-29 implementation. Approval: current spec, design, sketch and plan in `docs/approvals.md`; all four hashes matched before implementation.

| IDs | Status | Evidence / limit |
|---|---|---|
| AS-001–AS-004, AS-013, AS-015–AS-017; SC-001/002/005/006 | NOT TESTED | One bounded packaged QA trial passed: clean `entry.md` tab restored after last-window Close/LaunchServices Reopen; a disposable dirty tab and exact CodeMirror draft restored after app-menu Quit/Keep draft and a cold relaunch. Full tab/tree/scroll/layout, ten-trial and timing coverage remain open. |
| AS-005–AS-008, AS-014; SC-003 | NOT TESTED | Missing/replaced/changed fixtures and abrupt-exit trials pending. |
| AS-009–AS-012; SC-004/007 | NOT TESTED | Clear/session app-data hashes, EN/ES keyboard and production request observation pending. |

2026-09-29 setup: `node --version` v20.19.6; rustc 1.98.1 available under `/private/tmp/md-reader-rustup/toolchains/stable-aarch64-apple-darwin/bin`, macOS 26.2 arm64. `.gitignore` already excludes Node/Rust outputs, env files and logs; no publish-only ignore file is needed. No native acceptance is inferred from tool availability.

2026-09-29 implementation checks: native `session::tests` PASS 7/7 (schema/path validation, corrupt-current fallback, stale sequence, concurrent writers, picker identity, symlink/root-relative escape); `tests/ui/session.test.tsx` PASS 5/5 (tab order, active-first read, crash offer, clear confirmation, missing grant recovery). `tests/ui/workspace.test.tsx` PASS 10/10. `npm run build` PASS. These are scoped automated checks; packaged restart, Quit/Dock, timing, actual window geometry and no-write/request observation remain NOT TESTED.

Latest automated results: `npm test` PASS 158/158; native `cargo test --lib` PASS 52 with 2 ignored; focused `session::tests` PASS 8/8 including 100 durable writes; `tests/ui/session.test.tsx` PASS 8/8 including editor restoration, final checkpoint order and keyboard tab reorder. Local `.app` build/signature and mounted DMG inspection PASS as recorded in `docs/local-build-2026-09-29.md`. Packaged session UX remains NOT TESTED; Gatekeeper assessment BLOCKED by subsystem error.

Later F005 isolated QA `.app` on macOS 26.2 arm64 supplied the bounded packaged observations in the table above. The QA bundle ID is `com.juanmantilla.markdownworkspace.qaf005`; the production app data was untouched. Details and the cold Finder startup repair are in `specs/012-macos-delivery/verification.md`.


## HTML native checkpoint — 2026-10-08

F003C-H01: current implementation/evidence/limitations live in [native report](../../os-engineering/html-report-20261008.md) and [provider handoff](../../os-engineering/html-frontend-handoff.md). Prior PASS results do not certify this changed candidate. Windows and full frontend/package journeys remain separately qualified.


### HTML native scoped verification — 2026-10-08

Implemented native owner contribution; [actual handoff](../../os-engineering/html-frontend-handoff.md), [report](../../os-engineering/html-report-20261008.md), [exact evidence](../../os-engineering/evidence/html-native-20261008/). Real native Rust/filesystem, macOS engine and disposable packaged-harness scopes are distinguished from mocked frontend checks. Windows compilation/runtime, native picker/Tauri transport and complete frontend package journeys remain unverified; existing acceptance tasks are not promoted by this handoff. October6 authorization supersedes staged reapproval, and feature selection013 remains unchanged.


## Workspace layout native integration — 2026-10-08

L01/L03 native library and real macOS smoke PASS in bounded scope; L02 mocked continuity and actual dirty/search/history/recovery smoke PASS, exact nonzero anchor/selection and full matrix NOT TESTED.120native libraryPASS/5ignored,488mocked frontendPASS, local build/workerPASS; broader cargo --tests FAIL E0433 unrelated refresh harness imports. Complete commands, candidate hashes, actual AX/PNGs and limitations: ../../os-engineering/evidence/workspace-layout-native-20261008/report.md. Option set accepted; runtime user acceptance pending. No installation/release claim.
