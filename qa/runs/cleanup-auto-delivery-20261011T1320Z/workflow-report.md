# Accepted-QA automatic cleanup end-to-end report

Overall: **PASS after two scoped repairs and a fresh acceptance version.** Two authorized synthetic files (295 bytes) were deleted by the existing service, recovered, and protected against overwrite on the second restoration. Historical failures and initial keep decisions remain preserved. This is no application acceptance.

Generated: 2026-10-11T13:21:02.346521+00:00

| Stage | Result | Evidence-backed observation |
| --- | --- | --- |
| Original baseline, synthetic QA and conditional acceptance | PASS | Original immutable evidence preserved; original receipt hash validated. Current continuation required a new retention context, not fabricated application acceptance. |
| Hook diagnosis and scoped repair | PASS | Found fixed /bin/zsh -lc correlation incompatible with actual earlier /bin/bash -c executions and early SKIPPED diagnostics omitted. Repaired finite shell/flag matching and recognized-command diagnostics. |
| Historical exact hook payload reconstruction | NOT TESTED | Original handler did not persist early rejection payloads. Historical delivery cannot be retrospectively certified; no event was fabricated. |
| Repair baseline and regression tests | PASS | Documented snapshot before testing. 83 hook-repair tests; 86 tests after service-lock repair, all passing. Component fixtures are not counted as live delivery. |
| Loaded hook and user trust review | PASS | Actual-host hooks/list reports enabled/trusted; current user renewed review before live publication. Trust records unchanged. |
| Actual canonical event / command recognition / successful execution | PASS | Failed non-publishing probe observed PostToolUse/Bash first. Successful completion outcomes correlate by real session/tool IDs, exact command/output digest and exit zero. Earlier /bin/bash -c shape replay also passed live. |
| Committed receipt and live acceptance validation | PASS | v1 receipt identical to original persisted body/nonce; v2 current accepted record validates and supersedes v1. Helper idempotency distinguished from hook queue deduplication. |
| v1 ENQUEUED and identical replay DUPLICATE | PASS | Actual hook outcomes and persisted queue agree. Exactly one job for original key; no duplicate job from additional Bash replay. |
| First service discovery and independent review | PASS | Distinct successful sessions; both retained files because historical workflow/state still imposed a temporary hold. APPLIED with two kept outcomes, zero deletion receipts. |
| Fresh v2 acceptance and supersession | PASS | Current exact user authorization recorded; four checks passed after fresh baseline. Old evidence, decisions, receipt and queue preserved unchanged. |
| v2 ENQUEUED and identical replay DUPLICATE | PASS | Correlated actual outcomes; exactly one job for v2. Two acceptance versions intentionally have two different jobs, each deduplicated separately. |
| Automatic v2 discovery | PASS | Existing service inspected both exact files and current evidence; successful observed session. |
| Fresh independent v2 review | PASS | Distinct successful session, new exec invocation without resume/fork; review payload contains neither discovery session ID nor discovery event stream. |
| Standing policy and guarded deletion | PASS | APPLIED; two exact inventory files absent before restoration, two finished deletion receipts; no extra deletions. Standing authority and sealed evidence validated before subsequent service repair. |
| Recovery copies and receipt verification | PASS | Two recovery copies match original hashes and sizes: 149 + 146 = 295 bytes. Recovery and receipt hashes unchanged after both restores. |
| Initial restore while old service held idle lock | FAIL | Documented command exited 2 / EAGAIN. Failure preserved; it made no restoration. Resolved by tested service-lock repair. |
| Service-lock repair and approved activation | PASS | Dedicated service singleton lock; worker lock held for work but released while idle. 86 tests pass; explicit user-authorized single restart. Existing service now PID 37399; no concurrent/new service. |
| First successful non-overwriting restoration | PASS | Both paths restored from verified receipts. First summary copied and hash-verified before repeat. |
| Second restoration refuses overwrite | PASS | Both outcomes kept / destination now exists; never overwritten. Full fingerprints including identity and bytes unchanged. |
| Final retention and policy integrity | PASS | All original and v2 QA/acceptance/reproducibility files remain hash-identical. Policy/config unchanged; receipts and recovery preserved. Restored originals remain present; APPLIED job is not replayed. |

