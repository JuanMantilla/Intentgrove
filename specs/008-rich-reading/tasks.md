# Tasks: Rich Reading Completion (F002R)

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [research](research.md), [model](data-model.md), [renderer contract](contracts/reading.md), [verification](quickstart.md). **Tests:** Required by the acceptance scenarios and success criteria; use disposable content.

## Phase 1: Setup

- [x] T001 Verify approved F002R spec/design/plan hashes and installed Spec Kit feature state; record baseline and reference Mac in `specs/008-rich-reading/verification.md`.
- [x] T002 [P] Audit exact Mermaid 11.x, frontmatter/YAML and local syntax token dependency versions, licenses, advisories and lockfile changes in `package.json`, `package-lock.json` and `specs/008-rich-reading/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T003 [P] Record Roboto and Roboto Mono source, licenses and bundled font artifacts under `src/assets/fonts/` and `specs/008-rich-reading/verification.md` (R06).

## Phase 2: Foundation

- [x] T004 Implement versioned, cancellable bounded block results and per-block fallback in `src/reader/markdownBudget.worker.ts` and `src/reader/MarkdownView.tsx`; one block failure cannot blank siblings (R09/R10). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T005 Define one duplicate-aware heading sequence with IDs, levels 1–6, source offsets and labels shared by rendered anchors and outline in `src/reader/MarkdownView.tsx` and `src/reader/heading-model.ts` (R05).
- [x] T006 [P] Add 1/10 MiB mixed and hostile disposable fixture manifests with file hashes in `specs/008-rich-reading/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 3: User Story 1 — Read technical content (P1)

**Goal:** Isolated diagrams, inert metadata and code tokens with source fallback.
**Independent test:** Valid and hostile blocks render or fail individually while neighboring blocks stay readable.

- [x] T007 [US1] Prove a packaged opaque-origin Mermaid context without Tauri IPC, filesystem/network access or active output; document CSP, nonce/source/generation checks, timeout and failure in `src/reader/diagram-host.ts` and `specs/008-rich-reading/verification.md` before enabling diagrams (R01/R02). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T008 [US1] Implement bounded kind/input/output Mermaid requests and inert raster acceptance in `src/reader/diagram-host.ts`, `src/reader/MarkdownView.tsx` and `src/reader/markdownBudget.worker.ts` (R01/R02). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T009 [US1] Parse bounded YAML frontmatter with a failsafe schema; show collapsed metadata or invalid source text without applying settings in `src/reader/MarkdownView.tsx` (R03).
- [x] T010 [US1] Render local syntax tokens as React text spans with fixed CSS classes and exact-source Copy; unknown/over-budget fences stay plain in `src/reader/MarkdownView.tsx` and `src/styles/app.css` (R04).
- [x] T011 [US1] Test valid/malformed/hostile diagrams, metadata, code, fallback and network/CSP observations in `tests/ui/rich-reading.test.tsx` and `specs/008-rich-reading/verification.md` (AS-001–003/007; SC-001). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 4: User Story 2 — Navigate and tune reading (P1)

**Goal:** Shared outline and persistent bounded typography.
**Independent test:** Repeated headings navigate and typography survives ten normal restarts without source writes.

- [x] T012 [US2] Add responsive optional outline, active position and anchor fallback for repeated/renamed headings in `src/app/App.tsx`, `src/reader/MarkdownView.tsx` and `src/styles/app.css` (R05). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T013 [US2] Implement app-owned versioned bounded font/size/line-height/width preferences with corruption fallback and F003C restore in `src-tauri/src/session.rs`, `src/app/App.tsx` and `src/app/api.ts` (R06/R07).
- [x] T014 [US2] Apply bundled Roboto/Mono and system font choices across themes with EN/ES keyboard controls in `src/styles/app.css`, `src/app/i18n.ts` and `src/app/App.tsx` (R06–R08).
- [x] T015 [US2] Test heading identity, refreshed anchors, bounds and persistence in `tests/ui/rich-reading.test.tsx`, native settings tests and `specs/008-rich-reading/verification.md` (AS-004–006; SC-004). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 5: User Story 3 — Keep content safe and usable (P1)

