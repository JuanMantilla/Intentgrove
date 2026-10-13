from pathlib import Path
import json,time,subprocess,sys
out=Path(__file__).resolve().parent
while 'finished_at' not in json.loads((out/'D-seeded-1-command.json').read_text()): time.sleep(1)
jobs=[('recorder','recorder-seeded-1'),('A','A-seeded-1'),('B','B-seeded-1'),('C','C-seeded-1'),('D','D-warm-2'),('A','A-warm-2'),('B','B-warm-2'),('C','C-warm-2')]
for variant,name in jobs:
    subprocess.run([sys.executable,str(out/'run.py'),variant,name],check=True)
