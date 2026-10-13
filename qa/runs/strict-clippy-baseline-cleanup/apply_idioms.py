from pathlib import Path
import json
root=Path(__file__).resolve().parents[3]
log=root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock/current-before.jsonl'
allowed={'clippy::redundant_field_names','clippy::needless_borrow','clippy::collapsible_if','clippy::manual_range_contains','clippy::unnecessary_map_or','clippy::uninlined_format_args','clippy::non_octal_unix_permissions','clippy::ptr_arg'}
edits={}
for line in log.read_text().splitlines():
 try:x=json.loads(line)
 except ValueError:continue
 if x.get('reason')!='compiler-message' or (x['message'].get('code') or {}).get('code') not in allowed:continue
 for child in x['message']['children']:
  for s in child['spans']:
   if s.get('suggested_replacement') is not None:
    edits.setdefault(s['file_name'],set()).add((s['byte_start'],s['byte_end'],s['suggested_replacement']))
for rel,changes in edits.items():
 p=root/'src-tauri'/rel;b=p.read_bytes()
 # The current source must still match the frozen input before editing.
 assert b==(root/'qa/runs/interactive-prototype-v1-phase-3-verification-unblock/initial-source/src-tauri'/rel).read_bytes(),rel
 for start,end,replacement in sorted(changes,reverse=True):b=b[:start]+replacement.encode()+b[end:]
 p.write_bytes(b)
print('Changed',len(edits),'files with reviewed idiom suggestions')
