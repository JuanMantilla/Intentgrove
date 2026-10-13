from pathlib import Path
import sys, subprocess, json, datetime, hashlib
root=Path(__file__).parent
name=sys.argv[1]
metadata=json.loads(subprocess.check_output(['/usr/bin/swift',str(root/'windows.swift'),'9232'],text=True))
windows=[w for w in metadata['windows'] if w.get('kCGWindowName')=='Intentgrove — Native validation' and w.get('kCGWindowOwnerPID')==9232]
assert len(windows)==1
w=windows[0];out=root/'originals'/(name+'.png');assert not out.exists()
subprocess.run(['/usr/sbin/screencapture','-x','-o','-l'+str(w['kCGWindowNumber']),'-t','png',str(out)],check=True)
assert out.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
record={'id':name,'path':str(out),'format':'PNG','captured_at':datetime.datetime.now().astimezone().isoformat(),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'runtime':'P-01','metadata':metadata}
with (root/'captures.jsonl').open('a') as f:f.write(json.dumps(record)+'\n')
print(out)
print(w['kCGWindowBounds'])
