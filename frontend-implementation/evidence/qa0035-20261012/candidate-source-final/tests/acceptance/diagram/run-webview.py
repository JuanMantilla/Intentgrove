"""Authenticated, bounded automatic run with no workspace/profile access or general command injection."""
import threading
import os,json,socket,secrets,subprocess,tempfile,hashlib,ctypes,struct,time
from pathlib import Path
root=Path(__file__).resolve().parents[3];os.chdir(root)
out=root/'qa/runs/macos-remaining-20261008/mermaid-acceptance'
app=root/'target/qa-native/release/bundle/macos/Intentgrove QA.app'
prod=root/'src-tauri/target/release/bundle/macos/Intentgrove.app'
for folder in ['XPCServices','Helpers']:
 subprocess.run(['ditto',str(prod/'Contents'/folder),str(app/'Contents'/folder)],check=True)
subprocess.run(['ditto',str(root/'src-tauri/target/diagram-diagnostic/DiagramRenderer.app'),str(app/'Contents/Helpers/DiagramDiagnostic.app')],check=True)
subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
exe=app/'Contents/MacOS/md_reader'
run=Path(tempfile.mkdtemp(prefix='intentgrove-diagram-',dir='/private/tmp'));run.chmod(0o700)
documents=run/'documents';documents.mkdir()
cases=json.loads((root/'tests/acceptance/diagram/cases.json').read_text())
for i,source in enumerate(cases):
 metadata=['---\ntitle: Disposable\n---\n','---\ninvalid: [\n---\n','---\nx: !!js/function forbidden\n---\n','---\na: &a [*a]\n---\n'][i%4]
 (documents/f'document-{i:02}.md').write_text(metadata+f'# Before {i}\n\nReadable before\n\n```mermaid\n{source}\n```\n\n# After {i}\n\nReadable after\n\n```mermaid\nflowchart LR\nSafe-->Sibling\n```\n\n```javascript\nwindow.__hostileExecuted=true; fetch("https://127.0.0.1:9/code")\n```\n\n<script>window.__hostileExecuted=true</script>\n\n![remote](https://127.0.0.1:9/image)\n\n![svg](file:///private/tmp/blocked.svg)')
before={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in documents.iterdir()}
path=run/'control.sock';read_fd,write_fd=os.pipe();token=secrets.token_hex(32);runid=secrets.token_hex(16)
with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM) as server:
 server.bind(str(path));path.chmod(0o600);server.listen(1);server.settimeout(20)
 with (run/'host.log').open('wb') as log:process=subprocess.Popen([str(exe)],env=dict(os.environ,F002A_BOOTSTRAP_FD=str(read_fd),INTENTGROVE_DIAG_FIXTURES=str(documents),INTENTGROVE_DIAG_FILE=str(out/'disposable-readable-file')),pass_fds=(read_fd,),stdout=log,stderr=log)
 os.close(read_fd)
 with os.fdopen(write_fd,'wb') as pipe:pipe.write(json.dumps({'socket':str(path),'token':token,'run':runid,'fault':'diagram-acceptance'}).encode())
 (out/'webview-run.json').write_text(json.dumps({'directory':str(run),'pid':process.pid,'executable':str(exe),'sha256':hashlib.sha256(exe.read_bytes()).hexdigest(),'buildClass':'authenticated instrumented QA; production helper and XPC copied unchanged'},indent=2))
 stop=threading.Event();ownership=[]
 def monitor():
  while not stop.is_set():
   rows=[]
   for line in subprocess.check_output(['/bin/ps','-axo','pid=,ppid=,comm='],text=True).splitlines():
    fields=line.strip().split(None,2)
    if len(fields)==3:rows.append({'pid':int(fields[0]),'ppid':int(fields[1]),'command':fields[2]})
   owned={process.pid}
   for _ in range(6):owned.update(x['pid'] for x in rows if x['ppid'] in owned)
   ownership.append({'at':time.monotonic(),'processes':[x for x in rows if x['pid'] in owned]})
   stop.wait(.04)
 watcher=threading.Thread(target=monitor);watcher.start()
 connection,_=server.accept();assert struct.unpack('i',connection.getsockopt(0,2,4))[0]==process.pid
 connection.settimeout(5);reader=connection.makefile('rb');sequence=0;start=time.monotonic()
 with (run/'protocol.jsonl').open('w') as trace:
  while process.poll() is None:
   if time.monotonic()-start>180:raise TimeoutError('bounded WebView run did not finish; owned process preserved for diagnosis')
   sequence+=1;connection.sendall((json.dumps({'schema':1,'token':token,'run':runid,'sequence':sequence,'command':'snapshot'})+'\n').encode())
   try:
    line=reader.readline();
    if not line:break
    trace.write(line.decode());trace.flush()
   except (socket.timeout,ConnectionResetError):break
   time.sleep(.25)
 code=process.wait(timeout=10);stop.set();watcher.join();(out/'process-ownership.json').write_text(json.dumps(ownership,indent=2))
text=(run/'host.log').read_text();marker='INTENTGROVE_DIAGRAM_ACCEPTANCE:'
if marker in text:
 result=json.loads(text.split(marker)[-1].splitlines()[0]);(out/'webview-results.json').write_text(json.dumps(result,indent=2));print('passed',result['passed'],'records',len(result['records']),'failure',result['failure'])
else:print(text[-5000:])
after={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in documents.iterdir()};assert before==after;
(out/'document-hashes.json').write_text(json.dumps({'before':before,'after':after,'unchanged':before==after,'directory':str(documents)},indent=2))
print('exit',code,'evidence',run)
raise SystemExit(0 if code==0 and result["passed"] else 1)
