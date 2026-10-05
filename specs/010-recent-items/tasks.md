# Tasks: Recent Local Items (F003R)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [model](data-model.md), [contract](contracts/recents-ipc.md). Approved gate hashes are in `docs/approvals.md`.

## Phase 1: Setup

- [X] T001 Confirm F003R feature state in `.specify/feature.json`, approval hashes in `docs/approvals.md`, and native grant/session boundaries in `src-tauri/src/state.rs` and `src-tauri/src/session.rs`.
- [X] T002 Create AS-001–006 and SC-001–003 ledger in `specs/010-recent-items/verification.md`.

## Phase 2: Foundation

- [X] T003 Implement schema/checksum/size-bounded private recent record with durable temp-sync-rename and previous-valid fallback in `src-tauri/src/recents.rs`; cap 20 folders and 50 documents, with ID, kind, canonical display path, device/inode/type, root-relative location if applicable, latest-use sequence and recoverable status (R01/R06).
- [X] T004 Wire native recent service into `src-tauri/src/lib.rs` and grant-safe interfaces in `src-tauri/src/state.rs`; never persist process-local grant IDs or document bytes (R02/R08).

## Phase 3: User Story 1 — Return to an item (P1)

**Independent test:** Open disposable folders/documents, restart, open a recent item, then replace one path and verify reselection is required.

- [X] T005 [US1] Record successful explicit folder and document opens and scoped document opens in `src-tauri/src/selection.rs`, `src-tauri/src/document.rs`, and `src-tauri/src/recents.rs`; deduplicate by native identity and preserve latest-use order (R01; AS-001).
- [X] T006 [US1] Implement list/open/reselect native commands in `src-tauri/src/recents.rs`; revalidate no-follow identity before fresh grant, return typed recovery state for missing/moved/replaced/denied items (R02/R03; AS-001/002).
- [X] T007 [US1] Add native IPC types and recent start-view rows with name, parent context, available/reselect states in `src/app/api.ts`, `src/app/App.tsx`, `src/app/i18n.ts`, and `src/styles/app.css` (R01–R03; AS-001/002).
- [ ] T008 [US1] Add disposable Rust/UI identity, order, restart and reselection tests in `src-tauri/src/recents.rs` and `tests/ui/recents.test.tsx` (AS-001/002; SC-001). Current tests lack a real process restart and moved-path native picker trial.

## Phase 4: User Story 2 — Control history (P1)

**Independent test:** Remove one and clear all recent metadata while source/draft hashes and open tabs stay unchanged.

- [X] T009 [US2] Implement remove-one/confirmed-clear native commands touching only recents metadata in `src-tauri/src/recents.rs` and `src-tauri/src/lib.rs` (R04/R05; AS-003/004).
- [X] T010 [US2] Add row Remove, footer Clear Recents, confirmation and empty/corrupt recovery copy in `src/app/App.tsx` and `src/app/i18n.ts` (R04–R06; AS-003–005).
- [X] T011 [US2] Add disposable remove/clear/corrupt-record tests in `src-tauri/src/recents.rs` and `tests/ui/recents.test.tsx` (AS-003–005; SC-002).

## Phase 5: User Story 3 — Use it privately (P1)

**Independent test:** EN/ES keyboard journey opens/reselects/removes/clears recent items in a packaged fixture without repository changes or app network requests.

- [ ] T012 [US3] Verify keyboard semantics, focus, labels, 640/900-point layout, EN/ES and no-motion states in `src/app/App.tsx`, `src/app/i18n.ts`, `src/styles/app.css`, and `tests/ui/recents.test.tsx` (R07; AS-006; SC-003).
- [ ] T013 [US3] Verify source/draft hashes and request behavior with disposable packaged fixtures; record outcomes in `specs/010-recent-items/verification.md` (R08; AS-006; SC-002/003).

## Phase 6: Verification

- [ ] T014 Run focused/native/full tests, production build and local `.app` build; record exact commands and outcomes in `specs/010-recent-items/verification.md`.

## Dependencies and execution strategy

T001–T004 precede the three stories. US1 is the MVP and establishes the list/reselection flow. US2 uses that record and UI; US3 verifies their shared keyboard/privacy behavior. Rust record tests and UI copy can be prepared independently, while changes to `App.tsx` and native grant state serialize.
