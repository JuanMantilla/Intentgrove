from pathlib import Path
import subprocess,json,datetime,os,concurrent.futures
out=Path(__file__).resolve().parent;root=out.parents[2];candidate=out/'current-candidate'
def run(name,args,cwd=root,env=None):
 name=name+'-current'
 start=datetime.datetime.now(datetime.timezone.utc).isoformat()
 with (out/(name+'.log')).open('w') as f:
  p=subprocess.run(args,cwd=cwd,env={**os.environ,**(env or {})},stdout=f,stderr=subprocess.STDOUT)
 result=dict(name=name,command=args,cwd=str(cwd),environment_overrides=env or {},started_at=start,finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),exit_code=p.returncode,log=name+'.log',tested_snapshot='tested-snapshot-current.json')
 (out/(name+'-result.json')).write_text(json.dumps(result,indent=2));print(name,p.returncode,flush=True)
 return result

def native():
 return [run('ipc-contract',['cargo','test','--manifest-path','src-tauri/Cargo.toml','--offline','--locked','--features','settings-contract-tests','--lib','command_args::tests']),run('native-clippy-final',['cargo','clippy','--manifest-path','src-tauri/Cargo.toml','--offline','--locked','--lib','--tests','--message-format=json','--','-D','warnings']),run('native-tests',['cargo','test','--manifest-path','src-tauri/Cargo.toml','--offline','--locked','--features','document-contract-tests','--lib','--tests']),run('native-check',['cargo','check','--manifest-path','src-tauri/Cargo.toml','--offline','--locked'])]
def frontend():
 return [run('frontend',['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui','--maxWorkers','1','--reporter=json','--outputFile='+str(out/'full-suite-after.json')],candidate),run('types',['node',str(root/'node_modules/typescript/bin/tsc'),'--noEmit'],candidate),run('vite',['node',str(root/'node_modules/vite/bin/vite.js'),'build','--outDir',str(out/'frontend-build-current')],candidate)]
def crates():
 env={'CARGO_TARGET_DIR':str(root/'crates/target')}
 return [run('phase12',['cargo','test','--manifest-path','crates/Cargo.toml','--offline','--locked','--workspace'],candidate,env),run('crate-clippy',['cargo','clippy','--manifest-path','crates/Cargo.toml','--offline','--locked','--workspace','--all-targets','--','-D','warnings'],candidate,env),run('crate-format',['cargo','fmt','--manifest-path','crates/Cargo.toml','--all','--','--check'],candidate)]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 futures=[pool.submit(f) for f in [native,frontend,crates]]
 results=[r for f in futures for r in f.result()]
results += [run('app-boundaries',['python3',str(out/'audit_boundaries.py')]),run('crate-boundaries',['python3','crates/check_boundaries.py']),run('maintenance-format',['python3',str(root/'qa/runs/strict-clippy-baseline-cleanup/format_scope.py'),'--check'])]
(out/'check-results-current.json').write_text(json.dumps(results,indent=2))
