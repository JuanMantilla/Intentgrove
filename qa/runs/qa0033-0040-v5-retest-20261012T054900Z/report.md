# QA-0033–QA-0040 final v5 RETEST

QA_FAILED / ACTIVE. Five bounded repairs implemented and verified within the scope below. QA-0038, QA-0039 and QA-0040 remain unresolved because their historical failing order was not captured. User task acceptance is absent. Foreground assistance does not accept the task; no release, commit, publication, dependency install, OS permission change or artifact cleanup.

## Exact candidate and scope

Frozen source: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v5](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v5>). Source manifest: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/source-manifest-v5.json](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/source-manifest-v5.json>); SHA256 `7b46e952c4a759421327ec94482246bb17dadfaa9fe107ec2e591faeed79a6ee` (434 rows).
Native: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-target/debug/bundle/macos/Intentgrove QA0033-0040 v5.app](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-target/debug/bundle/macos/Intentgrove QA0033-0040 v5.app>); executable SHA256 `c610ab34140cd215c520b56d36a257af308724cb4fa05e4ca6285630a79d4764`. Config: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-v5.config.json](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-v5.config.json>); SHA256 `4de89ca0e1601aa560cef51d1c61246f794c1b55a52f154cc02fd97f4e9817c1`. Full identity: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-identity-v5.json](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-identity-v5.json>). Implementation handoff: [/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/implementation-handoff-v5.md](</Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/implementation-handoff-v5.md>).

Complete pre-task source/native capture plus exactly9 frontend/test paths. Concurrent native work in15 paths is preserved live and deliberately outside this candidate; that later native revision is unverified here. Installed node_modules reused, no dependency installation. Snapshot before checks: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/tested-snapshot.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/tested-snapshot.json>) (444 exact inputs). Source/bundle/config/fixture bytes and file identities unchanged through final integrity check. Original7 test-file body suffixes remain byte-identical; QA-0037 fixture/import/lifecycle supplies its boundary outside the scenario. Original promises, assertions, deadlines and maxWorkers2 retained. -t filters are the requested original isolated cases, not disabled tests; all3 default suites run all716 with no skips.

## Required original repetitions and default gate

18 original isolated processes PASS (30 original test executions): four New Markdown journeys, reader170, standalone native=true startup failure, repeated-open rejection, initial section control and both staged End margins, each3 times. Adjacent32 PASS. Default unchanged npm test -- --dir tests:

| Attempt | Outcome | Failure boundary |
|---|---|---|
| 01 |715 PASS /1 FAIL|session initial heading second missing at line304, before clearing assertions|
| 02 |716 PASS|all cases|
| 03 |715 PASS /1 FAIL|bounded source ctrl-wheel leaves zoom1 at line82|

Every requested finding's original case passes all3 final default contexts. Historical failures remain open where no causal diagnosis was established. Successful isolated29 and observation-only full716 for the residual cases are diagnostic successes, not gate replacements. Exact commands/times/loads/raw logs: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/attempt-summary.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/attempt-summary.json>); residual classification: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/remaining-diagnosis.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/remaining-diagnosis.json>).

## Per-finding outcomes

| Finding | Outcome | Responsible role |
|---|---|---|
|QA-0033|IMPLEMENTED / SCOPED PASS|FRONTEND|
|QA-0034|IMPLEMENTED / MOCKED PASS; HELD NATIVE BLOCKED|FRONTEND|
|QA-0035|IMPLEMENTED / NATIVE PASS|FRONTEND|
|QA-0036|IMPLEMENTED / NATIVE PASS|FRONTEND|
|QA-0037|AUTOMATED / ORIGINAL ISOLATED PASS|QA_AUTOMATION|
|QA-0038|UNRESOLVED / NOT REPRODUCED|QA_TRIAGE|
|QA-0039|UNRESOLVED / NOT REPRODUCED|QA_TRIAGE|
|QA-0040|UNRESOLVED / NOT REPRODUCED|QA_TRIAGE|

**QA-0033:** Synchronous sessionReadyRef acknowledges restoration before the following React state commit; enabled activation no longer rejects solely on stale sessionReady state. Controlled original-boundary probe failed before and passed after. Original four journeys3 times and all final default contexts pass; actual native Filename modal ownership passes.

**QA-0034:** Native-independent trace proves fully painted content receives scroll170 while initial section layout is pending, capture rejects it, then restoration writes0. Identity/content/sequence/generation-owned initial intent preserves170. Original held-confirmation assertion and controlled initial-layout regression pass. Real controlled held-native refresh remains unavailable.

**QA-0035:** Lease persists read-finally→active commit, queued key and late adapter publication wake dispatch. v2 cold failure and v3 empty reopen failures retained. Minimal real native probe captures delivered Cmd+A, valid acquired target/adapter/content, but no animation-frame dispatch under WebKit occlusion. Final cancellable microtask is outside commit and adapter retains parse/paint/layout ownership. Unavailable-frame regression failed before and passed after. Exact v5 cold initial25B/end actual clipboard and3 completed long plus3 empty one-key reopens pass; early Loading-only interrupted attempt retained BLOCKED.

