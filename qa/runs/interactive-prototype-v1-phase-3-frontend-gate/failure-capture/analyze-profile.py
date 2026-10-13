from pathlib import Path
import json,collections
out=Path(__file__).resolve().parent
for d in (out/'captures').glob('*'):
 if not (d/'failure.cpuprofile').exists():continue
 profile=json.loads((d/'failure.cpuprofile').read_text())
 if 'nodes' not in profile:continue
 ring=json.loads((d/'failing-ring-buffer.json').read_text());resource=json.loads((d/'resource-at-failure.json').read_text())
 events=ring['events'];ts={e['event']:e['t'] for e in events};start=ts['TEST_START'];end=ring['failureTime']
 offset=resource['clock']['hrtimeUs']-resource['clock']['performanceMs']*1000
 nodes={n['id']:n for n in profile['nodes']};parents={child:n['id'] for n in profile['nodes'] for child in n.get('children',[])}
 windows={'test':[start,end],'heading_lookup':[ts.get('HEADING_LOOKUP_BEGIN',start),end]}
 if 'FILE_CLICK_BEGIN' in ts and 'FILE_CLICK_END' in ts:windows['file_click']=[ts['FILE_CLICK_BEGIN'],ts['FILE_CLICK_END']]
 result={'test':ring['test'],'resource':resource,'profile_start_performance_ms':(profile['startTime']-offset)/1000,'windows':{}}
 for label,(lo,hi) in windows.items():
  leaves=collections.Counter();stacks=collections.Counter();total=0;clock=profile['startTime']
  for ident,delta in zip(profile.get('samples',[]),profile.get('timeDeltas',[])):
   clock+=delta;t=(clock-offset)/1000
   if lo<=t<=hi:
    total+=delta;leaves[ident]+=delta;walk=ident
    while walk:
     stacks[walk]+=delta;walk=parents.get(walk)
  def rows(counts):
   return [{'ms':us/1000,'function':nodes[ident]['callFrame']['functionName'],'url':nodes[ident]['callFrame']['url'],'line':nodes[ident]['callFrame']['lineNumber']+1} for ident,us in counts.most_common(35)]
  result['windows'][label]={'start':lo,'end':hi,'sample_weight_ms':total/1000,'leaf':rows(leaves),'inclusive':rows(stacks)}
 (d/'profile-analysis.json').write_text(json.dumps(result,indent=2))
 print(d.name,json.dumps(result['windows'],indent=2)[:9000])
