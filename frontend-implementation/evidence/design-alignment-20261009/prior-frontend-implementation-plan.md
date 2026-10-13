# Approved design implementation — option D

USER-AUTHORIZED: explicit IMPLEMENT request authorizes scoped frontend changes, fixes, tests and non-publishing builds. Design authority: `../design-reviews/03-10-27-01/proposals/approval-option-D.json`; user selected D and approved the revised package. Active Spec Kit feature confirmed by installed check-prerequisites query: F006 (`specs/006-view-local-images`). React/TypeScript/Vite/Tauri/CodeMirror installed; no dependencies/config/native contracts will change. Prior implementation evidence read from `../../frontend-implementation/STATE.md` and its renderer harness; preserved separately.

Worktree baseline: repository files are untracked; no clean Git baseline inferred. Exact fingerprints and source copies captured before changes. Baseline suite passed: 33 files, 225 tests. Changed/new files and the source diff are recorded under `evidence/option-D/`; 108 captured design files and 57 captured native files remain unchanged.

| Requirement | Source | Implementation and verification |
|---|---|---|
| REQ-D1 fixed D arrows | selected-design-handoff, D wide/state/narrow SVGs | Fixed semantic Back/Forward pair and divider outside scrolling tabs; shared client-side committed visit history, menus, branching/limit/clear/empty/closed behavior; tests using actual App with mocked native APIs. |
| REQ-D2 retain file/edit context | history handoff rules 3–9 | Per-visit reader and image position, per-file zoom, current drafts and existing guards; stale request and failed traversal tests. |
| REQ-Z1 pinch zoom | current user instruction | Shared non-passive WebKit gesture/control-wheel handling scoped to active viewer; image scale and Markdown view zoom retain location, ordinary scrolling unaffected. Limits reuse image 25–400%; test gesture events, accumulated input, per-file isolation. Physical trackpad verification separate. |
| REQ-L1 transient load failure | user bug report | Reproduced against saved original App: released image pixels become a false unavailable state, stale same-file failure replaces success, slow older open steals selection. Implement pending-image semantics, per-request ownership and latest selection intent. Also guard restored-file/large-inspection/link-fragment responses and wait for actual Markdown rendering before restoring passage geometry. Successful/pending/failure/rapid-switch/reopen/stale-response tests cover these causes. |
| REQ-U1 workspace/menu decluttering | frontend and interaction handoffs | Projects menu owns acquisition/search; contextual root/folder/file routes reuse existing commands; scoped document actions and neutral status; keyboard/focus/localization tests. |
| REQ-S1 scoped search presentation | frontend search states | Preserve existing jobs/guards and real Markdown coverage; idle query guidance, distinct selection, clear/stop states. Subtree API unsupported: truthful disabled folder action with request recorded. |
| REQ-E1 editing/save/recovery | interaction fidelity gate | Preserve existing native source/draft/conflict/recovery guards and improve explicit feedback. Full in-place rich editing needs source-backed engine/serialization/recovery architecture approval; document concrete request rather than replace source with unsafe DOM serialization. |
| REQ-P1 separate Settings window | settings handoff | Existing permissions cover main window only; separate-window creation/preferences sync require reviewed capability/native integration. Keep existing working preference controls until approved integration; document exact request. |
| REQ-H1 HTML and other files | HTML/file-navigation handoffs | Existing bridge only accepts Markdown/images; safe HTML/resource access and other-file handler contracts absent. Document concrete change requests; no fake viewer or arbitrary file/native access. |

Visual references: inspected selected D, its row in the shared state board, its 640×480 frame, and relevant original workspace/editing/Settings mockups. No presentation annotations or native traffic lights shipped as product UI. Current source/split editing and preference controls remain visibly different from the full approved rich editor and separate Settings window; IR-01/04 specify the remaining work.

Verification performed: pre-change and final Vitest suites; targeted regressions; TypeScript/Vite build and production worker guard. Network-listening/CDP restrictions prevented the usual Chrome route. A disposable offline macOS WKWebView rendered the actual bundled App with synthetic fixtures and a mocked native bridge. Seven captures cover light/dark, EN/ES, 640×480, 200% page/text enlargement, dirty navigation, save/recovery failure and retry, keyboard menus and gesture input. This is renderer evidence, not actual Tauri integration or physical trackpad evidence. See `report.md` for exact outcomes.

Implementation status remains PARTIAL. Native/architecture requests IR-01–05 are concrete and reviewable in `integration-requests.md`; independently authorized frontend work and verification continued. Existing native access/security contracts, dependencies, canonical specification/design/architecture and approved design artifacts were preserved. No commit, push or deployment.

