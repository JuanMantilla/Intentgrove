# Tasks: Search the Selected Folder (F003F)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [research](research.md), [model](data-model.md), [IPC contract](contracts/search-ipc.md), [verification](quickstart.md). **Tests:** The acceptance scenarios require disposable native, UI and packaged checks.

## Phase 1: Setup

- [x] T001 Verify the approved F003F spec/design/plan hashes and installed Spec Kit feature state; record the host and baseline in `specs/009-folder-search/verification.md`.
- [ ] T002 [P] Audit and exactly pin `ignore` 0.4.22 and compatible literal matcher dependencies, licenses, transitive MSRV and offline build in `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock` and `specs/009-folder-search/verification.md`.
- [ ] T003 [P] Create a disposable manifest for 25,000 entries, 5,000 Markdown files, nested ignore rules, symlinks, Unicode, skips and file hashes in `specs/009-folder-search/verification.md`.

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
- [ ] T010 [US1] Test name/content/ignore/skip scenarios in `src-tauri/src/search.rs` and `tests/ui/folder-search.test.tsx`; record fixture counts in `specs/009-folder-search/verification.md` (AS-001–003).

## Phase 4: User Story 2 — Control work (P1)

**Goal:** Stop, invalidate stale jobs and reopen only current content.
**Independent test:** Stop a live scan, switch query/root and change a hit before opening it.

- [x] T011 [US2] Add cancellation acknowledgments and generation invalidation to `src-tauri/src/search.rs`, `src-tauri/src/lib.rs` and `src/app/App.tsx` (R06/R07).
- [x] T012 [US2] Reopen a hit through the current root grant, recheck identity/content and return current location or changed/missing explanation in `src-tauri/src/search.rs` and `src/app/App.tsx` (R02/R08).
- [ ] T013 [US2] Test Stop, query/root switch, late batches and changed-result fallback in `src-tauri/src/search.rs` and `tests/ui/folder-search.test.tsx` (AS-004–006).

## Phase 5: User Story 3 — Use it safely (P1)

**Goal:** No source writes, network requests or inaccessible controls.
**Independent test:** EN/ES keyboard and 25,000-entry cancellation trials leave fixture hashes unchanged.

- [ ] T014 [US3] Verify scope, symlink, explicit-file exclusion, no-write and request observation with disposable fixtures in `specs/009-folder-search/verification.md` (R09; AS-007).
- [ ] T015 [US3] Run ten packaged 25,000-entry Stop trials and EN/ES keyboard checks at 640/900/1440 points; record all raw timings in `specs/009-folder-search/verification.md` (R10/R11; AS-008; SC-002/003).

## Phase 6: Cross-cutting verification

- [ ] T016 Run full UI/native tests, production build, signed `.app`/`.dmg` inspection and twenty manifest queries; mark AS-001–008 and SC-001–003 PASS/FAIL/BLOCKED/NOT TESTED in `specs/009-folder-search/verification.md`.

## Dependencies and order

T001–T006 establish scope and matcher safety. US1 establishes results, US2 adds cancellation and current-file navigation, and US3 verifies packaged safety. T016 follows all stories.

## Parallel examples

T003 can run while T002 audits dependencies. After T004, native hostile fixtures in T006 can be prepared while the UI states in T009 are designed; shared native or `App.tsx` edits remain sequential.

## Implementation strategy

Complete the native scope contract, then the independently testable US1 panel. Integrate cancellation/current-file open, followed by packaged measurements. Keep all unverified targets open.
