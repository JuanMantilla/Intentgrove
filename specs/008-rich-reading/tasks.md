# Tasks: Rich Reading Completion (F002R)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [research](research.md), [model](data-model.md), [renderer contract](contracts/reading.md), [verification](quickstart.md). **Tests:** Required by the acceptance scenarios and success criteria; use disposable content.

## Phase 1: Setup

- [x] T001 Verify approved F002R spec/design/plan hashes and installed Spec Kit feature state; record baseline and reference Mac in `specs/008-rich-reading/verification.md`.
- [ ] T002 [P] Audit exact Mermaid 11.x, frontmatter/YAML and local syntax token dependency versions, licenses, advisories and lockfile changes in `package.json`, `package-lock.json` and `specs/008-rich-reading/verification.md`.
- [x] T003 [P] Record Roboto and Roboto Mono source, licenses and bundled font artifacts under `src/assets/fonts/` and `specs/008-rich-reading/verification.md` (R06).

## Phase 2: Foundation

- [ ] T004 Implement versioned, cancellable bounded block results and per-block fallback in `src/reader/markdownBudget.worker.ts` and `src/reader/MarkdownView.tsx`; one block failure cannot blank siblings (R09/R10).
- [x] T005 Define one duplicate-aware heading sequence with IDs, levels 1–6, source offsets and labels shared by rendered anchors and outline in `src/reader/MarkdownView.tsx` and `src/reader/heading-model.ts` (R05).
- [ ] T006 [P] Add 1/10 MiB mixed and hostile disposable fixture manifests with file hashes in `specs/008-rich-reading/verification.md`.

## Phase 3: User Story 1 — Read technical content (P1)

**Goal:** Isolated diagrams, inert metadata and code tokens with source fallback.
**Independent test:** Valid and hostile blocks render or fail individually while neighboring blocks stay readable.

- [ ] T007 [US1] Prove a packaged opaque-origin Mermaid context without Tauri IPC, filesystem/network access or active output; document CSP, nonce/source/generation checks, timeout and failure in `src/reader/diagram-host.ts` and `specs/008-rich-reading/verification.md` before enabling diagrams (R01/R02).
- [ ] T008 [US1] Implement bounded kind/input/output Mermaid requests and inert raster acceptance in `src/reader/diagram-host.ts`, `src/reader/MarkdownView.tsx` and `src/reader/markdownBudget.worker.ts` (R01/R02).
- [x] T009 [US1] Parse bounded YAML frontmatter with a failsafe schema; show collapsed metadata or invalid source text without applying settings in `src/reader/MarkdownView.tsx` (R03).
- [x] T010 [US1] Render local syntax tokens as React text spans with fixed CSS classes and exact-source Copy; unknown/over-budget fences stay plain in `src/reader/MarkdownView.tsx` and `src/styles/app.css` (R04).
- [ ] T011 [US1] Test valid/malformed/hostile diagrams, metadata, code, fallback and network/CSP observations in `tests/ui/rich-reading.test.tsx` and `specs/008-rich-reading/verification.md` (AS-001–003/007; SC-001).

## Phase 4: User Story 2 — Navigate and tune reading (P1)

**Goal:** Shared outline and persistent bounded typography.
**Independent test:** Repeated headings navigate and typography survives ten normal restarts without source writes.

- [ ] T012 [US2] Add responsive optional outline, active position and anchor fallback for repeated/renamed headings in `src/app/App.tsx`, `src/reader/MarkdownView.tsx` and `src/styles/app.css` (R05).
- [x] T013 [US2] Implement app-owned versioned bounded font/size/line-height/width preferences with corruption fallback and F003C restore in `src-tauri/src/session.rs`, `src/app/App.tsx` and `src/app/api.ts` (R06/R07).
- [x] T014 [US2] Apply bundled Roboto/Mono and system font choices across themes with EN/ES keyboard controls in `src/styles/app.css`, `src/app/i18n.ts` and `src/app/App.tsx` (R06–R08).
- [ ] T015 [US2] Test heading identity, refreshed anchors, bounds and persistence in `tests/ui/rich-reading.test.tsx`, native settings tests and `specs/008-rich-reading/verification.md` (AS-004–006; SC-004).

## Phase 5: User Story 3 — Keep content safe and usable (P1)

**Goal:** Hostile content stays inert and long documents keep the app usable.
**Independent test:** EN/ES packaged fixtures at three widths and timed 1/10 MiB runs meet or visibly degrade against targets.

- [ ] T016 [US3] Verify blocked HTML/MDX/SVG links, Mermaid/YAML/code attack fixtures and zero app-requested network attempts in `specs/008-rich-reading/verification.md` (R02/R08/R09; AS-007).
- [ ] T017 [US3] Run packaged EN/ES focus, Reduce Motion, source fallback and 640/900/1440-point journeys in `specs/008-rich-reading/verification.md` (AS-008; SC-002).
- [ ] T018 [US3] Run ten warm trials per 1/10 MiB size, record raw timings and unrelated-tab response in `specs/008-rich-reading/verification.md` (R10; AS-009; SC-003).

## Phase 6: Cross-cutting verification

- [ ] T019 Run full UI/native suites, bundle guards and signed `.app`/`.dmg` checks; mark AS-001–009 and SC-001–004 PASS/FAIL/BLOCKED/NOT TESTED in `specs/008-rich-reading/verification.md`.

## Dependencies and order

T001–T006 establish bounded rendering and shared headings. US1 diagram enablement depends on proving T007; if that boundary fails, pause it for revised architecture approval. US2 uses shared headings and session storage. US3 verifies integrated behavior; T019 follows all stories.

## Parallel examples

T002, T003 and T006 use different artifacts. After T005, metadata fixtures can be prepared while font assets are audited; integration of shared renderer and `App.tsx` edits remains sequential.

## Implementation strategy

Establish bounded blocks and diagram isolation first, then complete technical content and outline/typography. Run fixture and packaged checks before marking any safety or performance criterion complete.

## Approved Reading frontend maintenance — 2026-10-06

- [x] T020 Implement approved REQ-P1 numeric Reading fields/validation/preview using existing fonts/ranges/session contracts; preserve custom values/anchor capture/Reading-only reset and add localized preference Retry. Focused40/full291/build/worker PASS, actual Chrome synthetic renderer reviewed at640/320px. See frontend-maintenance-20261006.md and ../../frontend-implementation/evidence/settings-reading-20261006/report.md. Separate native Settings/filter/schema contracts remain IR-04; no native/config/dependency changes.
- [ ] T021 Verify this Reading slice in a rebuilt native candidate: persisted choices/failure Retry, source/draft/caret/anchor continuity, actual zoom/DPI and platform focus/keyboard. Current native pipe error2; Windows/Mac NOT TESTED. Existing packaged gates remain open; mocked renderer checks are not native acceptance.
