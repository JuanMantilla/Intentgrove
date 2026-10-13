from pathlib import Path
import subprocess,sys,json,datetime,os
base=Path(__file__).resolve().parent
name=sys.argv[1];command=sys.argv[2:];cwd=base/'candidate-source-final'
record={'command':command,'cwd':str(cwd),'started_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'load_before':os.getloadavg()}
with (base/(name+'.log')).open('w') as log:result=subprocess.run(command,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
record.update(exit_code=result.returncode,finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),load_after=os.getloadavg())
(base/(name+'.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));sys.exit(result.returncode)
