import subprocess,time,json,pathlib,hashlib,sys
ROOT=pathlib.Path('/private/tmp/f002a-qa-followup');OUT=ROOT/'observations';D='/private/tmp/f002a-ax-driver';APP='/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Markdown workspace.app'
def run(*args):
 r=subprocess.run(args,capture_output=True,text=True,timeout=15)
 if r.returncode:raise RuntimeError(str(args[:3])+': '+r.stdout+r.stderr)
 return r.stdout
def ax():return json.loads(run(D,'dump'))
def script(s):return run('osascript','-e',s)
def press(role,name):return run(D,'press',role,name)
def choose(name,value):
 press('AXPopUpButton',name);press('AXMenuItem',value);time.sleep(.2)
def wait(pred):
 end=time.monotonic()+8
 while time.monotonic()<end:
  a=ax()
  if pred(a):return a
  time.sleep(.2)
 raise RuntimeError('UI readiness timeout')
def activate():
 pid=json.loads(run(D,'status'))['pid']
 script(f'tell application "System Events" to tell (first process whose unix id is {pid}) to set frontmost to true')
 return pid
def picker(path):
 pid=activate();a=ax();name='Open folder' if any(n.get('name')=='Appearance' for n in a['nodes']) else 'Abrir carpeta'
 press('AXButton',name);wait(lambda a:any(n['role']=='AXSheet' for n in a['nodes']))
 script(f'tell application "System Events" to tell (first process whose unix id is {pid})\nkeystroke "g" using {{command down,shift down}}\ndelay 0.3\nkeystroke "{path}"\nkey code 36\ndelay 0.4\nkey code 36\nend tell')
 wait(lambda a:not any(n['role']=='AXSheet' for n in a['nodes']));time.sleep(.5)
def shot(tag):
 a=ax();wid=json.loads(run(D,'window'))['windows'][0]['id'];run('screencapture','-x','-o','-l',str(wid),str(OUT/(tag+'.png')))
 (OUT/(tag+'.json')).write_text(json.dumps(a,indent=2));return a
def matrix(state):
 rows=[]
 try:
  for width in (640,1440):
   run(D,'position','0','59');run(D,'size',str(width),'820');time.sleep(.3)
   for locale in ('en','es'):
    a=ax();lang=next(n['name'] for n in a['nodes'] if n['role']=='AXPopUpButton' and n['name'] in ['Language','Idioma'])
    choose(lang,'English' if locale=='en' else 'Español')
    for mode in ('light','dark'):
     choose('Appearance' if locale=='en' else 'Apariencia',{'light':'Light','dark':'Dark'}[mode] if locale=='en' else {'light':'Claro','dark':'Oscuro'}[mode])
     a=shot(f'{state}-{width}-{locale}-{mode}');w=next(n for n in a['nodes'] if n['role']=='AXWindow')
     controls=[n for n in a['nodes'] if n['role'] in ('AXButton','AXPopUpButton') and n.get('name') and n.get('size',[0])[0]>0]
     outside=[n['name'] for n in controls if n['position'][0]<w['position'][0]-.5 or n['position'][0]+n['size'][0]>w['position'][0]+w['size'][0]+.5]
     row={'state':state,'width':width,'locale':locale,'theme':mode,'windowSize':w['size'],'controlsOutsideHorizontalBounds':outside,'controlCount':len(controls)};rows.append(row);print(json.dumps(row),flush=True)
 finally:(OUT/(state+'-matrix.json')).write_text(json.dumps(rows,indent=2))
if __name__=='__main__':
 activate();cmd=sys.argv[1]
 if cmd=='empty':matrix('empty')
 elif cmd=='open':
  choose('Idioma','English');picker(str(ROOT/'workspace'));press('AXButton','README.md');wait(lambda a:any(n.get('name')=='Dark theme QA' for n in a['nodes']));shot('reader-initial')
 elif cmd=='reader':matrix('reader')
 elif cmd=='error':
  a=ax()
  if any(n.get('name')=='Idioma' for n in a['nodes']):choose('Idioma','English')
  press('AXButton','invalid.md');wait(lambda a:any(n.get('AXValue')=='This file is not valid UTF-8' or n.get('name')=='This file is not valid UTF-8' for n in a['nodes']));matrix('error')
 elif cmd=='dump':print(json.dumps(ax()))
