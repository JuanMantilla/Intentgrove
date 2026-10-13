"""Verify saved acceptance evidence; do not synthesize outcomes."""
from pathlib import Path
import json,hashlib,collections,urllib.parse
root=Path(__file__).resolve().parents[3];p=root/'qa/runs/macos-remaining-20261008/mermaid-acceptance'
r=json.loads((p/'webview-results.json').read_text());assert r['passed'] and not r['failure'];assert len(r['records'])==90
kinds=collections.Counter(x['kind']for x in r['records'])
assert kinds=={'native-admission':3,'malformed-invoke':1,'document':40,'forged-child':14,'resource-probes':1,'cancel':20,'ownership':1,'pre-cancel':1,'deadline':2,'late-real-reply':3,'forged-transport':4}
def events(child):
 for line in child['events']:
  try:e=json.loads(line)
  except ValueError:continue
  if e['event']=='js':e['js']=json.loads(e['value'])
  yield e
for mode in ['production','observe']:
 rows=[x for x in r['records']if x['kind']=='document'and x['mode']==mode];assert sorted(x['index']for x in rows)==list(range(20))
 for x in rows:
  assert not x['attempts'] and not x['state']['active'];assert len(x['state']['children'])==2
  assert all(not c['alive']for c in x['state']['children'])
  if mode=='observe':
   for c in x['state']['children']:
    ev=list(events(c));urls=[e['value']['url']for e in ev if e['event']=='resource'];assert len(urls)==2
    assert all(u.endswith('/index.html')or u.endswith('/reader.bundle.js')for u in urls)
    assert not any(e['event']in ['native-file','native-network']for e in ev)
    assert not any(e.get('js',{}).get('kind')in ['resource-attempt','bridge-unexpected','wk-unexpected','csp']for e in ev)
resource=next(x for x in r['records']if x['kind']=='resource-probes');ev=list(events(resource['state']['child']))
f=next(e['value']for e in ev if e['event']=='native-file');n=next(e['value']for e in ev if e['event']=='native-network')
assert f['allowed']==0 and f['errno']==1;assert n['result']==-1 and n['errno']==1
assert not any(e.get('js',{}).get('kind')in ['fetch-unexpected','bridge-unexpected','wk-unexpected']for e in ev)
cs=[x for x in r['records']if x['kind']=='cancel'];assert collections.Counter(x['phase']for x in cs)=={'parse-entered':10,'render-entered':10}
for x in cs:
 assert x['before']['child']['alive'];assert x['ack']['elapsed']<250
 assert not x['state']['active']and not x['state']['child']['alive']and x['state']['child']['cancelled']
 assert any(x['phase']in line for line in x['before']['child']['events'])
assert r['ownerWindowCleanup']['passed']and not r['ownerWindowCleanup']['alive']and r['ownerWindowCleanup']['cancelled']
assert r['ownerWindowCleanup']['elapsedMs']<250
hashes=json.loads((p/'document-hashes.json').read_text());assert hashes['unchanged']and hashes['before']==hashes['after']and len(hashes['before'])==20
ownership=json.loads((p/'process-ownership.json').read_text());info=json.loads((p/'webview-run.json').read_text());children={x['pid']:x for sample in ownership for x in sample['processes']if x['pid']!=info['pid']}
assert all(x['ppid']==info['pid'] for x in children.values()),'helper spawned an observed descendant'
for pid in children:
 try:__import__('os').kill(pid,0)
 except ProcessLookupError:continue
 raise AssertionError(f'owned process remains: {pid}')