## Diagnosis and limitations

Original host executions are preserved in actual-earlier-executions.json with source rollout line numbers and actual execution IDs. Both successful commands used /bin/bash -c and exited zero with identical committed receipt contents. The installed raw-output correlation predicate accepted only /bin/zsh -lc; it necessarily rejected those execution argv values if delivered as the documented raw hook response. Production outcome persistence only occurred after receipt recognition, hiding such early SKIPPED results. Historical hook payloads were not preserved, so their delivery cannot be retrospectively certified.

Read-only hooks/list from both a separate configuration probe and the actual running host reported the PostToolUse ^Bash$ hook enabled and trusted. This rules out assuming missing current trust from absent queue records. See hook-api.json and host-observer.jsonl. The observer did not subscribe to turn events and captured no hook notifications; its lack of notifications is not evidence of non-delivery. It started no thread or turn.

The scoped repair accepts only exact /bin/zsh or /bin/bash argv with -c or -lc. It retains the same session/execution identity, completed status, integer-zero exit, exact command/output, committed receipt, current acceptance, policy and queue guards. It also persists recognized-helper SKIPPED diagnostics with real event/tool names, identity, command and response digest; no raw arbitrary output or credentials are copied. Installed changes and tests are in repair.diff, before/, tested-paths.json, tested-snapshot.json and component-tests.txt. All 83 component tests pass; they are isolated fixtures, not live delivery evidence. No production hook was directly invoked.

User renewed hook review is recorded in renewed-hook-review.json. Trust records and hook definition were not edited. A real failed helper probe against a nonexistent input then produced a persisted PostToolUse/Bash SKIPPED outcome. This established canonical event compatibility before any current completion publication. A sandbox-denied completion also produced SKIPPED; the authorized standalone escalated call then produced ENQUEUED. Its identical replay produced DUPLICATE. A further real /bin/bash -c replay—the earlier shell shape—also produced DUPLICATE, verifying the repaired path live. Each outcome is matched to the actual host CommandExecution and exact response digest in delivery-verified.json and later verification records. Raw payload text is recoverable from the preserved exact host output plus validated command; the event itself was not fabricated.

The original accepted synthetic calculation still validated mechanically. Its service discovery and fresh independent review both honored an obsolete temporary workflow hold and kept both originals, leaving zero deletion receipts. APPLIED did not mean deleted. See first-service-result.json and the untouched first run. Current user authority was then transcribed in a fresh v2 acceptance package; it expressly permits this test's original exact synthetic deletion/restoration. Fresh baseline and four checks establish v2 acceptance, preserving the old records and decisions. No review output, policy or original evidence was edited. V2 publication/deduplication is independently verified in v2-delivery-verified.json.

No manual enqueue, additional worker, policy change, trust bypass, manual deletion, or artifact movement was performed. The running service remains responsible for all discovery, review and deletion. Recovery must still be checked against receipts and the original inventory before restoration.

A further live defect appeared during restore: the service held worker.lock throughout idle polling. The fix retains a lifetime service singleton lock and takes worker.lock only across a full polling/work cycle. Lock-acquisition contention skips work; errors inside work propagate. The approved restart replaced PID 24145 with PID 37399. Live probes observed service.lock held and worker.lock available while idle; both guarded restores then completed.

The service implementation changed after deletion, so the old sealed implementation hashes describe the historical deletion run. They were successfully revalidated before that change. The prior seal is preserved and was not rewritten or used to authorize a repeat deletion. Current synthetic acceptance remains valid because its tested scope and retained evidence are unchanged; restore independently verifies repository and recovery receipts.

## Queue and hook evidence

### v1 original / superseded

Record key: `f9547099378e1a8aea7c80ddc29ff9ae6d34096d94d4c390b362bf7dc1bb76cb`. Queue: /Users/juanmantilla/projects/personal/.agents/cleanup-state/queue/f9547099378e1a8aea7c80ddc29ff9ae6d34096d94d4c390b362bf7dc1bb76cb.json. Final observed state: APPLIED; attempts: 1; run: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/f9547099378e1a8aea7c-1. Exactly one matching job.

