"""Launch the exact opt-in Settings QA package using the existing authenticated diagnostic reporting transport."""
from pathlib import Path
import os,json,socket,secrets,subprocess,tempfile,hashlib,struct,time,shutil,argparse
root=Path(__file__).resolve().parents[3];os.chdir(root)
p=argparse.ArgumentParser();p.add_argument('label');args=p.parse_args();out=root/'qa/runs/macos-remaining-20261008/reliability/session-20261008'/args.label;out.mkdir(exist_ok=False)
app=root/'target/qa-native/release/bundle/macos/Intentgrove QA.app';exe=app/'Contents/MacOS/md_reader'
assert str(exe)not in subprocess.check_output(['ps','-axo','comm='],text=True).splitlines(),'leave existing QA session intact'
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
run=Path(tempfile.mkdtemp(prefix='intentgrove-settings-',dir='/private/tmp'));run.chmod(0o700);path=run/'control.sock';token=secrets.token_hex(32);runid=secrets.token_hex(16)
with socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)as server:
 server.bind(str(path));path.chmod(0o600);server.listen(1);server.settimeout(20);rd,wr=os.pipe()
 with (run/'host.log').open('xb')as log:process=subprocess.Popen([str(exe)],env=dict(os.environ,F002A_BOOTSTRAP_FD=str(rd)),pass_fds=(rd,),stdout=log,stderr=log)
 os.close(rd)
 with os.fdopen(wr,'wb')as pipe:pipe.write(json.dumps({'socket':str(path),'token':token,'run':runid,'fault':'diagram-acceptance'}).encode())
 metadata={'pid':process.pid,'directory':str(run),'sha256':hashlib.sha256(exe.read_bytes()).hexdigest(),'executable':str(exe),'scope':'opt-in Settings QA actual React/native preferences; existing diagnostic finish transport only','productionProfileAccess':False}
 (out/'candidate.json').write_text(json.dumps(metadata,indent=2));print(json.dumps(metadata),flush=True)
 connection,_=server.accept();assert struct.unpack('i',connection.getsockopt(0,2,4))[0]==process.pid;connection.settimeout(4)
 with connection,connection.makefile('rb')as reader,(out/'snapshots.jsonl').open('x')as trace:
  seq=0;start=time.monotonic()
  while process.poll()is None and time.monotonic()-start<150:
   seq+=1
   try:
    connection.sendall(json.dumps({'schema':1,'token':token,'run':runid,'sequence':seq,'command':'snapshot'}).encode()+b'\n');line=reader.readline(65537)
    if not line:break
    row=json.loads(line);assert row['sequence']==seq;trace.write(json.dumps(row)+'\n');trace.flush()
   except (BrokenPipeError,ConnectionResetError):break
   time.sleep(.25)
 try:code=process.wait(timeout=5)
 except subprocess.TimeoutExpired:
  (out/'incomplete.json').write_text(json.dumps({'pid':process.pid,'reason':'bounded runner ended; process retained to avoid losing unknown QA state'}));raise
text=(run/'host.log').read_text();prefix='INTENTGROVE_DIAGRAM_ACCEPTANCE:';lines=[line for line in text.splitlines()if line.startswith(prefix)];report=json.loads(lines[-1][len(prefix):])if lines else None
(out/'result.json').write_text(json.dumps({'exit':code,'report':report},indent=2)+'\n');shutil.copy2(run/'host.log',out/'host.log');path.unlink(missing_ok=True)
assert code==0 and report and report['kind']=='settings-integration'and report['passed'];print('PASS: real native reader owner acknowledgment and cleanup; Settings-local report requires separate AX capture')
