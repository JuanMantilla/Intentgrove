import json,difflib,collections
from pathlib import Path
out=Path(__file__).resolve().parent

def read(name):
 result=[]
 for line in (out/name).read_text().splitlines():
  try:x=json.loads(line)
  except ValueError:continue
  if x.get('reason')!='compiler-message':continue
  m=x['message'];spans=[]
  for s in m['spans']:
   if s['is_primary']:
    spans.append({'file':s['file_name'],'line':s['line_start'],'end_line':s['line_end'],'columns':[s['column_start'],s['column_end']],'text':s['text']})
  result.append({'lint':(m.get('code') or {}).get('code'),'message':m['message'],'level':m['level'],'target':x['target']['kind'],'spans':spans})
 return result
b=read('baseline.jsonl');c=read('current-before.jsonl')
def key(d):
 # Absolute package/cache IDs and unrelated line insertion shifts are excluded;
 # exact span text/highlights/columns, file, lint, target and message remain.
 return json.dumps({**d,'spans':[{k:v for k,v in s.items() if k not in ['line','end_line']} for s in d['spans']]},sort_keys=True)
bc=collections.Counter(map(key,b));cc=collections.Counter(map(key,c))
new=list((cc-bc).elements());removed=list((bc-cc).elements())
(out/'baseline-normalized.json').write_text(json.dumps(b,indent=2)+'\n');(out/'current-normalized.json').write_text(json.dumps(c,indent=2)+'\n')
(out/'diagnostics.diff').write_text(''.join(difflib.unified_diff(sorted(k+'\n' for k in map(key,b)),sorted(k+'\n' for k in map(key,c)),fromfile='baseline',tofile='current')) or 'No diagnostic differences. Exact diagnostic multiset match.\n')
# Explicit source-line mapping proves shifts correspond to unchanged lines.
locations=[]
for d in c:
 for s in d['spans']:
  rel=Path('src-tauri')/s['file'];before=(out/'baseline-checkout'/rel).read_text().splitlines();after=(out/'initial-source'/rel).read_text().splitlines();mapping={}
  for block in difflib.SequenceMatcher(None,before,after,autojunk=False).get_matching_blocks():
   for n in range(block.size):mapping[block.b+n+1]=block.a+n+1
  candidates=[bs for bd in b if key(bd)==key(d) for bs in bd['spans'] if bs['file']==s['file']]
  ok=any(mapping.get(s['line'])==bs['line'] and mapping.get(s['end_line'])==bs['end_line'] for bs in candidates)
  locations.append({'file':str(rel),'current_line':s['line'],'mapped_baseline_line':mapping.get(s['line']),'verified_unchanged_source':ok})
result={'result':'BASELINE IDENTICAL — 0 NEW' if not new and not removed and all(x['verified_unchanged_source'] for x in locations) else 'BASELINE DIFFERENT','baseline':len(b),'current':len(c),'new':len(new),'removed':len(removed),'new_diagnostics':[json.loads(x) for x in new],'locations':locations}
(out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(result['result'],len(b),len(c),len(new),'all locations match:',all(x['verified_unchanged_source'] for x in locations))
# Preserve an additional literal positional diff; line changes are mapped, never hidden.
order=lambda d:(d['lint'],d['spans'][0]['file'],d['spans'][0]['line'],str(d['target']))
def position_lines(ds):return [json.dumps(d,sort_keys=True)+'\n' for d in sorted(ds,key=order)]
(out/'diagnostic-locations.diff').write_text(''.join(difflib.unified_diff(position_lines(b),position_lines(c),fromfile='baseline-with-original-lines',tofile='phase3-with-original-lines')))