**Goal:** Hostile content stays inert and long documents keep the app usable.
**Independent test:** EN/ES packaged fixtures at three widths and timed 1/10 MiB runs meet or visibly degrade against targets.

- [x] T016 [US3] Verify blocked HTML/MDX/SVG links, Mermaid/YAML/code attack fixtures and zero app-requested network attempts in `specs/008-rich-reading/verification.md` (R02/R08/R09; AS-007). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T017 [US3] Run packaged EN/ES focus, Reduce Motion, source fallback and 640/900/1440-point journeys in `specs/008-rich-reading/verification.md` (AS-008; SC-002). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T018 [US3] Run ten warm trials per 1/10 MiB size, record raw timings and unrelated-tab response in `specs/008-rich-reading/verification.md` (R10; AS-009; SC-003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 6: Cross-cutting verification

- [x] T019 Run full UI/native suites, bundle guards and signed `.app`/`.dmg` checks; mark AS-001–009 and SC-001–004 PASS/FAIL/BLOCKED/NOT TESTED in `specs/008-rich-reading/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Dependencies and order

T001–T006 establish bounded rendering and shared headings. US1 diagram enablement depends on proving T007; if that boundary fails, pause it for revised architecture approval. US2 uses shared headings and session storage. US3 verifies integrated behavior; T019 follows all stories.

## Parallel examples

T002, T003 and T006 use different artifacts. After T005, metadata fixtures can be prepared while font assets are audited; integration of shared renderer and `App.tsx` edits remains sequential.

## Implementation strategy

Establish bounded blocks and diagram isolation first, then complete technical content and outline/typography. Run fixture and packaged checks before marking any safety or performance criterion complete.

## Approved Reading frontend maintenance — 2026-10-06

- [x] T020 Implement approved REQ-P1 numeric Reading fields/validation/preview using existing fonts/ranges/session contracts; preserve custom values/anchor capture/Reading-only reset and add localized preference Retry. Focused40/full291/build/worker PASS, actual Chrome synthetic renderer reviewed at640/320px. See frontend-maintenance-20261006.md and ../../frontend-implementation/evidence/settings-reading-20261006/report.md. Separate native Settings/filter/schema contracts remain IR-04; no native/config/dependency changes.
- [x] T021 Verify this Reading slice in a rebuilt native candidate: persisted choices/failure Retry, source/draft/caret/anchor continuity, actual zoom/DPI and platform focus/keyboard. Current native pipe error2; Windows/Mac NOT TESTED. Existing packaged gates remain open; mocked renderer checks are not native acceptance. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**


## 2026-10-08 evidence reconciliation

T004 bounded parser/cancellable worker/source-fallback implementation and tests now present; full packaged busy-work cancellation and cross-region semantics gate remains, so checkbox stays open. T006 disposable1/10MiBmixed and hostile fixtures/hash manifest now recorded in verification. T007 concrete failed child-start probe and reviewable amendment recorded; T002/T007/T008/T011/T016 blocked by explicit approval/proof requirements. T01810MiBconservative native timing passed,1MiBafter-read timing/unrelated response incomplete. T012/T015/T017/T019/T021 full contracts incomplete. See verification current continuation; no diagram/network/language/compatibility gate marked complete.


## User authorization update — 2026-10-08

User approved the scoped outstanding actions: [canonical approval and boundaries](../../docs/macos-continuation-approval-20261008.md), [reviewed hashes](../../docs/macos-continuation-approval-20261008.json). Disposable blob-frame probe and audited Mermaid11.17.2 installation/lockfile changes are now authorized; isolated Applications install/update tests are authorized on a disposable account/host. Earlier approval-pending/no-install labels are historical and superseded only for these actions. Production proof gates, acceptance results and unchecked tasks stay unchanged. Separate killable-process architecture requires a concrete amendment if needed; release/security/commit restrictions remain. Environments/prior update package are still prerequisites. Next: execute the approved probe/audit, then implementation/rebuild/retest; run installation checks when the isolated environment is available.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.
