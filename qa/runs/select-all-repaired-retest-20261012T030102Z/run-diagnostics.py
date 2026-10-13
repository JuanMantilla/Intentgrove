from pathlib import Path
import subprocess,json,datetime,os
r=Path(__file__).resolve().parent
c=Path(json.loads((r/'run-context.json').read_text())['candidate_source'])
checks=[]
for i in range(1,4):
 checks.append((f'new-startup-isolated-{i:02}',['npm','test','--','--dir','tests','tests/ui/new-markdown.test.tsx','-t','retains the created tab on editor startup failure']))
 checks.append((f'adjacent-failures-isolated-{i:02}',['npm','test','--','--dir','tests','tests/ui/approved-navigation.test.tsx','tests/ui/edit-flow.test.tsx','tests/ui/automatic-refresh.test.tsx','-t','rejects an older failure|keeps the passage readable during section entry|retains the heading anchor']))
for name,cmd in checks:
 rec={'id':name,'command':cmd,'cwd':str(c),'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'load_before':os.getloadavg(),'original_config':True,'diagnostic_reason':'Repeat exact failed original cases without changing assertions, deadlines, promises, workers or source','log':str(r/'evidence/logs'/(name+'.log'))}
 with Path(rec['log']).open('w') as f:result=subprocess.run(cmd,cwd=c,stdout=f,stderr=subprocess.STDOUT)
 rec.update(exit_code=result.returncode,result='PASS' if result.returncode==0 else 'FAIL',finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),load_after=os.getloadavg())
 (r/'evidence/logs'/(name+'.json')).write_text(json.dumps(rec,indent=2)+'\n');print(name,rec['result'],flush=True)
