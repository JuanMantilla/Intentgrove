import json,hashlib,datetime,subprocess
from pathlib import Path
e=Path(__file__).resolve().parent; root=Path('/Users/juanmantilla/projects/personal/md-reader'); workspace=root.parent; prior_evidence=root/'qa/runs/cleanup-auto-disposable-20261011T050112Z'
def read(n):return json.loads((prior_evidence/n).read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(id,ok,reason):
 checks.append(dict(id=id,result='PASS' if ok else 'FAIL',reason=reason,finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),evidence_paths=[str((e/'checks.json').relative_to(root))]))
inv=read('synthetic-inventory.json'); inputs=read('reproducibility-inputs.json')
check('synthetic_bytes_result',2+3==5 and all(sha(root/n)==v['sha256'] and (root/n).read_text()==inputs[Path(n).name] for n,v in inv.items()),'Compared both exact file bytes and SHA-256 against preserved inputs/inventory; arithmetic 2+3=5.')
old=read('existing-intermediates.json')
check('future_exact_scope',all(n.startswith('cleanup-disposable/qa-intermediates/') and str(root/n) not in old for n in inv) and all(Path(n).is_file() and sha(Path(n))==v for n,v in old.items()),'New unique paths only; preexisting intermediate files retain baseline hashes.')
check('protected_reproducibility',all(not p.is_relative_to(root/'cleanup-disposable/qa-intermediates') for p in e.iterdir()) and bool(inputs),'All final evidence and reproducibility inputs live outside deletion folder in protected qa tree.')
service=subprocess.run(['launchctl','print','gui/501/com.juanmantilla.qa-cleanup'],capture_output=True,text=True)
(e/'launchd-check.txt').write_text(service.stdout+service.stderr)
p=json.loads((workspace/'.agents/cleanup-policy.json').read_text())
check('standing_policy_service',p['automatic_execution']['enabled'] and str(root) in p['automatic_execution']['task_roots'] and 'cleanup-disposable/qa-intermediates' in p['allowed_cleanup_roots'] and all((prior_evidence/(n+'.baseline')).read_bytes()==(workspace/'.agents'/n).read_bytes() for n in ['cleanup-policy.json','cleanup-service.json']) and service.returncode==0 and 'state = running' in service.stdout,'Approved policy/config bytes unchanged; launchd observed existing service running. No new worker started.')
(e/'checks.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
raise SystemExit(0 if all(c['result']=='PASS' for c in checks) else 1)
