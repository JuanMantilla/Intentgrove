# Tasks: Workspace Reader

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** approved [spec.md](spec.md), [design.md](design.md), [plan.md](plan.md)
**Scope:** F001 only. A completed checkbox requires evidence in `verification.md`.

## Phase 1: Setup

- [x] T001 Install local Rust toolchain and record versions in `specs/001-workspace-reader/verification.md`.
- [x] T002 Scaffold pinned Tauri 2, React, TypeScript, Vite, and GFM dependencies in `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock`.
- [x] T003 Configure production CSP, main-window capabilities, app metadata, and asset bundling in `src-tauri/tauri.conf.json` and `src-tauri/capabilities/main.json`.

## Phase 2: Foundation

- [x] T004 Implement typed, localized command errors and process-local grant state in `src-tauri/src/state.rs` and `src/app/i18n.ts` for F001-R07/R10.
- [x] T005 Implement backend-owned native folder/file selection and grant registration in `src-tauri/src/selection.rs` for F001-R01/R02/R04.
- [x] T006 Implement path-component validation, no-symlink traversal, file identity, regular-file checks, and limits in `src-tauri/src/scope.rs` for F001-R04/R05/R07.
- [x] T007 Create disposable adversarial repository fixtures and native boundary tests in `src-tauri/tests/scope.rs` for F001-R04/R05/R07.

## Phase 3: US1 — Open and read a local repository (P1, MVP)

**Independent test:** choose a disposable folder, browse incrementally, open two Markdown documents, render GFM, and compare file hashes.

- [x] T008 [US1] Implement paged/cancellable listing and documented exclusions in `src-tauri/src/listing.rs` for F001-R01/R08.
- [x] T009 [US1] Implement bounded UTF-8 document read and file-only grants in `src-tauri/src/document.rs` for F001-R02/R05/R07.
- [x] T010 [US1] Build the approved toolbar, directory tree, tabs, and reader shell in `src/app/App.tsx` and `src/styles/app.css` for F001-R01/R02/R03/R08/R10.
- [x] T011 [US1] Render basic GFM with inert raw HTML and display-only task lists in `src/reader/MarkdownView.tsx` for F001-R02/R06.
- [x] T012 [US1] Test listing, tab identity, GFM, and no-write behavior in `src-tauri/tests/workspace.rs` and `tests/ui/workspace.test.tsx` for F001-R01/R02/R03/R05.

## Phase 4: US2 — Follow safe local links (P1)

**Independent test:** in-scope links/PNG work; remote, encoded, symlink, SVG, and escaping targets show blocked states without widening access.

- [x] T013 [US2] Implement native link resolution and bounded raster reads in `src-tauri/src/assets.rs` for F001-R04/R06.
- [x] T014 [US2] Connect safe link/image components and blocked placeholders in `src/reader/MarkdownView.tsx` for F001-R04/R06.
- [x] T015 [US2] Test link, image, scheme, and traversal fixtures in `src-tauri/tests/assets.rs` and `tests/ui/unsafe-content.test.tsx` for F001-R04/R06.

## Phase 5: US3 — Recover from errors and switch tabs (P2)

**Independent test:** duplicate-name tabs retain scroll positions; missing, denied, binary, invalid UTF-8, and oversize files show recoverable states.

- [x] T016 [US3] Implement per-tab scroll and recoverable file states in `src/workspace/tabs.ts` and `src/app/App.tsx` for F001-R03/R07.
- [x] T017 [US3] Test tab switching, cancellation, error recovery, keyboard access, and EN/ES labels in `tests/ui/states.test.tsx` for F001-R03/R07/R08/R10.

## Phase 6: US4 — Packaged reading (P1)

**Independent test:** launch the real .app with no dev server, navigate a fixture, and prove no source changes.

