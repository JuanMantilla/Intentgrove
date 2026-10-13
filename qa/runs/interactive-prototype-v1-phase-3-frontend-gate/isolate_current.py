from pathlib import Path
import subprocess,json,datetime,os,hashlib
out=Path(__file__).resolve().parent;root=out.parents[2];old=root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock';original=json.loads((old/'frontend-v3-result.json').read_text());cwd=out/'current-candidate';checks=[]
for name,extra in [('current-isolated-close',['tests/ui/close-edit.test.tsx']),('current-isolated-handoff',['tests/ui/workspace-handoff.test.tsx'])]:
 cmd=['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui',*extra,'--maxWorkers','1','--reporter=json','--outputFile='+str(out/(name+'.json'))]
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (out/(name+'.txt')).open('w') as f:
  f.write(json.dumps({'command':cmd,'cwd':str(cwd),'started_at':start})+'\n');f.flush();p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 check={'name':name,'command':cmd,'cwd':str(cwd),'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode};checks.append(check);(out/'current-isolated-commands.json').write_text(json.dumps(checks,indent=2));print(name,p.returncode,flush=True)
