#!/usr/bin/env python3
"""Exercise actual Cargo build rejections. Reuses QA target; creates no fixture documents."""
import json
import os
from pathlib import Path
import subprocess

root=Path(__file__).resolve().parents[2]
base=dict(os.environ, CARGO_TARGET_DIR=str(root/'target/qa-native'))
base.pop('TAURI_CONFIG',None)
qa_id='com.juanmantilla.markdownworkspace.qa'
cases=[
    ('feature-with-production-id',True,None,'QA feature/identifier mismatch'),
    ('qa-id-without-feature',False,{'identifier':qa_id,'build':{'frontendDist':'../target/qa-dist'}},'QA feature/identifier mismatch'),
    ('qa-feature-with-production-assets',True,{'identifier':qa_id},'QA feature/frontend mismatch'),
    ('production-with-qa-assets',False,{'build':{'frontendDist':'../target/qa-dist'}},'QA feature/frontend mismatch'),
]
results=[]
for name,feature,config,expected in cases:
    env=dict(base)
    if config is not None: env['TAURI_CONFIG']=json.dumps(config)
    command=['cargo','build','--manifest-path','src-tauri/Cargo.toml','--lib','--locked','--offline']
    if feature: command += ['--features','acceptance-harness']
    run=subprocess.run(command,cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    passed=run.returncode!=0 and expected in run.stdout
    results.append({'case':name,'result':'PASS' if passed else 'FAIL'})
    if not passed:
        print(run.stdout)
print(json.dumps(results,indent=2))
raise SystemExit(0 if all(r['result']=='PASS' for r in results) else 1)
