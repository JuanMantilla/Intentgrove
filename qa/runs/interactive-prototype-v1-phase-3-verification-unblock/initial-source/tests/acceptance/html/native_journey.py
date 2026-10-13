import json,subprocess,threading,http.server,urllib.request,hashlib,time,os
from pathlib import Path
evidence=Path.cwd()/'os-engineering/evidence/html-native-20261008'
base=Path(os.environ.get('HTML_NATIVE_EVIDENCE_DIRECTORY',str(evidence)));base.mkdir(parents=True,exist_ok=True)
x=json.loads((evidence/'fixture.json').read_text());root=Path(x['workspace'])
candidate=os.environ.get('HTML_NATIVE_PROBE_CANDIDATE','src-tauri/target/debug/html-native-probe')
requests=[]
connections=[]
class ObservedServer(http.server.ThreadingHTTPServer):
 def get_request(self):
  sock,addr=super().get_request();connections.append(addr);return sock,addr
 def handle_error(self,request,client_address):pass
class Server(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  requests.append(self.path);self.send_response(200);self.send_header('Content-Type','text/plain');self.end_headers();self.wfile.write(b'positive network control')
 def log_message(self,*args):pass
server=ObservedServer(('127.0.0.1',0),Server);threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}'
# Positive control verifies the observer is live, outside the renderer.
assert urllib.request.urlopen(url+'/positive-before',timeout=2).read()==b'positive network control'
hostile=Path('tests/fixtures/html-view/hostile.html').read_text().replace('https://invalid.example',url).replace('window.__htmlHostile=','document.documentElement.dataset.executed=')
hostile=hostile.replace('</head>',f'''<link rel="dns-prefetch" href="{url}"><link rel="preconnect" href="{url}"><link rel="prefetch" href="{url}/prefetch"><style>@import '{url}/inline-import';body{{background-image:url('{url}/inline-css')}}</style></head>''')
(root/'hostile.html').write_text(hostile)
(root/'page.html').write_text(Path('tests/fixtures/html-view/page.html').read_text().replace('https://invalid.example',url))
(root/'assets/hostile.css').write_text(f"@import '{url}/nested-import'; body{{background-image:url('{url}/css-image')}} @font-face{{font-family:Remote;src:url('{url}/font')}}")
(root/'nested').mkdir(exist_ok=True)
(root/'nested/relative.html').write_text("<link rel='stylesheet' href='../assets/page.css'><h1>Ancestor resource</h1><img src='../assets/pixel.png'><a href='../notes.md'>Parent Markdown</a>")
(root/'assets/nested.css').write_text("body { border: 5px solid rgb(52,99,77); } .grid { border: 2px solid rgb(52,99,77); }")
# Known valid PNG generated through system image tools from the licensed repository fixture.
subprocess.run(['sips','-s','format','png','tests/fixtures/diagram-pixels.png','--out',str(root/'assets/pixel.png')],check=True,capture_output=True)
before={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
for mode in ['folder','explicit','resource-folder','resource-file']:
 with (base/f'probe-{mode}-final.json').open('w') as out,(base/f'probe-{mode}-final.stderr').open('w') as err:
  r=subprocess.run([candidate,str(root),mode,str(base)],stdout=out,stderr=err,timeout=90)
  assert r.returncode==0, (mode,r.returncode)
  print(mode,r.returncode,flush=True)
assert urllib.request.urlopen(url+'/positive-after',timeout=2).status==200
after={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
(base/'network-observation.json').write_text(json.dumps({'observer':'task-owned loopback HTTP request log','positiveControls':['/positive-before','/positive-after'],'observed':requests,'documentTriggeredRequests':[p for p in requests if not p.startswith('/positive-')],'acceptedConnections':len(connections),'expectedPositiveConnections':2,'unexpectedConnections':max(0,len(connections)-2),'fixtureUnchanged':before==after,'before':before,'after':after,'limit':'observes fixture-targeted loopback endpoints; not whole-system packet capture or proof of arbitrary hostname/DNS behavior'},indent=2))
server.shutdown()
assert len(connections)==2, ('unexpected speculative connections',len(connections))
