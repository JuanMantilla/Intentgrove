# Tasks: Find Text in a Document (F003S)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [model](data-model.md), [contract](contracts/find-session.md). Approved gate hashes are recorded in `docs/approvals.md`.

## Phase 1: Setup

- [X] T001 Confirm F003S active in `.specify/feature.json`, all four approved hashes and existing UI/CSS/test boundaries in `docs/approvals.md`, `src/app/App.tsx`, `src/reader/MarkdownView.tsx` and `src/reader/SectionEditor.tsx`.
- [X] T002 Add AS-001–011 / SC-001–005 verification ledger in `specs/003-document-text-search/verification.md`.

## Phase 2: Foundation

- [X] T003 Implement bounded visible text-node index and exact literal/accent-sensitive case-insensitive match offsets in `src/reader/find-index.ts`; add Unicode/hidden/control fixture tests in `tests/ui/find-index.test.ts` (R04/R06/R10; AS-003/004/008).
- [X] T004 Add React-owned render root and display-generation access for Find in `src/reader/MarkdownView.tsx`; keep search out of native IPC (R03/R07/R10).

## Phase 3: User Story 1 — Find the current document (P1)

**Independent test:** On disposable Markdown, Command+F focuses Find; a query matches displayed text, with exact count including offscreen content.

- [X] T005 [US1] Add a compact in-flow Find band with query/count/empty/zero/unavailable states and EN/ES labels in `src/app/App.tsx`, `src/app/i18n.ts`, `src/styles/app.css` (R01/R03/R06/R08/R09; AS-001/004/010/011).
- [X] T006 [US1] Connect Command+F, active-tab/version invalidation and safe index scheduling to `src/app/App.tsx` and `src/reader/find-index.ts` (R01/R03/R04/R10; AS-001/003/007/008).
- [X] T007 [US1] Paint visible and active matches with CSS Custom Highlight or noninteractive fallback without mutating React-owned DOM in `src/reader/find-index.ts` and `src/styles/app.css` (R04/R09; AS-003).
- [X] T008 [US1] Add UI tests for shortcut/focus, rendered syntax exclusions, offscreen count, accents, empty/zero/unavailable and refresh/tab invalidation in `tests/ui/find.test.tsx` (AS-001/003/004/007/008/010/011).

## Phase 4: User Story 2 — Navigate and return to reading (P1)

**Independent test:** Enter/Shift+Enter wraps through disposable matches, Escape preserves the located passage and returns focus.

- [X] T009 [US2] Implement next/previous/wrap/reveal and Escape focus return in `src/app/App.tsx` and `src/reader/find-index.ts` (R03/R05/R09; AS-005/006).
- [X] T010 [US2] Add keyboard, scroll and tab-change tests in `tests/ui/find.test.tsx` (AS-005–007).

## Phase 5: User Story 3 — Find in draft safely (P2)

**Independent test:** Search a live unsaved section draft, edit it, and verify current counts and unchanged source file.

- [X] T011 [US3] Expose a read-only CodeMirror draft find adapter in `src/reader/SectionEditor.tsx` without changing undo, selection or draft bytes (R07/R10; AS-008/009).
- [X] T012 [US3] Route active edit Find to the draft only in `src/app/App.tsx`; test draft changes, EN/ES accessibility and unavailable states in `tests/ui/find.test.tsx` (R08–R10; AS-008–011).

## Phase 6: Verification

- [X] T013 Run focused UI tests, full Vitest, `npm run build`, bundle asset/IPC checks and local `.app` build; record exact results in `verification.md`.
- [ ] T014 Run disposable packaged AS-001–011/SC-001–004, ten 1 MiB timing trials, source hashes and app-request observation per [quickstart](quickstart.md); mark unavailable checks BLOCKED/NOT TESTED. Keep future Windows/Linux AS-002/SC-005 NOT TESTED.

## Dependencies and execution strategy

T001–T004 precede user stories. US1 T005–T008 is the MVP; US2 and US3 build on its index/band, with separate navigation and draft tests. T013–T014 follow implementation. Parallel work is limited to independent fixture/index tests and EN/ES CSS; edits to `App.tsx` serialize.
