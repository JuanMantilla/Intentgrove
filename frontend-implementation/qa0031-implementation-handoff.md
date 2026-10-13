# QA-0031 implementation handoff — 2026-10-11

IMPLEMENTATION COMPLETE_IN_SCOPE; FUNCTIONAL_CHECKS PASS in the named scope; NATIVE_INTEGRATION PARTIAL; VISUAL_REVIEW BLOCKED for menu overlays; USER_ACCEPTANCE PENDING. This is the implementer's verification, not independent QA RETEST. QA-0031 remains OPEN.

## Authorization and changed scope

The user approved /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0031-repair-plan.md with “I aprove it, continue.” This scoped instruction authorizes the QA-0031 frontend repair, disposable verification and isolated local build. Existing design and native grant architecture remain in place; no new design or architecture direction was introduced. Original QA/designer evidence and unrelated user edits were preserved.

Three application/test files changed for this task:

- /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx: shared explorer/tab menu composition disables Reveal for known unavailable freshness, matching unavailable reload status, unavailable root-backed grants, and missing/reselection/denied availability errors (including restored tabs). Existing localized error/status copy supplies the disabled reason. Dirty/editing/conflict state alone does not disable Reveal. Native payloads remain fileId for opened tabs and rootId+segments for unopened explorer files; display paths provide no new authority.
- /Users/juanmantilla/projects/personal/md-reader/src/app/ActionMenu.tsx: when the focused action becomes disabled while its menu remains open, focus advances to the next enabled action, wrapping if necessary. Other focus is left alone. Existing Escape, arrows, Return, anchor restoration and nearby actions remain intact.
- /Users/juanmantilla/projects/personal/md-reader/tests/ui/reveal-file.test.tsx: 12 additional tests, giving 19 focused tests. Coverage includes both entry points, root/explicit known missing states, restored errors, dirty saved-file availability and retained drafts, live status changes, stale generations, recovery of unopened status and focus transfer. The editor and IPC are mocked here; native journeys are separately attributed below.

Task-only diff: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/task-only.diff. Before-file reconstruction was hash-validated against the actual pre-edit observations for all three files; /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/baseline-reconstruction.json records the matches. The much larger Git diff includes existing unrelated work and is not this task's scope.

Additional writes: this handoff, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0031-repair-plan.md, new evidence under /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011, and prepended status in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/STATE.md and /Users/juanmantilla/projects/personal/md-reader/.agents/state.md.

No save or discard was used to enable Reveal. No native production source, IPC contract, privilege, translations, dependency, deployment/CI configuration or installed app changed. No installation, publishing, commit/push, cleanup or DONE_ACCEPTED.

## Exact candidate identity

Project /Users/juanmantilla/projects/personal/md-reader; dirty HEAD 7e00d3316ce46563cafb46ba928498fcb0d82880. Final pre-check baseline: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/tested-snapshot-v4.json. All 157 explicit source/config/asset/test inputs were unchanged at final verification. Scope excludes dependency bytes, QA profile and deliberately renamed disposable fixtures; build override is hashed separately. Manifest digests below hash sorted compact JSON without the stored trailing newline.

| Identity | SHA256 |
| --- | --- |
| 157-input source manifest | af6c2f65787ab513ecfc70b43d495c6051e32ef55c7591e4d0949aa3b3ac819b |
| Native executable | 49af076cc61ed2a1e79178da77685937ee4d075ea32b2ea85cca62654e8e51e7 |
| Complete bundle file manifest | 0ed0bdc7a12ddd5a8a5a23a43675d43222828d6eb1f84f53c4347535f5d280d6 |
| Bundled frontend file manifest | d0a4499c7ec41b671fee792b15777b96b3d6d229bdafc1209017c5d191ffab18 |
| Isolated build override | aa7bc753b80541f34c637a2165e1b599d5776eb5aca8b0efae43646ecc261459 |
| /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx | c0815240e3798023df4cf33044a0753b54b394b75f5ec99fad1938740d365dd2 |
| /Users/juanmantilla/projects/personal/md-reader/src/app/ActionMenu.tsx | 8e72b2dc271cf047d96e842c8130c352e68c3bd9de3a854b5ca70a6b1bfda64e |
| /Users/juanmantilla/projects/personal/md-reader/tests/ui/reveal-file.test.tsx | 999da8d4b188a59cfb9670ce29e9b2ec0e313114e78710aaa42ca8c19d47d91c |

Machine identity and manifests: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/candidate-identity.json, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/source-hashes.json, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/bundle-hashes.json and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/frontend-hashes.json.

Final candidate: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/Intentgrove QA0031.app. Executable: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/Intentgrove QA0031.app/Contents/MacOS/md_reader. Debug Tauri production frontend/custom protocol, no acceptance-harness runtime or mocked IPC. Unique ID com.juanmantilla.intentgrove.qa0031.r20261011, version0.1.0; ad hoc signature verified. macOS27.0.1 (26A434), arm64, 1280×820. Initial and focus-only candidates are retained as intermediate evidence and must not be used for RETEST.

## Commands and results

Commands ran from /Users/juanmantilla/projects/personal/md-reader unless stated otherwise. Final relevant logs are under /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011.

