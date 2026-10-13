import subprocess,time,json,pathlib
out=pathlib.Path(__file__).parent;seen={};samples={};start=time.monotonic()
with (out/'executing-helper-processes.jsonl').open('w') as log:
 while time.monotonic()-start<25:
  ps=subprocess.check_output(['ps','-axo','pid=,ppid=,command='],text=True); live={}
  for line in ps.splitlines():
   row=line.strip().split(None,2)
   if len(row)==3 and row[1]=='7405' and '/DiagramRenderer.app/Contents/MacOS/DiagramRenderer' in row[2]:live[int(row[0])]=row[2]
  for pid,command in live.items():
   if pid not in seen:
    seen[pid]=True; log.write(json.dumps({'kind':'start','pid':pid,'ppid':7405,'command':command,'wall':time.time(),'mono':time.monotonic()})+'\n');log.flush()
    samples[pid]=subprocess.Popen(['/usr/bin/sample',str(pid),'1','1','-file',str(out/('executing-helper-'+str(pid)+'.sample'))],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  for pid in list(seen):
   if seen[pid] and pid not in live:seen[pid]=False;log.write(json.dumps({'kind':'exited','pid':pid,'wall':time.time(),'mono':time.monotonic()})+'\n');log.flush()
  time.sleep(.02)
for p in samples.values():p.wait()
