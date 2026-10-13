# Tasks: Search the Selected Folder (F003F)

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [research](research.md), [model](data-model.md), [IPC contract](contracts/search-ipc.md), [verification](quickstart.md). **Tests:** The acceptance scenarios require disposable native, UI and packaged checks.

## Phase 1: Setup

- [x] T001 Verify the approved F003F spec/design/plan hashes and installed Spec Kit feature state; record the host and baseline in `specs/009-folder-search/verification.md`.
- [x] T002 [P] Audit and exactly pin `ignore` 0.4.22 and compatible literal matcher dependencies, licenses, transitive MSRV and offline build in `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `specs/009-folder-search/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T003 [P] Create a disposable manifest for 25,000 entries, 5,000 Markdown files, nested ignore rules, symlinks, Unicode, skips and file hashes in `specs/009-folder-search/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 2: Foundation

- [x] T004 Define root-owned job, generation, bounded result, skipped-count and progress types in `src-tauri/src/search.rs` and `src/app/api.ts`; a result stores validated relative segments, identity/version, line/byte range and bounded context, never a grant.
- [x] T005 Implement fd-relative, no-follow, cancellable traversal and bounded `.gitignore` reads in `src-tauri/src/search.rs`; never use a path-based walker or follow a symlinked ignore file.
- [x] T006 [P] Add hostile traversal, ignore-file and generation contract fixtures in `src-tauri/src/search.rs` and record their source hashes in `specs/009-folder-search/verification.md`.

## Phase 3: User Story 1 — Find in a repository (P1)

**Goal:** Incremental filename and content results from a selected root.
**Independent test:** Query the 25,000-entry fixture with ignore toggle and verify result order, context and skipped counts.

- [x] T007 [US1] Implement bounded case-insensitive filename and UTF-8 `.md`/`.markdown` content matching, ordered batches, line/context and 25,000-entry/5,000-document progress in `src-tauri/src/search.rs` (R01/R03).
- [x] T008 [US1] Apply hierarchical `.gitignore` and visible default exclusions by default, with explicit include-ignored marking, in `src-tauri/src/search.rs` (R04).
- [x] T009 [US1] Add an in-flow EN/ES keyboard Search panel, query/mode/toggle, progress, empty/zero/partial/skip states and result list in `src/app/App.tsx`, `src/app/i18n.ts` and `src/styles/app.css` (R01/R05/R10).
- [x] T010 [US1] Test name/content/ignore/skip scenarios in `src-tauri/src/search.rs` and `tests/ui/folder-search.test.tsx`; record fixture counts in `specs/009-folder-search/verification.md` (AS-001–003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 4: User Story 2 — Control work (P1)

**Goal:** Stop, invalidate stale jobs and reopen only current content.
**Independent test:** Stop a live scan, switch query/root and change a hit before opening it.

- [x] T011 [US2] Add cancellation acknowledgments and generation invalidation to `src-tauri/src/search.rs`, `src-tauri/src/lib.rs` and `src/app/App.tsx` (R06/R07).
- [x] T012 [US2] Reopen a hit through the current root grant, recheck identity/content and return current location or changed/missing explanation in `src-tauri/src/search.rs` and `src/app/App.tsx` (R02/R08).
- [x] T013 [US2] Test Stop, query/root switch, late batches and changed-result fallback in `src-tauri/src/search.rs` and `tests/ui/folder-search.test.tsx` (AS-004–006). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 5: User Story 3 — Use it safely (P1)

**Goal:** No source writes, network requests or inaccessible controls.
**Independent test:** EN/ES keyboard and 25,000-entry cancellation trials leave fixture hashes unchanged.

- [x] T014 [US3] Verify scope, symlink, explicit-file exclusion, no-write and request observation with disposable fixtures in `specs/009-folder-search/verification.md` (R09; AS-007). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T015 [US3] Run ten packaged 25,000-entry Stop trials and EN/ES keyboard checks at 640/900/1440 points; record all raw timings in `specs/009-folder-search/verification.md` (R10/R11; AS-008; SC-002/003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 6: Cross-cutting verification

- [x] T016 Run full UI/native tests, production build, signed `.app`/`.dmg` inspection and twenty manifest queries; mark AS-001–008 and SC-001–003 PASS/FAIL/BLOCKED/NOT TESTED in `specs/009-folder-search/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Dependencies and order

T001–T006 establish scope and matcher safety. US1 establishes results, US2 adds cancellation and current-file navigation, and US3 verifies packaged safety. T016 follows all stories.

## Parallel examples

T003 can run while T002 audits dependencies. After T004, native hostile fixtures in T006 can be prepared while the UI states in T009 are designed; shared native or `App.tsx` edits remain sequential.

## Implementation strategy

Complete the native scope contract, then the independently testable US1 panel. Integrate cancellation/current-file open, followed by packaged measurements. Keep all unverified targets open.

## IR-05 supplemental delivery

- [x] IR05-01 Implement identity-bound optional native subtree scope with inherited ignores and result/open containment.
- [x] IR05-02 Implement macOS Go routes/state using committed client history and existing menu events, no new accelerators.
- [x] IR05-03 Verify disposable Windows native fixtures and frontend event regressions; evidence in os-engineering/evidence/ir05/.
- [x] IR05-04 Frontend connects folder action/panel scope using os-engineering/ir05-frontend-handoff.md, including scope-switch race tests. 2026-10-07 scope9 and packaged Mac query/open PASS; frontend-implementation/evidence/macos-20261007/report.md.
- [x] IR05-05 Actual macOS native menu/build and packaged scoped-search/keyboard acceptance; existing T013-T016 remain open. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

See [native amendment](ir05-native-amendment.md).


## Final-source verification reconciliation — 2026-10-08

Scoped query/open and scope-change constituents native PASS; executing cancellation/stale batches/open replies remain native BLOCKED. Keep all full acceptance gates open; see verification continuation and current42-case ledger.


Final follow-up: NF26 executing cancellation PASS (uncapped query, observed Stop, Stopped7,527entries stable on later capture54–55). Earlier cancellation-blocked prose remains historical and is superseded for NF26 only. Native stale batch/open replies NF27 remain BLOCKED; ledger now30PASS/2FAIL/10BLOCKED.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.


## HTML continuation — F003F-H01

- [x] H-NATIVE-F003F-H01 Complete and verify the native extension described in [canonical amendment](../001-workspace-reader/html-native-amendment-20261008.md) against exact platform/candidate evidence. Source completion, targeted checks and remaining native/frontend acceptance are recorded in [handoff](../../os-engineering/html-frontend-handoff.md); preserve existing task outcomes. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
