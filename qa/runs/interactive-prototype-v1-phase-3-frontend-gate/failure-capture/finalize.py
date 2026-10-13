from pathlib import Path
import json,hashlib,datetime,subprocess
p=Path(__file__).resolve().parent;root=p.parents[3];now=datetime.datetime.now(datetime.timezone.utc).isoformat()
latest=json.loads((p/'current-late-seeded-1-command.json').read_text());assert 'finished_at' in latest
subprocess.run(['python3',str(p/'summarize-runs.py')],check=True)
baseline=json.loads((p/'tested-snapshot-current-late.json').read_text())['snapshot'];changes=[]
for name,meta in baseline['files'].items():
 f=root/name;s=f.stat();values={'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'size':s.st_size,'mtime_ns':s.st_mtime_ns,'ctime_ns':s.st_ctime_ns,'device':s.st_dev,'inode':s.st_ino,'mode':s.st_mode}
 if any(meta[k]!=v for k,v in values.items()):changes.append(name)
candidate_changes=[]
for file in p.glob('*-command.json'):
 r=json.loads(file.read_text())
 for name,sha in r.get('input_sha256',{}).items():
  f=Path(r['cwd'])/name
  if hashlib.sha256(f.read_bytes()).hexdigest()!=sha:candidate_changes.append([r['name'],name])
integrity={'at':now,'canonical_late_baseline_paths':len(baseline['files']),'canonical_late_changes':changes,'run_input_manifest_changes':candidate_changes,'entry_baseline_delta':'Only externally changed App.tsx and document-selection-readiness.test.tsx; preserved in late-concurrent-provenance.json.','first_recorder_qualification':'Startup getter-only edit documented separately; no immutable whole-run claim for recorder-seeded-1.'}
(p/'final-input-integrity.json').write_text(json.dumps(integrity,indent=2));assert not changes and not candidate_changes,integrity
report=f'''# Phase 3 frontend gate — failed-state capture and diagnostic outcome

Finalized {now}. **A real failed state was captured. Causal owner and root cause remain unresolved. No repair was made.** Phase 3 remains **PARTIAL / QA_FAILED / BLOCKED**, without acceptance. The latest, separately frozen current frontend passes **{latest['passed']}/{latest['total']}**. Passing reruns do not explain the preserved failure.

## Failing-state captured

**YES.** The original workspace-handoff lookup failed naturally in `reveals collapsed branches only after explicit request`. Minimal-recorder full suite: **711/712**, one failure. Exact command, original awaits/assertions/timeouts, default ordering, and mocked IPC are preserved. First raw capture: `{p}/captures/1791782635664-37782/`.

## Observer effect

Minimal recorder: **one failure (711/712), one pass (712/712)**. The separate CPU/event-loop profiling run passed **712/712**, so its failure-only policy produced no CPU profile or failed histogram. The minimal recorder did not eliminate reproduction; observer neutrality is not demonstrated. Conditional reduction after consistently passing minimal runs was not triggered.

Provenance qualification: three fields were added to the diagnostic App failure getter during the first run's startup, after its App had apparently been transformed. The capture lacks those fields and matches the preserved earlier getter. No application behavior, test control flow, milestone calls, assertion, or deadline changed. Both forms/hashes and timing are retained in `{p}/recorder-source-timing-note.json`. The frozen follow-up passed. Do not claim immutable whole-run source for the first recorder attempt, or use that limitation to erase the actual snapshot.

## Last successful milestone

**SECTIONS_RESOLVED — 29498.784167 ms**, for `a.md`, disk version `v1`, cancelled=false.

Query began **27981.132917 ms** and failed **29574.193334 ms**: **1593.060417 ms** elapsed. Descriptor callback occurred **517.651250 ms after the nominal 1000 ms query deadline**, and **75.409167 ms before rejection**. No ring entries were dropped. The generic ring generation slot on SECTIONS_RESOLVED is its cancellation boolean; actual workspace generation is 1.

## State at failure

Correct sole active tab/document `a.md`, identity `a.md`, Markdown content `# One\\nalpha\\n# Two\\nbeta\\n`, version `v1`, workspace `/tmp/fixture`, generation 1, navigation 1. App active ID and ref agree. Markdown kind is implicit in the tab descriptor; MarkdownView and the DOM establish the view.

Document load complete; session ready; busy=false; no document/selection pending, queued selection, edit, recovery, or entering section. Selection adapter belongs to a.md. Native read and descriptor mocks are fulfilled; the descriptor reply contains both correct sections and is not cancelled. Latest App render still has empty sectionsByTab and sectionLayoutVersions. Markdown inline rendering/selection readiness is true, all 4 blocks are painted, but **layoutPending=true** and no sections/map have reached that render.

Focused DOM contains plain One/Two headings and alpha/beta, with **no edit buttons**. No beginSectionEdit call, editor mount, or editor unmount was reached. This excludes an existing editor/button missed by accessible-name lookup for this capture. Nine listeners belong to the still-mounted mock App; their presence does not establish a leak.

## Failure category

**READINESS_RESOLVED_RENDER_MISSING**, specifically: descriptor acquisition callback completed, but section-map/layout publication had not committed before lookup rejection. Selection readiness itself was already true. This classifies the observed state, not a proven application invariant violation.

Broader classification remains **OTHER — nondeterministic frontend verification failure, cause unresolved**. No Phase 3 regression, state leak, timing bug, or concurrent-change regression is established.

## Causal owner

**UNRESOLVED.** The observed boundary is the listEditSections callback/state publication in `{root}/src/app/App.tsx` to the section map/heading render in `{root}/src/reader/MarkdownView.tsx`. Those locations identify the next investigative boundary, not a blamed owner.

## Concurrent selection-readiness correlation

Two uninstrumented full runs per exact reconstructed entry-time variant:

| Variant | Run 1 | Run 2 | Workspace-handoff |
|---|---:|---:|---|
| A: historical candidate | 711/711 | 711/711 | 24/24 both |
| B: historical + App patch | 711/711 | 711/711 | 24/24 both |
| C: historical + added test | 710/712 | 711/712 | 24/24 both |
| D: historical + both | 712/712 | 712/712 | 24/24 both |

C's added readiness test fails twice without the App behavior it tests. C's first run also has the separate new-Markdown alert lookup failure. **No workspace-handoff correlation with the entry-time App/test patch was observed in these eight runs.** Two observations per cell cannot establish absence of an effect or causation. Exact patches, hashes, copies, cache states and failures are retained in `{p}/variant-matrix.md`, `{p}/variant-provenance.json`, and `{p}/run-matrix.csv`.

Later external concurrent work changed the live selection dispatch from requestAnimationFrame to a cancellable microtask and added another test at 05:45–05:46 UTC. These edits postdate the 05:23:55 UTC capture and were not made or removed by this task. The original matrix stays frozen at 712 tests. A new pre-check snapshot and independent current-late copy preserve the later source: `{p}/late-concurrent.patch`, `{p}/late-concurrent-provenance.json`, `{p}/tested-snapshot-current-late.json`. Its full result is **{latest['passed']}/{latest['total']}**, without attributing the pass to that concurrent patch.

## Test-order correlation

Passing D-seeded-1 and failing recorder-seeded-1 have the **same complete 70-file order**, beginning close-edit → workspace-handoff. Actual reporter startTime order is retained for each run.

Explicit replay matches that failing order exactly on untouched entry-time D source: **workspace-handoff 24/24 passes**, but the overall replay is **711/712**, with the independent new-Markdown alert lookup failure. **file order alone is insufficient for the workspace-handoff heading failure**. Do not call the whole replay a pass. No permanent ordering change was made.

Entry-time D passes **712/712** with the saved initial cache, its own warm cache, and a fresh private cache. Default fresh-cache ordering is a separate observed variable; this is not a cold OS-cache experiment. Only run-owned caches were renamed, and all before/after files were preserved. See `{p}/file-order-comparison.md`.

## Deadline and resource assessment

The captured case progresses during the query; it does not show a multi-second interval with no application milestones. Read request-to-callback is 1308.668792 ms; descriptor request-to-callback is 850.577833 ms despite immediate mock implementations. Those intervals include scheduling and synchronous work, not native service latency. Descriptors resolved late and their render had not committed at rejection. There is no evidence of an editor mounting afterward because ordinary failure cleanup proceeds without a grace period.

The historical first case's **5619.9 ms runner/deadline signature was not recaptured**. Its earlier cause remains uncharacterized. The new trace exposes the existing query deadline instead.

Other Vitest processes were observed during this investigation and left untouched. No at-failure CPU/GC/blocking stack was obtained: the dedicated profiled run passed. External process overlap, synchronous query/render work, GC, and scheduler delay remain unproven possibilities. **No actual blocking operation is attributed.** Evidence/limits: `{p}/deadline-analysis.json`, `{p}/first-capture-analysis.md`, and the resource-follow-up section of `{p}/diagnostic-design.md`.

## Root cause

**NOT YET ESTABLISHED.** The first real failed-state trace narrows the decision tree to late section acquisition/publication and the missing render at rejection. It does not prove which operation consumed or delayed that time.

## Repair

**NONE — insufficient causal evidence.** No application/test repair or regression assertion added. No longer timeout, retry, arbitrary wait, assertion weakening, reset, skipped test, fixed production order, or production telemetry. Temporary instrumentation exists only in retained diagnostic copies.

## Current full frontend

**{'PASS' if latest['failed']==0 else 'FAIL'} — {latest['passed']}/{latest['total']}**, latest live-source-equivalent isolated copy, after preserving the later concurrent changes. Entry-time source separately passed 712/712 in three ordinary cache runs; its failing diagnostic and unrelated full-order replay failure remain retained. All **14 full-suite attempts** are recorded individually; no passing rerun replaces a failed attempt.

## Phase 3 QA

**PARTIAL / QA_FAILED / BLOCKED — unresolved frontend verification gate; acceptance absent.** Existing strict Clippy/native/prototype gate results remain preserved; this continuation did not rerun native gates. Final late baseline verifies all 398 scoped canonical bytes/identities unchanged since that baseline. The two differences from entry are the explicitly recorded external App/test updates. Later run input manifests also match their frozen copies. No Phase 4, playback, .igproto change, VectorCraft change, commit, push, deployment, cleanup worker, or deletion.

## Recommendation

**CONTINUE ROOT-CAUSE INVESTIGATION.** Use the saved real failing state to capture the actual blocking operation on a frozen recurrence. No targeted repair or Phase 3 acceptance is justified yet. QA_TRIAGE handoff and bounded continuation/retest prompts: `{p}/department-handoff.md`.
'''
(p/'root-cause-update.md').write_text(report)
index=['# Failure capture evidence index','',f'Finalized {now}. Raw attempts and the original parent run evidence are preserved.','']
names=['root-cause-update.md','diagnostic-design.md','first-capture-analysis.md','failing-ring-buffer.json','failing-state.json','focused-dom.txt','deadline-analysis.json','variant-matrix.md','run-matrix.csv','failure-ledger.json','file-order-comparison.md','variant-provenance.json','selection-readiness-app.patch','selection-readiness-test.tsx','recorder.patch','recorder.ts','recorder-v1-App.tsx','recorder-source-timing-note.json','recorder-inputs.json','profile.patch','profile-inputs.json','environment.json','late-concurrent.patch','late-concurrent-provenance.json','tested-snapshot.json','tested-snapshot-current-late.json','integrity-pre-final.json','final-input-integrity.json','concurrent-process-observation.txt','concurrent-process-observation-late.txt','department-handoff.md']
names += [f.name for f in sorted(p.glob('*-command.json'))]
names += [f.name for f in sorted(p.glob('*-order.json'))]
for name in names:index.append(f'- [{p/name}]({p/name})')
index+=['','Each command record names the matching raw JSON result and log; adjacent cache-before/cache-after directories preserve exact cache contents. Candidate copies retain exact source. No failure CPU profile exists because the profile attempt passed.']
(p/'evidence-index.md').write_text('\n'.join(index)+'\n')
for name in ['report.md','root-cause.md','evidence-index.md']:
 if 'Actual failed reader state captured; causal owner unresolved.' in (p.parent/name).read_text():continue
 with (p.parent/name).open('a') as f:f.write(f'\n## Failure-capture continuation — {now}\n\nActual failed reader state captured; causal owner unresolved. Latest later-source frontend {latest["passed"]}/{latest["total"]}; no repair or acceptance. Authoritative continuation and raw evidence: {p}/root-cause-update.md and {p}/evidence-index.md. Prior evidence above remains historical and unchanged.\n')
state=f'''# Phase 3 failed-state capture — {now}

VERIFICATION/DIAGNOSTIC complete in requested scope. Real workspace-handoff heading failure captured: correct a.md Markdown, fulfilled uncancelled descriptors, selection ready, section layout pending and no edit buttons. Last event SECTIONS_RESOLVED; query rejects at1593ms. Owner/root cause UNRESOLVED; no repair.

Four entry-time variants run twice: A/B711PASS twice,D712PASS twice;C710/712 then711/712 (added-test dependency and one unrelated New Markdown failure);handoff24PASS throughout. Minimal recorder711/712FAIL then712PASS;profile712PASS/no failed CPU trace. Exact70-file replay:handoffPASS,overall711/712NewMarkdownFAIL. Fresh cache712PASS.

External later App microtask/test edits preserved separately; latest frozen current713/713PASS.398 late-baseline scoped bytes/identities unchanged. First trace has documented startup getter-only provenance qualification. Phase3 PARTIAL/QA_FAILED/BLOCKED; no acceptance,Phase4,production edits,commit,push,deploy,deletion or worker.

Report: {p}/root-cause-update.md. Next: capture actual blocking operation on frozen recurrence; causal invariant required before repair.

---

'''
for name,backup in [('.agents/state.md','agents-state-before-final.md'),('qa/STATE.md','qa-state-before-final.md')]:
 if (p/backup).exists():continue
 target=root/name;old=target.read_bytes();(p/backup).write_bytes(old);target.write_bytes(state.encode()+old)
rel=lambda f:str(f.relative_to(root))
evidence=[rel(p/name) for name in names if (p/name).is_file()]
completion={'schema_version':1,'task_id':'interactive-prototype-v1-phase-3','acceptance_version':'failure-capture-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'),'session_kind':'qa','qa_result':'QA_FAILED','task_state':'BLOCKED','unresolved_blockers':['Actual heading failure captured on entry-time source, but causal owner/blocking operation and violated invariant remain unresolved. Passing later-source verification is not a demonstrated repair or acceptance.'],
 'required_checks':[{'id':'latest-current-frontend','result':'PASS' if not latest['failed'] else 'FAIL','reason':f'Frozen latest current source: {latest["passed"]}/{latest["total"]}; exact requested frontend command.','finished_at':latest['finished_at'],'evidence_paths':[rel(p/'current-late-seeded-1-command.json'),rel(p/'current-late-seeded-1.json')]},
 {'id':'causal-diagnosis-assessment','result':'BLOCKED','reason':'Final assessment: failed-state decision branch narrowed, no demonstrated blocking operation/causal owner; no repair. Earlier matrix/capture results are versioned evidence, not retimed checks on the late snapshot.','finished_at':now,'evidence_paths':[rel(p/'root-cause-update.md')]},
 {'id':'latest-scope-integrity','result':'PASS','reason':'398 scoped canonical content and stat identities match the pre-check late baseline; recorded later candidate input hashes match.','finished_at':now,'evidence_paths':[rel(p/'final-input-integrity.json')]}],
 'final_report':rel(p/'root-cause-update.md'),'evidence_paths':[rel(p/'evidence-index.md'),rel(p/'run-matrix.csv')],'tested_snapshot_path':rel(p/'tested-snapshot-current-late.json'),
 'artifact_paths':[rel(f) for f in p.rglob('*') if f.is_file() and 'node_modules' not in f.parts],
 'retain_paths':evidence,'requirements_source_paths':['AGENTS.md','specs/014-interactive-prototype-v1/spec.md','specs/014-interactive-prototype-v1/plan.md','specs/014-interactive-prototype-v1/tasks.md'],
 'completion_requirements':[{'requirement':'Actual user acceptance of Phase 3 after review; passing individual gates alone is not acceptance.','source_path':'specs/014-interactive-prototype-v1/tasks.md','evidence_path':rel(p/'root-cause-update.md'),'satisfied':False}]}
(p/'completion.json').write_text(json.dumps(completion,indent=2));print('Reports finalized; current source integrity verified; completion input prepared.')
