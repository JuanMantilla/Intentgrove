from pathlib import Path
import subprocess,json,datetime,os
out=Path(__file__).resolve().parent;root=out.parents[2];cwd=root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock/regression-candidate-final'
cmd=['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui','tests/ui/workspace-handoff.test.tsx','tests/ui/refresh-conflict.test.tsx','tests/ui/close-edit.test.tsx','--config',str(out/'historical-order.config.mjs'),'--maxWorkers','1','--reporter=json','--outputFile='+str(out/'predecessor-replay.json')]
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (out/'minimal-reproducer.txt').open('w') as f:
 f.write(json.dumps({'command':cmd,'cwd':str(cwd),'env':{'DEBUG_PRINT_LIMIT':'100000'},'started_at':start})+'\n');f.flush();p=subprocess.run(cmd,cwd=cwd,env={**os.environ,'DEBUG_PRINT_LIMIT':'100000'},stdout=f,stderr=subprocess.STDOUT)
(out/'predecessor-replay-command.json').write_text(json.dumps({'command':cmd,'cwd':str(cwd),'environment_overrides':{'DEBUG_PRINT_LIMIT':'100000'},'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode},indent=2));print('predecessor-replay',p.returncode)
