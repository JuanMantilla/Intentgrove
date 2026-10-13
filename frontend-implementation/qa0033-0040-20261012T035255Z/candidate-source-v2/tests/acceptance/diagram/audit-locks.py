"""Read-only public advisory/integrity verification; no installation or lock mutation."""
from pathlib import Path
import re,json,urllib.request,hashlib,base64,concurrent.futures,datetime,tarfile,io
root=Path(__file__).resolve().parents[3];out=root/'qa/runs/macos-remaining-20261008/mermaid-acceptance'
lock=json.loads((root/'package-lock.json').read_text())
def verify(item):
 path,p=item
 if not path:return None
 data=urllib.request.urlopen(p['resolved'],timeout=60).read();algo,want=p['integrity'].split('-',1)
 assert base64.b64encode(hashlib.new(algo,data).digest()).decode()==want,path
 return {'path':path,'version':p['version'],'integrity':p['integrity'],'sha256':hashlib.sha256(data).hexdigest(),'verified':True}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(verify,lock['packages'].items()))
(out/'npm-tarball-integrity.json').write_text(json.dumps([r for r in rows if r],indent=2))
packages={}
for filename in ['src-tauri/Cargo.lock','src-tauri/xpc/Cargo.lock']:
 for section in (root/filename).read_text().split('[[package]]')[1:]:
  p={k:json.loads(v) for k,v in re.findall(r'^(name|version|source) = ("[^"\n]*")$',section,re.M)}
  if p.get('source','').startswith('registry+'):
   key=(p['name'],p['version']);packages.setdefault(key,[]).append(filename)
keys=list(packages);results=[]
for i in range(0,len(keys),100):
 batch=keys[i:i+100];queries=[{'package':{'ecosystem':'crates.io','name':n},'version':v}for n,v in batch]
 req=urllib.request.Request('https://api.osv.dev/v1/querybatch',data=json.dumps({'queries':queries}).encode(),headers={'Content-Type':'application/json'})
 raw=json.load(urllib.request.urlopen(req,timeout=90));assert len(raw['results'])==len(batch)
 for (n,v),r in zip(batch,raw['results']):results.append({'name':n,'version':v,'locks':packages[(n,v)],**r})
(out/'cargo-osv-audit.json').write_text(json.dumps({'checkedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'https://api.osv.dev/v1/querybatch','packages':results},indent=2))
print('npm integrity',len(rows)-1,'cargo packages',len(results),'cargo findings',sum(bool(r.get('vulns'))for r in results))
