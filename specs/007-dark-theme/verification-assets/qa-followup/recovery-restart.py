from qa import *
pid=activate();script(f'tell application "System Events" to tell (first process whose unix id is {pid}) to click menu item "Quit" of menu 1 of menu bar item "Markdown workspace" of menu bar 1')
wait(lambda a:any(n.get('name')=='Keep this section edit?' for n in a['nodes']));press('AXButton','Keep draft');time.sleep(1)
run('open','-n',APP);time.sleep(.8);activate();picker(str(ROOT/'workspace'));press('AXButton','README.md')
wait(lambda a:any(n.get('name')=='Recover unsaved edit' and n['role']=='AXButton' for n in a['nodes']));matrix('recovery')
choose('Idioma','English');press('AXButton','Recover unsaved edit');wait(lambda a:any(n['role']=='AXTextArea' for n in a['nodes']));shot('recovery-resumed')
