"""Format new/changed Rust only, preserving pre-existing formatting outside task edits."""
import pathlib,subprocess,tempfile,difflib,json,sys
root=pathlib.Path(__file__).resolve().parents[3]
run=pathlib.Path(__file__).resolve().parent
paths=[root/p for p in json.loads((run/'changed-files.json').read_text())]
def formatted(p,text):
 with tempfile.TemporaryDirectory() as temp:
  out=pathlib.Path(temp)/p.name;out.write_text(text)
  subprocess.run(['rustfmt','--edition','2021','--config','skip_children=true',str(out)],check=True,capture_output=True)
  return out.read_text().splitlines(keepends=True)
ledger=[]
for p in paths:
 rel=str(p.relative_to(root));now=p.read_text().splitlines(keepends=True);fmt=formatted(p,''.join(now));baseline=root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock/initial-source'/rel
 if not baseline.exists():
  if '--check' not in sys.argv:p.write_text(''.join(fmt))
  ledger.append({'path':rel,'result':'PASS' if '--check' not in sys.argv or now==fmt else 'FAIL','baseline_unformatted_hunks':0});continue
 old=baseline.read_text().splitlines(keepends=True);oldfmt=formatted(p,''.join(old))
 baseline_bad=set()
 for tag,i,j,_,_ in difflib.SequenceMatcher(a=old,b=oldfmt,autojunk=False).get_opcodes():
  if tag!='equal':baseline_bad.update(range(i,j))
 mapping={}
 for block in difflib.SequenceMatcher(a=old,b=now,autojunk=False).get_matching_blocks():
  for k in range(block.size):mapping[block.b+k]=block.a+k
 ignored=0;patches=[]
 for tag,i,j,a,b in difflib.SequenceMatcher(a=now,b=fmt,autojunk=False).get_opcodes():
  if tag=='equal':continue
  if any(mapping.get(k) in baseline_bad for k in range(i,j)):
   ignored+=1
  else:patches.append((i,j,fmt[a:b]))
 if '--check' not in sys.argv:
  for i,j,lines in reversed(patches):now[i:j]=lines
  p.write_text(''.join(now))
 ledger.append({'path':rel,'result':'PASS' if '--check' not in sys.argv or not patches else 'FAIL','baseline_unformatted_hunks':ignored,'new_unformatted_hunks':len(patches) if '--check' in sys.argv else 0})
print(json.dumps(ledger,indent=2))
if any(x['result']=='FAIL' for x in ledger):sys.exit(1)