- ENQUEUED / PASS; tool `exec-4b668f27-79db-498b-afb3-7b2fca1f36ad`; session `01a12b0e-0a8d-75d2-a8cd-63beaffbd460`; hook queue state QUEUED; exit 0; exact output digest match True. Outcome: /Users/juanmantilla/projects/personal/.agents/cleanup-state/hook-outcomes/d9ff1eaab5ac4c7e98345adab197bbb4.json
- DUPLICATE / PASS; tool `exec-1affde05-8c84-49f0-ba2b-ece7f2738aaa`; session `01a12b0e-0a8d-75d2-a8cd-63beaffbd460`; hook queue state RUNNING; exit 0; exact output digest match True. Outcome: /Users/juanmantilla/projects/personal/.agents/cleanup-state/hook-outcomes/af145078faef4499b3b232c31081bb45.json
- DUPLICATE / PASS; tool `exec-3306ef71-bcc3-477e-b815-d8abd7900056`; session `01a12b0e-0a8d-75d2-a8cd-63beaffbd460`; hook queue state RUNNING; exit 0; exact output digest match True. Outcome: /Users/juanmantilla/projects/personal/.agents/cleanup-state/hook-outcomes/79620a3304a14e90a9bfab5cf70290f2.json
### v2 current

Record key: `5061204d5916fdbe637e73efa2d9f5b13f38b52debae8001c741571cd42079ee`. Queue: /Users/juanmantilla/projects/personal/.agents/cleanup-state/queue/5061204d5916fdbe637e73efa2d9f5b13f38b52debae8001c741571cd42079ee.json. Final observed state: APPLIED; attempts: 1; run: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1. Exactly one matching job.

- DUPLICATE / PASS; tool `exec-48d8d61c-c122-474d-b7da-86a99a8ba021`; session `01a12b0e-0a8d-75d2-a8cd-63beaffbd460`; hook queue state RUNNING; exit 0; exact output digest match True. Outcome: /Users/juanmantilla/projects/personal/.agents/cleanup-state/hook-outcomes/51532cf4390d42a58079f53212151db1.json
- ENQUEUED / PASS; tool `exec-cd01497d-5e56-4609-b71e-b56be5a84a0f`; session `01a12b0e-0a8d-75d2-a8cd-63beaffbd460`; hook queue state QUEUED; exit 0; exact output digest match True. Outcome: /Users/juanmantilla/projects/personal/.agents/cleanup-state/hook-outcomes/8899c077f59f424b879dfd7edcede84a.json

Canonical failed probes were safely SKIPPED before queueing; actual IDs and payload digests are included in /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/final-state.json. The sandbox-denied completion was not counted as publication. Receipt equality alone proves helper idempotency; ENQUEUED/DUPLICATE plus persisted one-job counts prove hook deduplication.

## Observed independent sessions

- v1 discover: `01a12b14-3b05-7aa2-ae9d-5cbaeefda153`; exit 0; 2026-10-11T13:08:28.402442+00:00 → 2026-10-11T13:09:46.298946+00:00. Events: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/f9547099378e1a8aea7c-1/discover-events.jsonl; process: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/f9547099378e1a8aea7c-1/discover-process.json
- v1 review: `01a12b15-6dfe-73f2-844c-7f15c45653f3`; exit 0; 2026-10-11T13:09:47.018028+00:00 → 2026-10-11T13:10:44.085614+00:00. Events: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/f9547099378e1a8aea7c-1/review-events.jsonl; process: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/f9547099378e1a8aea7c-1/review-process.json
- v2 discover: `01a12b18-a0a2-7440-8b71-fd8b613d9237`; exit 0; 2026-10-11T13:13:16.604352+00:00 → 2026-10-11T13:14:16.249840+00:00. Events: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/discover-events.jsonl; process: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/discover-process.json
- v2 review: `01a12b19-8c86-7922-972b-30ff86638275`; exit 0; 2026-10-11T13:14:17.024569+00:00 → 2026-10-11T13:15:10.571811+00:00. Events: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/review-events.jsonl; process: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/review-process.json

## Deleted, restored, and retained synthetic paths

