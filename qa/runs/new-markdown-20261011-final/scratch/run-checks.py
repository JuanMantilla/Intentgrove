from pathlib import Path
import subprocess,datetime,json
r=Path('/Users/juanmantilla/projects/personal/md-reader'); q=r/'qa/runs/new-markdown-20261011-final'; outcomes=[]
commands=[('frontend-focused',['npm','test','--','tests/ui/new-markdown.test.tsx','tests/ui/close-edit.test.tsx','tests/ui/recovery.test.tsx','tests/ui/refresh-conflict.test.tsx','tests/ui/edit-flow.test.tsx'],r),('types',['node_modules/.bin/tsc','--noEmit'],r),('frontend-build',['node_modules/.bin/vite','build','--outDir',str(q/'scratch/dist')],r),('native-lib',['cargo','test','--offline','--locked','--lib'],r/'src-tauri'),('native-version',['cargo','test','--offline','--locked','--test','refresh_version'],r/'src-tauri'),('native-build',['npm','run','tauri','--','build','--debug','--no-bundle','--config',str(q/'scratch/native-config.json'),'--','--offline','--locked'],r)]
for name,cmd,cwd in commands:
 with (q/('evidence/'+name+'.log')).open('w') as f:
  f.write('COMMAND '+repr(cmd)+' CWD '+str(cwd)+'\n');f.flush(); result=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 outcomes.append({'id':name,'command':cmd,'cwd':str(cwd),'exit':result.returncode,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat()})
 (q/'evidence/checks.json').write_text(json.dumps(outcomes,indent=2))
 print(name,result.returncode,flush=True)
