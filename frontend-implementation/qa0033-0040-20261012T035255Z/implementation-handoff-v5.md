# Implementation handoff — final v5

USER-AUTHORIZED scoped repairs; acceptance PENDING. Exact source and native candidate below supersede prior candidates for final retest. Earlier candidates, baselines, failures and evidence remain immutable.

- Frozen source: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v5
- Source manifest: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/source-manifest-v5.json
- Source manifest SHA256: `7b46e952c4a759421327ec94482246bb17dadfaa9fe107ec2e591faeed79a6ee` (434 rows)
- Native app: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-target/debug/bundle/macos/Intentgrove QA0033-0040 v5.app
- Executable SHA256: `c610ab34140cd215c520b56d36a257af308724cb4fa05e4ca6285630a79d4764`
- Native config: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/native-v5.config.json
- Config SHA256: `4de89ca0e1601aa560cef51d1c61246f794c1b55a52f154cc02fd97f4e9817c1`
- Full bundle identity: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-identity-v5.json
- Retained task profile: /Users/juanmantilla/Library/Application Support/com.juanmantilla.intentgrove.qa0033to40.r20261012t035255zv3
- Original unchanged native fixtures: /Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-retest-v3-20261012T042800Z/fixtures
- Exact implementation patch: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/implementation-final-v5.patch
- Original test-body parity: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/evidence/original-case-parity-complete.json
- Fresh QA context: /Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-v5-retest-20261012T054900Z

QA-0033: synchronous restoration acknowledgement fixes an enabled activation using stale sessionReady state. QA-0034: preserves user scroll after full paint but before initial section layout; identity/content/generation owned. QA-0035: acquisition lease survives read-finally→active commit; key and adapter publication wake queued intent; final native minimal probe proved a valid queued request waiting indefinitely for animation frames under WebKit occlusion. Cancellable microtask dispatches outside commit; adapter still owns parse/paint/layout and every current-document/field/modal/composition guard. Final controlled unavailable-frame regression fails before and26 affected tests pass after. QA-0036: automatic editable Find revelation uses focus:false, explicit focus/close remains available. QA-0037: isolated native=true original startup failure has legitimate native window/appearance methods and fresh owned singleton lifecycle independently; original scenario unchanged.

QA-0038/39/40 remain UNRESOLVED: originals and traced prerequisites pass, no failure-order observation supporting a repair. Passing repetitions do not close them. New untraced cancellation/denied alert timeout and native keyboard Undo observation remain separate triage; no speculative changes.

Candidate consists of complete pre-task source capture plus9 scoped frontend/test paths. Fifteen unrelated native paths changed concurrently before initial freeze, preserved live and deliberately excluded; this candidate does not verify that native revision. Installed dependencies reused through node_modules symlink; no install or lockfile change by this task. Final native build includes TypeScript/Vite/offline locked debug compile and signing. No commit/publication/acceptance/cleanup.

Retest every unchanged isolated original and default at least3, retain every attempt; actual native selection/clipboard/Find/native fields/ownership/history, preserve retained drafts and original fixtures. Held-native/overlay/physical IME/VoiceOver/Windows remain BLOCKED/NOT_RUN if unavailable. Record final reports and actual completion with user acceptance pending.
