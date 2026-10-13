import subprocess,json,time,os,signal,hashlib,base64,select
from pathlib import Path
p=Path(__file__).parent;exe=p/'DiagramRenderer.app/Contents/MacOS/DiagramRenderer';e=p.parent/'evidence';results=[]
cases=[('execution',{'probe':True},'probe'),('native-denial',{'nativeProbe':True},'native'),('resources',{'resources':True},'resources'),('flowchart',{'source':'flowchart LR\n A[Start] --> B[End]'},'image'),('sequence',{'source':'sequenceDiagram\n Alice->>Bob: Hello\n Bob-->>Alice: Ready'},'image'),('malformed',{'source':'flowchart LR\n A --> ['},'error'),('directive',{'source':'%%{init: {securityLevel: "loose"}}%%\nflowchart LR\nA-->B'},'error'),('html',{'source':'flowchart LR\nA["<img src=x onerror=alert(1)>"]'},'error'),('link',{'source':'flowchart LR\nA-->B\nclick A "file:///etc/passwd"'},'error'),('configuration',{'source':'---\nconfig: {}\n---\nflowchart LR\nA-->B'},'error'),('oversized-source',{'source':'flowchart LR\n'+ 'A'*32768},'error'),('nodes257',{'source':'flowchart LR\n'+'\n'.join('N'+str(i) for i in range(257))},'error'),('edges513',{'source':'flowchart LR\n'+'\n'.join('A-->B' for i in range(513))},'error'),('expensive-label-deadline',{'source':'flowchart LR\nA["'+ 'wide '*800+'"]'},'timeout'),('native-pixels',{'outputProbe':{'width':2049,'height':1}},'error'),('native-svg-limit',{'oversizedSvg':True},'error'),('svg-script',{'outputProbe':{'width':24,'height':16,'svg':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><script>alert(1)</script></svg>'}},'error'),('svg-resource',{'outputProbe':{'width':24,'height':16,'svg':'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="16"><image href="file:///etc/passwd"/></svg>'}},'error')]+[('forge-'+key,{'forge':key},'timeout') for key in ['token','generation','sourceDigest','jobId']]+[('busy-deadline',{'busy':True},'busy'),('busy-cancel',{'busy':True},'cancel'),('busy-completion-diagnostic',{'busy':True},'diagnostic')]
for name,extra,expected in cases:
 baselineWebkit=subprocess.check_output(['pgrep','-f','/com.apple.WebKit.'],text=True).split() if subprocess.run(['pgrep','-f','/com.apple.WebKit.'],capture_output=True).returncode==0 else []
 req={'version':1,'jobId':name,'token':'a'*64,'generation':1,'sourceDigest':hashlib.sha256(extra.get('source','').encode()).hexdigest(),**extra};began=time.monotonic();child=subprocess.Popen([str(exe.resolve())],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True);stderr=b'';child.stdin.write(json.dumps(req).encode());child.stdin.close();child.stdin=None;ticks=[];during=[];deadline=7 if expected=='diagnostic' else 2;entered=False;cancel=False
 while child.poll() is None and time.monotonic()-began<deadline:
  ticks.append(time.monotonic())
  ready,_,_=select.select([child.stderr],[],[],0.01)
  if ready:
   data=os.read(child.stderr.fileno(),4096);stderr+=data
   if b'javascript-alert busy-entered' in stderr:
    if not entered:during=subprocess.check_output(['ps','-axo','pid,ppid,pgid,comm'],text=True).splitlines()
    entered=True
    if expected=='cancel':cancel=True;break
 killed=child.poll() is None
 if killed:os.killpg(child.pid,signal.SIGKILL)
 out,rest=child.communicate(timeout=2);stderr+=rest;elapsed=time.monotonic()-began
 try:
  header,_,pixels=out.partition(b'\n');value=json.loads(header) if header else None
  if value and pixels:
   assert len(pixels)==value['byteLength']<=4194304
   (e/('legacy-proof-'+name+'.png')).write_bytes(pixels);value.update(pngBytes=len(pixels),pngSha256=hashlib.sha256(pixels).hexdigest())
 except Exception:value={'invalidOutput':True}
 if value and value.get('png'):
  img=base64.b64decode(value.pop('png'));(e/('legacy-proof-'+name+'.png')).write_bytes(img);value.update(pngBytes=len(img),pngSha256=hashlib.sha256(img).hexdigest())
 okay=(expected=='probe' and value and value.get('probe') and not value.get('handlers') and not value.get('tauri')) or (expected=='native' and value and value.get('fileErrno')==1 and value.get('networkErrno')==1) or (expected=='resources' and value and all(v=='denied' for v in value.get('resources',{}).values()) and value.get('parentSelf') and value.get('opener') and value.get('nativeObjects')==['undefined']*4) or (expected=='image' and value and value.get('pngBytes',0)>1000 and 0<value['width']<=2048 and 0<value['height']<=2048) or (expected=='error' and value and value.get('error')) or (expected=='timeout' and killed and value is None) or (expected=='busy' and entered and killed and elapsed<2.15 and value is None) or (expected=='cancel' and entered and cancel and killed and elapsed<1 and value is None) or (expected=='diagnostic' and entered and not killed and value and value.get('error')=='busy completed' and elapsed>=5)
 try:os.kill(child.pid,0);gone=False
 except ProcessLookupError:gone=True
 ps=subprocess.check_output(['ps','-axo','pid,ppid,pgid,command'],text=True);descendants=[line for line in ps.splitlines() if len(line.split())>2 and (line.split()[1]==str(child.pid) or line.split()[2]==str(child.pid))]
 row={'case':name,'expected':expected,'status':'PASS' if okay and gone and not descendants else 'FAIL','elapsedSeconds':elapsed,'parentMaxPollingGapSeconds':max([b-a for a,b in zip(ticks,ticks[1:])],default=0),'webkitPidsBefore':baselineWebkit,'processesAtBusyEntry':during,'enteredBusy':entered,'killed':killed,'pid':child.pid,'processGone':gone,'remainingDescendants':descendants,'exitCode':child.returncode,'output':value,'stderr':stderr.decode(errors='replace'),'request':req,'exeSha256':hashlib.sha256(exe.read_bytes()).hexdigest()};results.append(row);(e/'renderer-legacy-proof-attempt-04.json').write_text(json.dumps(results,indent=2));print(name,row['status'],round(elapsed,3),value,flush=True)
