# F003R verification ledger

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

Approval: User approved the F003R review set on 2026-09-29; all four gate hashes in `docs/approvals.md` matched before implementation. `.specify/feature.json` selected F003R for task generation.

| IDs | Status | Evidence / limit |
|---|---|---|
| AS-001/002/005 (native metadata and UI flow) | PASS | `src-tauri/src/recents.rs` disposable tests cover latest-use order, 50-document cap, prior-valid fallback and source-file preservation; `tests/ui/recents.test.tsx` 4/4 covers open, replaced-folder reselection routing, remove, clear confirmation, corrupt-state copy and EN/ES. Native grant identity is rechecked on open. |
| AS-003/004 (metadata removal) | PASS | Native remove/clear commands write only private recents record; disposable source bytes remain unchanged. UI test verifies confirmation and distinct session API. |
| AS-001–006 (packaged host) | NOT TESTED | One bounded QA `.app` observation passed: Finder-opened `entry.md` appeared under Recent documents with Open/Remove/Clear controls after native File → Close Tab. Source and sibling SHA-256 stayed unchanged. Restart/reselection, focus, 640/900-point layout, draft hashes and app-request observation remain open. |
| SC-001–003 | NOT TESTED | Ten trial order/reselection, ten remove/clear and packaged keyboard journeys have not been measured. |

`npm run build` PASS; full `npm test` PASS 174/174 after Recents integration; `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib` PASS 55/55 with two existing ignored tests. Focused Recents Rust 2/2 PASS after root-relative metadata change. Later F005 integration raised suite counts; see F005 ledger. No user repository was selected or changed by these tests.


## HTML native checkpoint — 2026-10-08

F003R-H01: current implementation/evidence/limitations live in [native report](../../os-engineering/html-report-20261008.md) and [provider handoff](../../os-engineering/html-frontend-handoff.md). Prior PASS results do not certify this changed candidate. Windows and full frontend/package journeys remain separately qualified.


### HTML native scoped verification — 2026-10-08

Implemented native owner contribution; [actual handoff](../../os-engineering/html-frontend-handoff.md), [report](../../os-engineering/html-report-20261008.md), [exact evidence](../../os-engineering/evidence/html-native-20261008/). Real native Rust/filesystem, macOS engine and disposable packaged-harness scopes are distinguished from mocked frontend checks. Windows compilation/runtime, native picker/Tauri transport and complete frontend package journeys remain unverified; existing acceptance tasks are not promoted by this handoff. October6 authorization supersedes staged reapproval, and feature selection013 remains unchanged.
