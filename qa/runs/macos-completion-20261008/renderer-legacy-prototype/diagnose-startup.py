import subprocess,json,time,os,signal,hashlib,base64
from pathlib import Path
p=Path(__file__).parent; exe=p/'DiagramRenderer.app/Contents/MacOS/DiagramRenderer'; evidence=p.parent/'evidence'
Path('/private/tmp/intentgrove-diagram-probe-sentinel').write_text('disposable native sandbox sentinel')
def processes():
 return subprocess.check_output(['ps','-axo','pid,ppid,pgid,command'],text=True)
results=[]
for name,extra in [('native-sandbox',{'nativeProbe':True}),('webkit-execution',{'probe':True}),('valid-flowchart',{'source':'flowchart LR\n A[Start] --> B[End]'}),('executing-busy-deadline',{'busy':True})]:
 request={'version':1,'jobId':name,'token':'a'*64,'generation':1,**extra};before=processes();began=time.monotonic();child=subprocess.Popen([str(exe.resolve())],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 row={'case':name,'pid':child.pid,'request':request,'sourceHash':hashlib.sha256(exe.read_bytes()).hexdigest(),'beforeClock':began,'diagnosticTimeoutSeconds':10}
 try:
  out,err=child.communicate(json.dumps(request).encode(),timeout=10);row.update(elapsedSeconds=time.monotonic()-began,exitCode=child.returncode,stderr=err.decode(errors='replace'),output=json.loads(out) if out else None,terminatedAtDeadline=False)
  if row['output'] and row['output'].get('png'):
   img=base64.b64decode(row['output'].pop('png'));(evidence/(name+'.png')).write_bytes(img);row['output']['pngSha256']=hashlib.sha256(img).hexdigest();row['output']['pngBytes']=len(img)
 except subprocess.TimeoutExpired:
  row['watchdogClock']=time.monotonic();os.killpg(child.pid,signal.SIGKILL);out,err=child.communicate(timeout=3);row.update(elapsedSeconds=time.monotonic()-began,exitCode=child.returncode,stderr=err.decode(errors='replace'),output=out.decode(errors='replace'),terminatedAtDeadline=True)
 row['processesBefore']=before;row['processesAfter']=processes();results.append(row);(evidence/'renderer-prototype-results.json').write_text(json.dumps(results,indent=2));print(name,row['elapsedSeconds'],row.get('output'),flush=True)
