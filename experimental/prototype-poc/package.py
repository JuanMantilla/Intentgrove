"""Experimental v1 compiler/reader. Fail closed, no extraction or executable content."""
from pathlib import Path,PurePosixPath
import json,zipfile,re,base64,hashlib,xml.etree.ElementTree as ET,io,stat
NS='http://www.w3.org/2000/svg'; XL='http://www.w3.org/1999/xlink'
ET.register_namespace('',NS);ET.register_namespace('xlink',XL)
LIMIT=4*1024*1024
TAGS=set('svg g defs path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask image filter feGaussianBlur feOffset feFlood feComposite feMerge feMergeNode feColorMatrix feBlend use pattern title desc'.split())
ATTRS=set('id data-prototype-id xmlns version width height viewBox x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-miterlimit stroke-dasharray stroke-dashoffset opacity display visibility style font-family font-size font-weight font-style letter-spacing text-anchor dominant-baseline dx dy gradientUnits gradientTransform offset stop-color stop-opacity spreadMethod fx fy fr clip-path clip-rule clipPathUnits mask maskUnits maskContentUnits filter filterUnits primitiveUnits stdDeviation in in2 result operator k1 k2 k3 k4 values type mode flood-color flood-opacity color-interpolation-filters preserveAspectRatio href patternUnits patternContentUnits patternTransform'.split())
STYLE=set('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin opacity display visibility font-family font-size font-weight font-style letter-spacing text-anchor clip-path filter mix-blend-mode isolation'.split())
IDENT=re.compile(r'^[a-z][a-z0-9-]{0,63}$')
def require(ok,msg):
 if not ok:raise ValueError(msg)
def path_ok(p):
 require(isinstance(p,str) and len(p)<=160 and not any(c in p for c in ['\\','%',':','\x00']), 'unsafe package path')
 require(not p.startswith('/') and all(x not in ('','..','.') for x in p.split('/')), 'path traversal')
 return p

def sanitize(raw,assets,extract=False):
 require(len(raw)<=LIMIT,'scene size limit');require(b'<!' not in raw,'DTD/declaration prohibited')
 root=ET.fromstring(raw);require(root.tag=='{'+NS+'}svg','SVG namespace/root')
 ids=set();targets=set();refs=[];count=0
 def value(v):
  require(len(v)<16384 and not re.search(r'(?:https?:|file:|javascript:|data:|ftp:|//|\\|@|expression\s*\(|[\x00-\x08])',v,re.I),'unsafe URL/style')
  for m in re.finditer(r'url\((.*?)\)',v,re.I):
   u=m.group(1).strip(' \"\'');require(re.fullmatch(r'#[A-Za-z0-9_.:-]+',u)!=None,'external URL');refs.append(u[1:])
  require('url' not in re.sub(r'url\([^)]*\)','',v,flags=re.I).lower(),'malformed URL')
 def walk(el,depth):
  nonlocal count
  count+=1;require(count<10000 and depth<40,'SVG complexity limit')
  require(el.tag.startswith('{'+NS+'}') and el.tag.split('}')[1] in TAGS,'prohibited SVG element '+el.tag)
  for k,v in list(el.attrib.items()):
   if k=='data-vc-blend':
    del el.attrib[k];continue
   if k=='{http://www.w3.org/XML/1998/namespace}space':
    require(v in ['preserve','default'],'xml space');continue
   require(k in ATTRS or k=='{'+XL+'}href','prohibited SVG attribute '+k)
   local=k.split('}')[-1]
   if local=='id':require(v not in ids,'duplicate SVG id');ids.add(v)
   if local=='data-prototype-id':require(IDENT.fullmatch(v)!=None and v not in targets,'duplicate/invalid prototype ID');targets.add(v)
   if local=='href':
    if v.startswith('#'):refs.append(v[1:])
    elif extract and el.tag=='{'+NS+'}image' and v.startswith('data:image/png;base64,'):
     data=base64.b64decode(v.split(',',1)[1],validate=True);require(len(data)<LIMIT and data.startswith(b'\x89PNG\r\n\x1a\n'),'invalid PNG');name='assets/'+hashlib.sha256(data).hexdigest()+'.png';assets[name]=data;el.set(k,name)
    else:
     require(el.tag=='{'+NS+'}image','non-image asset URL');path_ok(v);require(v in assets and v.startswith('assets/') and v.endswith('.png'),'missing/external image')
   elif local=='style':
    for entry in v.split(';'):
     if not entry.strip():continue
     require(':' in entry,'invalid style');prop,val=entry.split(':',1);require(prop.strip() in STYLE,'unsupported style '+prop);value(val)
   else:value(v)
  for c in el:walk(c,depth+1)
 walk(root,0);require(all(r in ids for r in refs),'malformed SVG fragment reference')
 require(root.get('viewBox')=='0 0 390 844','bounded scene viewBox')
 return ET.tostring(root,encoding='unicode'),targets

