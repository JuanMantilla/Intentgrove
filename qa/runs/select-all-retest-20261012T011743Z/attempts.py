from pathlib import Path
import subprocess,datetime,json,os,time
r=Path(__file__).parent
root=r.parents[2]
commands=[
('isolated-reader-01',['npm','test','--','--dir','tests','tests/ui/appearance-operations.test.tsx','-t','preserves the active tab and reader position']),
('isolated-new-01',['npm','test','--','--dir','tests','tests/ui/new-markdown.test.tsx','-t','opens from empty workspace and Projects']),
('full-suite-01',['npm','test','--','--dir','tests']),
('isolated-reader-02',['npm','test','--','--dir','tests','tests/ui/appearance-operations.test.tsx','-t','preserves the active tab and reader position']),
('isolated-new-02',['npm','test','--','--dir','tests','tests/ui/new-markdown.test.tsx','-t','opens from empty workspace and Projects']),
('affected-files-01',['npm','test','--','--dir','tests','tests/ui/appearance-operations.test.tsx','tests/ui/new-markdown.test.tsx']),
('full-suite-02',['npm','test','--','--dir','tests']),
('full-suite-serial-diagnostic',['npm','test','--','--dir','tests','--maxWorkers','1']),
]
for name,cmd in commands:
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 env={'load':os.getloadavg(),'observedProcesses':subprocess.check_output(['ps','-Ao','pid,ppid,%cpu,%mem,comm'],text=True)}
 (r/'evidence'/f'{name}-environment.json').write_text(json.dumps(env,indent=2))
 with (r/'evidence'/f'{name}.log').open('w') as f:p=subprocess.run(cmd,cwd=root,stdout=f,stderr=subprocess.STDOUT)
 record={'id':name,'command':cmd,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode,'log':str(r/'evidence'/f'{name}.log'),'load_after':os.getloadavg()}
 with (r/'evidence/test-attempts.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
 print(json.dumps(record),flush=True)
 print((r/'evidence'/f'{name}.log').read_text()[-1100:],flush=True)
