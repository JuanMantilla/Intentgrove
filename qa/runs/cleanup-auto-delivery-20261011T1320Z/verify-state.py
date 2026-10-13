"""Read-only verification; writes only this continuation's unique evidence files."""
from pathlib import Path
import json,hashlib,datetime,sys
ROOT=Path('/Users/juanmantilla/projects/personal'); PROJECT=ROOT/'md-reader'
OUT=Path(__file__).parent; OLD=PROJECT/'qa/runs/cleanup-auto-disposable-20261011T050112Z'
STATE=ROOT/'.agents/cleanup-state'; KEY='f9547099378e1a8aea7c80ddc29ff9ae6d34096d94d4c390b362bf7dc1bb76cb'; SID='01a12b0e-0a8d-75d2-a8cd-63beaffbd460'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False).encode()).hexdigest()
KEY=sys.argv[2] if len(sys.argv)>2 else KEY
label=sys.argv[1]; dest=OUT/(label+'.json');assert not dest.exists()
q=read(STATE/'queue'/(KEY+'.json')); run=STATE/'runs'/q['run_id']
hooks=[{'path':str(p),'outcome':read(p)} for p in (STATE/'hook-outcomes').glob('*.json') if read(p).get('session_id')==SID]
rollout=Path('/Users/juanmantilla/.codex/sessions/2026/10/11/rollout-2026-10-11T08-01-43-'+SID+'.jsonl');ids={h['outcome']['tool_use_id'] for h in hooks};execs=[]
for n,l in enumerate(rollout.open(),1):
 r=json.loads(l);it=r.get('payload',{}).get('item',{})
 if it.get('id') in ids:execs.append({'source':str(rollout),'line':n,'execution':it})
for h in hooks:
 e=[r['execution'] for r in execs if r['execution']['id']==h['outcome']['tool_use_id']]
 h['host_output_hash_match']=len(e)==1 and digest(e[0]['aggregated_output'])==h['outcome']['response_sha256']
 h['host_exit_code']=e[0]['exit_code'] if len(e)==1 else None
inv=read(OLD/'synthetic-inventory.json');live={}
for name,v in inv.items():
 p=PROJECT/name; live[str(p)]={'exists':p.exists(),'expected_sha256':v['sha256'],'actual_sha256':sha(p) if p.exists() else None}
original=read(OUT/'original-evidence-hashes.json'); original.update(read(OUT/'v2-evidence-hashes.json') if (OUT/'v2-evidence-hashes.json').exists() else {}); retained={p:Path(p).is_file() and sha(Path(p))==s for p,s in original.items()}
receipts=[]
for p in (run/'receipts').glob('*.json'):
 r=read(p);backup=Path(r['recovery_path']);receipts.append({'receipt':str(p),'receipt_sha256':sha(p),'body':r,'backup_exists':backup.is_file(),'backup_sha256':sha(backup) if backup.is_file() else None,'inventory_match':r['path'] in inv and sha(backup)==inv[r['path']]['sha256']})
stages={}
for phase in ['discover','review']:
 event=run/(phase+'-events.jsonl');process=run/(phase+'-process.json')
 if event.exists():
  events=[json.loads(l) for l in event.read_text().splitlines() if l.strip()]
  stages[phase]={'events_path':str(event),'sessions':[e['thread_id'] for e in events if e.get('type')=='thread.started'],'process':read(process) if process.exists() else None,'event_types':sorted(set(e.get('type','') for e in events))}
result={'observed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'queue':q,'queue_path':str(STATE/'queue'/(KEY+'.json')),'matching_job_count':sum(read(p).get('record_key')==KEY for p in (STATE/'queue').glob('*.json')),'run_directory':str(run),'hooks':hooks,'executions':execs,'synthetic_files':live,'original_evidence_unchanged':retained,'policy_unchanged':(ROOT/'.agents/cleanup-policy.json').read_bytes()==(OLD/'cleanup-policy.json.baseline').read_bytes(),'service_config_unchanged':(ROOT/'.agents/cleanup-service.json').read_bytes()==(OLD/'cleanup-service.json.baseline').read_bytes(),'stages':stages,'receipts':receipts,'run_files':sorted(str(p) for p in run.iterdir()),'report':read(run/'report.json') if (run/'report.json').exists() else None}
dest.write_text(json.dumps(result,indent=2));print(json.dumps({'evidence':str(dest),'state':q['state'],'stages':stages,'receipts':len(receipts),'all_original_evidence_unchanged':all(retained.values())},indent=2))
