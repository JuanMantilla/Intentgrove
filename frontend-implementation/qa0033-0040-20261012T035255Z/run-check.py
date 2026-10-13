import sys,subprocess,json,os,datetime
from pathlib import Path
o=Path(__file__).resolve().parent
name=sys.argv[1];cmd=sys.argv[2:];cwd=os.environ.get("QA_CWD",str(o.parent.parent))
at=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
row={"id":name,"command":cmd,"cwd":cwd,"started_at":at(),"load_before":os.getloadavg()}
log=o/"evidence/logs"/(name+".log")
with log.open("x") as f:p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT)
row.update(exit_code=p.returncode,finished_at=at(),load_after=os.getloadavg(),log=str(log));(o/"evidence"/(name+".json")).write_text(json.dumps(row,indent=2));print(json.dumps(row));print(log.read_text()[-3500:])
