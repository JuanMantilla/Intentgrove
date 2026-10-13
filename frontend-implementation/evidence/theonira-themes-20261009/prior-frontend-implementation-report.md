# Approved frontend gap pass — 2026-10-05

IMPLEMENTATION: PARTIAL for the full approved design package. Remaining authorized client gaps implemented; existing option D/history/loading fixes preserved and reverified. FUNCTIONAL_CHECKS: PASS for the named frontend checks. VISUAL_REVIEW: PARTIAL, matching reviewed D/menu/footer/affected layouts; rich-editor and Settings differences remain. INTEGRATION: MOCKED_ONLY for this pass. USER_ACCEPTANCE: PENDING.

User explicitly requested IMPLEMENT, including inspection to avoid repeating completed features. Design authority: `../design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.json`. No new dependency, native contract, privilege, persistence schema, commit, push or publishing performed by this pass.

## What changed and why

The baseline suite passed 37 files / 255 tests. CodeGraph reported stale App/editor/search index ranges; those files were inspected directly. Option D, committed client history, draft/location retention, search presentation and prior loading fixes were already present. They were verified instead of rebuilt. The pre-edit assessment is in [plan.md](plan.md).

| Requirement / approval criterion | Final implementation and evidence | Remaining limit |
|---|---|---|
| REQ-D1 / frontend 1–3: fixed arrows/tabs/shell | Existing implementation preserved. Existing navigation/workspace/geometry tests and nine rendered states cover fixed 32×32 targets, tab separation, Back/Forward and no horizontal window overflow. | Mixed HTML/other-file views depend on IR-02/03. |
| REQ-D2 / frontend 13,16: edit/view continuity | Existing CodeMirror draft/Undo/caret and per-file image/reading locations retained. Current tests and WebKit dirty navigation/save/recovery scenarios pass. | Rich transactions/restart semantics: IR-01; real native save/restart NOT TESTED. |
| REQ-U1 / frontend 4: reload feedback | `ReloadFeedback.tsx`, App/CSS: manual outcomes moved from tree rows to reserved footer. Target-named checkmark plus muted success expires after five seconds, pausing on hover/focus; Dismiss retains last result in target menu. Errors/uncertainty persist; background success does not resurface dismissed manual outcomes. Progress/cancellation remain real existing API state. Tests cover expiry, remaining-time pause, failure/dismiss/new outcome, no tree insertion and retained result. | Real native event/grant integration NOT TESTED in this pass. |
| REQ-U1 / frontend 5–6: menus | `ActionMenu.tsx`: outside/scroll/resize/blur dismissal does not restore invoker focus; keyboard cancellation does. Disconnected anchors dismiss. Document changes dismiss menus; opening contextual menus closes Document disclosure. App adds folder Expand/Collapse, context routes for root-owned tabs, batch Close others/Close to right, Projects root Reload/Copy path and accurate active-target Reload hints. Existing loss guards protect all batch targets; cancellation/save failure retains tabs/drafts. Menu viewport height/width constrained. | Rich selection/table menus and generic-file/native routes await IR-01/02/03/05. |
| REQ-S1 / frontend 17–19: folder search | Pending native start can be stopped and is cancelled when its ID arrives. Sequence ownership prevents stale cancellation or old result-open failures from changing replacement searches. Existing root scope/Both/explicit query/retained sidebar preserved. Focused tests cover pending-start and replacement-job races. | Native subtree contract: IR-05; root-only remains honestly labeled. |
| REQ-E1 / frontend 7–15: direct rich editing | Existing source editor, Save acknowledgment, recovery and conflict guards preserved/reverified. | Approved direct rich editing is not implemented: IR-01 requires a source-backed engine/serialization/checkpoint architecture amendment. Source/split UI remains a known design mismatch. |
| REQ-P1 / frontend 21–24: Settings | Existing preferences remain working; no duplicate or fake window introduced. | Separate native Settings/capability/preference ownership/filter persistence: IR-04. Current popover/tree filter remain known design differences. |
| REQ-H1 / HTML 1–8 and mixed-file history | Existing scoped Markdown/image type boundaries preserved by this frontend pass. | Isolated HTML/CSS/resources and other-file metadata/default-handler support absent: IR-02/03. |
| REQ-D1 native Go; frontend 20 | Client Go/D/image routes preserved and tested. | OS Go/subtree support: IR-05. Physical trackpad/VoiceOver/native acceptance NOT TESTED. |

## Checks actually run

