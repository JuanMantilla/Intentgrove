# Tasks: Bounded Large-File Source Mode (F003L)

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [data model](data-model.md), [native contract](contracts/large-source-ipc.md), [verification guide](quickstart.md)
**Tests:** Required for boundary, no-write, cancellation, memory and keyboard criteria.

## Phase 1: Setup

- [x] T001 Verify F003L approval hashes in `docs/approvals.md` and installed Spec Kit feature state; create PASS/FAIL/BLOCKED/NOT TESTED ledger in `specs/011-large-file-mode/verification.md`.
- [x] T002 [P] Generate disposable 10 MiB, 10 MiB+1, 25 MiB, 50 MiB, 50 MiB+1, long-line, invalid UTF-8 and concurrent-writer fixtures with hashes in `specs/011-large-file-mode/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 2: Foundation

- [x] T003 Add size-only grant-validated inspection and >50 MiB rejection before full read in `src-tauri/src/document.rs` and `src-tauri/src/large_source.rs`; preserve the existing 10 MiB rich read ceiling (R01/R03).
- [x] T004 Implement <=50 MiB private 0700/0600 streaming snapshot, stable identity/version checks, cancellation, checksum, sparse line offsets and orphan cleanup in `src-tauri/src/large_source.rs`; never create files in the repository (R02/R04/R10).
- [x] T005 [P] Define bounded native/TypeScript inspect, open, window, Find, cancel and copy IPC with generation IDs in `src-tauri/src/lib.rs` and `src/app/api.ts`; no command accepts an arbitrary filesystem path (R02/R05).
- [x] T006 Add disposable native tests for 10/50 MiB boundaries, changing source, encoding, permissions, private storage, snapshot cleanup and no source writes in `src-tauri/src/large_source.rs` (AS-001–003; SC-001). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 3: User Story 1 — Open with control (P1)

**Goal:** Explicit read-only source mode for >10–50 MiB Markdown.
**Independent test:** 12 MiB offers choice and complete source; 51 MiB stops before full read.

- [x] T007 [US1] Add an in-tab EN/ES opt-in/Cancel and >50 MiB limit state to `src/app/App.tsx`, `src/app/i18n.ts` and `src/styles/app.css`; hide rich render/edit for large source (R01/R07/R09).
- [x] T008 [US1] Implement a bounded, virtualized read-only line/long-line window in `src/reader/LargeSourceView.tsx` with beginning/end access and honest progress/completion (R02/R07).
- [x] T009 [US1] Add UI choice, cancel, no-truncation and error tests in `tests/ui/large-source.test.tsx`; record boundary fixture outcomes in `specs/011-large-file-mode/verification.md` (AS-001–003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 4: User Story 2 — Navigate safely (P1)

**Goal:** Bounded Find, Go to Line and copy; refresh invalidates stale windows.
**Independent test:** Find and line jump reach a known 50 MiB tail; >1 MiB copy rejects; external write never presents old text as current.

- [x] T010 [US2] Add bounded literal Find batches/cancellation, Go to Line using sparse offsets and <=1 MiB selection-copy in `src-tauri/src/large_source.rs` (R05). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T011 [US2] Add keyboard Find, Go to Line, selection-copy and clear limit feedback in `src/reader/LargeSourceView.tsx`, `src/app/i18n.ts` and `src/styles/app.css` (R05/R09).
- [x] T012 [US2] Integrate F003D confirmed change/Reload invalidation and generation checks with `src/app/App.tsx` and `src-tauri/src/refresh.rs`; unload inactive windows while retaining tab identity (R04/R06/R08). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T013 [US2] Test Find/cancel, line, copy, reload and changed-source behavior in `src-tauri/src/large_source.rs`, `tests/ui/large-source.test.tsx` and `specs/011-large-file-mode/verification.md` (AS-004/005). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 5: User Story 3 — Keep app responsive (P1)

**Goal:** Bounded memory and interactive unrelated tabs at 25/50 MiB.
**Independent test:** Ten pathological fixtures remain scrollable and under proposed 128 MiB additional steady memory in a packaged app.

- [x] T014 [US3] Bound native snapshot/window caches, renderer rows and long-line paint work in `src-tauri/src/large_source.rs` and `src/reader/LargeSourceView.tsx` (R07/R08).
- [x] T015 [US3] Verify EN/ES keyboard/focus at 640/900 points, tab responsiveness, memory and source hashes in `specs/011-large-file-mode/verification.md` using `quickstart.md` (AS-006/007; SC-002/003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 6: Cross-cutting verification

- [x] T016 Run UI/native tests, bundle guards and local app/DMG build; record commands, hashes, OS/architecture and failures in `specs/011-large-file-mode/verification.md`.
- [x] T017 Complete twenty boundary fixtures and ten 25/50 MiB packaged trials; mark every AS-001–007/SC-001–003 PASS/FAIL/BLOCKED/NOT TESTED in `specs/011-large-file-mode/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Dependencies and order

T003–T006 establish the bounded native contract. US1 uses it; US2 adds navigation and refresh; US3 measures integrated responsiveness. T016–T017 follow implementation. No packaged result is inferred from a unit test.

## Parallel examples

T002 fixtures can be prepared while T003 designs size inspection. After T005, UI choice strings and native snapshot tests can proceed in separate files; shared `App.tsx` changes remain sequential.

## Implementation strategy

Build the native size/snapshot contract first, then a minimal opt-in source view, then navigation and memory controls. Verify each story with disposable fixtures before moving to the next.
