from pathlib import Path
import subprocess,json,datetime,os
r=Path(__file__).resolve().parent
c=Path(json.loads((r/'run-context.json').read_text())['candidate_source'])
cases=[]
for i in range(1,4):
 cases += [(f'original-new-isolated-{i:02}', ['npm','test','--','--dir','tests','tests/ui/new-markdown.test.tsx','-t','opens from empty workspace|deduplicates native menu|real App mock journey|preserves another dirty rendered draft']), (f'original-reader-isolated-{i:02}', ['npm','test','--','--dir','tests','tests/ui/appearance-operations.test.tsx','-t','preserves the active tab and reader position'])]
cases += [('selection-focused',['npm','test','--','--dir','tests','tests/ui/document-select-all.test.tsx']), ('affected-original-files',['npm','test','--','--dir','tests','tests/ui/new-markdown.test.tsx','tests/ui/appearance-operations.test.tsx'])]
cases += [(f'default-full-{i:02}',['npm','test','--','--dir','tests']) for i in range(1,4)]
for name,cmd in cases:
 rec={'id':name,'command':cmd,'cwd':str(c),'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'load_before':os.getloadavg(),'original_config':True,'log':str(r/'evidence/logs'/(name+'.log'))}
 print('START',name,flush=True)
 with Path(rec['log']).open('w') as f: result=subprocess.run(cmd,cwd=c,stdout=f,stderr=subprocess.STDOUT)
 rec.update(exit_code=result.returncode,result='PASS' if result.returncode==0 else 'FAIL',finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),load_after=os.getloadavg())
 (r/'evidence/logs'/(name+'.json')).write_text(json.dumps(rec,indent=2)+'\n')
 print('FINISH',name,rec['result'],flush=True)
