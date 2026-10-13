"""Copy the completed snapshot bundle, restore existing helper payloads, sign, hash."""
import pathlib, json, hashlib, tempfile, subprocess, plistlib
repo = pathlib.Path('/Users/juanmantilla/projects/personal/md-reader')
e = repo / 'frontend-implementation/evidence/html-integration-20261008'
snapshot = pathlib.Path(json.loads((e/'snapshot.json').read_text())['path'])
name = 'Intentgrove HTML Frontend 20261008.app'
built = snapshot / 'src-tauri/target/release/bundle/macos' / name
previous = pathlib.Path(json.loads((e/'candidate-pre-focus-fix.json').read_text())['app'])
app = pathlib.Path(tempfile.mkdtemp(prefix='intentgrove-html-qa-final-')) / 'Intentgrove HTML QA Final 20261008.app'
subprocess.run(['ditto',str(built),str(app)],check=True)
for helper in ['XPCServices','Helpers']:
    subprocess.run(['ditto',str(previous/'Contents'/helper),str(app/'Contents'/helper)],check=True)
plist=app/'Contents/Info.plist'
info=plistlib.loads(plist.read_bytes());info['CFBundleIdentifier']='com.juanmantilla.intentgrove.htmlfrontend20261008.qafinal';info['CFBundleName']='Intentgrove HTML QA Final 20261008';info['CFBundleDisplayName']='Intentgrove HTML QA Final 20261008';plist.write_bytes(plistlib.dumps(info))
subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict','--verbose=2',str(app)],check=True)
hashfile=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={str(p.relative_to(app)):hashfile(p) for p in sorted(app.rglob('*')) if p.is_file()}
(e/'candidate-bundle-manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
source=json.loads((e/'source-manifest.json').read_text())
changed=[f for f,h in source.items() if not (snapshot/f).is_file() or hashfile(snapshot/f)!=h]
if changed: raise RuntimeError('Snapshot changed: '+repr(changed))
executable=app/'Contents/MacOS/md_reader'
result={'app':str(app),'executable':str(executable),'executableSha256':hashfile(executable),'bundleManifestSha256':hashfile(e/'candidate-bundle-manifest.json'),'sourceManifestSha256':hashfile(e/'source-manifest.json'),'sourceSnapshot':str(snapshot),'changedSinceFreeze':changed,'signature':'PASS deep strict; ad-hoc; not notarization','profileIdentifier':'com.juanmantilla.intentgrove.htmlfrontend20261008','bundleIdentifier':'com.juanmantilla.intentgrove.htmlfrontend20261008.qafinal','bundleIdentityNote':'Unique copied-bundle UI identity; compiled Tauri task profile/config remains htmlfrontend20261008'}
(e/'candidate.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
