"""Package the real Rust test executable with the production XPC service. No app profile access."""
import hashlib
import json,os,plistlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[3];os.chdir(root)
evidence=root/'qa/runs/macos-remaining-20261008/mermaid-acceptance'
rows=[json.loads(l) for l in (evidence/'test-build.jsonl').read_text().splitlines()]
exe=next(Path(r['executable']) for r in rows if r.get('reason')=='compiler-artifact' and r.get('executable') and r['target']['name']=='md_reader_lib')
app=root/'src-tauri/target/diagram-parent-tests/ParentTests.app'
(app/'Contents/MacOS').mkdir(parents=True,exist_ok=True)
subprocess.run(['ditto',str(exe),str(app/'Contents/MacOS/ParentTests')],check=True)
with (app/'Contents/Info.plist').open('wb') as f:plistlib.dump({'CFBundleExecutable':'ParentTests','CFBundleIdentifier':'com.juanmantilla.intentgrove.diagram-parent-tests','CFBundlePackageType':'APPL'},f)
prod=root/'src-tauri/target/release/bundle/macos/Intentgrove.app'
subprocess.run(['ditto',str(prod/'Contents/XPCServices'),str(app/'Contents/XPCServices')],check=True)
subprocess.run(['codesign','--force','--sign','-',str(app)],check=True)
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
probe=evidence/'disposable-readable-file';probe.write_text('disposable sandbox probe\n');probe.chmod(0o644)
env=dict(os.environ,INTENTGROVE_PRODUCTION_HELPER=str(prod/'Contents/Helpers/DiagramRenderer.app/Contents/MacOS/DiagramRenderer'),INTENTGROVE_DIAGNOSTIC_HELPER=str(root/'src-tauri/target/diagram-diagnostic/DiagramRenderer.app/Contents/MacOS/DiagramRenderer'),INTENTGROVE_EVIDENCE=str(evidence),INTENTGROVE_DIAG_FILE=str(probe))
command=[str(app/'Contents/MacOS/ParentTests'),'process_acceptance','--ignored','--test-threads=1','--nocapture']
(evidence/'parent-command.json').write_text(json.dumps({'command':command,'taskEnvironment':{k:v for k,v in env.items() if k.startswith('INTENTGROVE_')},'helperHashes':{k:hashlib.sha256(Path(v).read_bytes()).hexdigest() for k,v in env.items() if k.endswith('_HELPER')}},indent=2))
raise SystemExit(subprocess.run(command,env=env).returncode)
