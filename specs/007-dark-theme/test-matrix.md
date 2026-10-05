> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F002A requirement-to-verification matrix

Run: 2026-09-28, macOS 26.2 arm64, final local signed package. Current procedures, commands and artifact identity are in [verification.md](verification.md); retained report hashes are in [verification-assets/manifest.json](verification-assets/manifest.json). PASS applies to the stated check, not to unobserved native cases.

| Requirements / scenario | Check / procedure | Result | Evidence / remaining check |
|---|---|---|---|
| R01/R08; AS-003/009 | Real EN/ES named selects and toolbar bounds in both palettes at actual 640/1440 points | PASS | `layout-results.json`, representative layout PNGs; T023 complete. |
| R02/R06; AS-001–003 | Solid rendered text, status, link, selection, control-border and focus color pairs | PASS | Sixteen pairs in `rendered-contrast.json`; minimum text 6.17, indicator 3.28. |
| R02/R08; AS-001/009 | All required surfaces and interactions at each required locale/width/theme | NOT TESTED | Observed reader/editor/preview, tables/code/links, warning/version and dirty-close dialog. Every remaining error/empty/progress state and full layout combination still needs observation; T018 open. |
| R03/R04; AS-004–006; SC-001 | Select Light/Dark/System, Quit/restart and inspect real value/palette | PASS | `restoration-results.json`; explicit opposite-system override and saved-Dark/light-system captures. |
| R03; AS-005; SC-001 | Ten real macOS changes while System is selected | PASS | `final-editor-system-results.json`: 0.460–0.642 seconds; T017 complete. |
| R03/R04; AS-007 | Invalid/bounded storage and failures, ordering/disposal/stale native completion | PASS | Final `npm test`, 143 tests, appearance suite; packaged corruption/error injection is not inferred. |
| R04; AS-004/006; SC-004 | Ten cold Dark launches observed from launch through document | BLOCKED | Four completed document-period captures, zero light background probes; early startup gap and six missing complete trials. T020 open. |
| R05; AS-008; SC-003 | Two native edits, ten System events, history/selection/focus/scroll/checkpoint comparisons and Undo/Redo | PASS | `final-editor-system-results.json`, `native-editor-state.json`, before/after PNGs; editor scroll 3321, sequence 32. |
| R05; AS-008; SC-003 | Ten explicit selections with nonzero editor/reader scroll and selector focus | PASS | `explicit-dialog-results.json`; scroll 3339/3636, sequence 40. |
| R05; edge cases | Dirty-close, native Save As dialog and external-writer conflict across both palettes | PASS | `dialog-conflict-results.json`, `explicit-dialog-results.json`; cancelled/discarded only disposable fixture state. |
| R05; edge cases | Change theme precisely during loading, refresh and disk-save operations; prove no restart | NOT TESTED | Existing source/component coverage is not this native check; T019 open. |
| R02/R05/R08 | Bundled editor structural layout under existing CSP | PASS | Native monospaced 430-point viewport, nonzero scroll/state trials and final regressions; T022 complete. |
| R07; AS-002 | Original opaque/transparent image samples in actual Light/Dark rendering | PASS | Sixteen samples in `image-pixels.json`; image PNGs and baseline hashes. |
| R08; AS-009 | Native Reduce Motion enabled, appearance changes and restoration | PASS | `reduce-motion-native.json`; normal macOS Motion checkbox and native preference read. |
| R08; AS-009 | VoiceOver spoken EN/ES names/values/feedback | BLOCKED | VoiceOver activated; output query stalled and was stopped. Original off state restored. `voiceover-results.json`; T018 open. |
| R09; AS-001/002; SC-005 | Reading/theme controls with Wi-Fi Off, restore network and compare source inventory | PASS | `offline-results.json`, `restoration-results.json`, offline reader PNG. Separate control DNS failed; no blanket assertion about all routes. |
| R09; SC-005 | Observe app-requested resources/request attempts independently of other apps/OS | BLOCKED | Connection snapshots cannot prove absence of attempts. Root observer unavailable; broad HTTP recorder stopped. T021 open. |
| T013/T014 | Current UI regression, frontend/native package, bundled worker and signature | PASS | 143/143 tests; final build/worker logs; `codesign --verify --deep --strict`; current executable hash in manifest. |
| T015 | All packaged success criteria completed | NOT TESTED | SC-002/003 incomplete; SC-004/005 blocked. |

