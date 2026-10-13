import json,hashlib,zlib
from pathlib import Path
base=Path(__file__).resolve().parent
checks=[]
def first_pixel(path):
 data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
 assert data[24]==8 and data[25] in [2,6], 'Expected 8bit RGB/RGBA screenshot'
 pos=8;chunks=[]
 while pos+12<=len(data):
  n=int.from_bytes(data[pos:pos+4],'big');kind=data[pos+4:pos+8]
  if kind==b'IDAT':chunks.append(data[pos+8:pos+8+n])
  pos+=n+12
 raw=zlib.decompress(b''.join(chunks));return tuple(raw[1:4])

def check(label,value):
 checks.append({'case':label,'passed':bool(value)})
 assert value,label
for scope in [base,base/'packaged-native']:
 for mode in ['folder','explicit','resource-folder','resource-file']:
  data=json.loads((scope/f'probe-{mode}-final.json').read_text())
  for r in data['results']:
   label=f'{scope.name}/{mode}/{r["name"]}'
   dom=json.loads(r['dom']['value']); sec=json.loads(r['security']['value'])
   check(label+'/startup-viewport-correlation',r['startupViewportRequest']>=1)
   check(label+'/readiness',r['state']['state']==('empty' if r['name']=='empty.html' else 'ready'))
   check(label+'/authored-js-ipc',dom['hostile'] is None and sec['marker'] is None and dom['ipc']=='undefined' and dom['webkit']=='undefined' and sec['ipc']=='undefined' and sec['handlers']=='undefined')
   check(label+'/navigation',sec['url']==dom['url'])
   check(label+'/pending-reply',r['pendingDisposal'].get('error')=='stale_view')
   check(label+'/disposal',r['disposed'] and r['nativeDispose']['disposed'] and r['stale']=='stale_view')
   check(label+'/snapshot',r['screenshot'])
   if r['name']=='page.html':
    check(label+'/authored-light',dom['bg']=='rgb(255, 247, 232)')
    loaded=mode in ['folder','resource-folder']
    check(label+'/image-authority',(dom['images'][0]['width']>0)==loaded)
    check(label+'/nested-css-authority',(dom['border']=='5px')==loaded)
    check(label+'/font-authority',any(f['family']=='FixtureFont' and f['status']=='loaded' for f in dom['fonts'])==loaded)
    check(label+'/find',r['find']['count']==1)
    check(label+'/outline',len(r['outline']['headings'])==2)
    check(label+'/anchor-zoom',r['anchor']['location']['headingId']=='section two' and r['anchor']['location']['zoom']==1.5)
    check(label+'/missing-anchor',r['missingAnchor']['error']=='anchor_missing')
    check(label+'/deliberate-link',any(u.endswith('/notes.md') for u in r['links']))
    check(label+'/refresh',r['refresh']['newToken'] and r['refresh']['state']=='ready' and r['refresh']['restored']['location']['headingId']=='section two')
    check(label+'/cancel-before-ready',r['refresh']['cancelBeforeReady']['disposed'] and r['refresh']['cancelledBroker']=='stale_view')
    check(label+'/resource-diagnostics',any(i['reason']==('missing' if loaded else 'outside_grant') for i in r['state']['issues']))
   if r['name']=='hostile.html':
    check(label+'/embedded-content',all(c in ['empty','denied'] for c in dom['frameContent']))
    check(label+'/automatic-navigation',any(i['reason']=='automatic_navigation_blocked' for i in r['state']['issues']))
   if r['name']=='nested/relative.html':
    loaded=mode in ['folder','resource-folder']
    check(label+'/ancestor-image-authority',(dom['images'][0]['width']>0)==loaded)
    check(label+'/ancestor-nested-css',(dom['border']=='5px')==loaded)
    check(label+'/ancestor-font',any(f['family']=='FixtureFont' and f['status']=='loaded' for f in dom['fonts'])==loaded)
   if r['name']=='unstyled.html':check(label+'/bundled-baseline',dom['h1font']=='IGRoboto, sans-serif' and any(f['family']=='IGRoboto' and f['status']=='loaded' for f in dom['fonts']))
   if r['name']=='second.htm':
    check(label+'/authored-canvas',first_pixel(scope/f'native-{mode}-second.htm.png')==(17,43,33))
    check(label+'/authored-dark',dom['bg']=='rgb(17, 43, 33)' and dom['color']=='rgb(234, 241, 235)')
  network=json.loads((scope/'network-observation.json').read_text())
  check(f'{scope.name}/{mode}/network',not network['documentTriggeredRequests'] and network['unexpectedConnections']==0 and network['observed']==['/positive-before','/positive-after'])
  check(f'{scope.name}/{mode}/fixture-integrity',network['fixtureUnchanged'])
(base/'native-assertions.json').write_text(json.dumps({'passed':len(checks),'failed':0,'scope':'real native engine observations; direct retained selection handles, app-controlled click/inspection, no full Tauri IPC/OS picker acceptance','checks':checks},indent=2)+'\n')
print(f'{len(checks)} native observation assertions passed')
