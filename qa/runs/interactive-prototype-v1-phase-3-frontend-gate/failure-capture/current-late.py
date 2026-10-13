from pathlib import Path
import time,json,subprocess,sys
p=Path(__file__).resolve().parent
while not (p/'D-failing-order-replay-command.json').exists() or 'finished_at' not in json.loads((p/'D-failing-order-replay-command.json').read_text()):time.sleep(1)
subprocess.run([sys.executable,str(p/'run.py'),'current-late','current-late-seeded-1'],check=True)
