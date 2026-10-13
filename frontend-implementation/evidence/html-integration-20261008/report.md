# HTML frontend integration execution — 2026-10-08

Status: FRONTEND IMPLEMENTATION → QA, with native coordinate/focus-descriptor/location dependencies. User acceptance is pending. October 6 authorization applies; no further design approval is needed. Native code, security policy and installed app were not changed. The original dirty worktree and concurrent direct Markdown editor work were preserved. Global Spec Kit013 selection was not changed.

## Source and candidate

Final dirty-worktree inputs are hashed individually in source-manifest.json; candidate.json and candidate-bundle-manifest.json identify the disposable runnable bundle. Earlier candidates/manifests are explicitly historical. Only final candidate observations below establish final packaged behavior. Local production build, real Tauri transport, JS-off native WKWebView and native pickers; no mock viewer or acceptance-harness injection. Helpers were copied from the existing local packaged build, with ad-hoc deep/strict verification. No installation/notarization claim.

## Functional checks (mocked transport)

- regression-final.log: 433 tests / 59 files PASS before the final focus correction and concurrent editor refinements.
- focus-final.log: 29 tests / 4 files PASS after focus correction. Includes actual App + HtmlView, real contract shapes, owner/revision/request lifecycle, hidden/dispose, identity, navigation commit/failure, missing fragments, Find and native-vs-DOM blur.
- Full post-correction worktree regression: regression-focus-final.log recorded failures and was explicitly terminated after source changes; not a completed PASS.
- Build and worker/package checks: see package-focus-final.log and worker-focus-final.log. Earlier failed build-focus-final.log captured concurrent rich-selection findLast/ES library errors; that source was independently corrected by the concurrent editor work. This HTML task did not alter rich-selection.
- Earlier failures, timeouts, outdated/interrupted package attempts remain in this directory. No test deadline or behavior assertion was relaxed. The two unsupported Testing Library exact options were removed without changing the assertions.

## Actual packaged integration

Pre-focus-correction candidate 194a6e9d… (candidate-pre-focus-fix.json) was exercised with generated disposable workspace fixtures through native UI. HTML/HTM acquisition, session restore to second.htm#end, authored light/dark CSS, nested stylesheet, local font, PNG, missing image fallback, disabled form submission, HTML link/fragment and native resource-folder picker cancellation were observed. Resource cancellation retained the details issues without Reload. Document menu and View details hid the surface before presenting shell controls. These observations are not attributed to the later candidate.

Actual native focus transfer reproduced a frontend defect: the shell DOM window blur hid its native sibling. Fixed by using native Tauri window focus/blur events; added a focused regression. final-pre-focus-fix-hidden.png records the failure. Final-candidate retest results are appended below.

## Native defect requiring owner follow-up

**HTML-NATIVE-GEOMETRY (blocking viewport acceptance):** At 1280×820, page.html with a missing-image notice mounts cream native content at approximately y249 and ends y744 while the measured shell native region should begin below the y247–282 notice and end at y776. The native content covers that warning; metadata and primary chrome remain reachable. Opening Document hides it and reveals the intact notice. Closing details reproduces the overlap. This is approximately one titlebar-height vertical translation.

The frontend supplies getBoundingClientRect logical web-client coordinates. src-tauri/src/html_native.rs native_mount passes ns_window; src-tauri/src/html_surface.m frame() converts against NSWindow.contentView.bounds, and mount adds the sibling to window.contentView. Native owner must map bounds from the actual Tauri main webview client view to the chosen NSView parent using native coordinate conversion, honoring flipped/nonflipped coordinates, scale, titlebar and resize. Do not apply a frontend magic offset or weaken isolation. Acceptance: missing-resource notice, empty/error controls, Outline and bottom viewport remain uncovered at 1280/960/640, retina/scaled displays and after restore/reload/resize. Native frame/client geometry assertions plus packaged screenshot required. Native files were not changed.

Reload contract limitation: html_commands.rs reload_html_view removes the old token and disposes its surface after acquisition, before new mount/readiness. Failed acquisition retains content; later replacement render failure cannot retain it. Native follow-up: readiness-staged atomic replacement/commit.

Other exact dependencies: generated heading capture drops ig-heading keys; exact initiating-link focus/original href absent; IR03 default-handler prepare/commit absent; Windows build/runtime unavailable. See ../../html-qa-handoff.md.

## Visual, accessibility and unavailable checks

Mockups09/10/11 were rendered and inspected; later option-D Back/Forward placement is used. Packaged 1280×820 dark shell with authored light/dark content was observed. The geometry defect means visual fidelity/viewport containment is NOT PASS. Native accessible headings, links, image alternatives and shell metadata/menus/details were present in the AX tree. Disabled authored Submit exposed its reason. VoiceOver, physical keyboard-only full journey, enlarged text, final EN/ES/light shell, narrow/full responsive matrix, Windows, observed-network security positive controls, resource grants/denials and source changes through every packaged journey remain NOT TESTED unless explicitly appended below. Automated EN/ES/state checks are separate.

