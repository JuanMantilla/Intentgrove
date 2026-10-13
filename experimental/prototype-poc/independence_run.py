from pathlib import Path
from control import Prototype
import json
P=Path(__file__).resolve().parent;E=P.parents[2]/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
p=Prototype()
try:
 assert p.call('prototype.open',path=str(E/'four-scenes.igproto'))['state']['scene']=='login'
 for scene,target,expected,overlays in [('login','login-button','dashboard',[]),('dashboard','profile-avatar','dashboard',['profile-overlay']),('profile-overlay','close-button','dashboard',[]),('dashboard','settings-button','settings',[]),('settings','back-button','dashboard',[]),('dashboard','menu-button','dashboard',[])]:
  s=p.call('prototype.click',scene=scene,target=target)['state'];assert s['scene']==expected and s['overlays']==overlays
 assert s['local']=={'dashboard/menu-panel':True};assert all(t['isTrusted'] for t in s['trace'] if t.get('trigger')=='CLICK')
 assert p.call('prototype.screenshot',path=str(E/'html-native-independent-dashboard-menu.png'))['saved']
 assert p.call('prototype.reset')['scene']=='login'
 print(json.dumps({'result':'PASS','nativeClicks':6,'trace':p.trace}))
finally:
 print(json.dumps({'controlTrace':p.trace}),flush=True);p.close()
