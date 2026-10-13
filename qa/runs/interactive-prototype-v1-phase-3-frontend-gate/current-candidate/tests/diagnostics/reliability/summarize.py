"""Derive current experiment metrics without attributing a cause to missing historical traces."""
from pathlib import Path
import json,collections
root=Path(__file__).resolve().parents[3];p=root/'qa/runs/macos-remaining-20261008/reliability/session-20261008'
summary={'historicalCause':'UNKNOWN','historicalCausalResolution':False,'historicalDeadlineMs':5000,'experiments':{}}
for prefix in ['focused','isolated','held-adapter','eight-worker-attempt-01','concurrent-attempt-01']:
 rows=[json.loads(line)for f in sorted(p.glob(prefix+'-*.jsonl'))for line in f.read_text().splitlines()];targets={}
 for test in sorted({r['test']for r in rows if 'cancels Save As without clearing'in(r.get('test')or'')or r.get('test','').endswith('quit: Cancel')}):
  selected=[r for r in rows if r['test']==test];clean=[r for r in selected if r['phase']=='cleanup:settled'];phases=[{k:r[k]for k in ['phase','elapsedMs','pid','threadId']}for r in selected if r['phase']not in ['heartbeat','mock:settled','mock:rejected','listener:register','listener:remove']]
  targets[test]={'phases':phases,'maxLoopDelayMs':max(r['loopMaxMs']or 0 for r in selected),'maxRSSKiB':max(r['resource']['maxRSS'] for r in selected),'workerAPIs':sorted({r['workerAPI']for r in selected}),'nativeBridgeValues':sorted({r.get('nativeBridge',False)for r in selected}),'postCleanup':[{'editors':r['editors'],'listeners':r['listeners'],'pending':r['pending'],'nodeResources':r['activeNodeResources']}for r in clean]}
 summary['experiments'][prefix]={'rows':len(rows),'observedPIDs':sorted({r['pid']for r in rows}),'targets':targets,'staleListenerStops':sum(r['phase']=='listener:remove'and not r.get('ownsCurrent',True)for r in rows)}
for label in ['eight-worker-attempt-01','concurrent-attempt-01']:
 d=json.loads((p/(label+'-processes.json')).read_text());summary['experiments'][label]['processObservation']={k:v for k,v in d.items()if k!='processSamples'};summary['experiments'][label]['ownedPIDs']=sorted({r['pid']for sample in d['processSamples']for r in sample['processes']});summary['experiments'][label]['maxAggregateRSSKiB']=max(sum(r['rssKiB']for r in sample['processes'])for sample in d['processSamples'])
summary['eightWorkerContext']='QA package builds overlapped the first eight-worker run; it is a retained current passing observation, not an idle controlled baseline. The subsequent concurrent-attempt01 uses only its explicitly owned compiler/test work.'
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:v['processObservation']for k,v in summary['experiments'].items()if 'processObservation'in v},indent=2))