Commands run from `/Users/juanmantilla/projects/personal/md-reader` on macOS 26.2 (25C56).

| Command / method | Result | Evidence |
|---|---|---|
| `npm test -- --reporter=dot` before edits | PASS, 37 files / 255 tests | `evidence/approved-gap-pass/baseline-tests.log` |
| `npm test -- tests/ui/action-menu.test.tsx --reporter=dot` before fixing menu focus | FAIL, two reproduced focus-stealing regressions | `menu-before.log` |
| `npm test -- --maxWorkers=2 --reporter=dot` final current source | PASS, 39 files / 269 tests | `final-current-tests.log` |
| Focused final menu/reload/search/workspace suite, `--maxWorkers=2` | PASS, five files / 35 tests | `final-focused-tests.log` |
| `npm run build` final current source | PASS, TypeScript and Vite. Bundle-size advisory remains. | `final-current-build.log` |
| `npm run test:bundle-worker` | PASS, production Markdown/code worker guard | `worker-bundle.log` |
| Installed Spec Kit `check-prerequisites.sh --json --require-tasks --include-tasks` with supported F006 directory override and NO_PERSIST | PASS; global Windows feature state untouched | `feature-state.json` |
| Current fixture bundle via installed Vite; existing disposable AppKit/WKWebView runner launched with `open -n /private/tmp/md-approved-gap-webkit/Renderer.app` | PASS, nine real renderer states / 204 checks; native APIs mocked and events synthetic | `renderer-results.json`, per-case JSON/PNG, `executed-offline-renderer.swift`, driver and preparation script |

An initial default-concurrency full run timed out in an existing recovery test during Swift module compilation. No test was weakened; lower-concurrency final runs pass. Initial render checks found one-pixel footer growth; reservation increased to 44 CSS units and layout checks pass. The mock reload fixture now publishes completion separately from item status; synthetic hover dispatch uses React's delegated mouseover path. Earlier failing renderer evidence is retained in `renderer-before-fix/`.

Swift compilation first failed writing the default outside-workspace module cache. A retry used a disposable cache, but source modification during overlapping compilation invalidated that attempt. Verification reused the existing compiled disposable runner with its exact original source saved as `executed-offline-renderer.swift`; no successful fresh compile is claimed. Normal sandbox launch failed; the authorized local runner launch succeeded through sandbox escalation. No security setting was changed.

## Visual review and integration limits

Actual WKWebView PNGs were compared with approved D, narrow workspace and menu SVGs rendered separately with UTF-8. Reviewed dark/light, EN/ES, 640×480, 1440×900 and 200% page/text states. D remains fixed outside the scrollable tab lane; success footer is neutral and target-named; reader geometry stays stable; essential controls remain visible in reviewed layouts. These are qualitative design comparisons, not pixel-approved visual regression baselines. The native window/titlebar, Tauri operations, IME, screen reader and physical gestures are NOT TESTED.

The static reference renders are labeled `reference-*`; they contain no application tests. Actual app captures use disposable document fixtures and a mocked bridge. They do not prove grants, durable native saves, restart recovery, HTML isolation or default-app launch.

## Change baseline and concurrent work

Repository files began untracked. `before-hashes.json` and source copies provide the review baseline; `frontend.patch` shows current deltas against those copies. Native/Windows artifacts changed concurrently, and subsequent platform adaptations also touched shared App/i18n source. They were preserved. The combined diff may therefore include concurrent platform edits; do not attribute every hunk to this frontend pass. No native/Cargo/Windows-specific artifact was written by this pass. All approved proposal/mockup/archive files remain byte-identical. [change-review.json](evidence/approved-gap-pass/change-review.json) records observed concurrent deltas separately.

Canonical traceability: `specs/006-view-local-images/frontend-maintenance-2026-10-05.md` and T039–T042 in its tasks. Original approved spec/design/architecture files were not rewritten. Global `.specify/feature.json` still selects F007W; local command overrides did not persist.

## Remaining work

[IR-01–05](integration-requests.md) remain the concrete technical requests for rich editing, HTML/resource isolation, generic metadata/launch, Settings/preference scope and native Go/subtree search. They are missing contracts or material architecture amendments, rather than unresolved design selection. The [frontend skill](/Users/juanmantilla/projects/personal/.agents/skills/senior-frontend-developer/SKILL.md) says: “Raise a specific change request for work outside the authorized frontend scope.” Repository AGENTS.md says: “Material scope/design/architecture changes reopen the affected gate only.” Those boundaries prevent silently adding native capabilities or replacing checkpoint/editor architecture. Current user authorization covers frontend implementation and documenting these requests; repeated design approval is unnecessary.

