from pathlib import Path
import json, shutil, hashlib, difflib, subprocess

out = Path(__file__).resolve().parent
root = out.parents[3]
historical = out.parent.parent / 'interactive-prototype-v1-phase-3-verification-unblock/regression-candidate-final'
paths = json.loads((out.parent/'tested-paths-current.json').read_text())
(out/'tested-paths.json').write_text(json.dumps(paths, indent=2))
subprocess.run(['python3','-B','/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py','snapshot','--root',str(root),'--paths',str(out/'tested-paths.json'),'--out',str(out/'tested-snapshot.json')], check=True)
sha=lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
provenance={'historical':str(historical),'current':str(root),'variants':{},'frontend_differences':[]}
for p in paths:
    if p.startswith(('src/','tests/')) or p in ['package.json','package-lock.json','vite.config.ts','vitest.config.ts','tsconfig.json']:
        a,b=historical/p,root/p
        if not a.exists() or a.read_bytes()!=b.read_bytes(): provenance['frontend_differences'].append(p)
assert provenance['frontend_differences']==['src/app/App.tsx','tests/ui/document-selection-readiness.test.tsx'], provenance['frontend_differences']
app='src/app/App.tsx'; test='tests/ui/document-selection-readiness.test.tsx'
(out/'selection-readiness-app.patch').write_text(''.join(difflib.unified_diff((historical/app).read_text().splitlines(True),(root/app).read_text().splitlines(True),fromfile=str(historical/app),tofile=str(root/app))))
shutil.copy2(root/test,out/'selection-readiness-test.tsx')
shutil.copytree(root/'node_modules/.vite',out/'cache-seed')
for variant in ['A','B','C','D','recorder']:
    dest=out/('candidate-'+variant)
    shutil.copytree(historical,dest,ignore=shutil.ignore_patterns('node_modules','target','dist','.vite'))
    if variant in ['B','D','recorder']: shutil.copy2(root/app,dest/app)
    if variant in ['C','D','recorder']: shutil.copy2(root/test,dest/test)
    nm=dest/'node_modules';nm.mkdir()
    for entry in (root/'node_modules').iterdir():
        if entry.name!='.vite': (nm/entry.name).symlink_to(entry,target_is_directory=entry.is_dir())
    shutil.copytree(out/'cache-seed',nm/'.vite')
    manifest={str(p.relative_to(dest)):sha(p) for folder in ['src','tests'] for p in (dest/folder).rglob('*') if p.is_file()}
    provenance['variants'][variant]={'root':str(dest),'inputs':manifest,'App':sha(dest/app),'test':sha(dest/test) if (dest/test).exists() else None}
(out/'variant-provenance.json').write_text(json.dumps(provenance,indent=2))
subprocess.run(['git','status','--short'],cwd=root,stdout=(out/'initial-git-status.txt').open('w'),check=True)
print('Prepared isolated A/B/C/D and recorder candidates; frontend delta verified.')
