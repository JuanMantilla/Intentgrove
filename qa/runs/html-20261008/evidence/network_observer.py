import http.server,threading,urllib.request,json,time,pathlib
base=pathlib.Path(__file__).parent
fixture=json.loads((base/'fixture.json').read_text());root=pathlib.Path(fixture['workspace']); events=[]
class S(http.server.ThreadingHTTPServer):
 def get_request(self):
  sock,a=super().get_request();events.append({'kind':'tcp','time':time.time()});return sock,a
class H(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  events.append({'kind':'http','path':self.path,'time':time.time()});self.send_response(200);self.end_headers();self.wfile.write(b'control')
 def log_message(self,*a):pass
s=S(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start();url='http://127.0.0.1:'+str(s.server_port)
text=(root/'hostile.html').read_text().replace('https://invalid.example',url).replace('<h1>Never render here</h1>','<h1 id="sentinel">Script has NOT executed</h1><script>document.getElementById("sentinel").textContent="EXECUTED";</script>')
text=text.replace('</head>',f'<link rel="dns-prefetch" href="{url}"><link rel="preconnect" href="{url}"><style>@import "{url}/css-import";body{{background-image:url({url}/css-image)}} @font-face{{font-family:X;src:url({url}/font)}}</style></head>')
text=text.replace('</body>',f'<img src="{url}/image"><video src="{url}/media"></video><svg onload="fetch(\'{url}/svg\')"><script>fetch("{url}/svg-script")</script></svg></body>');(root/'hostile-observed.html').write_text(text)
(root/'assets/hostile.css').write_text(f'@import "{url}/nested-import";body{{background-image:url({url}/external-css)}}')
(base/'network-endpoint.json').write_text(json.dumps({'url':url,'limit':'loopback fixture endpoint only, no DNS/whole system/execution/IPC observation'}));urllib.request.urlopen(url+'/positive-before').read();print(url,flush=True)
try:
 while not (base/'observer-stop').exists():
  (base/'network-live.json').write_text(json.dumps(events,indent=2));time.sleep(.25)
finally:
 urllib.request.urlopen(url+'/positive-after').read();(base/'network-final.json').write_text(json.dumps(events,indent=2));s.shutdown()
