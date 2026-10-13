from pathlib import Path
import subprocess,json,datetime,os,hashlib
out=Path(__file__).resolve().parent;root=out.parents[2];old=root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock';original=json.loads((old/'frontend-v3-result.json').read_text());cwd=Path(original['cwd']);checks=[]
(out/'environment.json').write_text(json.dumps({'node':subprocess.getoutput('node --version'),'vitest':json.loads((root/'node_modules/vitest/package.json').read_text())['version'],'env':{k:os.environ.get(k) for k in ['NODE_ENV','NODE_OPTIONS','CI','TZ','VITEST','VITE_CONFIG_NATIVE_IGNORE_WARNING','PATH']},'original_command':original},indent=2))
for name,extra in [('full-suite-before',[]),('isolated-suite',['tests/ui/close-edit.test.tsx']),('full-suite-before-2',[])]:
 cmd=['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui',*extra,'--maxWorkers','1','--reporter=json','--outputFile='+str(out/(name+'.json'))]
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (out/(name+'.txt')).open('w') as f:
  f.write(json.dumps({'command':cmd,'cwd':str(cwd),'started_at':start})+'\n');f.flush();p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 check={'name':name,'command':cmd,'cwd':str(cwd),'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode};checks.append(check);(out/'reproduction-commands.json').write_text(json.dumps(checks,indent=2));print(name,p.returncode,flush=True)
