"""Controlled current-source experiment. Monitor only descendants of task-owned test/compiler roots."""
import argparse,json,os,subprocess,time,threading,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[3];os.chdir(root)
p=argparse.ArgumentParser();p.add_argument('label');p.add_argument('--workers',default='2');p.add_argument('--full',action='store_true');p.add_argument('--compile',action='store_true');args=p.parse_args()
out=root/'qa/runs/macos-remaining-20261008/reliability/session-20261008';log=out/(args.label+'.log');assert not log.exists(),'preserve attempts'
subprocess.run(['python3','tests/diagnostics/reliability/generate.py'],check=True)
shutil.copytree(root/'tests/diagnostics/reliability/generated',out/(args.label+'-sources'));shutil.copy2(root/'tests/diagnostics/reliability/trace.ts',out/(args.label+'-sources')/'trace.ts')
env=dict(os.environ,INTENTGROVE_TRACE=str(out/args.label),INTENTGROVE_WORKERS=args.workers,INTENTGROVE_FULL='1'if args.full else '0')
command=['node_modules/.bin/vitest','run','--config','tests/diagnostics/reliability/vitest.config.ts'];compiler=None
if args.compile:
 compile_log=(out/(args.label+'-compiler.log')).open('xb');compiler=subprocess.Popen(['cargo','check','--lib','--manifest-path','src-tauri/Cargo.toml','--locked','--offline','--jobs','2'],env=dict(os.environ,CARGO_TARGET_DIR=str(root/'target'/('reliability-'+args.label))),stdout=compile_log,stderr=subprocess.STDOUT)
with log.open('xb')as output:process=subprocess.Popen(command,env=env,stdout=output,stderr=subprocess.STDOUT)
start=time.monotonic();samples=[]
while process.poll()is None:
 rows=[]
 for line in subprocess.check_output(['/bin/ps','-axo','pid=,ppid=,%cpu=,rss=,stat=,comm='],text=True).splitlines():
  f=line.strip().split(None,5)
  if len(f)==6:rows.append({'pid':int(f[0]),'ppid':int(f[1]),'cpuPercent':float(f[2]),'rssKiB':int(f[3]),'stat':f[4],'command':f[5]})
 owned={process.pid}|({compiler.pid}if compiler else set())
 for _ in range(8):owned.update(r['pid']for r in rows if r['ppid']in owned)
 samples.append({'ms':(time.monotonic()-start)*1000,'processes':[r for r in rows if r['pid']in owned]});time.sleep(.1)
frontend_elapsed=time.monotonic()-start;compiler_active=compiler is not None and compiler.poll()is None
# Keep the controlled compiler observation honest; bounded native build is permitted and waited, not killed by name.
compiler_code=compiler.wait(timeout=600)if compiler else None
result={'command':command,'environment':{k:v for k,v in env.items()if k.startswith('INTENTGROVE_')},'testPID':process.pid,'testExit':process.returncode,'frontendSeconds':frontend_elapsed,'compilerCommand':['cargo','check','--lib','--manifest-path','src-tauri/Cargo.toml','--locked','--offline','--jobs','2']if compiler else None,'compilerPID':compiler.pid if compiler else None,'compilerActiveAtFrontendCompletion':compiler_active,'compilerExit':compiler_code,'elapsedSeconds':time.monotonic()-start,'processSamples':samples}
(out/(args.label+'-processes.json')).write_text(json.dumps(result,indent=2)+'\n');print({k:v for k,v in result.items()if k!='processSamples'});raise SystemExit(process.returncode)
