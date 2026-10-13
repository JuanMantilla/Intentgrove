# Department handoff — select-all-retest-20261012T011743Z

Routing recommendation, not proven root cause, external ticket or implementation authorization.

| Primary | Findings / severity / priority | Responsible skill | Next action |
|---|---|---|---|
| QA_TRIAGE | QA-0033 — S3 provisional / P2 | $senior-software-engineer INVESTIGATE | Investigate trace/order first; separate product vs test vs environment |
| QA_TRIAGE | QA-0034 — S3 provisional / P2 | $senior-software-engineer INVESTIGATE | Investigate trace/order first; separate product vs test vs environment |
| FRONTEND | QA-0035 — S3 / P2 | $senior-frontend-developer IMPLEMENT | After separate authorization, remember Cmd+A through loading and preserve ownership |

## Copy-ready remediation prompts

### QA-0033 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0033.md
Evidence: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/read-only-timing-diagnostics.txt
Candidate: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/native-target/debug/bundle/macos/Intentgrove Select All Retest.app
Executable SHA256: 98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730
Observed/expected and bounded work: On /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source, run npm test -- --dir tests using unchanged maxWorkers2 and all original fixtures. Complete attempts produce668PASS/2FAIL and669PASS/1FAIL. First fails opens from empty workspace and Projects, and restores the owning trigger plus preserves another dirty rendered draft when creating a second file and deduplicates editor keyboard/menu; second fails the latter. Earlier frozen run additionally fails shortcut dedup and real mock journey, alongside separate missing-PNG suite errors. Four isolated empty-opening attempts pass (two canonical/two frozen); affected files82PASS; complete frozen single-worker670PASS. Native ready empty workspace opens/focuses Filename. Previous full-suite dialog timeout preserved. Expected: unchanged existing test actions open dialog/provide Filename and preserve draft ownership. No live native startup defect or root cause proven. Impact: unreliable regression gate and possible ignored creation interaction; rerun/isolate is diagnostic, not fix. Trace sessionReady and all newMarkdownReady guards at activation, menu/keyboard delivery, pending callbacks and per-file singleton/mock reuse. Visible button disabled by busy while handler additionally requires sessionReady is a hypothesis, not established cause. Distinguish frontend lifecycle bug from premature test activation or harness/environment effects before proposing repairs. Preserve assertions/timers/baselines; no sleeps/retries to hide failures.
Preserve all user files/profiles, prior failures, unrelated work, original assertions/baselines/configuration and native ownership/history. No install/permissions/commit/publish/cleanup.
Authorization: this handoff defines next work only. Product fixes need a separate user implementation instruction; INVESTIGATE is read-only.
Verify: Reproduce original full-context and isolated journeys; demonstrate cause with order/readiness evidence. After authorized repair, pass repeated unchanged default suite and native empty/Projects plus dirty-draft creation journeys without weakening assertions.
Return exact source/native candidate hashes, changed scope, check results, remaining limitations and full absolute implementation-handoff path for QA RETEST.
```

### QA-0034 — S3 provisional / P2

```text
Use $senior-software-engineer INVESTIGATE.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0034.md
Evidence: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/read-only-timing-diagnostics.txt
Candidate: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/native-target/debug/bundle/macos/Intentgrove Select All Retest.app
Executable SHA256: 98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730
Observed/expected and bounded work: Original tests/ui/appearance-operations.test.tsx sets .reader-scroll.scrollTop170, holds getConfirmedDocument, fires refresh:file_changed, changes theme ten times, expects170 at101; original full suite observed0. Prior report/snapshot/log retained. Current two canonical and two frozen isolated attempts pass; two affected-file82PASS and complete frozen suites pass this test. No source repair by QA, verified fix or pre-existing attribution. Reproduce npm test -- --dir tests and npm test -- --dir tests tests/ui/appearance-operations.test.tsx -t 'preserves the active tab and reader position'. Native held pending race NOT_RUN; ordinary reading is not equivalent. Expected preservation comes from unchanged original assertion. Impact: possible lost reading location; confirmed only in mocked prior run. Trace Markdown onRendered, section-layout readiness and pending RAF callbacks versus captureReadingPosition and anchor-restoration effect while refresh remains held. Host load and singleton behavior are hypotheses. Preserve170 assertion, fixture promises, timeouts/configuration and earlier failures.
Preserve all user files/profiles, prior failures, unrelated work, original assertions/baselines/configuration and native ownership/history. No install/permissions/commit/publish/cleanup.
Authorization: this handoff defines next work only. Product fixes need a separate user implementation instruction; INVESTIGATE is read-only.
Verify: Establish reproducible failing ordering and product/test/environment boundary; then obtain authorized owner repair and repeat original pending resolve/reject/theme cases. A later pass alone never closes the historical unexplained event.
Return exact source/native candidate hashes, changed scope, check results, remaining limitations and full absolute implementation-handoff path for QA RETEST.
```

### QA-0035 — S3 / P2

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0035.md
Evidence: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/attempt-summary.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/evidence/read-only-timing-diagnostics.txt
Candidate: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/native-target/debug/bundle/macos/Intentgrove Select All Retest.app
Executable SHA256: 98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730
Observed/expected and bounded work: Native app /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/native-target/debug/bundle/macos/Intentgrove Select All Retest.app, SHA256 98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730, isolated profile /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qaselectall.r20261012t011743z. Fixtures /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/fixtures. From long.md or empty.md click unopened second.md in tree and immediately send real super+a before awaiting new AX state. Also close clean second.md tab, reopen in tree, immediately super+a. Both show loaded second.md with no selection;2/2 first-open/reopen attempts. Later ready Cmd+A and native copy yields SWITCH_BEGIN_B/all25B/SWITCH_END_B only. Immediate existing-tab switch back to loaded long.md works. No stale-document selection or data loss; workaround press again after loaded. Expected: user explicitly answered Remember Cmd+A through loading (Recommended), saved as requirement clarification only. Guard excludes documentLoading or missing/mismatched adapter; exact asynchronous cause/patch UNKNOWN. Bounded repair after separate authorization: retain document-wide intent for newly active loading document, apply to it when current read/parse/layout completes, and cancel stale intent on subsequent switch/replacement or incompatible owner/modal changes. Preserve focused native fields, composition/modifier/modal ownership, entire mixed/live/whole selection, source history and UI exclusion. No repair performed in QA.
Preserve all user files/profiles, prior failures, unrelated work, original assertions/baselines/configuration and native ownership/history. No install/permissions/commit/publish/cleanup.
Authorization: this handoff defines next work only. Product fixes need a separate user implementation instruction; INVESTIGATE is read-only.
Verify: Real WebKit initial open/reopen immediate Cmd+A must eventually select every newly active passage/end without a second key; rapid A→B→A must never select stale content. Repeat reading/mixed/whole plus search/Filename/Local target/modal/composition regressions and unchanged default suite.
Return exact source/native candidate hashes, changed scope, check results, remaining limitations and full absolute implementation-handoff path for QA RETEST.
```

## Copy-ready QA retest prompt

```text
Use $senior-qa-engineer RETEST.
Project: /Users/juanmantilla/projects/personal/md-reader
Retest: QA-0033 S3 provisional, QA-0034 S3 provisional, QA-0035 S3 against an exact supplied/frozen repaired candidate.
Read: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/report.md; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/coverage.json; /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/department-handoff.md; /Users/juanmantilla/projects/personal/md-reader/qa/findings and the new implementation handoff.
Verify real macOS WebKit reading/mixed/whole selection including immediate initial-open/reopen loading, stale switches, control exclusion and native fields. Run unchanged original isolated cases and npm test -- --dir tests repeatedly with attempt-level evidence. Diagnose rather than erase any intermittent failure. Preserve all earlier logs and acceptance authority; unavailable native/AT/platform checks remain BLOCKED or NOT_RUN. Save a new unique run under /Users/juanmantilla/projects/personal/md-reader/qa/runs.
A passing retest is not task acceptance. No QA product fixes or cleanup.
```
