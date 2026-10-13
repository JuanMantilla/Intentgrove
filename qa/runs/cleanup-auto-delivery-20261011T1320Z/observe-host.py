"""Read-only host WebSocket observer; no turn start, resume, hook run or trust changes."""
import socket,base64,os,json,struct,time
from pathlib import Path
out=Path(__file__).parent
s=socket.socket(socket.AF_UNIX);s.settimeout(3);s.connect('/Users/juanmantilla/.codex/app-server-control/app-server-control.sock')
k=base64.b64encode(os.urandom(16)).decode();s.sendall(('GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: '+k+'\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
b=b''
while b'\r\n\r\n' not in b:b+=s.recv(1)
assert b.startswith(b'HTTP/1.1 101')
def send(v):
 d=json.dumps(v).encode(); mask=os.urandom(4); n=len(d); head=bytes([129,128+n]) if n<126 else bytes([129,254])+struct.pack('!H',n)
 s.sendall(head+mask+bytes(x^mask[i%4] for i,x in enumerate(d)))
def exact(n):
 b=b''
 while len(b)<n:
  part=s.recv(n-len(b))
  if not part:raise EOFError()
  b+=part
 return b
def recv():
 a,b=exact(2);n=b&127
 if n==126:n=struct.unpack('!H',exact(2))[0]
 if n==127:n=struct.unpack('!Q',exact(8))[0]
 assert not b&128
 d=exact(n)
 return json.loads(d) if a&15==1 else {}
send({'id':1,'method':'initialize','params':{'clientInfo':{'name':'cleanup-readonly-observer','version':'1'},'capabilities':{'experimentalApi':True}}})
f=(out/'host-observer.jsonl').open('a')
end=time.monotonic()+50
while time.monotonic()<end:
 try:r=recv()
 except socket.timeout:continue
 if r.get('id')==1:
  send({'id':2,'method':'hooks/list','params':{'cwds':['/Users/juanmantilla/projects/personal']}})
  send({'id':3,'method':'thread/read','params':{'threadId':'01a12b0e-0a8d-75d2-a8cd-63beaffbd460','includeTurns':False}})
 if r.get('id') in [1,2,3] or r.get('method','').startswith('hook/'):
  f.write(json.dumps(r)+'\n');f.flush();print(json.dumps(r),flush=True)
f.close();s.close()