No observed requirement is weakened to close a task. The exact next procedures are the four remaining acceptance groups at the end of `verification.md`.

## Current follow-up after retired checks were removed — 2026-09-28

| Requirement/task | Procedure | Result | Evidence/limit |
|---|---|---|---|
| R01/R02/R08; T018 | Seven native states × EN/ES × Light/Dark × 640/1440 | PASS for measured bounds | 56 cases; full surface/keyboard coverage remains NOT TESTED. |
| R06; T018 | Native screenshot solid text/background sampling | PASS | 20 pairs, minimum 5.957:1; other pairings remain NOT TESTED. |
| R05; T019 | Actual edit and serialized checkpoint comparison | PASS for steady state | Draft/editor JSON equal, sequence 4 unchanged; operation-overlap checks NOT TESTED. |
| R02/R05/R08 | Keep draft, Quit/relaunch and recover | PASS for observed recovery surface | Eight cases; broader restoration outside this feature not claimed. |
| T013 | Focused appearance suites | PASS | 70 tests across three files. |
| R09; T021 | fs_usage scoped to test PID | BLOCKED | Requires root; no escalation to root or broad collection attempted. |
| R05/R09 | Restore synthetic input bytes and discard test draft | PASS | Original README hash and inventory restored, fixture draft absent. |
| T015/T018–T021 | Complete all remaining criteria | NOT TESTED | Full surface/operation coverage incomplete; startup/request observation blocked. |

[Detailed procedures, blockers and restoration](qa-followup.md). The original
manifest remains historical; additive captures and reports have their own
[manifest](verification-assets/qa-followup/manifest.json).

## Prepared deterministic coverage — 2026-09-28

| Task | Test/procedure | Result | Native limitation |
|---|---|---|---|
| T018/T019 | Held read success/error, confirmed refresh, Save success/error; ten theme changes each | PASS, five component tests | Real App/CodeMirror with mock IPC; native I/O/visual timing remains NOT TESTED. |
| T020/T021 | Artifact/coverage intake and rejection cases | PASS, seven Python tests | Synthetic validator tests; no new video or request trace. |
| T018–T021 | Native gate, first-frame capture and scoped observer proposal | NOT TESTED | Requires review per instrumentation-decision.md before native implementation/acquisition. |

## Current review status — 2026-09-29

| Requirement / task | Result | Current evidence or remaining procedure |
|---|---|---|
| R02/R06/R08; T018 | NOT TESTED | Full native surface, keyboard, focus, contrast and layout matrix on the rebuilt production package remains open. Retired VoiceOver-specific checks are not a gate. |
| R05; T019 | NOT TESTED | Actual loading, refresh and save overlap with ten appearance changes per case remains open; A1 native gates are available but have not been exercised for acceptance. |
| R04; SC-004; T020 | NOT TESTED | Ten complete prelaunch-to-document saved-Dark recordings and flash calibration on an isolated display remain open. |
| R09; SC-005; T021 | BLOCKED | Production app-requested attempt observation lacks an established observer; QA-only inspection cannot close this row. |
| Regression | FAIL then PASS | First full UI run 150/151, isolated edit-flow 5/5, repeat full UI 151/151. The edit-flow assertion has a likely async render race; see verification.md. |
| T015 overall packaged acceptance | NOT TESTED | T018–T020 incomplete and T021 blocked; no feature-wide PASS. |
