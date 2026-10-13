"""Disposable authoring client: pinned VectorCraft MCP owns every SVG visual."""
from pathlib import Path
import subprocess,json,base64,hashlib,zlib,struct
ROOT=Path('/Users/juanmantilla/projects/personal')
E=ROOT/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
V=ROOT/'third_party/vectorcraft'; BIN=V/'target/release/vectorcraft-cli'
log=[]
p=subprocess.Popen([str(BIN),'mcp','--headless','--automation-read-root',str(E),'--automation-write-root',str(E)],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=open(E/'author.stderr','w'),text=True)
def request(method,params):
 i=len(log)+1; q={'jsonrpc':'2.0','id':i,'method':method,'params':params};p.stdin.write(json.dumps(q)+'\n');p.stdin.flush();r=json.loads(p.stdout.readline());log.append({'request':q,'response':r})
 (E/'author-mcp.json').write_text(json.dumps(log,indent=2))
 if 'error' in r or r.get('result',{}).get('isError'): raise RuntimeError(r)
 return r['result']
def tool(n,a):return request('tools/call',{'name':n,'arguments':a})
def cmd(n,a={}):
 r=tool('run_command',{'command':n,'params':a});return json.loads(''.join(c['text'] for c in r['content'] if c['type']=='text'))
def props(i,target=None,**kw):
 if target:kw['data']={'prototype-id':target}
 cmd('object.setProps',dict(id=i,**kw))
def rect(x,y,w,h,color,target=None,r=12):
 i=cmd('shape.rectangle',dict(x=x,y=y,width=w,height=h,radius=r))['id'];cmd('paint.setFill',{'ids':[i],'color':color});cmd('paint.setStroke',{'ids':[i],'none':True});props(i,target);return i
def text(x,y,s,size=18,color='#18243C'):
 return cmd('text.create',dict(x=x,y=y,text=s,size=size,font='Arial',color=color))['id']
def group(ids,target=None,visible=True):
 cmd('select.set',{'ids':ids});i=cmd('object.group')['id'];props(i,target,visible=visible);return i
def button(x,y,w,label,target):return group([rect(x,y,w,48,'#315DE8'),text(x+16,y+31,label,18,'#FFFFFF')],target)
def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
# Local original checker image; placed/embedded by VectorCraft, never substitute SVG.
w=h=64;raw=b''.join(b'\0'+b''.join(bytes((44 if (x//8+y//8)%2 else 84,155,210,255)) for x in range(w)) for y in range(h))
(E/'checker.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
try:
 request('initialize',{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'Intentgrove disposable POC','version':'1'}})
 p.stdin.write(json.dumps({'jsonrpc':'2.0','method':'notifications/initialized'})+'\n');p.stdin.flush()
 cmd('file.new',{'width':390,'height':844,'title':'Intentgrove four-scene POC','created':0})
 effect=cmd('effect.list');(E/'effect-catalog.json').write_text(json.dumps(effect,indent=2))
 for a,name in enumerate(['login','dashboard','settings','profile-overlay']):
  ox=a*500
  if a:cmd('artboard.new',dict(x=ox,y=0,width=390,height=844,name=name))
  rect(ox,0,390,844,'#F3F5FB',r=0)
  hero=rect(ox+20,20,350,150,'#315DE8',r=22)
  cmd('paint.setFill',{'ids':[hero],'gradient':{'kind':'linear','angle':25,'stops':[{'offset':0,'color':'#193590'},{'offset':1,'color':'#628BFF'}]}})
  text(ox+40,75,'Intentgrove',26,'#FFFFFF');text(ox+40,108,name.replace('-',' ').title(),20,'#FFFFFF')
  if name=='login':
   text(ox+28,220,'Welcome back',28);text(ox+28,258,'A bounded native prototype',16)
   rect(ox+28,295,334,52,'#FFFFFF');text(ox+42,328,'you@example.com',17)
   rect(ox+28,362,334,52,'#FFFFFF');text(ox+42,395,'Password',17)
   button(ox+28,450,334,'Continue','login-button')
  elif name=='dashboard':
   text(ox+28,220,'Your workspace',28)
   button(ox+28,260,160,'Settings','settings-button');button(ox+206,260,156,'Menu','menu-button')
   avatar=cmd('shape.ellipse',dict(x=ox+302,y=42,width=44,height=44))['id'];cmd('paint.setFill',{'ids':[avatar],'color':'#FFFFFF'});cmd('paint.setStroke',{'ids':[avatar],'none':True});group([avatar,text(ox+313,71,'JM',16)],'profile-avatar')
   group([rect(ox+206,318,156,95,'#FFFFFF'),text(ox+220,354,'Recent files',16),text(ox+220,387,'Saved locally',14)],'menu-panel',False)
   text(ox+28,460,'Visual contract probes',20)
  elif name=='settings':
   text(ox+28,220,'Settings',28);text(ox+28,268,'Preferences stay local',17)
   rect(ox+28,304,334,70,'#FFFFFF');text(ox+45,346,'Notifications enabled',18)
   button(ox+28,440,150,'Back','back-button')
  else:
   text(ox+28,220,'Profile overlay',28);rect(ox+28,270,334,175,'#FFFFFF');text(ox+48,312,'Juan Mantilla',22);text(ox+48,354,'Prototype author',17)
   button(ox+28,465,334,'Close profile','close-button')
  # Each board carries typography, gradients, clip/image, effect, transform, hidden group.
  img=cmd('file.place',{'path':str(E/'checker.png'),'link':False,'rect':[ox+28,530,104,104]})['ids']
  mask=rect(ox+42,540,74,76,'#FFFFFF',r=18)
  cmd('select.set',{'ids':img+[mask]});cl=cmd('object.clippingMask.make')['id'];props(cl,'image-probe')
  transformed=rect(ox+160,540,90,60,'#F4A852');cmd('object.transform',{'ids':[transformed],'matrix':[1,.12,-.12,1,65,-15-.12*ox]});props(transformed,'transform-probe')
  shadow=rect(ox+280,540,68,64,'#68BEA0');cmd('effect.apply',{'ids':[shadow],'effect':'stylize.dropShadow','params':{'dx':3,'dy':5,'blur':4,'opacity':30,'color':'#18243C'}});props(shadow,'effect-probe')
  text(ox+28,665,'Arial 16: Aa 0123',16);text(ox+28,700,'Clip / image / transform / shadow',14)
  group([rect(ox+28,740,100,40,'#FF0000'),text(ox+35,766,'HIDDEN',16)],'hidden-probe',False)
 cmd('document.save',{'path':str(E/'four-scenes.vectorcraft'),'compress':False})
 for a,name in enumerate(['login','dashboard','settings','profile-overlay']):
  tool('screenshot',{'path':str(E/(name+'-vectorcraft.png')),'artboard':a,'scale':1})
  cmd('document.export',{'path':str(E/(name+'.svg')),'artboard':a,'svg':{'hiddenLayers':True,'outlineText':False,'preserveEditing':False,'metadata':False,'objectIds':'minimal'}})
 (E/'author-provenance.json').write_text(json.dumps({'revision':subprocess.check_output(['git','-C',str(V),'rev-parse','HEAD'],text=True).strip(),'binary_sha256':hashlib.sha256(BIN.read_bytes()).hexdigest(),'argv':p.args,'transport':'MCP JSON-RPC stdio','source':'four-scenes.vectorcraft'},indent=2))
finally:
 p.stdin.close();p.wait(timeout=15)
print('VectorCraft MCP authoring and export complete')
