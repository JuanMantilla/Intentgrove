# Approved option-D frontend implementation — 2026-10-04

**Implementation: PARTIAL.** Option-D history navigation, workspace/document menus, scoped-search presentation, explicit Save controls, viewer pinch zoom and diagnosed loading regressions are implemented. The full rich editor, separate Settings window, HTML/CSS viewer and other-file routing remain integration work. Concrete proposals are in [integration-requests.md](integration-requests.md); none is represented as a working capability.

Functional checks: PASS for the named automated/renderer scenarios below. Visual review: PARTIAL; reviewed D placement and affected layouts, with the known rich-editor/Settings differences retained. Integration: MOCKED_ONLY for new interactions. Physical trackpad and packaged native acceptance: NOT TESTED. User acceptance of this implementation: PENDING; the design approval remains valid.

## Authority and change baseline

User authorized IMPLEMENT, scoped frontend changes, bug fixes, tests and local builds. Design authority: [approval-option-D.json](../design-reviews/03-10-27-01/proposals/approval-option-D.json), selected handoff and the statement “I like better option D, I approve everything”. All seven requested handoffs/specifications were read. The D wide SVG, D state-board row, D narrow frame and relevant original workspace/editing/Settings mockups were visually inspected.

AGENTS.md and current state were read; installed Spec Kit selects F006. CodeGraph was used first for application investigations. Prior evidence at the parent `../frontend-implementation/` was read and preserved. Existing React/TypeScript/Vite/Tauri/CodeMirror components and palette were reused.

The repository started wholly untracked. Git cannot provide a clean historical diff. [before-hashes.json](evidence/option-D/before-hashes.json), [after-hashes.json](evidence/option-D/after-hashes.json), [change-review.json](evidence/option-D/change-review.json) and [frontend.patch](evidence/option-D/frontend.patch) record the exact captured baseline and frontend changes. All 108 captured design files, including approvals/archive/SVGs, and all 57 captured native files remain unchanged. Native contracts, dependency manifests and production configuration were not edited. No commit, push, deployment or publishing occurred.

## Requirement traceability

REQ IDs below are local implementation-plan identifiers; they do not replace canonical feature IDs.

