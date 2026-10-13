from pathlib import Path
import json,csv,collections
out=Path(__file__).resolve().parent
records=[]
for path in out.glob('*-command.json'):
 r=json.loads(path.read_text())
 if 'finished_at' not in r:continue
 j=json.loads((out/(r['name']+'.json')).read_text())
 failed=[{'file':str(Path(f['name']).relative_to(r['cwd'])),'test':a['fullName'],'duration':a['duration'],'message':a['failureMessages'][0].split('\n')[0] if a['failureMessages'] else ''} for f in j['testResults'] for a in f['assertionResults'] if a['status']=='failed']
 r['failures']=failed;r['handoff_failed']=sum('workspace-handoff' in f['file'] for f in failed)
 records.append(r)
records.sort(key=lambda r:r['started_at'])
columns=['name','variant','passed','failed','total','handoff_failed','exit_code','started_at','finished_at','cwd']
with (out/'run-matrix.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore');w.writeheader();w.writerows(records)
(out/'failure-ledger.json').write_text(json.dumps([{k:r[k] for k in ['name','variant','failures']} for r in records],indent=2))
provenance=json.loads((out/'variant-provenance.json').read_text())
text=['# Selection-readiness variant matrix','', 'Plan: two runs per available uninstrumented A/B/C/D combination; the table below includes completed runs only. First run uses an identical preserved result-cache seed; second uses that candidate’s own resulting warm cache. Runs are sequential within this investigation. External host work is uncontrolled. These frequencies are descriptive and cannot establish causation.','', '| Variant | Source | App SHA-256 | New test SHA-256 |','|---|---|---|---|']
for v,description in [('A','Historical Phase 3 frontend'),('B','Historical + current App patch only'),('C','Historical + added readiness test only'),('D','Historical + both; equals current frontend at entry')]:
 p=provenance['variants'][v];text.append(f'| {v} | {description} | {p["App"]} | {p["test"] or "absent"} |')
text+=['','| Run | Passed/total | Failed | Workspace-handoff failed |','|---|---:|---:|---:|']
for r in records:text.append(f'| {r["name"]} | {r["passed"]}/{r["total"]} | {r["failed"]} | {r["handoff_failed"]} |')
text+=['','The C-only test deliberately exercises behavior implemented by the excluded App patch. Its own failure is a patch-dependency result, distinct from incidental workspace-handoff or deadline failures. No test is skipped or weakened in this combination.','','Exact paths, hashes and patch provenance are retained in '+str(out/'variant-provenance.json')+', '+str(out/'selection-readiness-app.patch')+', and '+str(out/'selection-readiness-test.tsx')+'. Each run has its exact command, cwd, timestamps, raw JSON result, stdout/stderr, actual file order, and before/after private cache.']
(out/'variant-matrix.md').write_text('\n'.join(text)+'\n')
order=lambda name:[x['file'] for x in json.loads((out/(name+'-order.json')).read_text())]
text=['# Actual file order and cache observations','', 'Actual order is derived from JSON reporter file startTime with maxWorkers=1, not guessed from CLI argument order. No observer reporter was added.','']
if (out/'recorder-seeded-1-order.json').exists():
 text+=['Current uninstrumented passing D-seeded-1 and failing recorder-seeded-1 have '+('identical' if order('D-seeded-1')==order('recorder-seeded-1') else 'different')+' complete 70-file execution orders. Both start close-edit → workspace-handoff. Instrumentation and host scheduling differ, so this comparison does not isolate their effects.','']
if (out/'D-failing-order-replay-order.json').exists():
 same=order('D-failing-order-replay')==order('recorder-seeded-1');r=next(r for r in records if r['name']=='D-failing-order-replay')
 text+=[f'Explicit disposable sequencer replay order exactly matches the failed recorder order: {same}. Uninstrumented current source result: {r["passed"]}/{r["total"]}, {r["failed"]} failed.']
 if same and not r['handoff_failed']:text+=['**file order alone is insufficient for the workspace-handoff heading failure**. Workspace-handoff passes 24/24; the full replay result above remains authoritative, including any unrelated failures.']
 text+=['The replay configuration is external to canonical source; it is not a suite fix.','']
for r in records:
 if r['variant']=='D':text.append(f'- {r["name"]}: {r["passed"]}/{r["total"]}, {r["failed"]} failures; private cache before/after preserved.')
text+=['','Only run-owned `.vite` directories were renamed for fresh-cache attempts. Dependencies were reused unchanged. Fresh here means Vitest/Vite result-cache state, not a cold OS filesystem cache or rebooted host. Initial historical failure cache contents were unavailable; the existing earlier failing order remains preserved separately.']
(out/'file-order-comparison.md').write_text('\n'.join(text)+'\n')
print('\n'.join(f'{r["name"]}: {r["passed"]}/{r["total"]}, handoff failures {r["handoff_failed"]}' for r in records))
