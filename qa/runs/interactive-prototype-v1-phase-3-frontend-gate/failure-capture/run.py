from pathlib import Path
import subprocess, json, datetime, sys, shutil, csv, os, hashlib
out=Path(__file__).resolve().parent; root=out.parents[3]
variant,name=sys.argv[1:3]; candidate=out/('candidate-'+variant)
cache=candidate/'node_modules/.vite'
if len(sys.argv)>3 and sys.argv[3]=='fresh':
    if cache.exists(): cache.rename(out/(name+'-cache-removed'))
if cache.exists(): shutil.copytree(cache,out/(name+'-cache-before'))
cmd=['node',str(root/'node_modules/vitest/vitest.mjs'),'run','--dir','tests/ui','--maxWorkers','1','--reporter=json','--outputFile='+str(out/(name+'.json'))]
if len(sys.argv)>3 and sys.argv[3].endswith('.mjs'): cmd += ['--config',sys.argv[3]]
record={'name':name,'variant':variant,'cwd':str(candidate),'command':cmd,'environment_overrides':{},'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
record['input_sha256']={str(p.relative_to(candidate)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','tests'] for p in (candidate/folder).rglob('*') if p.is_file()}
if (candidate/'qa-recorder.ts').exists(): record['input_sha256']['qa-recorder.ts']=hashlib.sha256((candidate/'qa-recorder.ts').read_bytes()).hexdigest()
(out/(name+'-command.json')).write_text(json.dumps(record,indent=2))
with (out/(name+'.log')).open('w') as log: p=subprocess.run(cmd,cwd=candidate,stdout=log,stderr=subprocess.STDOUT)
record.update(exit_code=p.returncode,finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
if (out/(name+'.json')).exists():
    j=json.loads((out/(name+'.json')).read_text())
    record.update(passed=j['numPassedTests'],failed=j['numFailedTests'],total=j['numTotalTests'])
    order=[{'file':str(Path(x['name']).relative_to(candidate)),'startTime':x['startTime'],'endTime':x['endTime'],'status':x['status']} for x in sorted(j['testResults'],key=lambda x:x['startTime'])]
    (out/(name+'-order.json')).write_text(json.dumps(order,indent=2))
if cache.exists(): shutil.copytree(cache,out/(name+'-cache-after'))
(out/(name+'-command.json')).write_text(json.dumps(record,indent=2))
print(json.dumps({k:v for k,v in record.items() if k!='input_sha256'}),flush=True)
