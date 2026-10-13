import subprocess,json,sys,os,time,datetime,platform
from pathlib import Path
out=Path(__file__).parent
cwd=Path('/Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source')
name=sys.argv[1]; args=sys.argv[2:]; cmd=['npm','test','--','--dir','tests',*args]
start=datetime.datetime.now(datetime.timezone.utc).isoformat(); t=time.monotonic()
with (out/'evidence'/f'{name}.log').open('w') as f:
 p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
record={'id':name,'cwd':str(cwd),'command':cmd,'exit_code':p.returncode,'started_at':start,'finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.monotonic()-t,'load_after':os.getloadavg(),'platform':platform.platform(),'log':str(out/'evidence'/f'{name}.log')}
(out/'evidence'/f'{name}.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))
print(''.join((out/'evidence'/f'{name}.log').read_text().splitlines(True)[-9:]))
sys.exit(p.returncode)