- [x] T018 [US4] Build the native arm64 .app and inspect bundled assets, capabilities, and test-driver absence in `specs/001-workspace-reader/verification.md` for F001-R06/R09.
- [x] T019 [US4] Run Mac acceptance, hashes, keyboard, and EN/ES checks; record PASS/FAIL/BLOCKED/NOT TESTED per requirement in `specs/001-workspace-reader/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 7: Polish and review

- [x] T020 Review renderer, IPC, filesystem scope, dependencies, and production CSP; record findings in `specs/001-workspace-reader/security-review.md`.
- [x] T021 Run formatting, type checks, unit/integration tests, and production build; record exact commands and residual limits in `specs/001-workspace-reader/verification.md`.

## Dependencies and execution

T001–T003 precede T004–T007. T008–T012 form the first runnable vertical
slice. T013–T015 and T016–T017 can proceed after the foundation, but integrate
against US1's tab and reader contracts. T018–T021 follow the implemented stories.
Tests for boundary behavior are written with the behavior they verify; no task is
marked complete merely because code compiles.

Parallel opportunities: T004's localization catalog and T006's native scope
model touch separate files; US2 asset tests and US3 UI state tests can be
prepared independently after their contracts settle. No parallel agents are
required for this project.

## Phase 8: Convergence

- [X] T022 Bound Markdown parsing and rendering work in `src/reader/MarkdownView.tsx` (and a worker if needed), show a recoverable fallback for pathological tables or long lines, and measure adversarial and 1 MiB fixtures per F001-R07/F001-R08/SC-001.
- [x] T023 Detect and refuse identifiable macOS cloud placeholders before content-opening operations in `src-tauri/src/scope.rs`, without triggering a download; add disposable detection tests and document host limits per F001-R05 and plan: file and IPC boundary (partial).
- [x] T024 Complete keyboard navigation, focus behavior, and narrow-window controls for the directory tree and tab strip in `src/app/App.tsx` and `src/styles/app.css`; verify EN/ES recovery actions per F001-R08/F001-R10/SC-006 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T025 Extend disposable native boundary fixtures in `src-tauri/src/scope.rs`, `src-tauri/src/document.rs`, and `src-tauri/src/assets.rs` for case-variant collisions, disappearing roots, symlink cycles, encoded and Unicode targets, and no-write hash/inventory assertions per F001-R04/F001-R05/F001-R07 and T007/T012/T015 (partial).
- [x] T026 Add UI regression tests in `tests/ui/` for same-document and cross-document anchors, local image success and blocked states, tab and error recovery, cancellation after leaving a folder, keyboard focus, and EN/ES parity per F001-R03/F001-R04/F001-R06/F001-R07/F001-R08/F001-R10 and T012/T015/T017 (partial).
- [x] T027 Complete the packaged macOS acceptance with disposable fixtures and a visible display: folder-to-tab-to-link/image journey, native dialogs, traffic observation, before/after hashes and inventory, 25,000-entry UI responsiveness, 1 MiB warm-load runs, keyboard, and 640×480/scaling checks; record PASS/FAIL/BLOCKED/NOT TESTED in `specs/001-workspace-reader/verification.md` per SC-001–SC-006 and T019 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T028 Evaluate the WebdriverIO Tauri service for macOS native acceptance automation, keep any embedded driver out of the production bundle, and record the automated versus manual coverage in `specs/001-workspace-reader/verification.md` per plan: verification strategy (missing).

## Phase 9: Convergence

- [X] T029 Add a bounded parsing path or equivalent interruptible fallback to `src/reader/MarkdownView.tsx` so pathological Markdown cannot stall the shell after the input-shape check; measure adversarial and 1 MiB ordinary mixed fixtures on packaged WKWebView and record the 9/10 warm-run result per F001-R08/SC-001 and T022.
- [x] T030 Complete and verify keyboard focus, EN/ES recovery actions, and unclipped controls at the 640×480 minimum window size and display scaling in `src/app/App.tsx`, `src/styles/app.css`, and packaged macOS evidence per F001-R08/F001-R10/SC-006 and T024 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T031 Run the packaged app against disposable fixtures with the dev server stopped; record folder-to-tab-to-link/image behavior, 25,000-entry UI cancellation, app traffic, fixture SHA-256/inventory, and PASS/FAIL/BLOCKED/NOT TESTED results in `specs/001-workspace-reader/verification.md` per F001-R05/F001-R06/F001-R09/SC-002–SC-005 and T019/T027 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 10: Convergence

- [X] T032 Bound or otherwise demonstrate responsiveness of the complete `src/reader/MarkdownView.tsx` render path after worker parsing, then record packaged WKWebView 1 MiB mixed-document usability in at least 9 of 10 warm runs and adversarial fallback results in `specs/001-workspace-reader/verification.md` per F001-R08/SC-001 and T022/T029.
- [x] T033 Run the packaged app with a disposable 25,000-entry fixture; record first visible entries before enumeration finishes, 10 UI cancellation acknowledgements against the 250 ms target, and window responsiveness in `specs/001-workspace-reader/verification.md` per F001-R01/SC-002 and T027/T031 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T034 Complete the packaged folder-to-tab-to-local-link/image journey with the development server stopped; observe app network and script/native execution behavior, compare fixture SHA-256 hashes and file inventories before and after, and record results in `specs/001-workspace-reader/verification.md` per F001-R05/F001-R06/F001-R09/SC-003/SC-004/SC-005 and T019/T027/T031 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T035 Exercise the packaged primary journey and every recovery action by keyboard in English and Spanish, and verify essential controls at 640×480 and tested display scaling; record results and repair any failures in `specs/001-workspace-reader/verification.md` per F001-R08/F001-R10/SC-006 and T024/T030 (partial). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## IR-05 shared navigation supplement

Native Go/state routes reuse committed client history with no new shortcuts; see [F003F native amendment](../009-folder-search/ir05-native-amendment.md) and [handoff](../../os-engineering/ir05-frontend-handoff.md). Client event regressions pass; actual macOS menu/runtime acceptance remains open. Existing workspace acceptance tasks are unchanged.


## Authorized HTML native continuation — F001-H01–H08

- [x] HN01 Implement and verify native HTML classification, acquisition, restore/recents/names-only search and type-aware local links; retain Markdown APIs and edit/recovery guards. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] HN02 Implement bounded grant/current-identity resource broker and independent resource selections, separate native rendering surface and script/network/IPC/navigation denial. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] HN03 Implement typed lifecycle, Find/Outline/location/viewport/zoom/refresh/cancellation and native-to-frontend adapters. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] HN04 Prove disposable real native authored CSS/resources/security/lifecycle journey and record exact candidate, failed attempts and limitations. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] HN05 Complete frontend integration and supported Windows/macOS packaged acceptance separately; native handoff is not UI completion. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

Execution/evidence checklist is reconciled in [native report](../../os-engineering/html-report-20261008.md). Unverified platform portions keep these umbrella tasks open.

Scoped native execution (does not close cross-platform umbrella tasks):
- [X] HN-M01 Implement shared classification, acquisition, resources, native surface/lifecycle and typed frontend provider.
- [X] HN-M02 Run real macOS engine and disposable packaged-harness security/resource/lifecycle journey; retain failed attempts and exact candidate identity.
- [X] HN-M03 Deliver actual API/budget/security/ownership/frontend handoff and reconcile affected canonical owners.
- [x] HN-W01 Compile and verify Windows adapter on a Windows SDK/WebView2 host; current host lacks target/runtime. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] HN-F01 Integrate provider in approved frontend and verify production package/picker/physical-input journeys on supported platforms. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
