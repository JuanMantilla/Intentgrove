"""Native click-through, snapshots, probes; no direct state-transition calls."""
from pathlib import Path
import subprocess,json,time,threading,http.server,sys,hashlib,os
from control import Prototype
P=Path(__file__).resolve().parent;E=P.parents[2]/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
checks=[];requests=[]
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):requests.append(self.path);self.send_response(200);self.end_headers();self.wfile.write(b'probe')
 def log_message(self,*args):pass
server=http.server.HTTPServer(('127.0.0.1',18765),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
p=Prototype();base_rss=int(subprocess.check_output(['ps','-o','rss=','-p',str(p.proc.pid)],text=True).strip());performance={}
def check(name,ok):
 checks.append({'name':name,'result':'PASS' if ok else 'FAIL'});assert ok,name

def screenshot(name):
 r=p.call('prototype.screenshot',path=str(E/('html-native-'+name+'.png')));check('screenshot '+name,r['saved'])
def click(scene,target):
 r=p.call('prototype.click',scene=scene,target=target)
 return r['state']
try:
 t=time.perf_counter();r=p.call('prototype.open',path=str(E/'four-scenes.igproto'));performance['openEndToEndMs']=(time.perf_counter()-t)*1000;performance['nativeLoadMs']=r['loadMs']
 check('open Login',r['state']['scene']=='login');check('host bridge absent',r['installation']['bridge']=='undefined');screenshot('login')
 s=click('login','login-button');check('navigate Dashboard',s['scene']=='dashboard' and s['history']==['login'] and not s['busy']);screenshot('dashboard')
 s=click('dashboard','profile-avatar');check('open overlay',s['scene']=='dashboard' and s['overlays']==['profile-overlay']);screenshot('profile-overlay')
 s=click('profile-overlay','close-button');check('close overlay',s['scene']=='dashboard' and s['overlays']==[])
 s=click('dashboard','settings-button');check('navigate Settings',s['scene']=='settings' and s['history']==['login','dashboard']);screenshot('settings')
 s=click('settings','back-button');check('Back Dashboard',s['scene']=='dashboard' and s['history']==['login'])
 s=click('dashboard','menu-button');check('toggle visible',s['local']=={'dashboard/menu-panel':True} and any(t['id']=='menu-panel' and t['visible'] for t in s['targets']));screenshot('dashboard-menu')
 interactions=[t for t in s['trace'] if t.get('trigger')=='CLICK'];check('all native trusted clicks',len(interactions)==6 and all(t['isTrusted'] for t in interactions));check('DISSOLVE completed',any(t.get('transition')=='DISSOLVE' for t in s['trace']) and any(t.get('action')=='NAVIGATE' and t['actionMs']>=80 for t in s['trace']))
 performance['actions']=[t for t in s['trace'] if 'actionMs' in t]
 s=p.call('prototype.reset');check('deterministic reset',s['scene']=='login' and s['history']==[] and s['overlays']==[] and s['local']=={} and s['trace']==[]);screenshot('reset-login')
 check('current_scene control',p.call('prototype.current_scene')=='login');check('inspect control',p.call('prototype.inspect')['scene']=='login')
 probe=p.call('prototype.security_probe');check('native broker traversal denied',probe['brokerTraversalDenied']);check('package script blocked',probe['clientWorld']['pageScript'] is False and probe['pageWorld']['scriptExecuted'] is False and probe['pageWorld']['playerExposed']=='undefined');check('no Tauri IPC',probe['clientWorld']['tauri']=='undefined');time.sleep(.3);check('network blocked',requests==[])
 (E/'native-security-probe.json').write_text(json.dumps({'probe':probe,'observedHttpRequests':requests},indent=2))
 broker=p.call('prototype.broker_log');(E/'broker-log.json').write_text(json.dumps(broker,indent=2));check('package asset broker used',any('/assets/' in u for u in broker));check('only package resources',all(u.startswith('ig-html://poc/') or u.startswith('file:') for u in broker))
 rss=int(subprocess.check_output(['ps','-o','rss=','-p',str(p.proc.pid)],text=True).strip());performance.update(packageBytes=(E/'four-scenes.igproto').stat().st_size,hostBaselineRssKiB=base_rss,hostLoadedRssKiB=rss,hostRssDeltaKiB=rss-base_rss,webKitChildMemory='UNKNOWN: host RSS excludes shared WebKit processes')
 (E/'lsof-native.txt').write_text(subprocess.run(['lsof','-p',str(p.proc.pid)],text=True,capture_output=True).stdout)
 check('no open VectorCraft files','third_party/vectorcraft' not in (E/'lsof-native.txt').read_text())
 (E/'performance.json').write_text(json.dumps(performance,indent=2))
finally:
 (E/'interaction-results.json').write_text(json.dumps(checks,indent=2));(E/'control-trace.json').write_text(json.dumps(p.trace,indent=2));p.close();server.shutdown();(E/'native.stderr').write_text(p.proc.stderr.read())
print('PASS',len(checks),'native runtime checks')
