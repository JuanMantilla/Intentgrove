"""Read-only supported hooks/list; never starts a thread or invokes a hook."""
import json, os, select, subprocess, time
from pathlib import Path
base=Path(__file__).parent
exe=str(Path('/Users/juanmantilla/.local/bin/codex').resolve())
argv=[exe,'--no-daemon','--disable','plugins','--disable','apps','-c','mcp_servers={}','app-server','--stdio']
p=subprocess.Popen(argv,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    env={'PATH':'/usr/bin:/bin','HOME':'/Users/juanmantilla','CODEX_HOME':'/Users/juanmantilla/.codex'},
    cwd='/Users/juanmantilla/projects/personal',start_new_session=True)
requests=[];responses=[];buffer=b''
def request(i,method,params):
 global buffer
 msg={'id':i,'method':method,'params':params};requests.append(msg)
 p.stdin.write((json.dumps(msg)+'\n').encode());p.stdin.flush()
 end=time.monotonic()+15
 while time.monotonic()<end:
  if b'\n' not in buffer:
   if not select.select([p.stdout],[],[],0.2)[0]:continue
   part=os.read(p.stdout.fileno(),65536)
   if not part:break
   buffer+=part;continue
  line,buffer=buffer.split(b'\n',1);event=json.loads(line);responses.append(event)
  if event.get('id')==i:return event
 raise RuntimeError('read-only API timeout')
try:
 request(1,'initialize',{'clientInfo':{'name':'cleanup-hook-inspection','version':'1'},'capabilities':{'experimentalApi':True}})
 result=request(2,'hooks/list',{'cwds':['/Users/juanmantilla/projects/personal']})
 print(json.dumps(result,indent=2))
finally:
 p.terminate()
 try:out,err=p.communicate(timeout=5)
 except subprocess.TimeoutExpired:p.kill();out,err=p.communicate()
 (base/'hook-api.json').write_text(json.dumps({'argv':argv,'requests':requests,'responses':responses,'returncode':p.returncode,'thread_created':False},indent=2))
 (base/'hook-api-stderr.txt').write_bytes(err)