Next: resolve the affected technical/native contracts through their owning canonical feature, implement those integrations, and run disposable packaged macOS acceptance. Full approved-package implementation and user acceptance remain pending.

## Evidence cleanup on 2026-10-05

User-authorized cleanup removed seven superseded PNGs from `evidence/option-D/` and twelve older PNGs from `evidence/approved-gap-pass/renderer-before-fix/`. Current same-case captures in `evidence/approved-gap-pass/`, historical case JSON/results, failure details, logs, source snapshots and drivers remain. Earlier wording about retained renderer evidence now refers to those retained records; old screenshots themselves are no longer retained. Current capture replacements depict later source and do not substitute for original historical pixels. See the [exact deletion report](../docs/implementation-status-2026-10-05.md#completed-cleanup-and-deleted-files) and [receipt](../docs/status-audit-2026-10-05/deletion-receipt.json). No code, tasks, open integration requests, approval artifacts or native acceptance evidence was removed.

## Two-file continuity repair - 2026-10-05

User authorized senior-frontend-developer IMPLEMENT for the sibling-link issue. Clarification: Ctrl+O single-file grant correctly blocks siblings. Reproduced a frontend defect when reopening the same file from the selected-folder tree: identity dedup retained that explicit grant. Successful tree reads now rebind only clean tabs to the returned root grant, preserving reading/history/checkpoint keys; edits/recoveries stay bound to their grant. EN/ES single-file guidance added. Focused54/full280 tests and isolated no-bundle Windows build PASS; native two-tab restart acceptance PENDING (helper pipe error2). Source unchanged after build; build-time279 tests, final extra draft-protection regression included in280. See frontend-implementation/evidence/sibling-link-repair/report.md and logs. Candidate SHA256 d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0. Existing QA-0003 failures/close repair, seven approvals, gates and unrelated edits preserved; no backend/security/dependency/install/sign/publish/commit changes.
Two-file continuity acceptance update: user confirms exact candidate d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0 opens the sibling from the folder tree, keeps Ctrl+O single-file restricted with the new guidance, and restores both tabs after restart. USER_ASSISTED PASS; T038 complete. Raw reply: frontend-implementation/evidence/sibling-link-repair/user-native-retest.json. Earlier blocked/pending entries retained as history. No DPI/new worker/Mac PASS inferred; QA-0003/T036/T037 and broader gates remain separately open.
## QA-0004 status and locale repair — 2026-10-05

COMPLETE_IN_SCOPE; native retest/user acceptance PENDING. Session load/checkpoint/close errors now identify the operation and returned code, remain distinct from successful document reading, and preserve guarded-close refusal. All existing notices evaluate in the current EN/ES locale, including delayed failures. Styles, native contracts/security, dependencies, editing gates and prior continuity changes preserved. Full287/build/worker PASS; Chrome synthetic renderer checks PASS. Historical startup native error uncaptured; QA-0003's established DACL finding is correlated through shared storage, not asserted as the identical startup error. [Detailed evidence and limitations](evidence/qa-0004/report.md).

## Settings Reading and integration decisions — 2026-10-06

Current user requested work on the identified remaining integrations. Implemented the approved existing-contract Reading slice: numeric fields/validation, live typography preview, language/appearance/checkpoint Retry, and bounded responsive overlay. 41 files/291 frontend tests, production build and worker guard PASS. Real Chrome renderer exercised English/dark and Spanish/light,640/320px, numeric/Escape/reset/close focus; native operations mocked. Full package PARTIAL; separate native Settings/rich editing/HTML/details/subtree remain absent. Native discovery still fails pipe error2 after reset; QA-0004/T039 and actualMac/DPI/zoom acceptance remain open. Native candidate for this new slice NOT BUILT.

[Evidence and limitations](evidence/settings-reading-20261006/report.md). [Concrete technical/native decision request](integration-decisions-20261006.md). No original design/native/config/dependency/schema/installer/commit/publication changes; prior user edits and acceptance preserved.

## Standalone HTML continuation — 2026-10-08

IMPLEMENTATION PARTIAL: HTML renderer/resource broker are absent in current native contracts. Implemented only truthful frontend readiness/fallback: HTML/HTM names in filtered tree; retained identity/opening/error/retry/close; typed native failure distinctions; unexpected HTML rejection at Markdown read/refresh/search boundaries; unsupported Markdown→HTML source retention; pending-close stale-reply protection; EN/ES. No HTML authoring, raw HTML insertion or mock viewer. Main CSP and native privileges unchanged.

October 6 remaining-scope authorization supersedes historical staged reapproval requirements. No approval requested. Exact actionable native dependency (shared Tauri host/platform surfaces, command/types, isolation/grants/budgets, routing, acceptance and canonical owners): [HTML native handoff](html-native-handoff-20261008.md). Full HTML rendering/resources/fragment/history/zoom/Find/Outline and packaged security behavior remain NOT TESTED and not implemented.

[Evidence, exact commands, failures and limits](evidence/html-20261008/report.md). Final focused26tests PASS; types/build/worker PASS. Initial full2worker run380PASS/2timeoutFAIL, with both anchor cases passing in focused serial retest; final full serial383tests/55files PASS. Browser/native capture attempts did not establish real visual verification; NOT TESTED. Dirty worktree preserved; no install/commit/push/publish.


## Direct in-place editor — 2026-10-08

IMPLEMENTATION PARTIAL; USER ACCEPTANCE PENDING. Replaced split/source authoring with source-backed rendered blocks at the selected section's existing document location. Actual text/list/table/code editing, paste/composition, local properties/formatting, Undo/Redo and schema1 CodeMirror checkpoint compatibility implemented without adding dependencies or changing native persistence. Later approved in-place UX explicitly supersedes the old F004 presentation in feature002. Opaque constructs retain original source; unsafe operations explain their refusal. CRLF Save remains deferred; non-LF direct authoring is guarded.

Current isolated rendered editor28PASS and workspace20PASS; current production build/worker/diff checks PASS. Real Rust disposable-file editing22PASS and recovery16PASS/1IGNORED are separate from mocked App integration. Broader runs have retained failures; no full-suite PASS or complete native integration claim. Visual review covers intermediate dark/English1440px synthetic-bridge Chrome only; final/narrow/light/Spanish/WebKit/physical IME/VoiceOver unavailable.

[Detailed implementation, evidence, failures and safety limits](evidence/in-place-20261008/report.md). [Concrete minimal IR-01 native Edit-menu contract request](in-place-native-request-20261008.md): source-history Undo/Redo and Format need focused native menu ownership. Native/API changes are outside this skill's authority; no new recovery schema/dependency is necessary. Arbitrary cross-leaf replacement, unsafe complex transforms, heading-level changes and editing syntax highlighting remain incomplete. No installation, commit, push or deployment.

Final editor-only verification:29PASS including composition focus-exit checkpoint. Appearance fixture corrected from literal backslash+n JSX attributes to actual LF; isolated1PASS. Historical multi-file failures remain in the evidence ledger; no full-suite PASS inferred. Latest local buildPASS (build-verified-final.log).

Final dirty-close routing23PASS (mocked editor/native), recorded in close-completion.log;29 actual rendered-editor tests and20 App workspace tests separatelyPASS. Delivered-source.sha256 all11entries matched; diff-delivered.logPASS. Full/native/visual limitations remain unchanged.

## HTML native frontend continuation — 2026-10-08

The previous HTML-unavailable-only checkpoint is superseded for valid native providers by actual frontend integration. Read the current [QA handoff](html-qa-handoff.md) and [execution evidence](evidence/html-integration-20261008/report.md); historical reports above retain their original boundaries. Implemented actual native lifecycle/acquisition/restoration/search/resource/Find/Outline/location/zoom/refresh, metadata-only File details and shared history. Malformed/unsupported providers still fail closed; HTML never enters Markdown editing/recovery. Native implementation/security/config/dependencies and unrelated dirty work were preserved.

Native-shaped mocked tests, application builds, actual packaged native observations, visual review and accessibility checks are reported separately. A build is not HTML support proof. Known native follow-ups are implementation dependencies rather than missing approval. Final exact source/candidate identities and test outcomes are recorded in the handoff/evidence after verification.


## Direct in-place editor finish continuation — 2026-10-08

IMPLEMENTED; platform/visual acceptance incomplete, user acceptance pending. Later approved direct editing supersedes historical F004 source/preview. Source/split authoring removed; localized rich transactions now cover multi-leaf/paragraph editing, clipboard/context menu, heading remap, nested lists/quote levels, code highlighting/caret and keyboard structure exits. Existing CodeMirror schema1 history/recovery and native Save/Save As/conflict/dirty boundaries retained. Presented native history/Format owner request implemented in the narrowly authorized OS slice; no new dependency/schema/privileges. CRLF Save remains DEFERRED.

Final editor61PASS; real native editing23/recovery16PASS+1ignored; local build/workerPASS. Broad frozen460PASS/2FAIL, individual failing casesPASS but cause unproven; no overall regression PASS. Workflow49PASS/1readinessFAIL retained. Actual final packaged menu/physical IME/VoiceOver/complete theme-locale-size matrix NOT TESTED because CUA state/screenshot/input channel is inconsistent. Precise next acceptance and manifests: frontend-implementation/evidence/in-place-finish-20261008/report.md. No remaining editor dependency decision; acceptance is still required. Concurrent HTML changes and selected013 preserved. No install/commit/push/deploy.

Final workspace file rerun:15PASS/7FAIL (`workspace-delivery.log`), unchanged edit-entry readiness deadlines and5s timeouts. Cause unresolved. Individual PASS does not establish suite-level regression acceptance; final editor61/build/worker remain PASS.

Final native check/current build/range27PASS. Scoped-query diagnostic13PASS/9FAIL did not resolve readiness and was reverted; original assertions/deadlines retained. No regression acceptance inferred. See final finish report.

Final handoff61/4filesPASS (`focused-handoff.log`) after all editor code changes; delivery diffPASS and source manifests refreshed. Task-owned servers stopped. Broader readiness/runtime/visual acceptance limitations remain explicit.


HTML frontend final handoff: implementation complete within frontend ownership; QA/visual acceptance pending native coordinate conversion. Exact frozen39focused/444full tests PASS; production package/worker/signature PASS. Final real-native smoke exercised125%zoom, fragments, Find/Outline, retained return, Markdown/image history branching, file-only asset denial/cancel, explicit folder grant+Reload, ES/light Settings, empty and baseline states. Known native dependencies and unavailable matrix are explicit in `frontend-implementation/html-qa-handoff.md` (from this file resolve relative to repo root) and `frontend-implementation/evidence/html-integration-20261008/report.md`. Final source/candidate hashes and runnable disposable path are there. Concurrent workspace/editor changes preserved; exact snapshot regression does not cover later editor/menu continuation. No install/commit/push/publish/security changes; stop at frontend→QA.


## Workspace layouts — 2026-10-08

All3 frontend compositions/settings integration prepared; overall PARTIAL pending native preference/session field. Current native choices disabled honestly. Final487frontend/61files,47focused, build/worker/diff PASS.24synthetic-native browser captures; packaged restart/enlargement acceptance pending. [Scoped report](evidence/workspace-layouts-20261008/report.md); [exact native request](evidence/workspace-layouts-20261008/native-request.md). Historical results/approvals unchanged.


## Workspace layout native integration — 2026-10-08

The earlier missing-native-contract status is superseded for this new candidate only. Native enum/session persistence delivered; real supported Settings and process restarts observed.488mocked frontendPASS; representative actual native inspection separate. Full native matrix and runtime user acceptance pending. See evidence/workspace-layout-native-20261008/report.md and OS canonical report. Historical failures preserved.

## Design alignment implementation — 2026-10-09

Overall approved workspace composition and DC-02–06 implemented; existing rich editor, native HTML and three-layout owner retained. [Full report](evidence/design-alignment-20261009/report.md) · [self-contained designer/before/after comparison](evidence/design-alignment-20261009/design-comparison.html) · [complete checklist](evidence/design-alignment-20261009/plan.md).

491/61 regression PASS, followed by23 close/recovery tests after the final guard refinement; TypeScript/Vite/native build, worker and signature checks PASS.24 matching renderer pairs plus real native save/search/history/image/layout/conflict/recovery checks, each scoped by receipt. Native HTML renders but overlaps metadata by32px: [OS_ENGINEERING dependency](evidence/design-alignment-20261009/native-boundary-request.md). Visual acceptance remains PARTIAL; exhaustive accessibility, encoding and native failure coverage NOT TESTED.

Final local candidate main992f2b5385211733eb75ab4ed043904c9225a31d8c51f718389a5da6bd24ae39; ID com.juanmantilla.intentgrove.alignment20261009. [Full source/bundle receipt](evidence/design-alignment-20261009/candidate.json). Installed executable unchanged; no install/deploy/dependencies/native contracts/commit/push. Historical work and approvals preserved. User acceptance pending.
