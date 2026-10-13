from pathlib import Path
import os,subprocess,json,datetime
q=Path(__file__).resolve().parent
os.environ['QA_CWD']="/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0044-20261012T133129Z/candidate-source-v6"
cases=[('startup-isolated',['tests/ui/new-markdown.test.tsx','-t','retains the created tab on editor startup failure']),('affected',['tests/ui/new-markdown.test.tsx','tests/ui/appearance-operations.test.tsx','tests/ui/document-select-all.test.tsx','tests/ui/document-selection-readiness.test.tsx','tests/ui/find.test.tsx','tests/ui/approved-navigation.test.tsx','tests/ui/edit-flow.test.tsx','tests/ui/automatic-refresh.test.tsx','tests/ui/session.test.tsx','tests/ui/large-source.test.tsx','tests/ui/pinch-zoom.test.tsx'])]+[('default-full-%02d'%i,[]) for i in range(1,4)]
for name,args in cases:
 subprocess.run(['python3',str(q/'run-check.py'),name,'npm','test','--','--dir','tests',*args],check=False)
