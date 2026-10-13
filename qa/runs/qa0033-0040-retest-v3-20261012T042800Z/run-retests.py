import subprocess,json,datetime,os,re
from pathlib import Path
run=Path(__file__).resolve().parent
cwd='/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0040-20261012T035255Z/candidate-source-v3'
at=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
rows=[]
filters=[('original-new','tests/ui/new-markdown.test.tsx','opens from empty workspace|deduplicates native menu|real App mock journey|preserves another dirty rendered draft'),('original-reader','tests/ui/appearance-operations.test.tsx','preserves the active tab and reader position'),('original-startup','tests/ui/new-markdown.test.tsx','retains the created tab on editor startup failure'),('original-repeated-open','tests/ui/approved-navigation.test.tsx','rejects an older failure'),('original-section-entry','tests/ui/edit-flow.test.tsx','keeps the passage readable during section entry'),('original-staged-paint','tests/ui/automatic-refresh.test.tsx','retains the heading anchor at margin')]
commands=[(f'{name}-{i:02d}',['npm','test','--','--dir','tests',file,'-t',pattern])for i in range(1,4)for name,file,pattern in filters]
commands+=[('adjacent-selection-find',['npm','test','--','--dir','tests','tests/ui/document-select-all.test.tsx','tests/ui/document-selection-readiness.test.tsx','tests/ui/find.test.tsx','tests/ui/appearance-operations.test.tsx'])]
commands += [(f'default-full-{i:02d}',['npm','test','--','--dir','tests'])for i in range(1,4)]
for name,cmd in commands:
 row={'id':name,'command':cmd,'cwd':cwd,'started_at':at(),'load_before':os.getloadavg()};log=run/'evidence/logs'/(name+'.log')
 with log.open('x')as f:p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
 body=log.read_text();row.update(exit_code=p.returncode,result='PASS'if p.returncode==0 else 'FAIL',finished_at=at(),load_after=os.getloadavg(),log=str(log),summary=[x for x in body.splitlines()if re.search(r'^\s*(Test Files|Tests |Duration)',x)],failures=re.findall(r'^ FAIL +(.+)',body,re.M))
 rows.append(row);(run/'evidence/attempt-summary.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
