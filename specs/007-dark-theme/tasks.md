# Tasks: Dark Theme

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** spec.md, design.md/design/theme-states.svg, plan.md, research.md, data-model.md, contracts/appearance.md, quickstart.md. Generated using the installed Spec Kit tasks template and `setup-tasks.sh --json` on 2026-09-28. Current artifact approval is recorded in docs/approvals.md.

## Format: `[ID] [P?] [Story] Description`

Completion needs evidence. Packaged acceptance remains open when macOS UI observation is unavailable.

## Phase 1: Setup

- [x] T001 Confirm active feature, all four approved hashes and requirements checklist in docs/approvals.md and specs/007-dark-theme/evidence.md.
- [x] T002 Verify installed window appearance API/ACL and unchanged dependencies/CSP in src-tauri/capabilities/main.json and specs/007-dark-theme/evidence.md.

## Phase 2: Foundation

- [x] T003 Add validated appearance controller and subscriptions in src/app/appearance.ts: record schema 1, system/light/dark enum, maximum 256 serialized characters, unreadable/invalid fallback System; resolved enum light/dark only (R01/R03/R04).
- [x] T004 Initialize before React in src/main.tsx and provide system-dark CSS fallback in src/styles/app.css without startup transitions (R04).

## Phase 3: US1 — Read in a dark workspace (P1, MVP)

**Goal:** All existing app-owned surfaces respond to appearance without changing document state.
**Independent test:** Select Dark while navigating a disposable reader; inspect text/code/table/menu/modal/error states and image colors (AS-001–003).

- [x] T005 [US1] Add localized System/Light/Dark selector and nonmodal warnings in src/app/App.tsx and src/app/i18n.ts, preserving focus and 640-point reachability (R01/R02/R08).
- [x] T006 [US1] Replace hardcoded app colors with both semantic palettes in src/styles/app.css; retain image pixels, control boundaries, focus and reduced-motion rules (R02/R06–R09).
- [x] T007 [US1] Verify selector EN/ES and calculated palette pairs in tests/ui/appearance.test.tsx and tests/ui/appearance-contrast.test.ts (AS-001–003/009); record rendered checks separately in specs/007-dark-theme/evidence.md.

## Phase 4: US2 — Follow system or remember choice (P1)

**Goal:** Valid local preference survives restart, explicit overrides remain stable, System responds to effective native appearance.
**Independent test:** All choices, storage corruption/failure, simulated system/native events; packaged restart and ten system trials (AS-004–007).

- [x] T008 [US2] Persist preferences, handle storage events/errors and warnings in src/app/appearance.ts without blocking reading (R03/R04).
- [x] T009 [US2] Sequence native setTheme(light/dark/null), read System after override release, dispose listeners and add only main-window core:window:allow-set-theme in src/app/appearance.ts and src-tauri/capabilities/main.json (R03/R09).
- [x] T010 [US2] Verify enum/bounds, System and explicit events, failed storage/native operations, disposal and stale native completion in tests/ui/appearance.test.tsx (AS-004–007).

## Phase 5: US3 — Change appearance during an edit (P1)

**Goal:** Theme changes preserve the live CodeMirror session and recovery state.
**Independent test:** Edit twice, toggle appearance ten times, inspect identity/text/history/selection/focus/scroll/checkpoint count and undo/redo (AS-008–009).

- [x] T011 [US3] Reconfigure only a CodeMirror darkTheme Compartment in src/reader/SectionEditor.tsx, style through bundled CSS and avoid appearance-only checkpoints (R05/R08).
- [x] T012 [US3] Verify live editor state, undo/redo, focus/scroll and checkpoint preservation through ten toggles in tests/ui/appearance-editor.test.tsx (AS-008/SC-003).

## Phase 6: Polish and cross-cutting verification

- [x] T013 Run UI/native regressions, TypeScript/Vite and bundled-worker checks; record exact platform/commands/counts in specs/007-dark-theme/evidence.md.
- [x] T014 Build and verify ad hoc signed local .app from src-tauri/target/release/bundle/macos; record hashes/permissions/CSP in specs/007-dark-theme/evidence.md.
- [x] T015 Perform packaged quickstart.md acceptance: ten cold Dark launches/system/edit trials, EN/ES 640/1440, contrast/Reduce Motion, source inventory; record each SC-001–005 as PASS/FAIL/BLOCKED/NOT TESTED in specs/007-dark-theme/evidence.md. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T016 Update traceability, remaining work and handoff in specs/007-dark-theme/evidence.md and .agents/state.md without claiming unobserved UX acceptance.

## Dependencies and execution order

T001–002 → T003–004 → US1 T005–007 → US2 T008–010 → US3 T011–012 → T013–016. All three stories are P1; the shared controller enables each to be tested separately. US1 is the first demonstrable increment, while completion requires all three.

## Parallel opportunities

