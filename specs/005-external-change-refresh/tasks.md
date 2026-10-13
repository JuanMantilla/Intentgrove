# Tasks: Refresh External Changes

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** [spec.md](spec.md), [design.md](design.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [refresh-ipc.md](contracts/refresh-ipc.md), and [quickstart.md](quickstart.md).  
**Status:** F003D approved 2026-09-26; T001–T022 complete with packaged UI journeys blocked by macOS accessibility. F004 is approved and integrated. T023–T027 now have native/UI conflict evidence; packaged journeys and remaining acceptance gates are open.

## Format: `[ID] [P?] [Story] Description`

- **[P]** marks independent work in different files after its prerequisites are met.
- **[US1]–[US4]** map to the four stories in `spec.md`.
- A task is complete only with code or review evidence and its requirement/acceptance ID recorded. No checkbox indicates approval.

## Phase 1: Setup (Shared Infrastructure)

**Purpose:** Confirm authority and toolchain before editing production code.

- [X] T001 Verify user approval of the current `specs/005-external-change-refresh/spec.md`, `design.md` and `design/refresh-states.svg`, and `plan.md` with hashes recorded in `docs/approvals.md`; stop before code if any gate is missing.
- [X] T002 Verify a working Rust/Cargo toolchain for the declared `src-tauri/Cargo.toml` minimum and record `sw_vers`, `uname -m`, `rustc --version`, and `cargo --version` in `specs/005-external-change-refresh/evidence.md`; do not install system-wide tools without separate authorization.
- [X] T003 Pin `notify` 8.2.0 in `src-tauri/Cargo.toml`, resolve `src-tauri/Cargo.lock`, and record dependency/license review in `specs/005-external-change-refresh/evidence.md` after T001–T002.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose:** Make the existing native read/listing path version-aware before either automatic or manual refresh uses it.

- [X] T004 Add failing disposable-file tests for same-size in-place writes, root-relative atomic replacement, selected-root replacement, file-only replacement, symlink escape, and unstable reads in `src-tauri/tests/refresh_version.rs` (F003D-R05, R09, R11; AS-003, AS-018–AS-019).
- [X] T005 Extend native grant state in `src-tauri/src/state.rs` with workspace generation, a stable tab/grant relationship, and selected root/file paths used only for identity checks; retain the root and file-only reselection rules from F003D-R09.
- [X] T006 Add bounded, two-check disk-version reads with device/inode, size, high-resolution metadata, and content digest to `src-tauri/src/document.rs`; expose an opaque `diskVersion` without trusting timestamps alone (F003D-R04–R05).
- [X] T007 Add generation-bound sorted directory snapshots and reject stale page tokens in `src-tauri/src/listing.rs`, preserving the 200-entry page contract while avoiding mixed live offsets (F003D-R02, R13).
- [X] T008 Extend `src/app/api.ts` with typed `diskVersion`, snapshot IDs, refresh targets, events, jobs, and reason codes from `contracts/refresh-ipc.md`; no renderer-supplied absolute path API (F003D-R11).
- [X] T009 Add EN/ES strings for Reload, changed/current/uncertain/unavailable status, selected-root reselection, progress, and conflict choices in `src/app/i18n.ts`, using the copy in `design.md` (F003D-R09, R12; AS-019).

**Checkpoint:** Native version reads and directory snapshots pass T004; automatic and manual journeys can be built on the same scoped checks.

---

## Phase 3: User Story 1 — See external changes while reading (Priority: P1) 🎯 MVP

**Goal:** Update clean open documents and the visible folder tree after other apps change them, without writing source files or shifting unaffected reading state.

**Independent Test:** With disposable clean tabs and an external writer, prove AS-001–AS-004 and the clean-update portions of SC-001–SC-002.

### Tests for User Story 1

- [X] T010 [P] [US1] Add failing native watcher/reconciliation tests for completed in-place, staged, and atomic-replace writes and missed-event rescan in `src-tauri/tests/automatic_refresh.rs` (F003D-R01–R02, R05; AS-001–AS-003).
- [X] T011 [P] [US1] Add failing UI tests for inactive-tab refresh, preserved passage, unchanged expansion/scroll, and stale-generation events in `tests/ui/automatic-refresh.test.tsx` (F003D-R01–R04; AS-001–AS-004).

### Implementation for User Story 1

- [X] T012 [US1] Implement grant-scoped `notify` watch ownership, burst coalescing, `need_rescan`/error handling, and generation invalidation in `src-tauri/src/refresh.rs`; events are hints only and must never directly authorize reads (F003D-R01–R02, R10–R11).
- [X] T013 [US1] Register only typed refresh commands/events in `src-tauri/src/lib.rs` and connect root/file selection lifecycle to watch setup and teardown in `src-tauri/src/selection.rs` (F003D-R01, R11).
- [X] T014 [US1] Create a per-tab/per-branch freshness reducer in `src/workspace/refreshState.ts` that ignores old generations, retains last confirmed content while checking, and preserves unaffected tree state (F003D-R01–R05).
- [X] T015 [US1] Integrate clean-tab content updates, stable tab identity, tree snapshots, and heading/nearby-passage restoration into `src/app/App.tsx` without moving focus to inactive tabs (F003D-R01–R04).
- [X] T016 [US1] Run `src-tauri/tests/automatic_refresh.rs`, `tests/ui/automatic-refresh.test.tsx`, and the AS-001–AS-004 disposable journeys from `specs/005-external-change-refresh/quickstart.md`; record commands, hashes, timing, and PASS/FAIL/NOT TESTED in `specs/005-external-change-refresh/evidence.md`.

**Checkpoint:** User Story 1 clean refresh is independently testable; dirty conflicts remain a later dependency and are not claimed complete.

---

## Phase 4: User Story 2 — Reload a selected item on demand (Priority: P1)

**Goal:** Reload one file or a folder subtree from its context menu, with scoped results, nonblocking progress, and cancellation.

**Independent Test:** Verify AS-005–AS-007 and AS-016 using disposable changed files, nested folders, a closed file, and a long cancellable folder scan.

### Tests for User Story 2

- [X] T017 [P] [US2] Add failing native contract tests for file-only scope, recursive folder Reload, cancellation, confirmed-result retention, and unchecked remainder in `src-tauri/tests/manual_reload.rs` (F003D-R03, R07, R13; AS-005–AS-006, AS-016).
- [X] T018 [P] [US2] Add failing keyboard/context-menu and status tests for tree rows and explicit-file tabs in `tests/ui/manual-reload.test.tsx` (F003D-R03, R12; AS-005–AS-007).

### Implementation for User Story 2

- [X] T019 [US2] Implement `reload_item`, `cancel_reload`, bounded descendant traversal, progress, and partial cancellation state in `src-tauri/src/refresh.rs`, sharing the scoped version checks from Phase 2 (F003D-R03, R07, R13).
- [X] T020 [US2] Register `reload_item` and `cancel_reload` in `src-tauri/src/lib.rs` with grant/generation validation from `contracts/refresh-ipc.md` (F003D-R03, R11).
- [X] T021 [US2] Add contextual Reload, keyboard menu access, progress/Cancel, and changed/current/error feedback to `src/app/App.tsx` using the approved `design.md` treatment (F003D-R03–R04, R12–R13).
- [X] T022 [US2] Run `src-tauri/tests/manual_reload.rs`, `tests/ui/manual-reload.test.tsx`, and AS-005–AS-007/AS-016 from `specs/005-external-change-refresh/quickstart.md`; record scope, hashes, cancellation state, and PASS/FAIL/NOT TESTED in `specs/005-external-change-refresh/evidence.md`.

**Checkpoint:** Manual Reload works for clean items independently of the external watcher timing.

---

## Phase 5: User Story 3 — Choose safely when an edit conflicts (Priority: P1)

**Goal:** Preserve an F004 section draft when disk changes and let the user inspect and choose without overwriting the changed original.

**Independent Test:** Use F004 editing in a disposable file, change disk externally, and verify AS-008–AS-012 plus SC-004/SC-007 for automatic and manual refresh.

**External prerequisite:** F004 section editing, recovery draft, Save As, and save-time conflict checks from `specs/002-section-editing-recovery/spec.md` must be approved and implemented. This feature must not implement an unapproved substitute editor.

### Tests for User Story 3

- [X] T023 [US3] Verify the F004 draft/save API and its approval evidence in `specs/002-section-editing-recovery/` and record the exact integrated interface in `specs/005-external-change-refresh/evidence.md`; stop this phase if F004 is unavailable.
- [X] T024 [P] [US3] Add failing native tests for newer-disk-token rejection and no changed-original write through refresh in `src-tauri/tests/refresh_conflict.rs` (F003D-R06–R08; AS-008, AS-012).
- [X] T025 [P] [US3] Add failing UI tests for draft retention, separate conflict per tab, comparison labels, Keep my edit, Save a copy, Use disk confirmation/Cancel, and second disk change in `tests/ui/refresh-conflict.test.tsx` (F003D-R06–R08; AS-008–AS-012).

### Implementation for User Story 3

- [X] T026 [US3] Connect the F004 dirty/base-version/draft state to `src/workspace/refreshState.ts`; a changed token creates one persistent conflict per dirty document without mutating its draft (F003D-R06–R07).
- [X] T027 [US3] Add read-only version comparison and the approved conflict notice/confirmation flow in `src/app/App.tsx`; Keep my edit retains the conflict, Use disk rechecks the inspected token before F004 discards, and Save a copy calls F004 Save As (F003D-R06–R08, R12).
- [x] T028 [US3] Run `src-tauri/tests/refresh_conflict.rs`, `tests/ui/refresh-conflict.test.tsx`, and AS-008–AS-012 from `specs/005-external-change-refresh/quickstart.md`; record draft/disk hashes and PASS/FAIL/NOT TESTED in `specs/005-external-change-refresh/evidence.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

**Checkpoint:** No draft loss, unconfirmed discard, merge, or changed-original overwrite is permitted; F004 integration is verified rather than assumed.

---

## Phase 6: User Story 4 — Recover from unavailable content (Priority: P2)

**Goal:** Keep tabs and drafts recoverable when files or watching fail, and reconcile on focus without expanding access.

**Independent Test:** Delete, deny, replace, or symlink disposable files; background/refocus the app; verify AS-013–AS-015/AS-017–AS-018 and SC-005–SC-006.

### Tests for User Story 4

- [X] T029 [P] [US4] Add native tests for missing/denied/unsupported targets and selected-root/file-only reselection in `src-tauri/tests/refresh_recovery.rs`, with symlink, watch failure and focus-rescan coverage in the existing refresh/version/worker suites (F003D-R09–R11; AS-013–AS-015, AS-018–AS-019). Cross-file evidence is recorded in evidence.md.
- [x] T030 [P] [US4] Add failing UI tests for unavailable/uncertain labels, root/file reselection, retained tabs/drafts, EN/ES status, Reduce Motion, and unaffected tabs in `tests/ui/refresh-recovery.test.tsx` (F003D-R09–R12; AS-013–AS-015, AS-017–AS-019). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

### Implementation for User Story 4

- [X] T031 [US4] Add focus-return reconciliation, failed-watch status, before/after root identity checks, file-only reselection checks, and safe retry behavior to `src-tauri/src/refresh.rs` (F003D-R09–R11; AS-019).
- [X] T032 [US4] Add persistent uncertain/unavailable states and root/file reselection actions to `src/app/App.tsx`, keeping other tabs and F004 drafts usable (F003D-R09–R12; AS-019).
- [x] T033 [US4] Run `src-tauri/tests/refresh_recovery.rs`, `tests/ui/refresh-recovery.test.tsx`, and AS-013–AS-015/AS-017–AS-019 from `specs/005-external-change-refresh/quickstart.md`; record scope, and PASS/FAIL/NOT TESTED evidence in `specs/005-external-change-refresh/evidence.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

**Checkpoint:** One failed item or watch does not break the rest of the workspace.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose:** Validate the full approved feature on the actual target without calling unit-test success macOS UX proof.

- [x] T034 Benchmark SC-001/SC-002 with 20 clean-save and 10 25,000-entry tree trials on a recorded Mac; store fixture shapes, timing distribution, failures, and host details in `specs/005-external-change-refresh/evidence.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [X] T035 Review the native watch/IPC boundary, symlink, selected-root and file-only grant replacement behavior, event payloads, and no-write invariant against `specs/005-external-change-refresh/contracts/refresh-ipc.md`; record findings in `specs/005-external-change-refresh/evidence.md`.
- [x] T036 Verify the packaged `.app` with an external writer, selected-root replacement/reselection, keyboard/EN/ES, Reduce Motion, multiple dirty drafts, and focus recovery following `specs/005-external-change-refresh/quickstart.md`; record each acceptance ID as PASS/FAIL/BLOCKED/NOT TESTED in `specs/005-external-change-refresh/evidence.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [X] T037 Update requirement-to-test links and handoff in `specs/005-external-change-refresh/evidence.md` and `.agents/state.md` only after the relevant evidence exists; leave any unrun requirement NOT TESTED.

---

## Dependencies & Execution Order

### Phase dependencies

```text
F003D user approvals + available Rust toolchain
  → Setup T001–T003
  → Foundation T004–T009
  → US1 clean automatic refresh (T010–T016)
  → US2 manual Reload (T017–T022)
  → US4 unavailable/focus recovery (T029–T033)

Approved and implemented F004 draft/save contract
  → US3 conflict flow (T023–T028)

All desired stories + native packaged evidence
  → Polish (T034–T037)
```

US1 and US2 use the same foundation but have independent test journeys. US3 additionally needs F004; it cannot be marked complete from watcher tests. US4 can be built after the shared foundation and tested without dirty editing for clean unavailable states, then rerun with F004 drafts before feature completion.

### Parallel opportunities

- After T009, T010 native tests and T011 UI tests use separate files; T017 and T018 do likewise for US2.
- After F004 is available, T024 native conflict tests and T025 UI conflict tests can run in parallel; T029 and T030 are separate recovery test files.
- Production edits to `src-tauri/src/refresh.rs`, `src-tauri/src/lib.rs`, and `src/app/App.tsx` remain sequential across story phases. Do not parallelize tasks that touch those files.

## Implementation Strategy

Start with clean automatic refresh as the MVP: a selected local root, a changed clean Markdown tab, and a tree update. Validate it before adding manual Reload. Add conflict UI only against the approved, working F004 draft/save interface. Finish with unavailable states, performance, security review, and packaged macOS evidence. No deployment, commit, or publication is included in these tasks.


## HTML continuation — F003D-H01

- [x] H-NATIVE-F003D-H01 Complete and verify the native extension described in [canonical amendment](../001-workspace-reader/html-native-amendment-20261008.md) against exact platform/candidate evidence. Source completion, targeted checks and remaining native/frontend acceptance are recorded in [handoff](../../os-engineering/html-frontend-handoff.md); preserve existing task outcomes. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
