# Department handoff

QA_FAILED / ACTIVE; user acceptance absent. Recommendations below do not authorize implementation, start agents or assign external tickets.

| Owner | IDs / severity | Responsible skill | Next action |
|---|---|---|---|
| FRONTEND | QA-0035, QA-0036 — S3/P2 | $senior-frontend-developer IMPLEMENT after user repair instruction | Resolve intermittent loading intent and Find input focus ownership; preserve source/history/native fields |
| QA_TRIAGE | QA-0033, QA-0034, QA-0038, QA-0039, QA-0040 — S3 provisional/P2 | $senior-software-engineer INVESTIGATE | Capture failing order and distinguish product/test/environment before repair |
| QA_AUTOMATION | QA-0037 — S3 provisional/P2 | $senior-qa-engineer AUTOMATE after explicit authorization | Faithful independent native-window mock/singleton lifecycle, with original assertions retained |
| QA | Native held refresh/replacement, physical IME, VoiceOver, Windows; severity N/A | $senior-qa-engineer RETEST | Obtain faithful native timing/access, retain BLOCKED/NOT_RUN |

## Copy-ready remediation prompts

### QA-0033 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0033.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_TRIAGE.
Bounded outcome: Trace sessionReady/newMarkdownReady guard state at each original first activation in default context, using the earlier investigation as mechanism evidence. Explain current missing dialog/Filename with a failing activation trace; preserve original assertions/deadlines and native readiness contract. No source repair is verified for this finding.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0034 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0034.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_TRIAGE.
Bounded outcome: Capture a causal failing-before/passing-after ordering of user scroll170, render/section readiness, capture guard and actual restoration writer. Original current passes do not close prior0. Actual held native refresh requires a separately scoped faithful native means; no injected success state or timeout weakening.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0035 — S3 / P2

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0035.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: FRONTEND.
Bounded outcome: After separate repair authorization, correct remaining immediate clean-reopen lost Cmd+A on exact supplied candidate. Retain current read/activation/render ownership through all scheduling gaps and cancel stale selection. Inspect acquisition ref cleanup versus active-id React commit as a hypothesis, not established writer; native FAIL/PASS/FAIL and PASS/FAIL evidence must be explained.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0036 — S3 / P2

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0036.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: FRONTEND.
Bounded outcome: Preserve Find input keyboard ownership during automatic match reveal while retaining match scrolling/highlighting, explicit navigation, editor selection/history and close-Find focus return. Verify x→xy/xq stays in query and complete draft bytes remain unchanged on real WKWebView.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0037 — S3 provisional / P2

```text
Use $senior-qa-engineer AUTOMATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0037.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_AUTOMATION.
Bounded outcome: After explicit AUTOMATE authorization, make this original scenario independently provide its legitimate native window/appearance boundary and reset owned singleton/timers. Preserve every original scenario, assertion, native=true branch, deadlines and production source; do not just set native=false, prime with another test or retry.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0038 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0038.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_TRIAGE.
Bounded outcome: Observe the exact repeated-open promise/activation boundary and locate the stalled original wait under default full context. Distinguish product sequencing, mock delivery, timer leakage and host delays. Preserve assertions/deadlines/worker count. Supply causal evidence before recommending repair.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0039 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0039.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_TRIAGE.
Bounded outcome: Capture initial read identity, parser/paint, section-layout readiness and control mount order at the unchanged failing wait in default full context. Keep native mock promises and deadlines unchanged; separate input-delivery/harness from product lifecycle before repair.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

### QA-0040 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0040.md
Candidate source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/qa0035-20261012/candidate-source-final
Native executable SHA256: 527a08482ee678471a3e3f547887a7e89f8ce494d391297e49b304d443f53b82
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/evidence/source-diagnostic-excerpts.txt; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/retest-history.md and the finding's linked native/raw failure evidence.
Primary department: QA_TRIAGE.
Bounded outcome: Capture original worker instance/request/reply identity and initial staged paint progression at line175 under full context. Preserve worker fixture replies, paint timers, headings, margins and assertions; do not describe this pre-refresh failure as an anchor defect without later evidence.
Preserve prior logs, assertions, fixtures, promise replies, original deadlines, maxWorkers2, application APIs, generation/content owners, clipboard/control exclusion, native fields, composition/modifier/modal semantics, source history and all existing drafts. No unrelated fixes, install, OS permissions, commits, publish or cleanup. Investigation remains read-only. IMPLEMENT/AUTOMATE work requires the user's corresponding instruction; this prompt grants no authority.
Verification: repeat the unchanged original failing isolated/full-context case and npm test -- --dir tests multiple times with every attempt retained. For native behavior, use real WKWebView user interaction on a separately identified frozen candidate, including immediate initial/reopen, stale switches, reading60/mixed live/whole30, native copy exclusions, Find/Filename/Local target and source undo/redo. Any later pass does not erase an unexplained failure. Return exact source/bundle/executable fingerprints, changed scope, results, limitations and full absolute implementation handoff path.
```

## QA retest prompt

```text
Use $senior-qa-engineer RETEST.
Project: /Users/juanmantilla/projects/personal/md-reader
Retest QA-0033–QA-0040 after authorized bounded repairs/investigations against an exact supplied/frozen candidate.
Read /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/report.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/coverage.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-repaired-retest-20261012T030102Z/department-handoff.md, /Users/juanmantilla/projects/personal/md-reader/qa/findings and the new implementation handoff.
Repeat original unchanged isolated cases and default npm test -- --dir tests at least three times; preserve all attempts and diagnose failures. Verify actual macOS WebKit initial open/reopen and stale selection, reading/mixed/whole clipboard/control exclusion, Find native typing without draft mutation, Filename/Local target/modal/modifiers, source undo/redo. Keep native held races, physical IME, AT and unavailable platforms BLOCKED/NOT_RUN until actually available. No QA product fixes, cleanup or acceptance authority. Save a unique new QA run.
```