| ID / source | Implemented behavior and files | Evidence / result | Remaining work |
|---|---|---|---|
| REQ-D1 — selected handoff; arrow spec/D references | `App.tsx`, `visitHistory.ts`, `app.css`, `i18n.ts`: fixed 32×32 outlined arrows, 8px gap and divider before scrolling tabs. Independent history, branch truncation, 100-entry session bound, Go/Visited/Clear, direction lists, retained closed cursor. No duplicate header arrows. | PASS: navigation/unit tests; seven renderer cases show stable placement. | Native Go menu, additional file types and full native access/reselection journeys: IR-02/03/05. |
| REQ-D2 — file-navigation handoff | History validates access before changing file/cursor; cancelled/failed traversal retains source and Forward branch. Draft/caret/Undo remain owned by the file. Reader passage, image view and per-file zoom survive supported traversal/tab switches. | PASS with mocked bridge: failure/retry/cancel, closed reopening, dirty editor round trip, focus restoration and rendered passage restoration. | Real grants, changed identity, restart and mixed HTML/other-file journeys NOT TESTED. |
| REQ-Z1 — pinch request | `usePinchZoom.ts`, `ImageView.tsx`, `LargeSourceView.tsx`, `App.tsx`, `find-index.ts`: WebKit gesture and control-wheel pinch; ordinary wheel remains scrolling. Content-only zoom, 25–400% limits, per-file/view ownership and pointed-location retention. Image controls retain Fit/manual behavior. Large source changes its content font, not its controls. | PASS: repeated in/out, WebKit gesture scale, missing coordinates, bounds, listener ownership and zoom geometry tests; actual WK renderer verifies Markdown/image changes, stable chrome and switching. | Physical trackpad NOT TESTED. HTML pinch awaits IR-02. Zoom is retained in the running workspace, not added to the native session schema. |
| REQ-L1 — loading bug | `App.tsx`: pending image semantics, request tokens, workspace generation and latest selection intent; same-file/restore/large-inspection stale-result rejection, duplicate restored-tab prevention, owned link fragments. `MarkdownView.tsx` signals completed rendering before passage restoration. | PASS: original App reproduced three failures; final regressions cover success/pending/reopen/rapid switching/stale success/failure/genuine failure. Rendered image observer sees zero false alerts; no false passage-shift notice. | Native watcher/helper faults and physical packaged reproduction NOT TESTED. |
| REQ-U1 — frontend/interaction handoffs | `ActionMenu.tsx`, `DocumentLocation.tsx`, `App.tsx`, CSS/EN/ES: Projects acquisition/search, root/file contexts, Document disclosure, path/reveal/copy availability, header Outline/Reading/Edit, narrow drawer with retained wide preference. Menus clamp, dismiss and return focus. | PASS: existing/updated UI tests; menu End/Escape, viewport bounds and narrow/enlarged captures. | Separate Settings/tree-filter ownership: IR-04. Full mixed-file contexts: IR-02/03. |
| REQ-S1 — scoped-search states | `FolderSearchPanel.tsx`: explicit Names/Contents/Both selection, root scope, truthful Markdown-content coverage, explicit submit, Stop/Clear/Return behavior, grouped results and stale-hit rejection. | PASS: folder-search UI tests; narrow rendered query focus/layout. | Subtree search disabled with a reason; native scope extension in IR-05. |
| REQ-E1 — editing/fidelity/Save/recovery | `SectionEditor.tsx`, `App.tsx`, EN/ES: visible header Edit/Save file/Return; Save returns to reading after acknowledgment, current drafts retained across history. Existing source/split CodeMirror, conflict, recovery, Save As and loss guards preserved. | PASS mocked: Save acknowledgment, recovery failure plus Retry, Save failure preserves draft, dirty navigation/caret/Undo. | Approved rich editing is **not implemented**. IR-01 specifies lossless source/history architecture and checkpoint migration. Native durable saves/restart NOT TESTED. |
| REQ-P1 — Settings handoff | Existing language/appearance/reading preferences remain functional and tested; narrow reading controls stay reachable in Document disclosure. | Existing behavior preserved; reading controls capture is **not** the approved Settings window. | Separate Settings, preference ownership/persistence/filter migration: IR-04. |
| REQ-H1 — HTML and shared file-link handoffs | Existing Markdown/image security boundaries retained; no unsafe HTML or generic launch facade introduced. | New HTML/other-file capability: NOT IMPLEMENTED. | Isolated HTML/CSS resource broker/type routing and explicit handler launch: IR-02/03. |

## Loading diagnosis

The saved original App fails three disposable regressions ([regression-before.log](evidence/option-D/regression-before.log)): inactive image pixels are deliberately released but the viewer briefly treats absent pixels as unavailable before reloading; an older same-document rejection can replace a newer success; an earlier slow open can steal selection from the latest requested file. These are observed failures, not an assumed single race.

Pending bytes now render loading until a real error exists. Owned request tokens/generations protect reads and recovery chains, while a separate selection intent prevents late valid reads from selecting another tab. Restored aliases reuse their existing tab. Large-file inspection and link-fragment completion use the same ownership rule. Real failures still expose their existing error/recovery states.

Rendered verification also exposed passage restoration before worker parsing finished. It now waits for the actual Markdown DOM and does not capture pending-view geometry, avoiding false “passage moved” notices or lost retained scroll. A delayed-worker session regression covers this transition.

## Checks actually run

All npm commands used `/Users/juanmantilla/projects/personal/md-reader`. Host: macOS 26.2 (25C56). No browser/native testing dependency was installed.

