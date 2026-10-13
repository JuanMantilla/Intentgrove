from pathlib import Path
import subprocess,json,datetime,os
out=Path(__file__).resolve().parent;root=out.parents[2];cwd=out/'diagnostic-candidate'
cmd=['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui','tests/ui/workspace-handoff.test.tsx','tests/ui/close-edit.test.tsx','--config',str(out/'current-prefix.config.mjs'),'--maxWorkers','1','--reporter=json','--outputFile='+str(out/'diagnostic-prefix.json')]
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (out/'diagnostic-prefix.txt').open('w') as f:
 f.write(json.dumps({'command':cmd,'cwd':str(cwd),'env':{'DEBUG_PRINT_LIMIT':'100000','GATE_TRACE':str(out/'diagnostic-prefix-trace.jsonl')},'started_at':start})+'\n');f.flush();p=subprocess.run(cmd,cwd=cwd,env={**os.environ,'DEBUG_PRINT_LIMIT':'100000','GATE_TRACE':str(out/'diagnostic-prefix-trace.jsonl')},stdout=f,stderr=subprocess.STDOUT)
(out/'diagnostic-prefix-command.json').write_text(json.dumps({'command':cmd,'cwd':str(cwd),'environment_overrides':{'DEBUG_PRINT_LIMIT':'100000','GATE_TRACE':str(out/'diagnostic-prefix-trace.jsonl')},'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode},indent=2));print('diagnostic-prefix',p.returncode)
