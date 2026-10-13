# QA-0035 implementation report

USER-AUTHORIZED IMPLEMENT from the current explicit user instruction. IMPLEMENTATION COMPLETE_IN_SCOPE; FUNCTIONAL_CHECKS PARTIAL (focused/native scope PASS, full regression FAIL); VISUAL_REVIEW MATCHES_REVIEWED_SCOPE (macOS English/dark1280×820); INTEGRATION PASS for tested native Markdown selection; USER_ACCEPTANCE PENDING. QA_FAILED / AWAITING_ACCEPTANCE. QA-0035 remains open for independent RETEST. No claim of release readiness or independent QA.

## Repair and scope

The first/reopened Markdown read keeps the old tab/adapter active while acquisition is pending. The original shortcut guard dropped commands when no adapter was available, or could use the retained adapter. The repair attaches intent to the specific acquisition token, navigation sequence and workspace generation, binds it only during that read's valid activation, then checks exact document ID/content through parse, incremental paint and section layout. Adapter dispatch after acquisition runs in requestAnimationFrame outside React commit. Native fields, composition, modifier and modal guards remain. HTML loading ownership is retained.

A subsequent switch, content replacement, revoked generation or incompatible text/modal/composition owner invalidates pending selection. Transient modal mutation records also cancel when the modal disappears before the parser completes. Selection completes using the existing document-root/live-editor paths; no editor history, native API, source-save, permission, UI style or dependency changes.

Four source/test paths changed relative to captured pre-task bytes. Scoped patch: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/implementation-final.patch. Existing dirty edits retained. Current Spec Kit feature specs/014-interactive-prototype-v1 observed and left unchanged; this is a task-local repair. Planning: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0035-implementation-plan.md.

| Changed absolute path | SHA256 |
| --- | --- |
| /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx | `191d1f489a3261df6b71e10569891734e92e7aa667b13689573b60c8b3184a10` |
| /Users/juanmantilla/projects/personal/md-reader/src/reader/MarkdownView.tsx | `3e442f560ef7750fb1d272b063748505906501deae08a2b3d68383fb72d9e161` |
| /Users/juanmantilla/projects/personal/md-reader/src/reader/document-selection.ts | `bf48e2cdb628566d6e9801d4be62b69fd4360044952b59edd2a52e5af6775f9c` |
| /Users/juanmantilla/projects/personal/md-reader/tests/ui/document-select-all.test.tsx | `b5b0134fddc691d65009bcdef26a1ab7de1feab0d1eb9f9f4710fad67af6a264` |

## Exact candidate

Frozen source/config/test manifest: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/source-manifest-final.json (433 inputs), SHA256 `e6cfb6a44094cc5d17efd985558766a0fe56a2d9887e8c07e5568188906adf04`. Frozen build/test root: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final. This digest identifies the exact serialized manifest; each input hash is inside.

Native app: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-target/debug/bundle/macos/Intentgrove QA0035.app. Executable: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-target/debug/bundle/macos/Intentgrove QA0035.app/Contents/MacOS/md_reader. Executable SHA256 `527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82`. Identifier com.juanmantilla.intentgrove.qa0035.r20261012; isolated profile /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qa0035.r20261012. Native build override /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native.config.json SHA256 `a0da3b645a4337cf8b3257186eec37bc121436e5e934fd716c3a5fb9a42d47e3`. Bundled files/hashes: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-identity.json. Ad-hoc signature verification PASS. Offline debug build, noninstalled. Target cache cloned from prior QA artifacts; inherited older bundle retained, only the newly named QA0035 app is the tested candidate.

The original provided executable still hashes `98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730`. Prior finding/report/fixtures/profile retained. No install, permission changes, commit, publish, deletion, cleanup worker or DONE_ACCEPTED.

## Checks

| Scope | Result | Observation / limit | Evidence |
| --- | --- | --- | --- |
| held reads / parser / layout / stale navigation / field-modal-composition / existing selection regressions | PASS | 16 tests, 1 file; synthetic composition/modifier events | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/focused-final.log |
| default suite unchanged | FAIL | 701 PASS, 9 FAIL, 710 tests / 70 files; failures retained, cause unresolved | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/default-final.log |
| TypeScript + Vite + offline debug macOS build | PASS | build exit 0; warnings retained | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-build-final.log |
| native first-open immediate Cmd+A | PASS | one key, all25 B passages/end; no intermediate AX observation | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-initial-immediate.txt |
| native reopen immediate Cmd+A | PASS | clean second.md closed/reopened, one key, all25 B passages/end | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-reopen-immediate.txt |
| native A→B→A cancellation | PASS | A active, no stale selection; no AX observation between rapid inputs | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-rapid-A-B-A.txt |
| reading60 + live mixed + whole30 selection | PASS | all endpoints verified; mixed/whole native copy excludes editing/chrome labels | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-evidence-validation.json |
| Filename / Find / Local target owners | PASS | real Cmd+A complete replacement with field focus retained; dialogs cancelled | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-local-target-owner.txt |
| source undo/redo | PASS | undo removed last typed character; redo restored it after mixed selection | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-mixed-redo.txt |
| modal ownership | PASS | synthetic current/transient modal tests pass; native quit modal visible after Cmd+A, AX disappearance limits native focus proof | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/focused-final.log |
| native physical IME / Windows / screen reader | NOT_RUN | no physical composition, Windows host or assistive-technology coverage | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/focused-final.log |
| clean candidate quit | BLOCKED | Keep draft clicked from inspected screenshot; noWindowsAvailable; process remained/session running; checkpoints and file bytes retained | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-profile-retention.json |
| source/prior-evidence/fixture integrity | PASS | 433 source inputs / 576 prior evidence inputs / 3 fixture bytes unchanged | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/integrity-final.json |

