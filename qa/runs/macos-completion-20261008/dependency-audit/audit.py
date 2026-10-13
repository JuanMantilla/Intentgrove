import urllib.request,json,hashlib,base64,tarfile,io,concurrent.futures
from pathlib import Path
p=Path(__file__).parent
lock=json.loads((p/'package-lock.json').read_text())
def inspect(item):
 name,v=item
 if not name:return None
 url=v['resolved'];assert url.startswith('https://registry.npmjs.org/')
 data=urllib.request.urlopen(url,timeout=40).read();algo,want=v['integrity'].split('-',1)
 actual=base64.b64encode(hashlib.new(algo,data).digest()).decode();assert actual==want,name
 with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as tar:
  manifests=[x for x in tar.getmembers() if len(x.name.split('/'))==2 and x.name.endswith('/package.json')];assert len(manifests)==1,name
  manifest=json.load(tar.extractfile(manifests[0]));licenses=[x for x in tar.getmembers() if x.isfile() and ('license' in x.name.lower() or 'copying' in x.name.lower())]
  notices=[]
  for x in licenses:
   if x.size<100000: notices.append({'path':x.name,'text':tar.extractfile(x).read().decode(errors='replace')})
  if name=='node_modules/mermaid':(p/'mermaid-11.17.2.tgz').write_bytes(data)
  return {'name':name,'version':v['version'],'integrity_verified':True,'sha256':hashlib.sha256(data).hexdigest(),'license':manifest.get('license'), 'scripts':manifest.get('scripts',{}),'engines':manifest.get('engines',{}),'notices':notices}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(inspect,lock['packages'].items()))
(p/'tarball-audit.json').write_text(json.dumps([r for r in results if r],indent=2))
req=urllib.request.Request('https://api.github.com/repos/mermaid-js/mermaid/security-advisories?per_page=100',headers={'Accept':'application/vnd.github+json','User-Agent':'Intentgrove-local-audit'})
(p/'upstream-advisories.json').write_bytes(urllib.request.urlopen(req,timeout=30).read())
print('verified tarballs',len([r for r in results if r]))
