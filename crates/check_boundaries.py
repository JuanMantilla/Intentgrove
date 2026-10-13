#!/usr/bin/env python3
"""Focused dependency/schema boundary check. No app build or state mutation."""
import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parent
metadata=json.loads(subprocess.check_output(['cargo','metadata','--manifest-path',str(root/'Cargo.toml'),'--locked','--format-version','1'],text=True))
packages={p['id']:p for p in metadata['packages']};nodes={n['id']:n for n in metadata['resolve']['nodes']}
def closure(id):
 seen=set();pending=[id]
 while pending:
  id=pending.pop()
  if id in seen:continue
  seen.add(id);pending.extend(n['pkg'] for n in nodes[id]['deps'])
 return {packages[id]['name'] for id in seen}
private={p['name']:p for p in metadata['packages'] if p['name'].startswith('igproto-')}
for name,p in private.items():
 assert p['publish']==[],f'{name} must remain private'
 names=closure(p['id']);forbidden={'tauri','wry','webkit2gtk','igproto-mcp'}
 assert not names & forbidden,(name,names & forbidden)
 assert not any('vectorcraft' in n for n in names),(name,names)
 if name=='igproto-model':assert not names & {'igproto-package','igproto-compiler','igproto-cli','zip','png','roxmltree','svgtypes','cssparser'}
 if name=='igproto-package':assert not names & {'igproto-compiler','igproto-cli','rustix'}
print(json.dumps({'status':'PASS','crate_closures':{n:sorted(closure(p['id'])) for n,p in private.items()},'schema_owner':'igproto-model','schema_drift':'covered by generated_schema_drift Rust test'},indent=2))