- PASS: `npm test -- tests/ui/reveal-file.test.tsx tests/ui/manual-reload.test.tsx tests/ui/automatic-refresh.test.tsx tests/ui/approved-navigation.test.tsx tests/ui/windows-platform.test.tsx tests/ui/close-edit.test.tsx tests/ui/workspace-layout.test.tsx tests/ui/session.test.tsx` — 124 tests in8 files, exit0; regression-v4.log. Earlier focused15 and affected74 passed. The first focus assertion failed because it assumed Copy path was enabled and Reveal was focused, while the explorer initially focuses Open and jsdom has no clipboard; the test now explicitly focuses Reveal and expects the next enabled Reload action. regression-v3.log passed96; v4 adds restored-error coverage. Earlier results are retained, not represented as final-candidate checks.
- PASS: `CARGO_TARGET_DIR=/Users/juanmantilla/projects/personal/md-reader/target/qa0030-native CARGO_BUILD_JOBS=4 ./node_modules/.bin/tauri build --debug --config /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/native-build.config.json --bundles app -- --locked --offline` — exit0; native-build-v4.log. Existing cache/dependencies reused. The reviewed beforeBuildCommand executes `npm run build -- --outDir /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/dist`, including `tsc --noEmit` and Vite. Frontend types/build PASS. Existing warning text retained; no release/notarization performed.
- PASS: `codesign --verify --deep --strict 'frontend-implementation/evidence/qa0031-20261011/Intentgrove QA0031.app'` — exit0; signature-v4.log.
- PASS: `git diff --check` — exit0; diff-check.log. Final source hash comparison found zero drift; all four fixture contents remained exactly their original saved bytes despite renames. candidate-identity.json records hashes.
- Normal native-open: `open -a '/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/Intentgrove QA0031.app' '/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/fixtures'` and the equivalent explicit-file command targeting /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/individual/explicit.md. Root item was accepted through the app's Open item control. Native picker Open stayed disabled; canceled without granting access through it. This uses the normal macOS-open grant route and does not certify picker usability.

## Requirement verification

| Requirement | Result and evidence |
| --- | --- |
| Both menu entry points disable known unavailable targets | PASS mocked root tab/explorer/explicit and unopened/root-status cases in regression-v4.log. PASS native missing root tab, restored missing tab and dirty missing explicit tab. When native directory refresh removes a renamed explorer row, its former target is no longer reachable; native explorer known-missing after row removal is NOT TESTED as a live retained row. |
| Saved existing dirty file remains revealable | PASS actual saved root file through tab and explorer; actual Finder selected existing.md. PASS actual dirty explicit grant; Finder selected explicit.md. Same-process typed drafts and unsaved markers retained; saved bytes unchanged. |
| Rename during open menu | PASS final native race.md and dirty explicit.md: Reveal disabled and Copy path became selected while menu remained open. Return then copied race path and dismissed the menu. Mocked live-update/stale-generation tests also PASS. |
| Grant-only dispatch and graceful in-flight failure | PASS mocked IPC target assertions and missing-error feedback/tab-retention tests. Native successful Finder selection exercises real root-backed/explicit grants. Deterministic native in-flight failure after dispatch NOT TESTED; native handler untouched, earlier QA evidence preserved. |
| Keyboard/focus and nearby actions | PASS mocked Arrow/Escape/anchor restoration, final native Shift+F10 reopening, Return Reveal, live focus transfer and Return Copy path. Final affected layout/navigation/reload/close suites PASS. Full AT conformance and screen reader NOT TESTED. |
| EN/ES and light/dark | PASS native menu AX labels, disabled/enabled states and draft retention in all four combinations for explorer and tab entry points. Underlying app appearance captures verify light/dark and EN/ES. Menu visual fidelity BLOCKED: screenshots omit overlays despite native AX menu presence; one capture and one full-tree observation returned ScreenCaptureKit -3811. |

Detailed observed native sequence and evidence caveats: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/native-observations.md. Complete final trees: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/final-explicit-missing-full.txt and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0031-20261011/final-root-draft-full.txt. Earlier .txt snapshots sometimes contain only AX diffs or no-change notices; those notices do not independently prove menu state. Provider errors and missing overlays are limitations, not visual passes.

Installed Intentgrove was left alone. Run-owned app quit normally with Keep draft; exact candidate process was absent afterward. Isolated profile retained at /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qa0031.r20261011. Windows native, narrow native windows, screen reader, full frontend suite, and deterministic native in-flight failure NOT TESTED. The Windows mocked label/grant suite passed; Linux remains outside supported scope. QA-0032 native replacement policy was not repaired or retested.

## Independent native QA RETEST

Use the exact final candidate/hash above, a fresh QA-owned profile/build identifier and new disposable files. Preserve this implementation evidence and original /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z evidence. Do not install over the user's app or close it. Capture the baseline before checks under /Users/juanmantilla/projects/personal/.agents/qa-cleanup-integration.md.

1. Check both menus after known missing root-backed and explicit states, including a restored missing tab and a retained explorer row where reachable. Confirm disabled localized Reveal and retained Copy path/Reload/Close behavior. Reject activation by mouse/Return.
2. Edit saved existing root and explicit files; invoke Reveal through both reachable entry points. Confirm actual Finder target, unchanged saved bytes and exact retained draft. Do not save/discard to enable the action.
3. Rename while Reveal has focus in an open menu. Confirm disable/focus transfer, safe Return and Escape/Shift+F10 reopening. Exercise a genuine native in-flight failure if available without injecting authority or changing protections.
4. Recheck EN/ES and light/dark with reliable native overlay capture, plus normal focus/keyboard and nearby actions. A build or AX tree is not visual proof.
5. Record result separately; keep QA-0031 OPEN until independent retest evidence supports closure and the user accepts. QA-0032 remains separate. Do not mark DONE_ACCEPTED or start cleanup from this handoff.
