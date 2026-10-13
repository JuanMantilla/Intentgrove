from pathlib import Path
import subprocess,json,datetime,os,concurrent.futures
out=Path(__file__).resolve().parent;root=out.parents[2]
def run(name,cmd,cwd,env={}):
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (out/(name+'.txt')).open('w') as f:
  f.write(json.dumps({'command':cmd,'cwd':str(cwd),'environment_overrides':env,'started_at':start})+'\n');f.flush();p=subprocess.run(cmd,cwd=cwd,env={**os.environ,**env},stdout=f,stderr=subprocess.STDOUT)
 d={'command':cmd,'cwd':str(cwd),'environment_overrides':env,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'exit_code':p.returncode};(out/(name+'-command.json')).write_text(json.dumps(d,indent=2));print(name,p.returncode,flush=True)
def frontend():
 run('diagnostic-overlap',['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui','tests/ui/close-edit.test.tsx','tests/ui/workspace-handoff.test.tsx','--config',str(out/'current-prefix.config.mjs'),'--maxWorkers','1','--reporter=json','--outputFile='+str(out/'diagnostic-overlap.json')],out/'diagnostic-candidate',{'GATE_TRACE':str(out/'diagnostic-overlap-trace.jsonl'),'DEBUG_PRINT_LIMIT':'100000'})
def native():
 run('overlap-ipc',['cargo','test','--manifest-path','src-tauri/Cargo.toml','--offline','--locked','--features','settings-contract-tests','--lib','command_args::tests'],root)
 run('overlap-clippy',['cargo','clippy','--manifest-path','src-tauri/Cargo.toml','--offline','--locked','--lib','--tests','--message-format=json','--','-D','warnings'],root)
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 futures=[pool.submit(f)for f in [frontend,native]]
 for f in futures:f.result()
