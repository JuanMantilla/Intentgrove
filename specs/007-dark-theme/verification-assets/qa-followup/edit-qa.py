from qa import *
cp=pathlib.Path.home()/'Library/Application Support/com.juanmantilla.markdownworkspace/drafts'/(hashlib.sha256(str(ROOT/'workspace/README.md').encode()).hexdigest()+'.json')
def english():
 if any(n.get('name')=='Idioma' for n in ax()['nodes']):choose('Idioma','English')
def section_menu():
 run(D,'focus','AXGroup','Edit section: Editable section');pid=activate()
 script(f'tell application "System Events" to tell (first process whose unix id is {pid}) to key code 109 using shift down')
 wait(lambda a:any(n['role']=='AXMenuItem' and n.get('name')=='Edit section' for n in a['nodes']))
cmd=sys.argv[1];activate();english()
if cmd=='edit':
 press('AXRadioButton','README.md') if any(n['role']=='AXRadioButton' and n.get('name')=='README.md' for n in ax()['nodes']) else press('AXButton','README.md')
 section_menu();shot('context-menu-dark');press('AXMenuItem','Edit section')
 wait(lambda a:any(n['role']=='AXTextArea' for n in a['nodes']))
 name=next(n['name'] for n in ax()['nodes'] if n['role']=='AXTextArea')
 run(D,'focus','AXTextArea',name);run(D,'select','AXTextArea',name,'20','0');run(D,'type','QA draft ');time.sleep(1)
 assert cp.exists(),'expected durable fixture checkpoint'
 baseline=json.loads(cp.read_text())['payload'];(OUT/'edit-baseline.json').write_text(json.dumps(baseline,indent=2))
 matrix('editor')
 after=json.loads(cp.read_text())['payload'];(OUT/'editor-preservation.json').write_text(json.dumps({'draftEqual':baseline['draft']==after['draft'],'editorJsonEqual':baseline['editorJson']==after['editorJson'],'sequenceBefore':baseline['sequence'],'sequenceAfter':after['sequence']},indent=2))
elif cmd=='conflict':
 fixture=ROOT/'workspace/README.md';original=fixture.read_bytes();(ROOT/'README-original.bin').write_bytes(original)
 run('python3','-c','import pathlib,sys;p=pathlib.Path(sys.argv[1]);p.write_text(p.read_text().replace("Original fixture text", "External writer text"))',str(fixture))
 wait(lambda a:any(n.get('name')=='Inspect versions' for n in a['nodes']));matrix('conflict')
elif cmd=='restore':
 # Restore only this fixture and explicitly discard its draft through the app.
 fixture=ROOT/'workspace/README.md';original=ROOT/'README-original.bin'
 if original.exists():fixture.write_bytes(original.read_bytes());time.sleep(.8)
 press('AXButton','Discard');time.sleep(.5)
 print(json.dumps({'fixtureDraftRemoved':not cp.exists()}))
 choose('Appearance','System');choose('Language','Español');run(D,'size','1280','820');run(D,'position','95','59')
 pid=activate();script(f'tell application "System Events" to tell (first process whose unix id is {pid}) to click menu item "Quit" of menu 1 of menu bar item "Markdown workspace" of menu bar 1')
