# Coverage ledger

One row per case/environment/candidate, with attempts retained. An unexplained failed attempt keeps its case FAIL.

{'PASS': 24, 'FAIL': 8, 'BLOCKED': 4, 'NOT_RUN': 3}; required {'PASS': 24, 'FAIL': 4}.

| ID | Case | Result | Reason |
|---|---|---|---|
| I01 | Exact supplied frozen candidate | PASS | 433 source hashes, four bundle files and supplied manifest/config match handoff. Source digest e6cfb6a4…; executable 527a0848…; no rebuilding or source mutation. |
| R01 | Four unchanged original New Markdown journeys repeated | PASS | 4/4 in each of three isolated attempts. Does not clear default-context failures. |
| R02 | Unchanged original pending reader-position case repeated | PASS | Expected170 retained in three isolated attempts and all three full contexts. QA-0034 remains unexplained; no causal repair. |
| R03 | Two original affected files | PASS | 82/82; all original resolve/reject, refresh/theme and Save cases. |
| R04 | Repaired controlled selection suite | PASS | 16/16, including held read/parser/layout, cancellation/ownership and replacement. Mocked boundaries do not establish native held races. |
| R05 | Unchanged default npm test -- --dir tests repeated | FAIL | 706PASS/4FAIL; 709PASS/1FAIL; 709PASS/1FAIL, 710 tests/70 files each, maxWorkers2 unchanged. QA-0033 reproduces in every full attempt. |
| D01 | Isolated original editor-startup-failure case | FAIL | 3/3 crash before dialog at appearance native getCurrentWindow: undefined metadata. QA-0037 harness defect; distinct from full-suite Filename absence. |
| D02 | Older repeated-open failure rejection | FAIL | Full01 hits unchanged5000ms deadline; Full02/03 and three isolated repetitions pass. Cause unknown; QA-0038. |
| D03 | Pending section-entry readable passage | FAIL | Full01 cannot find Edit section “One” before beginSectionEdit; later full and three isolated repetitions pass. QA-0039, not proof of acquired-session disposal failure. |
| D04 | Staged replacement heading anchor fixture | FAIL | Full01 cannot find initial End heading at175; later full and three isolated repeats pass. QA-0040; fails before refresh/anchor assertions, not established QA-0012 recurrence. |
| N01 | Reading sixty passages through offscreen end | PASS | Actual Cmd+A at top and end; native TextEdit paste contains all60/A begin/end. |
| N02 | Reading chrome and embedded-control exclusion | PASS | Actual native copied4928 characters omit controls; screenshots show document highlighting and unselected chrome. |
| N03 | Mixed live draft and read-only siblings | PASS | Retained recovered MIXED_LIVE_QA0035 plus all60/A begin/end copied from native selection. |
| N04 | Mixed editor/control exclusion | PASS | Copied4945 characters omit formatting/status/history/actions. Selected backdrop may cross editor container, while control glyphs remain unselected. |
| N05 | Whole rendered live draft thirty passages | PASS | Unique native-created empty fixture; actual paste/Cmd+A/copy includes all30 and both sentinels; file remains0 bytes. |
| N06 | Whole formatting/status/history exclusion | PASS | Native copied1236 characters exclude embedded controls; actual screenshot inspected. |
| N07 | Immediate initial open from long reading in fresh process | PASS | One real Cmd+A immediately after first second.md tree open; no intervening AX/render observation; all25/end selected. |
| N08 | Immediate initial open from empty reading in fresh process | PASS | Fresh process restored empty.md; second.md closed/not previously read in this process. One immediate key selects25/end. |
| N09 | Immediate clean reopen from long reading | FAIL | Three attempts FAIL/PASS/FAIL. First AX shows actual loading; settled screenshots lack selection. Formal supplementary-input repetition fails. QA-0035 STILL_REPRODUCIBLE. |
| N10 | Immediate clean reopen from empty reading | FAIL | Two attempts PASS/FAIL; final no-second-key observation still unselected. QA-0035, no pass-based closure. |
| N11 | Separate ready selection retry/new-document-only copy | PASS | Loaded retry copies all25 B/end and no A. Does not erase failed immediate key. |
| N12 | Rapid A→B→A stale intent cancellation | PASS | Click B, immediate Cmd+A, click A without AX between;255ms sequence. Settled active A, no B selected. Controlled replacement coverage attributed separately. |
| N13 | Native Filename Cmd+A owner | PASS | QA_FILENAME_FIELD replaced exactly by QA_REPLACED; no document command or Create during probe. |
| N14 | Native reading Find Cmd+A owner | PASS | QA_FIND_FIELD replaced exactly by QA_FIND_REPLACED on reading B. |
| N15 | Native mixed Find typing ownership | FAIL | Fresh query x then y/q edits MIXED_SECTION to MIyED/MIqED while query remains x. Two fresh-query failures; unchanged-query x→xq comparison passes. Initial slow-type anomaly retained. All run-added mutations undone. QA-0036 S3. |
| N16 | Native Local target Cmd+A owner | PASS | second.md replaced exactly with qa-native-target-replaced.md; Cancel without Apply. |
| N17 | Native modal Cmd+A exclusion | PASS | Quit modal stays active after Cmd+A; no document-wide selected text. Native Keep draft closes normally. |
| N18 | Shift/Alt modifier exclusion | PASS | Real super+shift+a and alt+super+a do not select all document. |
| N19 | Source undo/redo preservation | PASS | One Undo returns own whole paste to empty; Redo restores all30/end after document-wide selection and cancelled link field. |
| N20 | Ready native New Markdown creation | PASS | Creates unique disposable zero-byte file using existing QA root and enters whole editor; no prior file overwritten. Does not test startup failure/native dirty-second-create matrix. |
| I02 | Input/evidence preservation | PASS | 445 final-scope source/config/input paths byte AND identity unchanged;358 protected earlier artifacts unchanged before appended histories. Original three fixture bytes and both prior drafts retained. |
| I03 | Run-owned process shutdown and retention | PASS | Supplied profile retained; normal cold/final quits. Tested app and HTTP server stopped. Installed app PID6877 unoperated. Clipboard scratch saved locally4945bytes; original TextEdit PID12486 ended, later PID14673 ownership unknown and left untouched. |
| B01 | New folder native picker access | BLOCKED | Open disabled even selected folder; reused supplied disposable fixture profile. New run fixture copies unused. Existing native picker limitation retained. |
| B02 | Actual held native refresh/theme race | BLOCKED | No genuine native read-hold facility available without altering/instrumenting native candidate. Mocked held case passes; native QA-0034 cause remains unverified. |
| B03 | Native replacement/held incompatible-owner cancellation | BLOCKED | No controllable actual native held read/parse boundary; deterministic mocked replacement/modal/composition tests pass separately. Original fixture bytes protected. |
| B04 | Find overlay visual/focus capture completeness | BLOCKED | Provider screenshots omit AX-confirmed Find bar; heading mutation visible, field query evidenced by AX. Intermittent noWindowsAvailable/element frame/-3812 errors retained; not counted as product defects. |
| X01 | Physical IME composition | NOT_RUN | No configured physical IME interaction; synthetic isComposing tests do not certify it. |
| X02 | VoiceOver/assistive technology | NOT_RUN | AX inspection is not an AT user journey or conformance check. |
| X03 | Windows native equivalent | NOT_RUN | No accessible Windows native environment in this run. |

All attempt commands/timestamps/raw logs: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json](/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json).