The full mock regression exercises Markdown/image/edit/recovery/Settings preservation but does not establish those native packaged journeys. Exact acceptance steps and fixture generation are in ../../html-qa-handoff.md. fixture.json records the disposable root; the status FIXTURES_ONLY_NOT_TESTED is the generator's initial status, superseded only for explicitly executed journeys here.


## Concurrent-source isolation

The mutable worktree changed during final packaging (concurrent Markdown editor files and dist). That package is historical and not the final source identity. A task-owned full source snapshot was created at the exact path in snapshot.json; final source-manifest.json hashes that snapshot, including tests. The node_modules directory is a symlink to the existing installed dependencies; package/lock are hashed. Final packaging/tests run from the snapshot, with no changes to the concurrent worktree. The worktree regression-focus-final.log recorded failures and was terminated explicitly after failures while source was changing; no PASS or proven cause is inferred.


## Final frontend refinements and test ledger

The frozen snapshot contains native-window focus ownership (DOM child blur does not hide), explicit empty Outline text/disabled-action reason, fail-closed Find acknowledgment validation and continuous native pinch zoom display (the acknowledged value is retained). snapshot-focused-final.log:30PASS before the final continuous-zoom display refinement; snapshot-focused-delivered.log is the final focused run. snapshot-app-isolated.log:7PASS, unchanged deadlines. snapshot-focused.log:22PASS/7timeoutFAIL while a broad run/compiler/copy were also active; this coincidence is not a proven cause. snapshot-regression-final.log retains broader failures and cannot be called PASS. Earlier worktree full433PASS remains tied to its earlier inputs.

Outdated snapshot-package.log / snapshot-package-final.log were explicitly terminated, including owned orphan cargo/rustc, after frontend refinements. snapshot-package-delivered.log is the final packaging record. No unrelated processes were stopped. The completed mutable worktree package was not used as the delivered source identity.

Host: macOS27.0.1 (26A434), arm64. Windows and minimum-supported-macOS runtime are NOT TESTED.


Intermediate snapshot broad run: snapshot-regression-final.log completed420PASS/16FAIL/59files. It started before the later zoom/navigation refinements and loaded test modules while those task-owned snapshot files were still being refined; it is not a final frozen-source regression. Failures include deadlines, missing rendered headings/editor controls, recovery ownership assertion and continuous-zoom display. They are retained without claiming that load, unrelated work or timing caused them. Final-source focused qa-focused-final.log:33PASS/4files, unchanged deadlines, includes cross-file missing-fragment refusal and native source refocus after Markdown failure. Final source freeze:89a806009e9441a6c542a3206f8111677d7eb4b92df0e8ae430e21007f7bfe64 (manifest hash; all included inputs separately hashed).


## Authoritative frozen-source verification

The final source manifest SHA-256 is `01d8c2d2ba6fdaa2512b94d229a7d45c9b93e54887222d285c6c099ff23621bc`. Snapshot path is recorded in snapshot.json. No source changes follow this freeze. `handoff-focused-corrected.log`:39/39 tests,4/4files PASS (2.92s). `frozen-regression.log`:444/444 tests,59/59files PASS (140.85s), maxWorkers1, original assertion/test deadlines. These ran with installed Node20.19.6; production packaging uses installed Node24.20.0. Earlier failed/interrupted tests remain historical and do not become PASS. The missing-fragment test rejection was corrected to the actual NativeError shape including message; behavior assertions were retained. The accidentally invoked nonexistent test:ui script is preserved in its failed log.

Final refinements include synchronous selection-value capture before asynchronous zoom capture; source restoration after failed Markdown/image targets; root-scoped reacquisition replacing an explicitly opened token without duplicate tabs; clearing a missing-anchor notice only after successful navigation; querying actual native window focus inside serialized visible viewport operations. Root-rebind tests begin in an existing workspace: selecting an entirely new workspace intentionally closes its previous tabs.


### Workspace versus candidate boundary

`frontend-workspace-comparison.json` records both hashes for the HTML integration files. HtmlView/controller/native adapter, DocumentLocation, folder search, CSS and HTML tests match the frozen candidate. App.tsx and i18n.ts differ only through the concurrent Markdown editor/menu continuation at this checkpoint; its later menu/editor work is preserved and is not claimed to be covered by the candidate's444-test run. QA should use the candidate snapshot for exact reproduction, and retest the combined workspace when the other task freezes its candidate.


## Final packaged checkpoint — authoritative

Candidate executable `0a557d5e466b1f7b149bae24ee25807e82bb372e75e6336b7a30a0eb764ea929`; bundle manifest `3ea4c1d86610bf30501d8518569cb14502474e873f04be979eb7bb81caadecf9`; source manifest `01d8c2d2ba6fdaa2512b94d229a7d45c9b93e54887222d285c6c099ff23621bc`. Runnable path: `/var/folders/q1/w_vhh3xs5xg7tzvgskbvgj440000gn/T/intentgrove-html-qa-final-ujqpjvf1/Intentgrove HTML QA Final 20261008.app`. `frozen-package.log`: production TypeScript/Vite/Tauri release package PASS. `frozen-worker.log`: bounded local worker boundary PASS. `frozen-finalize.log`: ad-hoc deep/strict signature verification PASS and no source changes since freeze. No install/notarization/release claim.