## Approved-proposal gap pass — 2026-10-05

USER-AUTHORIZED: current IMPLEMENT request; all current design proposals approved at `approval-all-2026-10-05.json`. Preserve existing implementations and fix only demonstrated gaps. Installed Spec Kit resolves global feature F007W/013 Windows. Use its supported F006 feature-directory override with NO_PERSIST; do not change Windows state or canonical Windows artifacts. Existing native/API contracts and dependencies remain unchanged. Baseline hashes/source copies: `evidence/approved-gap-pass/`.

| Requirement / handoff acceptance | Pre-edit classification | Evidence and action |
|---|---|---|
| REQ-D1 / frontend 1–3: fixed D controls, tabs, responsive shell | Implemented but needs fresh verification | App/history/CSS plus approved-navigation and workspace tests. Preserve D anatomy/history. |
| REQ-D2 / frontend 13,16: drafts and reading/image locations | Implemented but needs fresh verification | App source edit guards and visit history; existing navigation/editor/geometry tests. Rich draft aspects await IR-01. |
| REQ-U1 / frontend 4: neutral reload feedback | Partially implemented | Results still inserted as red tree-feedback rows and never expire. Move manual outcomes to reserved footer, pause success timeout on hover/focus, Dismiss, retain last result in target menu; keep errors persistent and background success quiet. |
| REQ-U1 / frontend 5–6: contextual actions/lifecycle | Partially implemented | ActionMenu restores invoker on outside/scroll dismissal; root-file tabs lack context route; folder Expand/Collapse and tab batch close absent. Implement target-specific actions with existing loss guards and fix dismissal focus. |
| REQ-E1 / frontend 7–15: direct rich editor and fidelity | Partially implemented | Explicit edit/source Save/recovery/dirty guards exist. Rich rendered editor/transactions/round-trip architecture and checkpoint compatibility missing: IR-01. Preserve working source engine. |
| REQ-S1 / frontend 17–19: root search | Partially implemented | Root scope/query/batches and retained sidebar exist. Stop is unavailable before native start resolves; late cancel can overwrite a replacement job. Add pending-start cancellation and sequence ownership. Subtree support blocked by IR-05. |
| REQ-P1 / frontend 21–24: separate Settings/persistence | Partially implemented | Current preference controls work; approved separate window/capability and filter persistence contract missing: IR-04. No duplicate window facade. |
| REQ-H1 / HTML 1–8, navigation mixed files | Missing | Native types accept Markdown/images only. HTML isolated WebView/resources and generic metadata/handler contracts absent: IR-02/03. No fake viewer or frontend privilege expansion. |
| REQ-D1 / navigation Go native routes | Missing | Client Go/history exists; OS menu routes missing: IR-05. Preserve existing client implementation. |
| Frontend 20: safety and existing image behavior | Implemented but needs fresh verification | Existing image/security/refresh tests; verify preservation through baseline/final fingerprints. |

Implementation slices: menu focus/lifecycle and target actions; guarded batch close; pending/stale search cancellation; manual reload footer. Add focused regressions for demonstrated gaps, run existing suite/build/worker guard, reuse offline WebKit harness for current renderer captures without replacing historical evidence. Native/VoiceOver/physical input remain separately NOT TESTED. Canonical reconciliation is a bounded maintenance addendum to F006 tasks/verification; outstanding architecture amendments are documented in integration-requests, not silently ratified.

## Completion of the bounded gap pass

Frontend criteria 4–6 and pending/stale root-search cancellation were repaired using existing APIs. Existing D/navigation/loading fixes were retained. Current tests: 39 files/269 PASS; local build and worker guard PASS. WebKit renderer: nine states/204 checks PASS with mocked native APIs. Full package remains PARTIAL due to IR-01–05. Canonical mapping and T039–T042 are recorded under F006 using Spec Kit's supported NO_PERSIST feature override. Concurrent Windows/native/platform edits were preserved; current baseline deltas include those changes and are not all attributable to this pass. See report and `evidence/approved-gap-pass/`.

## Two-file continuity repair - 2026-10-05

