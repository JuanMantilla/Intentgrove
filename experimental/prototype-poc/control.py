"""Small non-shipping agent API. No eval command; validates ZIP on prototype.open."""
from pathlib import Path
import subprocess,json,time,select
from package import load
P=Path(__file__).resolve().parent
class Prototype:
 def __init__(self):
  self.proc=subprocess.Popen([str(P/'native-player'),str(P/'player.js')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
  self.trace=[]
 def call(self,op,**args):
  started=time.perf_counter();q={'op':op,**args}
  if op=='prototype.open':q={'op':op,'package':load(args['path'])}
  self.proc.stdin.write(json.dumps(q)+'\n');self.proc.stdin.flush()
  if not select.select([self.proc.stdout],[],[],15)[0]:raise TimeoutError(op)
  line=self.proc.stdout.readline()
  if not line:raise RuntimeError(self.proc.stderr.read())
  r=json.loads(line);self.trace.append({'request':{'op':op,**args},'result':r,'elapsedMs':(time.perf_counter()-started)*1000})
  if isinstance(r,dict) and 'error' in r:raise RuntimeError(r)
  return r
 def close(self):
  if self.proc.poll() is None:self.call('quit');self.proc.stdin.close();self.proc.wait(timeout=10)
if __name__=='__main__':
 import sys
 p=Prototype()
 try:
  for line in sys.stdin:
   q=json.loads(line);op=q.pop('op');print(json.dumps(p.call(op,**q)),flush=True)
 finally:p.close()
