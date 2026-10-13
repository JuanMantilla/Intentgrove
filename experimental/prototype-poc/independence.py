"""Denies VectorCraft reads to player/controller using macOS process sandbox."""
from pathlib import Path
import subprocess,json,sys
P=Path(__file__).resolve().parent;E=P.parents[2]/'.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence'
profile='(version 1)(allow default)(deny file-read* (subpath "/Users/juanmantilla/projects/personal/third_party/vectorcraft") (subpath "/Users/juanmantilla/projects/third_party/vectorcraft"))(deny network-outbound (remote tcp "localhost:7979"))'
q=['/usr/bin/sandbox-exec','-p',profile,sys.executable]
probe=subprocess.run(q+['-c','from pathlib import Path; Path("/Users/juanmantilla/projects/personal/third_party/vectorcraft/Cargo.toml").read_bytes()'],text=True,capture_output=True)
run=subprocess.run(q+[str(P/'independence_run.py')],text=True,capture_output=True)
deps=subprocess.run(['otool','-L',str(P/'native-player')],text=True,capture_output=True)
processes=subprocess.run(['ps','-axo','pid,comm'],text=True,capture_output=True).stdout
result={'sandboxProfile':profile,'denyProbeArgv':q+['-c','from pathlib import Path; Path("/Users/juanmantilla/projects/personal/third_party/vectorcraft/Cargo.toml").read_bytes()'],'denyProbeExit':probe.returncode,'denyProbeStderr':probe.stderr,'runtimeArgv':q+[str(P/'independence_run.py')],'runtimeExit':run.returncode,'runtimeStdout':run.stdout,'runtimeStderr':run.stderr,'nativeLinkedLibraries':deps.stdout,'vectorcraftProcesses':[l for l in processes.splitlines() if 'vectorcraft' in l.lower()],'result':'PASS' if probe.returncode!=0 and 'Operation not permitted' in probe.stderr and run.returncode==0 else 'FAIL'}
(E/'independence-results.json').write_text(json.dumps(result,indent=2));assert result['result']=='PASS',result;print('PASS runtime with VectorCraft source reads denied')