**QA-0036:** Automatic editable Find revelation uses focus:false while maintaining source span selection and scrolling. Actual x→xy and fresh x→xq remain in Find; heading/body, native checkpoint draft/doc and source history entries unchanged. Editable heading source selection5..6 supports actual editable revelation. Explicit focus/close and source Undo/Redo remain available.

**QA-0037:** Original native=true startup-failure scenario supplies legitimate window appearance methods independently and owns fresh imported App/appearance singleton lifecycle. No priming test or production repair. Original test body/assertions/replies/deadlines unchanged; standalone original3/3 and all final default contexts pass.

**QA-0038:** Original older-open rejection passes3 isolated and all3 final default contexts. Earlier failing timeout order is unobserved. Traced successful sequence confirms prerequisite read/activation path only; no causal repair or closure claimed.

**QA-0039:** Original initial section-entry control passes3 isolated and all3 final default contexts. Traces show current read/section/paint prerequisites complete. Earlier missing-control order remains unknown; no unsupported repair.

**QA-0040:** Both unchanged original staged heading margins pass3 isolated and all3 final default contexts. Traced current worker identity/request/reply/paint sequence passes. Historical missing initial End occurs before refresh assertions and remains unexplained; no anchor-fix claim.

## Real native evidence and limits

Actual macOS WKWebView, English/dark, configured1280×820; native clipboard pasted in owned TextEdit scratch. Cold first B acquisition from empty selects/copies all25 and end with one key. Completed3 long reopens and3 empty reopens pass. First additional long capture was still Loading and next case closed it before complete readiness was checked; retained as BLOCKED/incomplete, not counted as a failure or pass. Every attempt in [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-attempts.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-attempts.json>); screenshots retained. No AX observation between the open click and initial Cmd+A; no second key counted.

Actual reading60, mixed live draft plus60 siblings, whole editable30 and end sentinels copy without chrome/edit/status/format/history/control text. Unique clipboard primer prevents stale-copy false positives. Find x→xy/fresh x→xq stays in input during editable heading source revelation; native saved draft/doc and source change history preserved. Filename/Local target replacement and Cancel preserve draft. Alt/Shift Cmd+A retains local section behavior without selecting reading siblings. A→B/key→A leaves A/live draft and no B content. Source Cmd+Z/Shift+Cmd+Z succeeds with actual editor ownership; earlier unowned no-ops/native menu incidents are retained. One redo capture-provider failure is followed by a post-action observation without another key. Undo/Redo intentionally changes startSelection metadata while source change records/doc/draft stay equal.

One real4937-byte long fixture entered generic worker fallback. The failure is retained; subsequent separately attributed active navigation rendered60. Constructor/error/deadline/reply order is unobserved. No budget/deadline change or speculative parser repair. Held-native load/refresh170 and controlled overlay BLOCKED. Physical IME, VoiceOver and Windows NOT_RUN. Mocked native bridge, composition, held promises, accessibility tree and Windows tests never substitute for native verification.

Both owned draft sources/histories retained through normal Quit/Keep draft; original four fixture hashes unchanged. Earlier v2/v3/v4 candidates and1,840 pre-task protected artifacts unchanged. Installed app/process and concurrent work untouched. Evidence integrity: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/final-integrity-before-finding-history.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/final-integrity-before-finding-history.json>); semantic draft/history preservation: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-v5-final-semantic-history-preservation.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-v5-final-semantic-history-preservation.json>); profile after Keep: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-v5-drafts-after-final-keep.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence/native-v5-drafts-after-final-keep.json>).

## Remaining work and authority

Unresolved QA-0038–0040 require actual failing order, not more passing retries. Residual session startup, pinch registration/input order, earlier cancellation/denied alert and native worker fallback require discriminating traces as described in [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/department-handoff.md](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/department-handoff.md>). Full gate remains failed. Unavailable native/platform checks remain blocked/not run, and later concurrent native revision is unverified. Existing user approval scope authorizes bounded repairs; no authentic task acceptance exists. No DONE_ACCEPTED or cleanup eligibility.

Coverage: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/coverage.json](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/coverage.json>) ({'PASS': 18, 'FAIL': 3, 'BLOCKED': 4, 'NOT_RUN': 3}). Evidence index: [/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence-index.md](</Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z/evidence-index.md>).

Residual canonical records: [/Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0041.md](</Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0041.md>), [/Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0042.md](</Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0042.md>), [/Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0043.md](</Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0043.md>), [/Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0044.md](</Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0044.md>). They remain OPEN/provisional with unknown failed order; no out-of-scope source repair or closure.
