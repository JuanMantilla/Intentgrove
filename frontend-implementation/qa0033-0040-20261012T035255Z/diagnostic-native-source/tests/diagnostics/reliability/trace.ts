import { appendFileSync } from 'node:fs';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createHook } from 'node:async_hooks';
import { threadId } from 'node:worker_threads';
import { expect } from 'vitest';
type Mocks = Record<string, any>;
let owner = 0, start = 0, mocks: Mocks = {}, active = false;
const pending = new Map<Promise<unknown>, { owner: number; mock: string; order: number; state: string }>();
const resources = new Map<number, string>();
const listeners = new Map<string, { owner: number; callback: unknown }>();
const delay = monitorEventLoopDelay({ resolution: 10 });
let timer: ReturnType<typeof setInterval> | undefined;
const hook = createHook({ init(id,type) { if (active && !['PROMISE','TickObject'].includes(type)) resources.set(id,type); }, destroy(id) { resources.delete(id); } });
function write(phase: string, extra: object = {}) {
 const base = process.env.INTENTGROVE_TRACE;
 if (!base) return;
 appendFileSync(`${base}-${process.pid}-${threadId}.jsonl`, JSON.stringify({phase,ms:performance.now(),elapsedMs:performance.now()-start,pid:process.pid,threadId,owner,test:expect.getState().currentTestName,cpu:process.cpuUsage(),resource:process.resourceUsage(),loopMaxMs:Number.isFinite(delay.max)?delay.max/1e6:null,activeNodeResources:process.getActiveResourcesInfo(),asyncResources:[...resources.values()],workerAPI:typeof globalThis.Worker,nativeBridge:Boolean((window as any).__TAURI_INTERNALS__),editors:document.querySelectorAll('.cm-editor').length,listeners:Object.keys(mocks.listeners??{}),pending:[...pending.values()].filter(x=>x.state==='pending'),mocks:Object.fromEntries(Object.entries(mocks).filter(([,v])=>typeof v==='function').map(([k,v])=>[k,{calls:v.mock?.calls.length,orders:v.mock?.invocationCallOrder,results:v.mock?.results.map((r:any)=>r.type)}])),...extra})+'\n');
}
function observePromises() {
 for (const [name,fn] of Object.entries(mocks)) if (typeof fn==='function' && fn.mock) {
  fn.mock.results.forEach((r:any,i:number)=>{
   if (r.type!=='return'||!r.value||typeof r.value.then!=='function'||pending.has(r.value)) return;
   const record={owner,mock:name,order:fn.mock.invocationCallOrder[i],state:'pending'};pending.set(r.value,record);
   r.value.then(()=>{record.state='fulfilled';write('mock:settled',{mock:name,callOwner:record.owner,order:record.order});},()=>{record.state='rejected';write('mock:rejected',{mock:name,callOwner:record.owner,order:record.order});});
  });
 }
}
export function begin(next: Mocks) {
 owner++;start=performance.now();mocks=next;active=true;delay.reset();delay.enable();hook.enable();
 write('beforeEach:before-reset-observation');
 timer=setInterval(()=>{observePromises();write('heartbeat');},100);timer.unref();
}
export function phase(label: string) { observePromises();write(label); }
export function registered(name: string, callback: unknown) { listeners.set(name,{owner,callback});write('listener:register',{name}); }
export function removed(name: string, callback: unknown) { const current=listeners.get(name);write('listener:remove',{name,registeredOwner:current?.owner,ownsCurrent:current?.callback===callback});if(current?.callback===callback)listeners.delete(name); }
export async function finish(clean: () => void, act: (body: () => Promise<void>) => Promise<void>) {
 phase('cleanup:before');clean();phase('cleanup:unmounted');
 await act(async()=>{await Promise.resolve();await Promise.resolve();});
 phase('cleanup:settled');if(timer)clearInterval(timer);delay.disable();hook.disable();active=false;
 // Pending fixture promises are intentionally retained in the trace; never resolve them as cleanup success.
}