prod=root/'src-tauri/target/release/bundle/macos/Intentgrove.app';qa=root/'target/qa-native/release/bundle/macos/Intentgrove QA.app'
files=['Contents/MacOS/md_reader','Contents/Helpers/DiagramRenderer.app/Contents/MacOS/DiagramRenderer','Contents/Helpers/DiagramRenderer.app/Contents/Resources/reader.bundle.js','Contents/XPCServices/ImageDecoder.xpc/Contents/MacOS/md_reader_image_xpc']
candidates={'production':{f:hashlib.sha256((prod/f).read_bytes()).hexdigest()for f in files},'qa':{f:hashlib.sha256((qa/f).read_bytes()).hexdigest()for f in files}}
for f in files[1:]:assert candidates['production'][f]==candidates['qa'][f]
candidates['qa']['diagnosticExecutable']=hashlib.sha256((qa/'Contents/Helpers/DiagramDiagnostic.app/Contents/MacOS/DiagramRenderer').read_bytes()).hexdigest()
candidates['qa']['diagnosticBundle']=hashlib.sha256((qa/'Contents/Helpers/DiagramDiagnostic.app/Contents/Resources/reader.bundle.js').read_bytes()).hexdigest()
summary={'CF37':'PASS','CF38':'PASS','scope':'macOS27.0.1 arm64; real production parent/decoder/components in authenticated QA, unchanged packaged production helper separately executed; not full production-ID UX acceptance','records':dict(kinds),'nativeAcknowledgmentMs':{'min':min(x['ack']['elapsed']for x in cs),'max':max(x['ack']['elapsed']for x in cs)},'unrelatedReadyMs':{'min':min(x['elapsed']for x in cs),'max':max(x['elapsed']for x in cs)},'ownerWindowCleanup':r['ownerWindowCleanup'],'ownedHelperPIDsObserved':len(children),'helperDescendantsObserved':0,'sourceFilesUnchanged':20,'candidates':candidates,'deliberateResourceProbes':{'nativeFile':next(e['value']for e in ev if e['event']=='native-file'),'nativeNetwork':n,'cspEvents':[e['js']['value']for e in ev if e.get('js',{}).get('kind')=='csp']}}
assert '2 passed; 0 failed' in (p/'parent-attempt-09.log').read_text()
parent_files=list(p.glob('production-[0-9][0-9].json'))+list(p.glob('observed-[0-9][0-9].json'))+list(p.glob('budget-*.json'))+list(p.glob('forged-*.json'))+list(p.glob('cancel-render-[0-9][0-9].json'))+[p/'resources.json',p/'cancel-busy-parse.json',p/'cancel-busy-render.json',p/'deadline-parse.json',p/'deadline-render.json']
assert len(parent_files)==72
for f in parent_files:
 d=json.loads(f.read_text());pid=d['pid'];assert pid>0
 try:__import__('os').kill(pid,0)
 except ProcessLookupError:continue
 raise AssertionError(f'parent test child remains: {pid}')
busy={}
for phase in ['parse','render']:
 d=json.loads((p/f'cancel-busy-{phase}.json').read_text());assert d['result']in ['diagram_cancelled','diagram_rejected']and d['elapsedMs']<250;assert any(f'{phase}-entered'in l for l in d['events']);busy[phase]={'elapsedMs':d['elapsedMs'],'result':d['result'],'pid':d['pid']}
summary['explicitBusyCancellation']=busy
summary['nativeDeadlineMs']={phase:json.loads((p/f'deadline-{phase}.json').read_text())['elapsedMs']for phase in ['parse','render']}
summary['parentChildInvocations']=len(parent_files)
parent_resource=json.loads((p/'resources.json').read_text());parent_events=list(events(parent_resource));directives=sorted({e['js']['value']['directive']for e in parent_events if e.get('js',{}).get('kind')=='csp'})
assert 'font-src'in directives and 'form-action'in directives
summary['extendedParentResources']={'result':parent_resource['result'],'directives':directives,'parentCommand':'parent-command.json','diagnosticExecutableSHA256':hashlib.sha256((root/'src-tauri/target/diagram-diagnostic/DiagramRenderer.app/Contents/MacOS/DiagramRenderer').read_bytes()).hexdigest(),'diagnosticBundleSHA256':hashlib.sha256((root/'src-tauri/target/diagram-diagnostic/DiagramRenderer.app/Contents/Resources/reader.bundle.js').read_bytes()).hexdigest()}
(p/'acceptance-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({k:v for k,v in summary.items()if k!='candidates'},indent=2))
