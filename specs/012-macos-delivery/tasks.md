# Tasks: Private macOS Delivery (F005)

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [contract](contracts/macos-entry.md). Approved hashes: `docs/approvals.md`.

## Phase 1: Setup

- [X] T001 Confirm F005 active in `.specify/feature.json`, approved hashes, macOS arm64 host/toolchain and existing bundle/quit code in `docs/approvals.md`, `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, and `docs/local-build-2026-09-29.md`.
- [x] T002 Establish AS-001–009/SC-002–004 evidence ledger (SC-001 withdrawn) and full v1 matrix in `specs/012-macos-delivery/verification.md`. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 2: Foundation

- [X] T003 Add safe native incoming-event queue with bounded paths, source, event ID and renderer readiness in `src-tauri/src/native_entry.rs` (R05/R06).
- [X] T004 Add file/folder intake through no-follow grant checks and typed errors in `src-tauri/src/native_entry.rs` and `src-tauri/src/state.rs` (R05/R06).

## Phase 3: User Story 1 — Install and launch (P1)

**Independent test:** Build, mount and inspect disposable arm64 `.app`/`.dmg`, then launch without development tools and record exact compatibility/signing state.

- [x] T005 [US1] Finalize bundle metadata, supported document associations, icon/resources and minimum OS in `src-tauri/tauri.conf.json` and `src-tauri/Info.plist` (R01–R03; AS-001/002). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T006 [US1] Produce local `.app`/`.dmg`, verify arm64 binary, bundle resources, hashes, codesign, Gatekeeper and installed launch; record in `specs/012-macos-delivery/verification.md` (R01–R03; SC-001 withdrawn). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 4: User Story 2 — Use macOS entry points (P1)

**Independent test:** Open exact disposable files via Finder cold/warm and drop, with file-only grants and localized failures.

- [X] T007 [US2] Handle `RunEvent::Opened` and `WindowEvent::DragDrop`, queue until renderer ready and emit typed results in `src-tauri/src/lib.rs` and `src-tauri/src/native_entry.rs` (R05/R06; AS-004/005).
- [X] T008 [US2] Integrate incoming grant/error events into tabs, folder switching and EN/ES state in `src/app/App.tsx`, `src/app/api.ts`, `src/app/i18n.ts`, and `src/styles/app.css` (R05/R06; AS-004/005).
- [x] T009 [US2] Implement native application/File/Edit/View/Window menu actions and applicable shortcuts through current UI commands in `src-tauri/src/lib.rs` and `src/app/App.tsx` (R04; AS-003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**
- [x] T010 [US2] Verify Finder/drop/menu journeys and no sibling grant/source writes in disposable packaged tests; record in `specs/012-macos-delivery/verification.md` (SC-002). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 5: User Story 3 — Preserve work across lifecycle (P1)

**Independent test:** Five Close/Quit routes and Dock reopen with disposable clean/dirty documents preserve drafts and restore a reachable window.

- [X] T011 [US3] Unify native Close/Quit with F004 choices and durable F003C final checkpoint in `src-tauri/src/lib.rs` and `src/app/App.tsx` (R07; AS-006).
- [X] T012 [US3] Recreate/show main window on Dock Reopen and restart refresh ownership in `src-tauri/src/lib.rs` and `src-tauri/src/refresh.rs` (R08; AS-007).
- [x] T013 [US3] Verify clean/dirty/cancel/save-failure/reopen/update scenarios, fixture/app-data hashes and EN/ES status in `specs/012-macos-delivery/verification.md` (R07–R09; SC-003). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Phase 6: User Story 4 — Release honestly (P1)

**Independent test:** Every accepted v1 criterion has PASS/FAIL/BLOCKED/NOT TESTED with an evidence path and truthful host/signing scope.

- [x] T014 [US4] Complete v1 acceptance matrix and final app/DMG checksum/signing/compatibility record in `specs/012-macos-delivery/verification.md` (R10; AS-009; SC-004). **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**

## Dependencies and execution strategy

T001–T004 precede native entry points. US1 bundle metadata and US3 lifecycle can progress after setup; final US1/US4 verification follows all approved slices. US2 depends on safe intake; US3 depends on F003C/F004. F006 image associations are added only when its decoder is implemented and verified. Test fixtures and evidence can be prepared independently; `lib.rs` mutations serialize.

## Evidence reconciliation — 2026-10-07

Current local package/metadata/signature/DMG integrity checks are recorded in `current-readiness-20261007.md` and `verification.md`. T005/T006 remain open because minimum OS/runtime associations/Gatekeeper/install acceptance are not complete. T002/T009/T010/T013/T014 remain open pending the full current native/compatibility/install/update ledger. Historical checked implementation tasks and earlier bounded QA evidence are retained.


## 2026-10-08 reconciliation

Fresh final-source private-ad-hoc app/DMG rebuilt and inspected/mounted read-only successfully; final-source native30PASS/2FAIL/10BLOCKED. See verification continuation and OS final report. T002/T005/T006/T009/T010/T013/T014 remain open because complete runtime/installation/native journey/compatibility contracts are unmet; no minimum-OS runtime claim from min14 metadata.


## User authorization update — 2026-10-08

User approved the scoped outstanding actions: [canonical approval and boundaries](../../docs/macos-continuation-approval-20261008.md), [reviewed hashes](../../docs/macos-continuation-approval-20261008.json). Disposable blob-frame probe and audited Mermaid11.17.2 installation/lockfile changes are now authorized; isolated Applications install/update tests are authorized on a disposable account/host. Earlier approval-pending/no-install labels are historical and superseded only for these actions. Production proof gates, acceptance results and unchecked tasks stay unchanged. Separate killable-process architecture requires a concrete amendment if needed; release/security/commit restrictions remain. Environments/prior update package are still prerequisites. Next: execute the approved probe/audit, then implementation/rebuild/retest; run installation checks when the isolated environment is available.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.


## HTML continuation — F005-H01

- [x] H-NATIVE-F005-H01 Complete and verify the native extension described in [canonical amendment](../001-workspace-reader/html-native-amendment-20261008.md) against exact platform/candidate evidence. Source completion, targeted checks and remaining native/frontend acceptance are recorded in [handoff](../../os-engineering/html-frontend-handoff.md); preserve existing task outcomes. **Closed by user acceptance of the current state (2026-10-10); no additional execution claimed.**


## Proposed Markdown default-app opt-in — 2026-10-10

New user-requested work; DRAFT FOR REVIEW, separate from accepted current-version closeout. Task batch: [concrete amendment](default-markdown-20261010/plan.md). No implementation or real association changes performed.

## Approved Markdown default-app implementation — 2026-10-10

Approval: [verified review hashes and user instruction](default-markdown-20261010/approval.json). Reviewed artifacts remain byte-identical.

- [x] T-D01 Narrow association classification and production bundle eligibility.
- [x] T-D02 Consent coordinator, injected adapter tests and truthful post-query outcomes.
- [x] T-D03 One-time response persistence and readiness/deferred native sheet.
- [x] T-D04 Consent-only CLI and validated, quoted script; no workspace initialization.
- [x] T-D05 Separate Markdown/HTML declarations; build and package inspection.
- [ ] T-D06 Safe native association verification; real OS writes only disposable types/isolated account.
- [ ] T-D07 Native EN/ES keyboard/appearance and cold/warm file-open acceptance matrix.

T-D01–T-D05 source/local validation complete. T-D06–T-D07 remain open for actual OS consent and native acceptance; safe read-only queries and mocked outcomes executed. [Verification ledger](default-markdown-20261010/evidence/verification.json), [implementation report](default-markdown-20261010/implementation-report.md), [exact remaining procedure](default-markdown-20261010/manual-verification.md). No unmet native acceptance checkbox is completed.

## Every-launch refinement — 2026-10-10

- [x] T-D03-R1 Replace durable startup suppression with a status check on each eligible packaged launch; retain one prompt per process, readiness gates, explicit consent and already-default skip. [User-authorized amendment](default-markdown-20261010/every-launch-amendment.md).

T-D03-R1 native policy/adapter/script/library121PASS/5ignored, final package and disabled consent-only CLI/signature PASS. Actual OS-switch/relaunch acceptance remains NOT TESTED; user observed the prior consent-only app correctly reporting already-default. [Refinement report](default-markdown-20261010/every-launch-report.md).

## User-reported default request failure —2026-10-10

- [x] T-D02-R1 Clarify request-error versus exact-copy verification mismatch, add bounded read-only verification and diagnostic CLI; fake/native/build checks PASS. [Report](default-markdown-20261010/request-failure-report.md).

T-D06 real change effectiveness is USER-REPORTED FAIL; no independent setter rerun or cause established. Local association preference names Intentgrove identity; exact resolved URL must be obtained from the user-context read-only diagnostic. Do not weaken exact-copy verification or reset real preferences.

## Automatic native file opening — 2026-10-10

- [x] T-N01 Consume supported file entries automatically after restoration, serialize delivery, retain folder confirmation and scoped errors.
- [x] T-N02 Verify ordering, warm/cold events, deduplication and workspace/draft retention with frontend tests; run native checks/build/package inspection.
- [ ] T-N03 Actual macOS Finder/drop acceptance with isolated data and onboarding disabled.

T-N01/T-N02 source and local verification complete: frontend534PASS/62files, native123PASS/5ignored, worker/script/final arm64 package/ad-hoc signature PASS. T-N03 remains NOT TESTED; mocks are not native Finder/drop UX. [Report](automatic-native-open-20261010/report.md), [ledger](automatic-native-open-20261010/evidence/verification.json).
