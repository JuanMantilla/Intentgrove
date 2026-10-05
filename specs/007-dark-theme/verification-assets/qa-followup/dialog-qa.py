from qa import *
activate();rows=[]
if any(n.get("name")=="Keep this section edit?" for n in ax()["nodes"]):press("AXButton","Cancel")
try:
 for width in (640,1440):
  run(D,'position','0','59');run(D,'size',str(width),'820')
  for locale in ('en','es'):
   a=ax();control=next(n['name'] for n in a['nodes'] if n.get('name') in ('Language','Idioma') and n['role']=='AXPopUpButton');choose(control,'English' if locale=='en' else 'Español')
   for mode in ('light','dark'):
    choose('Appearance' if locale=='en' else 'Apariencia',({'light':'Light','dark':'Dark'} if locale=='en' else {'light':'Claro','dark':'Oscuro'})[mode])
    press('AXButton',('Close tab' if locale=='en' else 'Cerrar pestaña')+': README.md')
    a=wait(lambda a:any(n.get('name') in ('Keep this section edit?', '¿Conservar esta edición?') for n in a['nodes']));a=shot(f'close-dialog-{width}-{locale}-{mode}')
    dialog=next(n for n in a['nodes'] if n.get('name') in ('Keep this section edit?', '¿Conservar esta edición?'));w=next(n for n in a['nodes'] if n['role']=='AXWindow')
    children=[n for n in a['nodes'] if n['path'].startswith(dialog['path']+'/') and n['role']=='AXButton']
    outside=[n['name'] for n in children if n['position'][0]<w['position'][0] or n['position'][0]+n['size'][0]>w['position'][0]+w['size'][0] or n['position'][1]+n['size'][1]>w['position'][1]+w['size'][1]]
    row={'width':width,'locale':locale,'theme':mode,'dialog':dialog['name'],'buttons':[n['name'] for n in children],'buttonsOutsideWindow':outside};rows.append(row);print(json.dumps(row),flush=True)
    press('AXButton','Cancel' if locale=='en' else 'Cancelar');time.sleep(.2)
finally:(OUT/'close-dialog-matrix.json').write_text(json.dumps(rows,indent=2))
