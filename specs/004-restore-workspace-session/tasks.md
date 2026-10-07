# Tasks: Restore Workspace Session (F003C)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [contract](contracts/session-ipc.md), [model](data-model.md). Approved 2026-09-29 at hashes in `docs/approvals.md`.

## Phase 1: Setup

- [X] T001 Verify F003C approved hashes, active Spec Kit feature, Rust/Node toolchain and existing ignores in `docs/approvals.md`, `.specify/feature.json`, `src-tauri/Cargo.toml`, `.gitignore`.
- [X] T002 Add a feature verification ledger with AS-001–017 and SC-001–007 statuses in `specs/004-restore-workspace-session/verification.md`.

## Phase 2: Foundation

- [X] T003 Implement bounded schema-1 session entities and validation (<=2 MiB, <=100 tabs, <=1,024 expanded paths, <=4,096 UTF-8 path bytes, finite geometry, unique IDs) in `src-tauri/src/session.rs` (R03–R05/R13).
- [X] T004 Implement private durable checkpoint and prior-valid fallback with file/parent sync, checksum and sequence in `src-tauri/src/session.rs`; add corruption/concurrent-writer tests there (R05/R10/R13; AS-014).
- [ ] T005 Add native identity-bound rebuild of picker-issued root and explicit-file grants using no-follow checks in `src-tauri/src/state.rs` and `src-tauri/src/session.rs`; test missing/replaced/symlink/root-relative/external-file cases (R07/R08; AS-005–007).
- [ ] T006 Register typed load/checkpoint/finish/clear commands and session state in `src-tauri/src/lib.rs`, expose matching request/response types in `src/app/api.ts` (R01–R14).

## Phase 3: User Story 1 — Resume workspace (P1)

**Independent test:** Save a disposable three-tab workspace with distinct positions/layout, Quit and reopen; compare state without selecting the root again.

- [ ] T007 [US1] Implement renderer session snapshot/coordinator for root, tabs/order/active, anchors, tree and panel values in `src/app/session.ts` and `src/app/App.tsx` (R01–R05; AS-001–004).
- [ ] T008 [US1] Load active tab before inactive tabs/tree branches; cancel deferred work on a new root and preserve placeholders/tab order in `src/app/App.tsx` (R09; AS-013).
- [ ] T009 [US1] Restore/clamp native window bounds to visible display and persist panel/reading settings in `src-tauri/src/session.rs`, `src/app/App.tsx`, `src/styles/app.css` (R03/R04; AS-003).
- [ ] T010 [US1] Serialize completed navigation/layout checkpoints within two seconds and flush final scroll/layout on normal Quit in `src/app/session.ts` and `src-tauri/src/session.rs` (R05/R13; AS-004/014).
- [ ] T011 [US1] Coordinate titlebar Close, Cmd+Q, app-menu/Dock Quit and last-window close with F004 choices plus final durable session checkpoint in `src-tauri/src/lib.rs` and `src/app/App.tsx` (R06/R14; AS-008/015–017).
- [ ] T012 [US1] Add UI/native disposable multi-tab, tree, scroll, quit and 100-checkpoint tests in `tests/ui/session.test.tsx` and `src-tauri/src/session.rs` (AS-001–004/013–017; SC-001/002/005/006).

## Phase 4: User Story 2 — Recover changed paths/content (P1)

**Independent test:** Move/replace/deny a selected root or file before relaunch; available tabs remain usable and the changed item requires recovery.

- [ ] T013 [US2] Implement missing/replaced/denied selection placeholders and native picker reselection without scope widening in `src-tauri/src/session.rs`, `src/app/App.tsx`, `src/app/i18n.ts` (R07/R08; AS-005/006).
- [ ] T014 [US2] Restore clean changed content with heading-relative anchor fallback and explanation; route dirty drafts through F004 conflict checks in `src/app/session.ts`, `src/app/App.tsx` (R04/R07; AS-007).
- [ ] T015 [US2] Add disposable replacement/symlink/changed-heading/failed-tab tests in `src-tauri/src/session.rs` and `tests/ui/session.test.tsx` (AS-005–008; SC-003).

## Phase 5: User Story 3 — Control private state (P2)

**Independent test:** Inspect source/app-data hashes, restore/clear state with and without a draft, and verify EN/ES keyboard behavior.

- [ ] T016 [US3] Add localized remember-workspace disclosure, restore/offer/empty/corrupt statuses and keyboard recovery actions in `src/app/App.tsx`, `src/app/i18n.ts`, `src/styles/app.css` (R10–R12; AS-009–012).
- [ ] T017 [US3] Implement draft-aware Clear Session affecting only session and validated F004 drafts, preserving unresolved Save safety copies and source files in `src-tauri/src/session.rs` and `src/app/App.tsx` (R11; AS-009/012).
- [ ] T018 [US3] Add app-data inventory/hash, clear/cancel/corrupt-record and EN/ES keyboard tests in `src-tauri/src/session.rs` and `tests/ui/session.test.tsx` (AS-009–012; SC-004/007).

## Phase 6: Polish and verification

- [ ] T019 Integrate F004 editor-state restoration for the approved shared session contract in `src/app/App.tsx` and `src/reader/SectionEditor.tsx`; update F004 T029 only with evidence (R06; AS-008/016/017).
- [ ] T020 Run focused UI/Cargo tests, `npm run build`, bundle guards and `npm run tauri build -- --bundles app`; record command/build outcomes in `specs/004-restore-workspace-session/verification.md`.
- [ ] T021 Run [packaged disposable acceptance](quickstart.md) for AS-001–017/SC-001–007, including visible Mac, 25,000-entry timing, Quit/Dock, no-write/request observation; record PASS/FAIL/BLOCKED/NOT TESTED in `specs/004-restore-workspace-session/verification.md`.

## Dependencies and execution strategy

T001–T006 are foundation. US1 T007–T012 is the MVP and precedes US2/US3. US2 and US3 can proceed after foundation and share App/session files sequentially. T011 depends on F004 close choice; T019 depends on US1 and existing F004 recovery. T020/T021 follow implementation. Independent tests above use disposable fixtures and do not claim packaged success from unit tests. Parallel opportunity: T005 native identity fixtures and T007 renderer snapshot logic can be designed separately after T003/T006, but edits to `session.rs` and `App.tsx` must serialize.
## IR-04 scoped native delivery — 2026-10-06

The user-authorized native Settings/preference-coordinator amendment is implemented. See [shared amendment](ir04-settings-amendment.md), [native report](../../os-engineering/report.md) and [exact frontend handoff](../../os-engineering/frontend-handoff.md). Native/session checksum/default/filter/draft-owner regression, actual Windows/WebView2 IPC denial/singleton/close/focus, frontend regressions and default-target checks PASS. Current Mac execution and full product acceptance remain NOT TESTED; no prior acceptance/release task is closed by this note.