| Check | Exact command / method | Result and limits |
|---|---|---|
| Baseline | `npm test -- --reporter=dot` | PASS, 33 files / 225 tests: [log](evidence/option-D/baseline-tests.log). |
| Original-regression reproduction | Temporary copied original App imported by the disposable navigation tests, then temporary files removed | Expected FAIL for all three diagnosed cases: [log](evidence/option-D/regression-before.log). |
| Final full suite | `npm test -- --reporter=dot --maxWorkers=2` | PASS, 37 files / **255 tests**, exit 0: [log](evidence/option-D/tests.log). Native/file operations mocked. Default parallel execution had a one-second initial-heading timeout under load; session readiness now allows five seconds, and final workers are bounded. No assertion removed. |
| TypeScript/production web build | `npm run build` | PASS, exit 0: [log](evidence/option-D/build.log). Includes `tsc --noEmit`; existing >500kB bundle advisory remains. This is not a macOS app build. |
| Production worker boundary | `npm run test:bundle-worker` | PASS, exit 0: [log](evidence/option-D/worker-bundle.log). Markdown/code workers remain bounded/local and independent of document/window globals. |
| Active canonical feature | `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` | PASS, F006 selected: [result](evidence/option-D/feature-state.json). Canonical spec/design/architecture not revised. |
| Render build | `node frontend-implementation/evidence/option-D/prepare-offline-renderer.mjs` | PASS using installed Vite; synthetic fixture bundles written only to disposable `/private/tmp`: [log](evidence/option-D/renderer-build.log). |
| Actual rendered interactions | Compile `offline-renderer.swift` with installed `xcrun swiftc`; launch disposable helper with `open -n /private/tmp/md-option-D-webkit/Renderer.app` | PASS, seven WKWebView cases / **150 checks**: [matrix](evidence/option-D/renderer-results.json). Real DOM/rendering; native API mocked, gesture/keyboard events synthetic. Source driver and helper preserved in evidence. |

Intermediate diagnostic logs retain their failures and earlier revisions; final `tests.log`, `build.log`, `worker-bundle.log` and renderer matrix are authoritative for this handoff. A corrected renderer wait uses the actual localized Save-failure copy; it did not change product behavior.

## Rendered layout review

| Capture | Window / scale | Reviewed state |
|---|---|---|
| [Dark English](evidence/option-D/dark-en-reading.png) | 1440×900, 100% | D controls, fixed chrome, retained zoomed passage; no header arrows or false warning. |
| [Light Spanish](evidence/option-D/light-es-reading.png) | 1440×900, 100% | Translated controls/path hierarchy and overflowing tabs. |
| [Narrow editing](evidence/option-D/dark-es-narrow-editing.png) | 640×480, 100% | D pair, wrapped Save/Return/helper, preserved dirty draft. Source/split remains a known rich-editor mismatch. |
| [Narrow search](evidence/option-D/light-en-narrow-search.png) | 640×480, 100% | Drawer/query focus, scope/mode controls; content scrolls vertically below the fold. Drawer intentionally overlays reading. |
| [Enlarged Spanish](evidence/option-D/light-es-enlarged-reading.png) | 1440×900, 200% WebKit page/text enlargement (720×450 logical viewport) | Compact chrome/drawer behavior; D stays reachable after dismissing drawer; no whole-window horizontal overflow. |
| [Existing reading controls](evidence/option-D/dark-en-reading-controls.png) | 1440×900, 100% | Working retained preference controls, not a separate Settings implementation. |
| [Save/recovery](evidence/option-D/light-en-save-recovery.png) | 1280×800, 100% | Acknowledged Save returns to reading; failure/retry/draft checks recorded in its JSON. |

Each PNG has its own JSON interaction log. Reference boards are qualitative targets, not screenshot baselines. Palette, D geometry, shared placement and affected responsive hierarchy were reviewed; full design fidelity is not claimed while rich editing, Settings and mixed-file presentation are missing. Existing success-notice styling and editor presentation remain inherited differences.

The usual local Vite/CDP renderer was unavailable: sandboxed socket listening returned EPERM; Chrome JavaScript AppleEvents were disabled and headless Chrome aborted. No security setting was changed. The offline helper renders the actual compiled App without networking. Physical macOS trackpad input, actual Tauri picker/grants/native Go/Settings, durable save/recovery/restart, VoiceOver/IME, Reduce Motion and packaged workload/security observation remain **NOT TESTED**. Prior native evidence is historical and was not relabeled as verification of these changes.

## Remaining integration and acceptance

Repository architecture/native gates require IR-01–05; see the concrete interfaces, security boundaries, migrations and acceptance criteria in [integration-requests.md](integration-requests.md). The skill's exact scope rule and repository gate are linked and quoted there. Those technical changes were not silently implemented; independent frontend work continued. Normal acquisition retains existing failed-tab semantics, while committed history traversal has the tested atomic failure/cancellation behavior. Broad all-format failure/routing semantics require IR-02/03.

Next: reconcile the requests against affected canonical feature architecture/security gates, implement the remaining integrations, then use disposable native fixtures in a fresh visible macOS acceptance session. Exercise physical pinch, real save failures/recovery/restart, permissions/reselection, mixed-file history and separate Settings focus. This report closes the authorized local frontend pass, not the entire approved package or release acceptance.