def exact(o,keys,msg):require(isinstance(o,dict) and set(o)==set(keys),msg)
def validate_graph(g,targets):
 exact(g,['entry','scenes','interactions'],'graph keys');require(g['entry'] in targets,'invalid entry scene')
 require(isinstance(g['interactions'],list) and len(g['interactions'])<=64,'interaction limit');bindings=set()
 for i in g['interactions']:
  exact(i,['scene','target','trigger','action','transition'],'interaction keys')
  require(i['scene'] in targets and i['target'] in targets[i['scene']],'malformed scene/target reference')
  require(i['trigger']=='CLICK' and i['transition'] in ['INSTANT','DISSOLVE'],'unsupported trigger/transition')
  key=(i['scene'],i['target'],i['trigger']);require(key not in bindings,'duplicate interaction');bindings.add(key)
  a=i['action'];require(isinstance(a,dict),'invalid action');kind=a.get('type')
  if kind in ['NAVIGATE','OPEN_OVERLAY']:
   exact(a,['type','scene'],'action keys');require(a['scene'] in targets,'malformed scene reference')
  elif kind=='TOGGLE':
   exact(a,['type','target'],'action keys');require(a['target'] in targets[i['scene']],'malformed toggle target')
  else:require(kind in ['BACK','CLOSE_OVERLAY'],'unsupported action');exact(a,['type'],'action keys')

def load(source):
 if isinstance(source,(str,Path)):
  with Path(source).open('rb') as f:raw=f.read(LIMIT+1)
 else:raw=source
 require(len(raw)<=LIMIT,'package byte limit');assets={};scenes={};targets={}
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  require(len(z.infolist())<=32,'entry limit');seen=set();total=0
  for info in z.infolist():
   path_ok(info.filename);require(info.filename not in seen,'duplicate ZIP entry');seen.add(info.filename)
   require(not info.flag_bits&1 and not stat.S_ISLNK(info.external_attr>>16),'encrypted/symlink entry')
   require(info.compress_type in [zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED],'compression method')
   total+=info.file_size;require(total<=16*1024*1024 and info.file_size<=LIMIT,'expansion limit')
  def js(n):
   def unique(pairs):
    d={}
    for k,v in pairs:require(k not in d,'duplicate JSON key');d[k]=v
    return d
   return json.loads(z.read(n),object_pairs_hook=unique)
  m=js('manifest.json');exact(m,['format','version'],'manifest keys');require(type(m['version']) is int and m=={'format':'intentgrove-prototype','version':1},'unsupported format/version')
  g=js('prototype.json');require(isinstance(g.get('scenes'),dict) and 1<=len(g['scenes'])<=8,'scene count')
  expected={'manifest.json','prototype.json'}|set(g['scenes'].values())
  for n in seen:
   if n.startswith('assets/'):
    require(n.endswith('.png'),'asset type');data=z.read(n);require(data.startswith(b'\x89PNG\r\n\x1a\n') and len(data)>=24,'PNG asset');w=int.from_bytes(data[16:20],'big');h=int.from_bytes(data[20:24],'big');require(0<w<=2048 and 0<h<=2048 and w*h<=4194304,'asset pixels');assets[n]=data;expected.add(n)
  require(seen==expected,'undeclared package entries');require(len(set(g['scenes'].values()))==len(g['scenes']),'duplicate scene entry')
  for scene,n in g['scenes'].items():
   require(IDENT.fullmatch(scene)!=None,'invalid scene id');path_ok(n);require(n=='scenes/'+scene+'.svg','scene path contract');scenes[scene],targets[scene]=sanitize(z.read(n),assets)
  validate_graph(g,targets)
 return {'manifest':m,'graph':g,'scenes':scenes,'assets':{n:base64.b64encode(b).decode() for n,b in assets.items()}}

def compile_package(e):
 assets={};scenes={};targets={}
 for name in ['login','dashboard','settings','profile-overlay']:scenes[name],targets[name]=sanitize((e/(name+'.svg')).read_bytes(),assets,extract=True)
 pairs=[('login','login-button','NAVIGATE','dashboard','DISSOLVE'),('dashboard','settings-button','NAVIGATE','settings','INSTANT'),('dashboard','profile-avatar','OPEN_OVERLAY','profile-overlay','INSTANT'),('profile-overlay','close-button','CLOSE_OVERLAY',None,'INSTANT'),('settings','back-button','BACK',None,'INSTANT'),('dashboard','menu-button','TOGGLE','menu-panel','INSTANT')]
 interactions=[]
 for scene,target,kind,dest,tr in pairs:
  action={'type':kind}
  if dest:action['target' if kind=='TOGGLE' else 'scene']=dest
  interactions.append(dict(scene=scene,target=target,trigger='CLICK',action=action,transition=tr))
 g={'entry':'login','scenes':{n:'scenes/'+n+'.svg' for n in scenes},'interactions':interactions};validate_graph(g,targets)
 output=e/'four-scenes.igproto'
 with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
  z.writestr('manifest.json',json.dumps({'format':'intentgrove-prototype','version':1}));z.writestr('prototype.json',json.dumps(g))
  for n,s in scenes.items():z.writestr('scenes/'+n+'.svg',s);(e/(n+'-sanitized.svg')).write_text(s)
  for n,b in assets.items():z.writestr(n,b)
 load(output);return output
if __name__=='__main__':
 import sys
 print(compile_package(Path(sys.argv[1])))
