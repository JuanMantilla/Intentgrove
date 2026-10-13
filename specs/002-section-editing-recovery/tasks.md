> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

---
description: "Dependency-ordered F004 section editing and recovery implementation tasks"
---

# Tasks: Section Editing and Recovery

**Input**: Approved `spec.md`, `design.md` and sketch, `plan.md`; supporting `research.md`, `data-model.md`, `contracts/editing-ipc.md`, `quickstart.md`.

**Tests**: The feature specification explicitly requires byte-preservation, timing, restart, conflict, accessibility, and packaged macOS acceptance. Tasks include targeted automated tests and manual evidence.

**Format**: `[ID] [P?] [Story] Description with exact file path`. A checked task requires evidence in `specs/002-section-editing-recovery/evidence.md`.

## Phase 1: Setup

**Purpose**: Lock the approved local dependencies and document the implementation baseline.

- [x] T001 Pin modular CodeMirror 6 packages in `package.json` and `package-lock.json`; use `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, and optional `@codemirror/lang-markdown` only, with no remote runtime assets (F004-R03).
- [x] T002 Pin `pulldown-cmark = "=0.13.4"` in `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`; confirm the repository Rust toolchain and offline build availability (F004-R04).
- [x] T003 Create `specs/002-section-editing-recovery/evidence.md` with F004-R01–R15, AS-001–AS-017 and SC-001–SC-007 rows, recording NOT TESTED until evidence exists.

## Phase 2: Foundational

**Purpose**: Put native scope and version validation beneath all editing operations.

- [x] T004 Define opaque document/section/edit-session types and error codes in `src-tauri/src/editing.rs` and `src/app/api.ts`; client-provided path or byte span must never be authority (F004-R01, R07, R10).
- [x] T005 Extend `src-tauri/src/document.rs` and `src-tauri/src/state.rs` with a confirmed editable UTF-8 snapshot under the existing grant, 10 MiB limit, regular-local-file and identity checks, preserving BOM and raw bytes (F004-R07, R10).
- [x] T006 Wire bounded editing commands in `src-tauri/src/lib.rs` and `src/app/api.ts`, retaining existing read-only commands and Tauri capability limits (F004-R01, R10).

**Checkpoint**: A grant-bound native API can reject unsafe edit attempts without any original-file write.

## Phase 3: User Story 1 — Enter a clearly bounded section editor (P1) 🎯 MVP

**Goal**: Right-click or keyboard action opens only the selected source section; other sections remain readable.

**Independent Test**: Open disposable first/middle/last, pre-heading, heading-free, nested, and empty sections; confirm target and visible boundary before typing; nonselected content cannot be edited.

- [x] T007 [US1] Implement authoritative nonoverlapping section spans from native parser offsets, including BOM, heading at any level, pre-heading, heading-free and empty sections, in `src-tauri/src/editing.rs` (F004-R04, R05; AS-004, AS-013).
- [x] T008 [P] [US1] Add native section fixture tests for ATX/setext, fences, quotes, lists, repeated headings, BOM, Unicode and LF/CRLF/CR in `src-tauri/src/editing.rs`; parser disagreement must fail closed (AS-001, AS-004, AS-013).
- [x] T009 [US1] Implement version-bound `list_edit_sections` and `begin_section_edit` in `src-tauri/src/editing.rs` and wire them through `src-tauri/src/lib.rs`; reject stale IDs and a second pending document draft (F004-R01, R04, R10, R15).
- [x] T010 [US1] Map native descriptors to rendered document-level headings after stripping BOM and checking remark/native parity in `src/reader/sectionMap.ts` and `src/reader/MarkdownView.tsx`; disable Edit section with a reason on mismatch (F004-R01, R04, R10).
- [x] T011 [US1] Add right-click and keyboard context menu, section focus, accessible target label, and focus return in `src/reader/MarkdownView.tsx` and `src/app/App.tsx` (F004-R01, R11; AS-001, AS-003).
- [x] T012 [US1] Build a CodeMirror source editor and safe live preview for the selected span only in `src/reader/SectionEditor.tsx`; configure source line separator, fixed original boundary, and read-only surrounding document (F004-R02–R05).
- [x] T013 [P] [US1] Add EN/ES section, menu, read-only reason and editor labels in `src/app/i18n.ts`, plus selected/inactive styling and reduced-motion behavior in `src/styles/app.css` (F004-R02, R11).
- [x] T014 [US1] Add UI tests for context menu, keyboard route, nested/pre-heading selection, nonselected read-only content, and parser mismatch in `tests/ui/section-editing.test.tsx` (AS-001–AS-004, AS-013, AS-015).

**Checkpoint**: US1 works in-memory on disposable files without a source-file Save path.

## Phase 4: User Story 2 — Save a section safely (P1)

**Goal**: Explicit Save changes only selected source bytes; Save As makes a full copy; conflicts and failures preserve the draft.

**Independent Test**: Compare bytes outside the selected original range over 20 disposable-file saves; induce external changes and write failures; verify Save As copy and unchanged original.

- [x] T015 [US2] Define one-draft-per-document clean/dirty/paused/conflict transitions with sequence-checked async results in `src/workspace/editState.ts` and connect tab dirty state in `src/app/App.tsx` (F004-R06, R09, R15).
- [x] T016 [US2] Implement native replacement composition using immutable base bytes, UTF-8/BOM and source line-ending rules in `src-tauri/src/editing.rs`; preserve `base[0..start]` and `base[end..]` verbatim (F004-R07).
- [x] T017 [US2] Implement grant-validated Save with start and immediate pre-commit `diskVersion`/identity/hash checks, unique same-directory stage, durable sync, retained pre-save copy, atomic replacement, post-commit verification and refreshed grant/watch identity in `src-tauri/src/editing.rs`, `src-tauri/src/state.rs` and `src-tauri/src/lib.rs` (F004-R07, R09, R10).
- [x] T018 [US2] Implement native Save As destination dialog, exclusive new-file creation, explicit existing-destination confirmation/recheck, and whole-document base-plus-draft copy in `src-tauri/src/editing.rs` and `src-tauri/src/lib.rs` (F004-R07).
- [x] T019 [US2] Connect Undo/Redo, Save, Save As, Discard, dirty marker, live preview, failure and conflict actions in `src/reader/SectionEditor.tsx` and `src/app/App.tsx`; keep draft after any failed write (F004-R06–R10, R15).
- [x] T020 [P] [US2] Add EN/ES Save, Save As, close-choice, conflict and residual-race copy in `src/app/i18n.ts`, plus responsive comparison/choice styling in `src/styles/app.css` (F004-R09, R11).
- [x] T021 [US2] Add native disposable-file tests for 20 span-preserving saves, BOM/line endings, Save As existing target, permission/removal/staging failure, changed file before both version checks, and observed post-commit mismatch in `src-tauri/src/editing.rs` (AS-005–AS-007, AS-014; SC-002, SC-004).
- [x] T022 [US2] Add UI state tests for dirty transitions, one pending draft, Save/Discard/Cancel, conflict inspection and protected external version in `tests/ui/edit-flow.test.tsx` (AS-005–AS-008, AS-017).

**Checkpoint**: US2 passes scoped native/UI tests; record the disclosed residual cross-process race without claiming a perfect guarantee.

## Phase 5: User Story 3 — Resume an interrupted edit (P1)

**Goal**: Keep draft or clean editor state on normal close, checkpoint accepted edits durably, and restore without writing the source file.

**Independent Test**: After a durable checkpoint, terminate a packaged app and reopen a disposable workspace; inspect restored draft, history, cursor, position and unchanged original. Exact folder/tab/layout acceptance requires separate F003C approval and implementation.

- [x] T023 [US3] Prove packaged macOS titlebar Close, Cmd+W, Cmd+Q, app-menu Quit and Dock/system Quit interception using a native delegate bridge in `src-tauri/src/lib.rs`; if Dock Quit cannot be intercepted, stop R08/AS-009 completion and seek architecture revision before claiming success. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T024 [US3] Implement versioned, size-bounded, checksum-validated per-document recovery records in app data, serialized temp write/sync/replace/parent sync and prior-checkpoint fallback in `src-tauri/src/recovery.rs` (F004-R13, R14).
- [x] T025 [US3] Persist CodeMirror document, `historyField`, selection, reader/editor scroll, section, base snapshot/version and sequence in `src/workspace/editState.ts` and `src/reader/SectionEditor.tsx`; acknowledge only a completed checkpoint within one second of accepted input (F004-R12, R13). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T026 [US3] Implement native load, schema/checksum/scope validation, changed-disk conflict, unlocatable-section inspection, individual discard and clear-session in `src-tauri/src/recovery.rs` and `src-tauri/src/lib.rs`; restoration must never write an original document (F004-R09, R13, R14).
- [x] T027 [US3] Implement Save/Keep draft/Discard/Cancel for return to reading, tab close, window close and quit in `src/app/App.tsx`; a failed Save/checkpoint or Cancel keeps the app open and focused (F004-R08, R15).
- [x] T028 [US3] Restore clean/dirty editor mode, draft, undo/redo, selection and positions from valid recovery in `src/app/App.tsx` and `src/reader/SectionEditor.tsx`; show latest-completed-checkpoint and draft-storage explanations in EN/ES via `src/app/i18n.ts` (F004-R11–R14).
- [x] T029 [US3] Integrate F004 editor state with separately approved and implemented F003C workspace session contract in `src/app/App.tsx`; do not mark exact workspace/tab/layout restoration complete while F003C remains unapproved (F004-R12; AS-009, AS-016; SC-003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T030 [US3] Add native recovery corruption, quota, write-failure, sequence and crash-after-ack tests in `src-tauri/src/recovery.rs`, plus UI restore and 100-edit checkpoint timing tests in `tests/ui/recovery.test.tsx` (AS-009–AS-012, AS-016; SC-005, SC-007). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

**Checkpoint**: Recovery and quit paths are verified in a packaged app; F003C remains an explicit external prerequisite for exact workspace restoration.

## Phase 6: Polish and cross-cutting verification

- [x] T031 Run `npm test`, `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, and `npm run tauri build`; record command, OS/architecture, result and failures in `specs/002-section-editing-recovery/evidence.md`.
- [x] T032 Run disposable packaged macOS acceptance for AS-001–AS-017 and SC-001–SC-007, including EN/ES keyboard at 1440/900/640 points, Reduce Motion, normal/abrupt quit, external writes; record PASS/FAIL/BLOCKED/NOT TESTED in `specs/002-section-editing-recovery/evidence.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T033 Review native scope, untrusted Markdown preview, IPC, Save, recovery storage and residual-race messaging against `specs/002-section-editing-recovery/contracts/editing-ipc.md`; record findings and fixes in `specs/002-section-editing-recovery/evidence.md`.
- [x] T034 Update `specs/002-section-editing-recovery/evidence.md` with requirement-to-test traceability and `.agents/state.md` with exact remaining work; resume F003D T023 only when F004 dirty/conflict API exists.

## Audit regressions — 2026-09-28

- [x] T035 Add failing regressions for a NUL-containing draft, leaked Save stage after source removal, overlapping Quit/disk-discard dialogs and lost Cancel focus; repair the actual Save transaction and modal lifecycle in `src-tauri/src/editing.rs`, `src/app/App.tsx` and `tests/ui/close-edit.test.tsx` (R07–R09/R11/R15). See evidence.md for red and passing results.
- [x] T036 Verify recovery-record ownership and cleanup when an active document is reselected at a moved native path; prevent stale recovery records after Save/Discard without deleting a record belonging to another session. Add disposable recovery/reselection integration coverage in `src-tauri/src/recovery.rs` and the active feature's tests (R13/R14). Current same-path reselection tests do not cover moved-path cleanup. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T037 Complete F004-R16 moved-path recovery acceptance for active explicit files, active root files, and cold session root/file reselection in a disposable packaged app; record ten move sequences, Save/Discard cleanup and competing-record preservation in `specs/002-section-editing-recovery/evidence.md` (AS-018; SC-008). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T038 Complete F004-R17 retained safety-copy storage acceptance: verify 1 GiB pre-save stop, resolved/unresolved inventory and separate EN/ES confirmed cleanup without repository writes in ten disposable packaged trials; record results in `specs/002-section-editing-recovery/evidence.md` (AS-019; SC-009). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Dependencies and execution order

- Setup T001–T003 precedes foundational T004–T006. All stories require the foundation.
- US1 T007–T014 can deliver deliberate section editing in memory. US2 depends on native session and section identity from US1. US3 uses draft/save state from US2; its native quit feasibility T023 is an early independent risk gate.
- T029 depends on **separate F003C approval and implementation**. Other F004 tasks may proceed while that external gate remains pending, but AS-009/SC-003 cannot pass without it.
- T031–T034 follow the implemented story scope. A checked task needs a specific PASS or justified BLOCKED result in evidence.

## Parallel examples

- After T007, native fixtures T008 and UI localization/styling T013 touch separate files and can run in parallel.
- While native Save T017/T018 is in progress, UI copy/styling T020 can proceed independently.
- Native recovery T024/T026 and editor serialization T025 touch separate layers, but their contract must be fixed by T004/T006 first.

## Implementation strategy

Start with US1 as the smallest independently demonstrable slice, then add explicit safe Save and Save As (US2), then recovery and native quit (US3). Keep F003C as a separate approval/implementation track. No task authorizes committing, publishing, changing system security, or using real user documents as fixtures.

Current scope: CRLF Save acceptance/QA-0017 deferred by user; no CRLF repair/retest task is required now. See [decision](../../docs/macos-crlf-save-deferral-20261008.md). Other tasks unchanged.


## HTML read-only boundary — 2026-10-08

F002-H01: standalone HTML never enters Markdown section editing, dirty buffers or editing/recovery journals. Existing Markdown behavior is preserved. Session validation/checkpoint explicitly refuses HTML editing/recovery payloads; HTML routes through its own read-only provider. Canonical architecture: [F001 amendment](../001-workspace-reader/html-native-amendment-20261008.md); actual API and evidence: [native handoff](../../os-engineering/html-frontend-handoff.md) and [report](../../os-engineering/html-report-20261008.md). Native tests cover the rejection; frontend production routing remains receiving work. No HTML source editor is authorized.

- [X] HN-E01 Preserve Markdown-only edit/recovery and reject HTML session editing/recovery payloads; native suite PASS.
- [x] HN-E02 Verify receiving frontend never exposes edit/source actions for HTML in complete packaged routing. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
