import {execFileSync} from "node:child_process";
import {loadavg,freemem} from "node:os";
import {Session} from "node:inspector";
import {monitorEventLoopDelay} from "node:perf_hooks";
// Disposable QA only. Imported exclusively by the copied workspace-handoff suite.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';
const names = ['TEST_START','APP_RENDER_BEGIN','APP_RENDER_READY','WORKSPACE_HANDOFF_BEGIN',
  'DOCUMENT_OPEN_REQUESTED','DOCUMENT_OPEN_RESOLVED','DOCUMENT_OPEN_REJECTED','ACTIVE_DOCUMENT_CHANGED',
  'SECTIONS_REQUESTED','SECTIONS_RESOLVED','SECTIONS_REJECTED','SECTIONS_CANCELLED',
  'SELECTION_ADAPTER_PUBLISHED','SELECTION_ADAPTER_CLEARED','MARKDOWN_PAINTED','MARKDOWN_RENDERED',
  'EDITOR_MOUNT_REQUESTED','EDITOR_MOUNTED','EDITOR_UNMOUNTED','EDITABLE_HEADING_RENDERED',
  'HEADING_LOOKUP_BEGIN','EDITABLE_HEADING_AVAILABLE','HEADING_LOOKUP_FAILED','TEST_FAILED',
  'DOCUMENT_RESULT_STALE','SELECTION_REQUEST_CANCELLED','SELECTION_REQUEST_WAITING','SELECTION_REQUEST_COMPLETED','HEADING_LOOKUP_SYNC_RETURN','FILE_CLICK_BEGIN','FILE_CLICK_END'];
const profiler=new Session();
const loop=monitorEventLoopDelay({resolution:20});
let profileStarted=false,profileStopped=false;
let testCpu=process.cpuUsage();
const capacity=512;
const ring=Array.from({length:capacity},()=>({t:0,event:0,id:null as any,value:null as any,generation:null as any}));
let count=0, captured=false, mocks:any, test='', headingsSeen=new Set<unknown>();
const providers:Record<string,()=>unknown>={};
function event(code:number,id?:unknown,value?:unknown,generation?:unknown){
  const slot=ring[count++ % capacity]; slot.t=performance.now();slot.event=code;slot.id=id;slot.value=value;slot.generation=generation;
}
function heading(id:unknown,section:unknown){
  if(headingsSeen.has(section))return;headingsSeen.add(section);event(19,id,section);
}
export function begin(nativeMocks:any){
  if(!profileStarted){
    profiler.connect();profiler.post('Profiler.enable');
    profiler.post('Profiler.setSamplingInterval',{interval:2000});profiler.post('Profiler.start');
    profileStarted=true;loop.enable();
  }
  loop.reset();testCpu=process.cpuUsage();
  count=0;captured=false;headingsSeen.clear();mocks=nativeMocks;
  for(const key of Object.keys(providers))delete providers[key];
  test=expect.getState().currentTestName??'unknown';
  (globalThis as any).__fc={event,providers,heading};event(0);
}
export function mark(code:number){event(code);}
function safe(value:any){
  return JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='symbol'?String(v):v instanceof Map?[...v]:v instanceof Set?[...v]:typeof v==='function'?'[function]':v));
}
export function failure(error:unknown,code=22){
  if(captured)return; event(code); captured=true;
  const failureTime=performance.now();
  const resource={loadavg:loadavg(),freeMemory:freemem(),clock:{hrtimeUs:Number(process.hrtime.bigint()/1000n),performanceMs:performance.now()},testCpu:process.cpuUsage(testCpu),loopMaxMs:loop.max/1e6,loopMeanMs:loop.mean/1e6,loopP99Ms:loop.percentile(99)/1e6,cpu:process.cpuUsage(),memory:process.memoryUsage()};
  const events=Array.from({length:Math.min(count,capacity)},(_,i)=>{
    const e=ring[(Math.max(0,count-capacity)+i)%capacity];
    return {...e,event:names[e.event]};
  });
  const states:Record<string,unknown>={};
  for(const [key,get] of Object.entries(providers)){
    try{states[key]=safe(get());}catch(e){states[key]={captureError:String(e)};}
  }
  const native:Record<string,unknown>={listeners:Object.keys(mocks.listeners)};
  for(const key of ['selectRoot','listEntries','readDocument','listEditSections','beginSectionEdit']){
    const m=mocks[key].mock;
    native[key]={calls:m.calls,results:m.results.map((r:any)=>({type:r.type,promise:r.value instanceof Promise})),settledResults:m.settledResults};
  }
  const root=document.body.firstElementChild;
  const reader=document.querySelector('.document-page');
  const markdown=document.querySelector('.document-selection-root');
  const headings=[...document.querySelectorAll('.section-edit-button')].map(e=>({html:e.outerHTML,connected:e.isConnected,hidden:!!e.closest('[hidden],[aria-hidden="true"]')}));
  const dom={root:root?{tag:root.tagName,attributes:[...root.attributes].map(a=>[a.name,a.value]),children:[...root.children].map(e=>({tag:e.tagName,class:e.className,role:e.getAttribute('role')}))}:null,
    documentView:reader?.outerHTML??null,expectedEditorParent:markdown?.outerHTML??null};
  const dir=resolve(__dirname,'../captures',Date.now()+'-'+process.pid);
  mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,'resource-at-failure.json'),JSON.stringify(resource,null,2));
  if(!profileStopped){profileStopped=true;profiler.post('Profiler.stop',(error,result)=>{
    writeFileSync(resolve(dir,'failure.cpuprofile'),JSON.stringify(error?{error:String(error)}:result.profile));
    profiler.disconnect();loop.disable();
  });}
  writeFileSync(resolve(dir,'failing-ring-buffer.json'),JSON.stringify({test,failureTime,dropped:Math.max(0,count-capacity),events},null,2));
  writeFileSync(resolve(dir,'failing-state.json'),JSON.stringify({test,failureTime,error:String(error),states,native:safe(native),headings,
    domTabs:[...document.querySelectorAll('[role="tab"]')].map(e=>({text:e.textContent,selected:e.getAttribute('aria-selected')})),
    worker:typeof Worker,fakeTimers:Boolean((setTimeout as any).clock)},null,2));
  writeFileSync(resolve(dir,'focused-dom.txt'),JSON.stringify(dom,null,2));
  try { writeFileSync(resolve(dir,'processes-after-failure.txt'), execFileSync('/bin/ps',['-axo','pid,ppid,pcpu,pmem,etime,comm'],{encoding:'utf8'}).split('\n').filter(line=>/PID|node|cargo|rustc|clang|Python/.test(line)).join('\n')); } catch {}
}
export function end(){delete (globalThis as any).__fc;}
