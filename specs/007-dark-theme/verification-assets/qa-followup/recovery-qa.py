from qa import *
activate()
if any(n.get('name')=='Idioma' for n in ax()['nodes']):choose('Idioma','English')
press('AXButton','Close tab: README.md');wait(lambda a:any(n.get('name')=='Keep this section edit?' for n in a['nodes']));press('AXButton','Keep draft')
wait(lambda a:not any(n.get('name')=='Keep this section edit?' for n in a['nodes']));press('AXButton','README.md')
wait(lambda a:any(n.get('name')=='Recover unsaved edit' and n['role']=='AXButton' for n in a['nodes']));matrix('recovery')
choose('Idioma','English');press('AXButton','Recover unsaved edit');wait(lambda a:any(n['role']=='AXTextArea' for n in a['nodes']));shot('recovery-resumed')
