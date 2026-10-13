import { readFile,readdir,writeFile } from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
const assets='dist/assets'; const name=(await readdir(assets)).find(x=>/^markdownBudget.worker-.*\.js$/.test(x));
const worker={}; const results=[]; let result;
worker.postMessage=data=>{result=data};
runInNewContext(await readFile(`${assets}/${name}`,'utf8'),{self:worker,TextEncoder});
for(const size of [1048576,10485760]) {
 const source=await readFile(`/private/tmp/intentgrove-finish-20261008/fixtures/mixed-${size}.md`,'utf8');
 const trials=[];
 for(let trial=0;trial<11;trial++) {
  const began=performance.now();worker.onmessage({data:{version:1,generation:trial,source}}); const ms=performance.now()-began;
  if(result.kind!=='parsed')throw Error('parse failed');
  if(trial) trials.push({trial,ms,blocks:result.blocks.length,fallbacks:result.blocks.filter(x=>x.fallback).length,richNodes:result.tree.children.length});
 }
 results.push({size,sha256:createHash('sha256').update(source).digest('hex'),trials});
}
await writeFile('qa/runs/macos-finish-20261008/evidence/worker-performance.json',JSON.stringify({boundary:'Node VM production worker algorithm; excludes WebKit DOM/read; NOT native acceptance',results},null,2));
console.log(JSON.stringify(results.map(r=>({size:r.size,min:Math.min(...r.trials.map(t=>t.ms)),max:Math.max(...r.trials.map(t=>t.ms)),blocks:r.trials[0].blocks}))));