- /Users/juanmantilla/projects/personal/md-reader/cleanup-disposable/qa-intermediates/cleanup-auto-disposable-20261011T050112Z-trace.log
  - v1 retained due to temporary workflow hold; v2 deleted after verified recovery, then restored. Second restore retained the existing destination unchanged.
  - Original/restored SHA-256: `9d9acaf5608c6b92caa6490baacefb1c40de2f72d602b303ad419edade07507e`; bytes: 146.
  - Receipt: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/receipts/C2.json
  - Recovery: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/recovery/964053dd739d3f5911d69e0c58c82fee87e92931fe52cfae64c1818d2a235d75.recovery
- /Users/juanmantilla/projects/personal/md-reader/cleanup-disposable/qa-intermediates/cleanup-auto-disposable-20261011T050112Z-scratch.txt
  - v1 retained due to temporary workflow hold; v2 deleted after verified recovery, then restored. Second restore retained the existing destination unchanged.
  - Original/restored SHA-256: `e97b797b005df633a7891332059f813c6bb012da917309889782b496894e0608`; bytes: 149.
  - Receipt: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/receipts/C1.json
  - Recovery: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/recovery/6a81f17209dceb24fcd8df109983b83faf859ae56f139d500b3af3bcd1b87b17.recovery

Deleted outside the exact two-path inventory: zero observed in this service run. Recovery bytes retained: 295. Restored source bytes: 295. No disk-space savings claimed.

## Recovery evidence

- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/pre-restore-verified.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/restore-first-summary.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/restore-first-verification.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/restore-second-summary.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/restore-second-verification.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/final-state.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/restore-attempt1.json
- Original service restoration summary: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/restore-b1a03cdeb17b4f19881daac80dc3dbf3.json
- Original service restoration summary: /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/restore-ce276ac71e0d47718728a65a02424d62.json

## Protected evidence retained unchanged

Every path below was rehashed successfully after both restorations:

- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/acceptance.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/attempt1-error.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/authorization.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/check-attempt1.py
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/check.py
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/checks.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/completion.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/evidence-index.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/launchd-check.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/report.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/task-instructions.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/tested-paths.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/tested-snapshot-2.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/tested-snapshot.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/acceptance-source.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/acceptance.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/check.py
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/checks.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/cleanup-policy.json.baseline
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/cleanup-service.json.baseline
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/command-observations.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/completion-verification.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/completion.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/enqueue-observed.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/evidence-index.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/existing-intermediates.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/launchd-after.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/launchd-before.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/launchd-check.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/persisted-completion.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/queue-after-replay.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/queue-before.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/report.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/reproducibility-inputs.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/retained-hashes-before.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/synthetic-inventory.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/task-instructions.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/tested-paths.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/tested-snapshot.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/workflow-evidence-hashes.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/workflow-report.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z/workflow-results.json

## Repairs, baselines, and service evidence

- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/repair.diff
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/tested-snapshot.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/component-tests.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/renewed-hook-review.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/hook-api.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/host-observer.jsonl
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/actual-earlier-executions.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/delivery-verified.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/first-service-result.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/v2-delivery-verified.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/v2-service-observation.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/repair.diff
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/tested-snapshot.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/component-tests.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/activation.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/launchd-before.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-delivery-20261011T1320Z/service-lock-repair/launchd-after.txt
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/tested-snapshot-2.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/checks.json
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/authorization.md
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/cleanup-auto-disposable-20261011T050112Z-v2/acceptance.json
- /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/automatic-authorization.json
- /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/seal.json
- /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/review-original.json
- /Users/juanmantilla/projects/personal/.agents/cleanup-state/runs/5061204d5916fdbe637e-1/report.json

Changed installed scope: /Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py, /Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/post_tool_use.py, /Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/tests/test_cleanup.py, /Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup_service.py, /Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/tests/test_automatic.py, /Users/juanmantilla/projects/personal/.agents/qa-cleanup-operations.md. The project handoff was updated; all historical state was preserved. New evidence/check scripts live only in the two new QA directories.

No manual enqueue, manual deletion, policy edits, trust bypass, credentials copied, or additional worker/service. One explicitly approved restart of the existing service activated the lock fix. All recovery files and receipts remain.