Final focused command: `npm test -- tests/ui/document-select-all.test.tsx` in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final (16 PASS). Final unchanged default command: `npm test` in the same frozen root (701 PASS / 9 FAIL). Timestamp/load/exit record: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/default-final.json. Neither assertions, test deadlines nor default configuration changed. Native command: `PATH=/Users/juanmantilla/.cargo/bin:$PATH CARGO_TARGET_DIR=/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native-target npm run tauri build -- --debug --bundles app --config /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/native.config.json -- --offline --locked` in the same root. It runs the unchanged TypeScript/Vite build through the isolated output override. `codesign --verify --deep --strict` on the candidate passed; scoped `git diff --check` passed.

Development history preserved: initial canonical filtered run included archived copies (39 PASS across3 files, not final-source proof); first frozen development default709 PASS, later superseded by added regression; initial typecheck failure corrected; one intermediate default run interrupted after supersession with raw failures retained; first native packaging attempt failed due to omitted crates workspace manifest in the source copy. Build inputs corrected by copying existing unchanged workspace inputs. Final source/fixture integrity has no drift.

## Default failures retained

- tests/ui/close-edit.test.tsx > dirty editor close choices (F004-R08, R15) > quit: Cancel
- tests/ui/edit-flow.test.tsx > one pending section draft > routes window completion through the matching native action
- tests/ui/new-markdown.test.tsx > real App mock journey opens native identity then enters the existing empty rendered section
- tests/ui/workspace-handoff.test.tsx > approved workspace handoff > exposes folder expansion and context actions on root-owned tabs without changing selection
- tests/ui/workspace-handoff.test.tsx > approved workspace handoff > reveals collapsed branches only after explicit request
- tests/ui/workspace-handoff.test.tsx > approved workspace handoff > keeps an outside-root explicit file outside explorer membership
- tests/ui/workspace-handoff.test.tsx > routes native rich commands to the focused owner and publishes source-history availability
- tests/ui/workspace-layout.test.tsx > preview navigation refinement (jsdom, native bridge mocked) > keeps narrow atlas Projects keyboard-operable and returns focus without remounting an editor
- tests/ui/workspace.test.tsx > workspace shell > middle-click closes a background tab without selecting it, then closes the last tab

These failures are unresolved; no pre-existing attribution or causal load explanation. Final run296.71s, host load before27.63/33.98/22.05 and after124.44/80.96/47.19; other concurrent work observed. These are environmental observations, not proof of cause. No retries or serialized pass used to clear the failures. Prior QA-0033/QA-0034 failures and original baselines remain untouched.

## Native procedure and limitations

macOS27.0.1 arm64, actual packaged Tauri/WebKit app; normal folder picker to disposable copied fixtures /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/fixtures. Click unopened second.md then real super+a in the same call before any new AX state. Repeat after clean close/reopen. Both selects every B passage/end with one command. Close B then click B, super+a and A tab with no intermediate observation; A stays active without stale selection. Deterministic held-read tests complement native timing, which cannot guarantee a particular frame duration or all race schedules.

Real mixed edit added MIXED_LIVE_QA0035; whole edit inserted30 passages through WHOLE_END_QA0035. Native copy into an unsubmitted Filename field proved labels/controls excluded. AX selected-range text may contain CSS-nonselectable UI labels; actual copied text excludes them. Single-line probe removes newlines, so multiline clipboard formatting is not certified. No fixture file was saved.

Native Filename, Find and embedded Local target use actual Cmd+A replacement. Link properties and New Markdown probes cancelled without Apply/Create. Synthetic composition/modified-chord and transient modal tests PASS; physical IME and AT NOT_RUN. Quit modal after Cmd+A remained visibly open without document-wide highlight, but AX temporarily lost its HTML subtree. Keep draft was clicked using the inspected screenshot; tool then returned noWindowsAvailable. Process remained at last observation and session exitDisposition remained running: clean shutdown is BLOCKED, not claimed successful. Both escaped-Markdown draft marker checkpoints and all3 fixture file bytes are retained. Candidate/profile are left intact; do not terminate blindly or remove recovery.

Source snapshot /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/tested-snapshot-final-v3.json precedes final focused/default/native verification. Source/config coverage is explicit, not whole-repository; disposable fixture copies have a separate pre-native byte manifest /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/fixture-hashes-before.json, not a claim that the source snapshot includes them. Snapshots/failed attempted overwrite and initial logs retained; no retrospective baseline claims.

Native initial/reopen/mixed/whole JPEGs inspected; no visual redesign. Other themes/locales/widths, supported Windows, physical IME, screen reader and controlled native delayed replacement schedules remain untested.

## Next boundary

Implementation handoff: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0035-implementation-handoff.md. Independently QA RETEST the exact hash candidate, including loading/rapid ownership cases and unchanged default suite; user acceptance remains separate. Broad failures and clean-quit observation require triage outside the bounded selection patch.

## Completion recorder limitation

The required workspace completion helper was attempted with the nonaccepted QA_FAILED/AWAITING_ACCEPTANCE record and rejected it (`tested_snapshot_changed`, exit2). Concurrent work rewrote four unrelated prototype inputs with identical bytes, changing inode/time identity after the pre-check snapshot. Rechecking all433 source hashes shows no content drift, and the frozen candidate is unchanged. Exact changed identities are in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/completion-recording-attempt.json. No validated completion receipt exists. The rejected input is retained; no retrospective baseline or acceptance/cleanup claim was substituted. A future formal QA completion needs a fresh pre-check scope/baseline and its affected checks.
