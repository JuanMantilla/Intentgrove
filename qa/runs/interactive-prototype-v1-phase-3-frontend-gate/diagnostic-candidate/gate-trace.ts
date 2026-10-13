import {appendFileSync} from 'node:fs';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {expect} from 'vitest';
const delay=monitorEventLoopDelay({resolution:10});
let mocks:any={};let start=0;let previous=0;let observer:MutationObserver|undefined;
function state(){return {tabs:[...document.querySelectorAll('[role=tab]')].map(x=>[x.textContent,x.getAttribute('aria-selected')]),headingLabels:[...document.querySelectorAll('[aria-label]')].map(x=>x.getAttribute('aria-label')).filter(x=>x?.includes('Edit section')),reader:document.querySelector('.document-page')?.textContent,editors:document.querySelectorAll('.rich-section,.cm-editor').length,mocks:Object.fromEntries(Object.entries(mocks).filter(([,v]:any)=>v?.mock).map(([k,v]:any)=>[k,{calls:v.mock.calls,results:v.mock.results.map((r:any)=>r.type)}])),listeners:Object.keys(mocks.listeners??{}),worker:typeof Worker,fakeTimer:(setTimeout as any).clock!==undefined};}
export function trace(phase:string,extra:any={}){const now=performance.now();appendFileSync(process.env.GATE_TRACE!,JSON.stringify({test:expect.getState().currentTestName,pid:process.pid,phase,ms:now,elapsed:now-start,gap:now-previous,loopMax:delay.max/1e6,...extra})+'\n');previous=now;}
export function begin(m:any){mocks=m;start=performance.now();previous=start;delay.reset();delay.enable();trace('beforeEach',{state:state()});(globalThis as any).__gateTrace=trace;observer=new MutationObserver(()=>trace('DOM',{state:state()}));observer.observe(document.body,{childList:true,subtree:true});}
export function phase(label:string){trace(label,{state:state()});}
export function end(){phase('after-cleanup');observer?.disconnect();delay.disable();delete (globalThis as any).__gateTrace;}
export async function query<T>(f:()=>Promise<T>):Promise<T>{phase('query-start');try {const v=await f();phase('query-success');return v;}catch(e){trace('query-failure',{state:state(),html:document.body.innerHTML});throw e;}}
