# Tasks: Private macOS Delivery (F005)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [contract](contracts/macos-entry.md). Approved hashes: `docs/approvals.md`.

## Phase 1: Setup

- [X] T001 Confirm F005 active in `.specify/feature.json`, approved hashes, macOS arm64 host/toolchain and existing bundle/quit code in `docs/approvals.md`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, and `docs/local-build-2026-09-29.md`.
- [ ] T002 Establish AS-001–009/SC-001–004 evidence ledger and full v1 matrix in `specs/012-macos-delivery/verification.md`.

## Phase 2: Foundation

- [X] T003 Add safe native incoming-event queue with bounded paths, source, event ID and renderer readiness in `src-tauri/src/native_entry.rs` (R05/R06).
- [X] T004 Add file/folder intake through no-follow grant checks and typed errors in `src-tauri/src/native_entry.rs` and `src-tauri/src/state.rs` (R05/R06).

## Phase 3: User Story 1 — Install and launch (P1)

**Independent test:** Build, mount and inspect disposable arm64 `.app`/`.dmg`, then launch without development tools and record exact compatibility/signing state.

- [ ] T005 [US1] Finalize bundle metadata, supported document associations, icon/resources and minimum OS in `src-tauri/tauri.conf.json` and `src-tauri/Info.plist` (R01–R03; AS-001/002).
- [ ] T006 [US1] Produce local `.app`/`.dmg`, verify arm64 binary, bundle resources, hashes, codesign, Gatekeeper and installed launch; record in `specs/012-macos-delivery/verification.md` (R01–R03; SC-001).

## Phase 4: User Story 2 — Use macOS entry points (P1)

**Independent test:** Open exact disposable files via Finder cold/warm and drop, with file-only grants and localized failures.

- [X] T007 [US2] Handle `RunEvent::Opened` and `WindowEvent::DragDrop`, queue until renderer ready and emit typed results in `src-tauri/src/lib.rs` and `src-tauri/src/native_entry.rs` (R05/R06; AS-004/005).
- [X] T008 [US2] Integrate incoming grant/error events into tabs, folder switching and EN/ES state in `src/app/App.tsx`, `src/app/api.ts`, `src/app/i18n.ts`, and `src/styles/app.css` (R05/R06; AS-004/005).
- [ ] T009 [US2] Implement native application/File/Edit/View/Window menu actions and applicable shortcuts through current UI commands in `src-tauri/src/lib.rs` and `src/app/App.tsx` (R04; AS-003).
- [ ] T010 [US2] Verify Finder/drop/menu journeys and no sibling grant/source writes in disposable packaged tests; record in `specs/012-macos-delivery/verification.md` (SC-002).

## Phase 5: User Story 3 — Preserve work across lifecycle (P1)

**Independent test:** Five Close/Quit routes and Dock reopen with disposable clean/dirty documents preserve drafts and restore a reachable window.

- [X] T011 [US3] Unify native Close/Quit with F004 choices and durable F003C final checkpoint in `src-tauri/src/lib.rs` and `src/app/App.tsx` (R07; AS-006).
- [X] T012 [US3] Recreate/show main window on Dock Reopen and restart refresh ownership in `src-tauri/src/lib.rs` and `src-tauri/src/refresh.rs` (R08; AS-007).
- [ ] T013 [US3] Verify clean/dirty/cancel/save-failure/reopen/update scenarios, fixture/app-data hashes and EN/ES status in `specs/012-macos-delivery/verification.md` (R07–R09; SC-003).

## Phase 6: User Story 4 — Release honestly (P1)

**Independent test:** Every accepted v1 criterion has PASS/FAIL/BLOCKED/NOT TESTED with an evidence path and truthful host/signing scope.

- [ ] T014 [US4] Complete v1 acceptance matrix and final app/DMG checksum/signing/compatibility record in `specs/012-macos-delivery/verification.md` (R10; AS-009; SC-004).

## Dependencies and execution strategy

T001–T004 precede native entry points. US1 bundle metadata and US3 lifecycle can progress after setup; final US1/US4 verification follows all approved slices. US2 depends on safe intake; US3 depends on F003C/F004. F006 image associations are added only when its decoder is implemented and verified. Test fixtures and evidence can be prepared independently; `lib.rs` mutations serialize.