User authorized senior-frontend-developer IMPLEMENT for the sibling-link issue. Clarification: Ctrl+O single-file grant correctly blocks siblings. Reproduced a frontend defect when reopening the same file from the selected-folder tree: identity dedup retained that explicit grant. Successful tree reads now rebind only clean tabs to the returned root grant, preserving reading/history/checkpoint keys; edits/recoveries stay bound to their grant. EN/ES single-file guidance added. Focused54/full280 tests and isolated no-bundle Windows build PASS; native two-tab restart acceptance PENDING (helper pipe error2). Source unchanged after build; build-time279 tests, final extra draft-protection regression included in280. See frontend-implementation/evidence/sibling-link-repair/report.md and logs. Candidate SHA256 d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0. Existing QA-0003 failures/close repair, seven approvals, gates and unrelated edits preserved; no backend/security/dependency/install/sign/publish/commit changes.
## QA-0004 repair — 2026-10-05

User-authorized IMPLEMENT: trace startup/session operation errors and stale translated notice state; reuse existing notice UI, preserve storage/close/grant failures, add focused tests, run frontend/build/worker checks and renderer review. Source complete; 40 files/287 tests, build and worker PASS. Native retest pending. See [evidence](evidence/qa-0004/report.md); prior approved-gap and sibling-link plans retained.

## Settings Reading continuation — 2026-10-06

USER-AUTHORIZED IMPLEMENT: current request to work on QA-0004 and the remaining approved integrations. Existing-contract slice: REQ-P1 criteria22–24 numeric controls/preview and retryable preference failures, preserving reader anchors/session ownership. Completed and checked; see evidence/settings-reading-20261006/report.md. Canonical F002R prerequisite override is temporary; F007W stays globally selected.

Remaining work is scoped in integration-decisions-20261006.md: Settings/Go/subfolder native amendment and two isolated rich-editor/HTML security prototypes, followed by canonical decisions before production integration. These proposed technical changes are not self-approved. QA-0004 native discovery still fails pipe error2; actual native/Mac/DPI acceptance pending.

## HTML continuation — 2026-10-08

USER-AUTHORIZED IMPLEMENT: October 6 remaining-scope approval supersedes staged reapproval language. Scope is read-only standalone HTML/CSS, no source editor. Preserve dirty worktree and all native security boundaries. CodeGraph consulted before code reads; current index reported changed files, so targeted current reads followed. Installed Spec Kit prerequisite script reports feature013; selection unchanged.

Implemented independent frontend slice: classify HTML/HTM filenames in filtered tree; actual existing read attempt with retained identity/loading/error/retry/close; preserve missing/access diagnostics; reject HTML bytes from Markdown read/refresh/search response paths; prevent a closed loading tab from resurrection. This is a fallback, not HTML rendering support. Keep authored content out of main DOM.

Dependency: native IR-02 isolated surface/resource broker/type routing and relevant IR-03 metadata. Exact commands/types, budgets, transport parity, canonical owners and acceptance: [native handoff](html-native-handoff-20261008.md). No reapproval request. Full HTML viewer UI, resources, links, fragments, find/outline, refresh, history and zoom integrate only with actual native capabilities; no mock viewer or speculative command calls.

Verification: focused boundary/App tests; full existing frontend regressions; local type/build/worker checks; disposable hostile/light/dark/CSS/image/font corpus for native retest. Native HTML checks NOT TESTED until dependency lands. Browser/native-control limitations recorded separately from component results under evidence/html-20261008.

## Direct in-place editor — 2026-10-08

USER-AUTHORIZED: current explicit senior-frontend-developer IMPLEMENT request. Target: approved `03-10-27-01/proposals/interaction-spec.md#direct-in-place-editing`, frontend handoff and `02-in-place-editing.svg`; approval-all-2026-10-05. Later approved UX supersedes the old F004 source/live-preview presentation. Preserve unrelated dirty work (inventory in evidence/in-place-20261008/worktree-before.txt). Spec Kit global selection013 unchanged; supported feature002 override with NO_PERSIST inspected.

Engineering choice: reuse installed CodeMirror **EditorState**, source transaction history and schema-1 JSON without mounting its source view. Render source-positioned Markdown leaves inside the selected original section's location; apply localized source splices, never serialize the whole DOM. Keep native identity/save/conflict/dirty/recovery APIs unchanged. Existing schema-1 history is read/write compatible; invalid/mismatched history blocks editing and checkpoint replacement with a reason. No dependency addition/native/persistence-schema change planned. This is the proposed alternative to IR-01's previously suggested envelope2, subject to verification.

Slices: lossless text/escape/entity mapping and opaque-block locks; direct rendered editing/paste/composition/history; insertion at the native mapped section in the existing scroll surface; paragraph/list/table/format operations and safe refusal; migrate old source-view-specific behavioral tests; build/regression/worker checks and actual browser review using disposable synthetic bridge fixtures. Native disk bytes, durable restart, WebKit/IME, native menus, physical input and CRLF Save remain distinct verification gates. CRLF deferral retained.

