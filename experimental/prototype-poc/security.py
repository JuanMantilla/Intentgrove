"""Malicious disposable package corpus: same reader used by prototype.open."""
from pathlib import Path
import zipfile,io,json
from package import load,compile_package
P=Path(__file__).resolve().parent
E=P.parents[2]/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
def run():
 with zipfile.ZipFile(E/'four-scenes.igproto') as z:original={n:z.read(n) for n in z.namelist()}
 results=[]
 def case(name,edit):
  files=dict(original);edit(files);out=io.BytesIO()
  with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
   for n,b in files.items():z.writestr(n,b)
  path=E/('malicious-'+name+'.igproto');path.write_bytes(out.getvalue())
  try:load(path);r={'name':name,'result':'FAIL','reason':'accepted'}
  except Exception as e:r={'name':name,'result':'PASS','reason':str(e),'artifact':str(path)}
  results.append(r)
 def inject(xml):return lambda f:f.__setitem__('scenes/login.svg',f['scenes/login.svg'].replace(b'</svg>',xml.encode()+b'</svg>'))
 def graph(edit):
  def change(f):
   g=json.loads(f['prototype.json']);edit(g);f['prototype.json']=json.dumps(g).encode()
  return change
 case('script',inject('<script>window.hacked=true</script>'))
 case('event-handler',inject('<rect onclick="alert(1)"/>'))
 case('network-image',inject('<image href="https://example.com/a.png"/>'))
 case('external-file-image',inject('<image href="file:///etc/passwd"/>'))
 case('javascript-url',inject('<use href="javascript:alert(1)"/>'))
 case('external-css-resource',inject('<rect fill="url(https://example.com/a.svg)"/>'))
 case('css-escaped-url',inject('<rect style="fill:u\\72l(https://example.com/a)"/>'))
 case('path-traversal',lambda f:f.__setitem__('../escape.svg',b'x'))
 case('encoded-traversal',lambda f:f.__setitem__('assets/%2e%2e/a.png',b'x'))
 case('asset-traversal',inject('<image href="assets/../secret.png"/>'))
 case('missing-scene',graph(lambda g:g['interactions'][0]['action'].__setitem__('scene','missing')))
 case('missing-target',graph(lambda g:g['interactions'][0].__setitem__('target','deleted')))
 case('duplicate-prototype-id',inject('<g data-prototype-id="login-button"/>'))
 case('foreign-object',inject('<foreignObject/>'))
 case('svg-animation',inject('<animate attributeName="x"/>'))
 case('entity',lambda f:f.__setitem__('scenes/login.svg',b'<!DOCTYPE svg [<!ENTITY e SYSTEM "file:///etc/passwd">]>'+f['scenes/login.svg']))
 case('package-javascript',lambda f:f.__setitem__('assets/code.js',b'alert(1)'))
 case('boolean-version',lambda f:f.__setitem__('manifest.json',b'{"format":"intentgrove-prototype","version":true}'))
 case('unknown-version',lambda f:f.__setitem__('manifest.json',b'{"format":"intentgrove-prototype","version":2}'))
 case('script-action',graph(lambda g:g['interactions'][0].__setitem__('action',{'type':'EVAL','script':'alert(1)'})))
 case('duplicate-json-key',lambda f:f.__setitem__('manifest.json',b'{"format":"intentgrove-prototype","version":2,"version":1}'))
 case('expansion-limit',lambda f:f.__setitem__('assets/bomb.png',b'0'*(4*1024*1024+1)))
 # Compiler-side duplicate target check uses raw VectorCraft export, before packaging.
 import xml.etree.ElementTree as ET
 from package import sanitize
 raw=(E/'login.svg').read_bytes().replace(b'</svg>',b'<g data-prototype-id="login-button"/></svg>')
 try:sanitize(raw,{},extract=True);results.append({'name':'compiler-duplicate','result':'FAIL'})
 except ValueError as e:results.append({'name':'compiler-duplicate','result':'PASS','reason':str(e)})
 (E/'security-results.json').write_text(json.dumps(results,indent=2));assert all(x['result']=='PASS' for x in results)
 print('PASS',len(results),'security/compiler rejection checks')
if __name__=='__main__':run()
