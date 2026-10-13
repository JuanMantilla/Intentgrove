from pathlib import Path
import json,datetime,hashlib,shutil,subprocess,re
out=Path(__file__).resolve().parent;root=out.parents[2];rel=out.relative_to(root);now=datetime.datetime.now(datetime.timezone.utc).isoformat()
checks=json.loads((out/'check-results-current.json').read_text());data=json.loads((out/'full-suite-after.json').read_text());assert data['numPassedTests']==707 and data['numFailedTests']==5
failures=[{'file':f['name'],'name':a['fullName'],'duration_ms':a['duration'],'errors':a['failureMessages']}for f in data['testResults'] for a in f['assertionResults']if a['status']=='failed'];(out/'current-failures.json').write_text(json.dumps(failures,indent=2))
shutil.copy2(out/'frontend-current.log',out/'full-suite-after.txt')
snapshot=json.loads((out/'tested-snapshot-current.json').read_text())['snapshot']['files'];drift=[]
for path,v in snapshot.items():
 p=root/path;s=p.stat();actual={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':s.st_size,'mtime_ns':s.st_mtime_ns,'ctime_ns':s.st_ctime_ns,'device':s.st_dev,'inode':s.st_ino,'mode':s.st_mode}
 if actual!=v:drift.append({'path':path,'expected':v,'actual':actual})
(out/'final-input-integrity.json').write_text(json.dumps({'checked_at':now,'count':len(snapshot),'drift':drift},indent=2));assert not drift,drift
(out/'final-git-status.txt').write_text(subprocess.check_output(['git','status','--short'],cwd=root,text=True))
summary=[]
for name in ['diagnostic-prefix','diagnostic-overlap','diagnostic-full']:
 rows=[json.loads(x)for x in (out/(name+'-trace.jsonl')).read_text().splitlines()];clean=[x for x in rows if x['phase']=='after-cleanup'];before=[x for x in rows if x['phase']=='beforeEach'];result=json.loads((out/(name+'.json')).read_text());summary.append({'name':name,'passed':result['numPassedTests'],'failed':result['numFailedTests'],'query_failures':len([x for x in rows if x['phase']=='query-failure']),'cleanup_count':len(clean),'cleanup_with_editors_or_listeners':[x for x in clean if x['state']['editors']or x['state']['listeners']],'start_with_editors':[x for x in before if x['state']['editors']],'max_observed_event_loop_delay_ms':max(x['loopMax']for x in rows),'max_trace_gap_ms':max(x['gap']for x in rows)})
(out/'diagnostic-summary.json').write_text(json.dumps(summary,indent=2))
text=(out/'root-cause.md').read_text();text=text[text.index('# Root-cause'):].split('## Current-tree follow-up')[0];text=text.replace('OTHER — historical failure is not reproduced in this investigation.','OTHER — original Save-to-file failure is not reproduced; a related current full-suite failure is reproduced but its cause remains unresolved.');text=text.replace('No fix was made. The user explicitly requires reproducing both full-suite failure and isolated success before code changes. Only the latter reproduced.','No fix was made. The original Save-to-file full-suite failure did not reproduce. The current full suite instead failed five workspace-handoff cases, while both current affected suites passed alone. No state leak or causal remedy was established.');text += f'''
## Current-tree follow-up
The current 712-test full run failed five workspace-handoff cases: four setup lookups for `Edit section “One”`, and the first test with a runner stack-trace error at 5619.9 ms, consistent with its 5000 ms whole-test deadline. Full raw errors: {out}/current-failures.json. Close-edit passed all 27 in that full run. Current isolated close-edit passed 27/27 and workspace-handoff 24/24.

The exact current prefix close-edit → workspace-handoff was traced in a disposable candidate, without changing canonical source. It passed 51/51 standalone and 51/51 during controlled overlap with the same native IPC/Clippy commands used in the failed broad run. Both captures show zero editor DOM nodes and zero mock-native listeners after every cleanup, and zero editor nodes at each test start. These successful-run traces cannot prove what happened in a failing run. Trace state includes active document/tab, section responses, per-App section maps, Markdown map validity/worker/layout state, DOM heading labels, mock calls, listener ownership and event-loop delay. Observer instrumentation and generation script remain under {out}/; production is unchanged.

The current failing prefix differs from the historical failing prefix. No smaller reproducing sequence exists yet. Controlled native overlap did not reproduce the failure; compiler overlap alone is not causal evidence. No state reset, deadline increase, retry, code patch or new regression assertion was applied. A final complete instrumented run also preserved the current failing run's full recorded file order and overlapped native IPC/Clippy. Its result and exact command are retained in diagnostic-full.json and diagnostic-full-command.json; its traced prefix again had no heading failure. Instrumented success cannot override uninstrumented failure because observation can perturb scheduling. The unresolved prerequisite is a failing trace identifying the absent heading's state/resource owner, not permission to make speculative repairs.
''';(out/'root-cause.md').write_text(text)
f=out/'changed-files.md';s=f.read_text();f.write_text(s[s.index('# Ownership'):]+f'\nDisposable tracing changes to copies of App, MarkdownView and the two test files are generated by {out}/instrument.py; they are observational and are not a candidate repair.\n')
rows=[('Historical exact-command rerun 1','PASS — 711/711'),('Historical isolated close-edit','PASS — 27/27'),('Historical exact-command rerun 2','PASS — 711/711'),('Historical predecessors replay','PASS — 56/56; failure not reproduced'),('Current isolated close-edit','PASS — 27/27'),('Current isolated workspace-handoff','PASS — 24/24'),('Current prefix diagnostic','PASS — 51/51'),('Current prefix diagnostic with native overlap','PASS — 51/51'),('Complete instrumented diagnostic',str(json.loads((out/'diagnostic-full.json').read_text())['numPassedTests'])+'/712 PASS; observational copy, not a repair'),('Current complete frontend','FAIL — 707/712; five workspace-handoff failures'),('Prototype-specific frontend','PASS — 33/33 within current full run'),('Markdown regression','FAIL — full-suite workspace-handoff setup/deadline failures'),('Phase 1','PASS — 86 model tests within workspace'),('Phase 2','PASS — 332 workspace tests'),('Phase 3 native','PASS — 184 tests; five existing ignored'),('Native IPC contract','PASS — 1 additional test'),('Whole-app strict Clippy','PASS — exit 0; 0 compiler-message diagnostics'),('TypeScript / Vite / native compilation','PASS'),('Workspace Clippy / formatting / dependency boundaries','PASS'),('Scoped source integrity',f'PASS — {len(snapshot)} paths, no byte/stat drift'),('Causal diagnosis and regression repair','BLOCKED — no demonstrated contaminator or correct fix')]
table='| Check | Result |\n|---|---|\n'+''.join(f'| {a} | {b} |\n'for a,b in rows)
(out/'verification-summary.md').write_text(f'# Verification summary\n\nCompleted {now}.\n\n'+table+f'\nExact current command set and timestamps: {out}/check-results-current.json. Historical commands: {out}/reproduction-commands.json. Prefix commands: {out}/predecessor-replay-command.json, {out}/diagnostic-prefix-command.json, {out}/diagnostic-overlap-command.json. All tests use unchanged deadlines/assertions. Diagnostic runs are supplemental, not replacements for the failing full suite.\n')
blocker='Current full frontend suite fails 5 workspace-handoff cases (707/712 PASS); original Save-to-file failure and causal contaminator/repair remain unestablished despite isolated and ordered diagnostic passes.'
report=f'''# Interactive Prototype V1 Phase 3 — frontend verification gate

{now}. **FAIL / QA_FAILED / BLOCKED. Phase 3 implementation remains PARTIAL pending verification.** This investigation has not resolved the gate. No corrective application/test patch or acceptance is claimed.

## Reproduction and classification
Node v20.19.6; Vitest 4.1.11; macOS arm64; no NODE_ENV/NODE_OPTIONS/CI/TZ/VITEST overrides in exact-command reproductions. Full PATH and environment: {out}/environment.json. Original command arguments and cwd were replayed exactly except for output artifact destinations:

```text
node /Users/juanmantilla/projects/personal/md-reader/node_modules/vitest/vitest.mjs run --dir tests/ui --maxWorkers 1 --reporter=json --outputFile=<recorded absolute evidence file>
```

The historical candidate passed 711/711 twice, and close-edit passed 27/27 alone. Historical file order differs from current cache-derived order; explicit replay of workspace-handoff → refresh-conflict → close-edit passed 56/56. The original `window: Save to file` error did not recur. The missing label is the editable Markdown heading before editor mounting or Save, not the editor itself.

The current complete run failed **707/712**, with five workspace-handoff failures. Four cannot find the editable section button during setup; the first has a runner stack-trace/deadline signature at 5619.9 ms. Close-edit passes 27/27 in that run. Isolated current suites pass 27/27 and 24/24. Tracing the exact current prefix close-edit → workspace-handoff passes 51/51, including a controlled overlap with native verification. Successful traced cleanups leave no editor DOM or mock-native listeners. No failed-state trace identifies a leaked owner.

**Classification: OTHER — nondeterministic frontend verification failure, cause unresolved.** A Phase 3 defect, pre-existing leak, concurrent-change cause, or compiler-contention cause cannot be asserted. No minimal reproducer is established. No speculative production/test fix, arbitrary timeout/retry, broad reset, assertion removal, test skip or permanent ordering change was made.

The current total is 712 because unrelated concurrent work already added one selection-readiness test at task start. Its App change and test are preserved; they are excluded from historical reproduction and included in current verification. Source provenance and scope expansion are explicit in {out}/changed-files.md. Native lint maintenance remains separate.

## Results
{table}
## Evidence and remaining work
Root-cause answers and inspected state categories: {out}/root-cause.md. Exact files/raw traces/commands: {out}/evidence-index.md. The required names full-suite-before.txt and full-suite-after.txt contain actual attempts; “after” means after investigation began, not after a nonexistent fix. Passing focused attempts do not override the latest failed full suite.

Remaining blocker: {blocker}

Next discriminating step: capture a failing trace at the heading lookup, then reduce that actual condition, repair its owner and encode the violated invariant. No permanent waiver is requested or invented. Current native/TypeScript/Vite/format/boundary gates pass. No Phase 4, prototype playback, WKWebView, contract or VectorCraft changes, commit, push or deployment.

## QA workflow
Record QA_FAILED / BLOCKED through the existing completion helper. User acceptance remains unsatisfied. Recommendation: **FIX REMAINING GATE**.
'''
(out/'report.md').write_text(report)
completion=json.loads((out.parent/'interactive-prototype-v1-phase-3-verification-unblock/completion.json').read_text());completion.update(acceptance_version='frontend-gate-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'),qa_result='QA_FAILED',task_state='BLOCKED',unresolved_blockers=[blocker],final_report=str(rel/'report.md'),tested_snapshot_path=str(rel/'tested-snapshot-current.json'))
completion['required_checks']=[{'id':d['name'],'result':'PASS'if d['exit_code']==0 else 'FAIL','reason':'Recorded command exited '+str(d['exit_code'])+('. Five workspace-handoff failures; no waiver.'if d['exit_code']else '.'),'finished_at':d['finished_at'],'evidence_paths':[str(rel/d['log']),str(rel/(d['name']+'-result.json'))]}for d in checks]
completion['required_checks'].append({'id':'frontend-causal-repair','result':'BLOCKED','reason':blocker,'finished_at':now,'evidence_paths':[str(rel/'root-cause.md'),str(rel/'diagnostic-summary.json')]})
# Preserve all final QA evidence and reproduction source copies; never enqueue deletion.
files=[str(p.relative_to(root))for p in out.iterdir()if p.is_file()and p.name!='completion.json']
completion['evidence_paths']=files;completion['artifact_paths']=files;completion['retain_paths']=files;completion['completion_requirements'][0]['evidence_path']=str(rel/'report.md')
(out/'completion.json').write_text(json.dumps(completion,indent=2)+'\n')
print(json.dumps({'status':'QA_FAILED / BLOCKED','passed':707,'failed':5,'inputs':len(snapshot),'diagnostics':summary},indent=2))