### Real native integration

All following observations use the exact final candidate, CUA-bound explicitly by full app path. `frozen-*.png/.ax.txt` are final evidence. Older `qa-native-*` and earlier final-* captures are historical; the latter misbound-helper captures do not establish final-candidate behavior.

- Restored the generated workspace and existing HTML tabs through the native startup checkpoint. `frozen-startup`: actual authored light grid/CSS/local-font appearance, image, missing-image fallback and read-only metadata.
- Selected125% using the native dropdown and Return; `frozen-zoom-125` shows acknowledged125% plus visibly enlarged native content and horizontal/vertical scrollbars. No source dirty state.
- Clicked percent-encoded Section two: native scroll changed and Back became available. Missing fragment: source retained with explicit requested-section-not-found notice. Clicked HTML#end: second.htm active, actual dark content and end scroll; Cmd+F End reported1of1. Closed Find; clicked generated Dark authored page Outline; native scroll moved. Back to source link restored actual content, native focus and125% (`frozen-return-source`). Earlier blank-return failure did not recur once; no root cause proof or stress acceptance.
- Clicked Markdown: notes.md rendered with existing Edit section. Shared Back restored HTML125% and enabled Forward to notes.md. Clicked Image: real1×1 PNG viewer, Forward disabled (new branch), existing tabs retained (`frozen-crossformat-image-branch`). Cmd+R image produced no visible AX change; successful image-reload acknowledgment is NOT established.
- Native Open file selected outside/standalone-bundle/page.html. Same basename disambiguated by workspace versus standalone-bundle and full path. Single-file authority denied sibling stylesheet/image while retaining inline-authored light content and readable text (`frozen-file-only-denied`).
- View details hid native content; actual denied resource diagnostics and remote unsupported reason appeared. Choose resource opened native picker; Cancel returned unchanged issues, no grant/reload-success notice (`frozen-resource-cancel`).
- Choose resource folder explicitly selected standalone-bundle; native response showed resources-changed/Reload required. Explicit Reload replaced the view token. Nested CSS/grid/heading-font appearance, local PNG and CSS fixture text appeared; missing-image issue remained (`frozen-resource-grant-reload`). No programmatic grants were injected. This tests folder authority; successful per-file/mismatch selection remains NOT TESTED.
- Opened separate Settings, changed Language to Español and Appearance to Claro; native acknowledgment and return showed ES/light shell with original English authored content/styles (`frozen-es-settings-return`). Empty fixture showed truthful Spanish no-visible-content and no-headings states with native surface hidden (`frozen-empty-es`). Unstyled fixture used the actual native reading baseline (`frozen-unstyled-baseline`). Closed task-owned candidate with Cmd+Q.

### Visual and accessibility

Final screenshots are1280×820. Authored light/dark isolation, read-only metadata, option-D history placement, sidebar Outline, details, asset fallback and empty/baseline treatment were compared qualitatively with approved09/10/11; differing fixture content precludes pixel matching. **FAIL / native dependency:** y translation still covers resource notice; unstyled baseline can also cover part of metadata. This is the same native coordinate-conversion blocker above. Full approved viewport fidelity is not achieved and must not be called PASS.

Actual AX exposed shell controls and native headings/links/image alternatives, Find counts and disabled Submit explanation. Native clicking transferred focus without hiding the content; Return selected zoom and Cmd+F opened Find. These are partial accessibility observations, not full keyboard/VoiceOver acceptance. Spanish transient history notice retained an earlier English Back string after changing locale; visible navigation names themselves localized. QA should assess this existing transient-notice behavior.

### Explicit NOT TESTED / unresolved matrix

A CUA drag from bottom-right attempted960×720; screenshot dimensions remained1280×820 (`frozen-resize-attempt`), so narrow/responsive native viewport is NOT TESTED, not PASS. Enlarged app/reading text, comprehensive themes×locale×width matrix, physical keyboard-only/VoiceOver/contrast audit, Windows, native resource mismatch/per-file success and folder cancellation on final candidate, all link-access cancellations, external source/resource edits, nearest-anchor deletion restoration, rendering limits/errors/retry, close-during-native-operation/stale-response stress, long-history/closed-entry grant revalidation, dirty Markdown editing/recovery alongside HTML, acknowledged image reload and Settings persistence after restart remain NOT TESTED in the final package. Some are covered by mocked tests or historical native observations; those layers remain distinct. Network-observed hostile-script positive-control security verification is NOT TESTED by frontend and remains native owner's acceptance. Native parent-link normalization, generated-heading capture, exact link-focus/original-href, readiness-atomic reload, rendered-text Find limits and default-app contract dependencies remain as documented.

Frontend work stops at QA implementation handoff. No renewed design approval is required. Native geometry blocks viewport acceptance; remaining native/platform/manual matrix requires engineering/QA work, not speculative frontend API work.