Verification detail: focused behavioral checks use actual DOM beforeinput/composition/paste and rendered text, with a synthetic native bridge for App Save/Save As/close/conflict. Historical source-view tests are being migrated to rendered input without replacing assertions with engine dispatches. Initial 6-file run:43PASS/9FAIL, including one obsolete source-text assertion and timing/initial mapping failures; isolated edit-flow diagnostic PASS. Failures retained; final regression remains pending.

Checkpoint: source transaction/history alternative is implemented and validated against legacy JSON in both directions; envelope2 is unnecessary. Current evidence and exact partial handoff are in evidence/in-place-20261008/report.md. Native Edit menu requires the minimal existing-contract extension documented in in-place-native-request-20261008.md. Broad regression and complete final platform/visual acceptance remain open; no completion claim.

## HTML native integration continuation — 2026-10-08

USER-AUTHORIZED IMPLEMENT consumes the actual native handoff, not the previous unavailable fallback. October6 supersedes staged reapproval; selected Spec Kit013 is observed and unchanged. Preserve the dirty worktree and native/security boundaries. This section supersedes historical HTML dependency descriptions above only for the current integrated scope.

1. Verify registered commands/types/events/provider evidence and inspect approved SVG09–11 + option D. COMPLETE.
2. Implement provider-owning serialized lifecycle, validated acquisition/restore/search/type routing, read-only metadata/details/resources, native Find/Outline/location/zoom/refresh and success-only shared history. IMPLEMENTED; native limitations explicitly separated in html-qa-handoff.md.
3. Verify actual contract-shaped components/App; preserve Markdown/image/Settings regressions; build a separate-profile disposable package and test the real native UI. EXECUTED with explicit native/visual limitations; frozen source 39 focused and 444 full frontend tests PASS. Exact packaged outcomes live in evidence/html-integration-20261008/report.md.
4. Record source/candidate hashes, functional/visual/accessibility/native results and precise QA journeys. Deliver html-qa-handoff.md; stop at implementation handoff. No installation/publication/commit.

No new API, renderer, source editor, dependency, grant expansion or security-policy change is introduced by frontend work. Native follow-ups: generated-heading capture, exact initiating-link focus/original href, and IR03 deliberate default-handler contract; no reapproval dependency.


HTML execution closeout: actual provider integration implemented and native-shaped component/App checks executed. Packaged UI found frontend DOM-blur hiding (fixed and regression-covered) and native coordinate-conversion mismatch (documented to native owner). Final source/candidate IDs and separate verification results: html-qa-handoff.md and evidence/html-integration-20261008/report.md. Stop at frontend→QA; viewport acceptance remains dependent on the native geometry repair, with Windows/manual matrix explicitly untested. No renewed approval requirement.

## In-place finish continuation — 2026-10-08

USER-AUTHORIZED IMPLEMENT, continuing the exact editor scope. CodeGraph and feature002 prerequisites consulted; global013 and unrelated dirty changes preserved. Resolve the previously recorded rich-operation gaps with localized source transactions: multi-leaf selections, paragraph splits/joins, heading levels, nested list indentation, literal code fences, contextual clipboard, IME range reconciliation and caret continuity. Implement the presented minimal native menu owner request using OS engineering scope; keep schema1/source history and native persistence unchanged. Verify actual DOM editing/source fidelity, existing App save/dirty/conflict/recovery routes, real disposable native Save and recovery, local production/worker builds. Freeze a frontend snapshot for broad regression; retain any failures rather than weakening assertions. Browser/native visual acceptance is a separate evidence requirement and may remain NOT TESTED if the computer-use channel cannot operate reliably. No install/commit/push/deploy.

HTML final verification/handoff checkpoint: steps3–4 executed; final source/candidate frozen and identified,39focused/444full tests PASS, actual native smoke and visual blocker recorded. QA handoff delivered with exact journey results and NOT TESTED matrix. Native viewport repair is an implementation dependency; no missing approval.


## Workspace layouts — 2026-10-08
Current USER-AUTHORIZED frontend slice: [scoped plan](evidence/workspace-layouts-20261008/plan.md). All three layouts selected; Margin default. Historical plans/records retained. Native layout preference contract is absent; frontend integration must fail closed and exact native request is required.


## Workspace layout native integration — 2026-10-08

Native capability now implemented using approved owner/session mechanism; production frontend reused unchanged. Supported-host controls/message and checkpoint-before-ack tests added. Implementation handoff complete; remaining verification is recorded in evidence/workspace-layout-native-20261008/report.md.
