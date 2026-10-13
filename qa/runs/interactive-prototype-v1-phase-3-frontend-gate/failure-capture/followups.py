from pathlib import Path
import json,time,subprocess,sys,shutil
out=Path(__file__).resolve().parent;root=out.parents[3]
while not (out/'C-warm-2-command.json').exists() or 'finished_at' not in json.loads((out/'C-warm-2-command.json').read_text()):time.sleep(1)
for variant,name,args in [('profile','profile-seeded-1',[]),('recorder','recorder-warm-2',[]),('D','D-fresh-3',['fresh'])]:
 subprocess.run([sys.executable,str(out/'run.py'),variant,name,*args],check=True)
order=[x['file'] for x in json.loads((out/'recorder-seeded-1-order.json').read_text())]
c=out/'candidate-order';shutil.copytree(out/'candidate-D',c,ignore=shutil.ignore_patterns('node_modules'))
(c/'node_modules').mkdir()
for e in (root/'node_modules').iterdir():
 if e.name!='.vite':(c/'node_modules'/e.name).symlink_to(e,target_is_directory=e.is_dir())
config=out/'failing-order-replay.config.mjs'
config.write_text('import {mergeConfig} from '+json.dumps(str(root/'node_modules/vite/dist/node/index.js'))+';\nimport {BaseSequencer} from '+json.dumps(str(root/'node_modules/vitest/dist/node.js'))+';\nimport base from '+json.dumps(str(c/'vitest.config.ts'))+';\nimport {relative} from "node:path";\nconst root='+json.dumps(str(c))+';\nconst order='+json.dumps(order)+';\nclass Order extends BaseSequencer{async sort(files){return [...files].sort((a,b)=>order.indexOf(relative(root,a.moduleId))-order.indexOf(relative(root,b.moduleId)));}}\nexport default mergeConfig(base,{test:{sequence:{sequencer:Order}}});\n')
subprocess.run([sys.executable,str(out/'run.py'),'order','D-failing-order-replay',str(config)],check=True)