After T006, selector tests and contrast tests can run independently. After T011, appearance-controller tests and editor tests operate on separate files and may run together. Production App/CSS/controller edits stay sequential. No additional agents are required.

## Implementation strategy

Deliver the selector/palettes, then persistence/native synchronization, then live editor reconfiguration. Verify meaningful state/storage/native cases before packaging. Do not change source documents, OS appearance settings, CSP, dependencies or publishing state. `.specify/extensions.yml` is absent: no tasks hooks registered.


## Phase 7: Convergence

- [x] T017 Complete HIGH packaged preference/restart and live-System acceptance using specs/007-dark-theme/quickstart.md: exercise System/Light/Dark across restart, verify explicit overrides, and record ten confirmed macOS appearance changes with update latency at or below one second in specs/007-dark-theme/evidence.md; retain BLOCKED/NOT TESTED for unobserved trials and use only authorized manual or existing automation procedures per F002A-SC-001, F002A-AS-004–006, F002A-R03/R04, T015 (partial)
- [x] T018 Complete HIGH rendered palette/layout/accessibility acceptance for every R02 surface in both themes, including EN/ES at 640/1440 points, actual text/control/focus contrast, keyboard feedback, and Reduce Motion; record per-surface measurements and results in specs/007-dark-theme/evidence.md rather than treating token/component tests as native acceptance per F002A-SC-002, F002A-AS-001–003/009, F002A-R02/R06/R08, T007/T015 (partial) **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T019 Complete HIGH packaged editing-state preservation acceptance through ten appearance changes using a disposable dirty section edit: compare folder/tab/editor identity, draft, undo/redo, selection/caret, focus, reader/editor scroll, conflict/recovery status and source hashes, including theme changes during loading/refresh/save/dialog states without restarting operations; record observed results in specs/007-dark-theme/evidence.md per F002A-SC-003, F002A-AS-001/008, F002A-R05, spec: edge cases, T012/T015 (partial) **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T020 Complete HIGH saved-Dark startup-frame acceptance across ten cold packaged launches, observing from launch through the first document frame and recording any light document frame in specs/007-dark-theme/evidence.md; distinguish native pre-content chrome from app-owned document surfaces per F002A-SC-004, F002A-AS-004/006, F002A-R04, T004/T015 (partial) **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T021 Complete HIGH packaged appearance/persistence acceptance with disposable fixtures: observe app-requested resources/network separately from OS traffic, compare workspace inventories and hashes before/after, and verify local opaque/transparent image colors remain unchanged; record results and observation limits in specs/007-dark-theme/evidence.md per F002A-SC-005, F002A-AS-002, F002A-R07/R09, T015 (partial) **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 8: Packaged verification repair

- [x] T022 Bundle the existing CodeMirror structural styles needed by the current editor extensions in src/styles/app.css so source text remains monospaced and scrolls inside the 430-point editor under the unchanged style-src 'self' CSP; verify the actual packaged editor, theme/selection/scroll preservation and focused regressions without adding dependencies or runtime style authority per F002A-R02/R05/R08, plan: bundled editor styling, T011/T018/T019 (partial).

- [x] T023 Preserve the localized Language/Idioma accessible name when the narrow toolbar hides its visible label in src/app/App.tsx; verify the actual packaged EN/ES controls at 640/1440 points and run existing regressions per F002A-R08/SC-002, T005/T018 (partial).

Verification: specs/007-dark-theme/verification.md, test-matrix.md and verification-assets/manifest.json. The user expressly authorized temporary macOS appearance/Reduce Motion/network trials and restoration; that authorization supersedes the earlier strategy sentence for those trials. All original settings were restored. T015/T018–T021 remain open for the specific unobserved/blocked checks documented in the matrix.

## T018–T021 test-only preparation — 2026-09-28

Supporting preparation is recorded in [instrumentation-decision.md](instrumentation-decision.md).
Five held-operation component tests and a seven-test evidence-intake checker are
implemented under tests/ only. Full UI suite: 148 PASS; build and worker PASS.
Native hooks/control channel, isolated prelaunch acquisition and production request
observer remain review proposals. No T018–T021 acceptance checkbox is closed by
this preparation. See verification-assets/instrumentation-preparation.json.

## A1 implementation batch — approved 2026-09-28

User instruction: “Approve A1 and implement the QA harness and startup recorder”.
Exact approved architecture hashes are recorded in docs/approvals.md. The historical
pending labels in those immutable artifacts do not supersede that approval.

- [x] T024 Implement and validate A1 QA build/storage isolation, bounded native gates,
  fixed fault adapters and renderer snapshots for T018/T019; implement external
  prelaunch recorder, flash stimulus, cold-launch runner and evidence intake for
  T020. Record build exclusion, protocol/fixture safety, package smoke and remaining
  native capture limits in instrumentation-implementation.md. This supporting task
  does not close T015 or T018–T021 and does not include a T021 request observer.
