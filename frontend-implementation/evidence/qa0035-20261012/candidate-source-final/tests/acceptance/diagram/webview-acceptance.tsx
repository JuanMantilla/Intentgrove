import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {invoke} from '@tauri-apps/api/core';
import {api} from '../../../src/app/api';
import MarkdownView from '../../../src/reader/MarkdownView';
import '../../../src/styles/app.css';
const valid='flowchart LR\nA-->B';
import cases from './cases.json';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const check=(value:unknown,message:string)=>{if(!value)throw Error(message)};
async function until(read:()=>boolean|Promise<boolean>,message:string,ms=6000){const start=performance.now();while(!await read()){if(performance.now()-start>ms)throw Error(message);await sleep(5)}}
const control=(action:string,mode?:string,report?:unknown)=>invoke<any>('diagram_acceptance',{action,mode,report});
const transportSamples:any[]=[];
const actualRender=api.renderDiagram;
api.renderDiagram=async(...args:Parameters<typeof actualRender>)=>{const value=await actualRender(...args);if(transportSamples.length<2)transportSamples.push(value);return value};
const records:any[]=[];const network:any[]=[];const cancellationAcks:{job:string;start:number;elapsed:number}[]=[];
const nativeCancel=api.cancelDiagram;
api.cancelDiagram=async job=>{const start=performance.now();try{return await nativeCancel(job)}finally{cancellationAcks.push({job,start,elapsed:performance.now()-start})}};
function observe(){
 document.addEventListener('securitypolicyviolation',e=>network.push({kind:'csp',url:e.blockedURI,directive:e.effectiveDirective,at:performance.now()}));
 const fetch=window.fetch;window.fetch=function(input,init){network.push({kind:'fetch',url:String(input),at:performance.now()});return fetch.call(this,input,init)};
 const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method:string,url:string|URL,...args:any[]){network.push({kind:'xhr',url:String(url),at:performance.now()});return (open as any).call(this,method,url,...args)};
 new PerformanceObserver(list=>{for(const e of list.getEntries())network.push({kind:'resource',url:e.name,at:performance.now()})}).observe({entryTypes:['resource']});
}
async function snapshot(){return control('snapshot')}
async function configure(mode:string){await until(async()=>!(await snapshot()).active,'parent not idle');await control('configure',mode)}
export async function run(){
 observe();const mount=document.getElementById('root')!;const root=createRoot(mount);
 let passed=false;let failure='';let nativeFinishes=false;
 const show=(content:string,id:string)=>flushSync(()=>root.render(<MarkdownView content={content} fileId={id} locale="en" onNavigate={()=>{}}/>));
 try{
  await configure('production');
  for(const [source,job,generation] of [[valid,'bad/job',1],[valid,'zero-generation',0],['é'.repeat(20000),'oversource',1]] as const){
   let code='';try{await api.renderDiagram(source,job,generation)}catch(e:any){code=e.code}check(code==='diagram_input_limit','native admission failed');records.push({kind:'native-admission',job,code,state:await snapshot()});
  }
  let malformedRejected=false;try{await invoke('render_diagram',{source:123,jobId:'bad-type',generation:1})}catch{malformedRejected=true}check(malformedRejected,'malformed invoke accepted');records.push({kind:'malformed-invoke',rejected:malformedRejected});
  // Actual production components -> real invoke -> production parent -> unchanged packaged helpers.
  for(const mode of ['production','observe'])for(let i=0;i<cases.length;i++){
   await configure(mode);const grant=await control('fixture',String(i));const doc=await api.readDocument({fileId:grant.id});const content=doc.content;
   const start=network.length;show(content,`${mode}-${i}`);
   await until(()=>{const blocks=Array.from(mount.querySelectorAll('.diagram-block'));return blocks.length===2&&blocks.every(b=>b.querySelector('img,p[role=alert]'))},'diagram never settled',10000);
   check(!!mount.querySelector('.diagram-block')?.querySelector('img')===(i<2),`wrong block result ${mode} ${i}`);
   check(mount.textContent?.includes('Readable before')&&mount.textContent?.includes('Readable after'),'unaffected siblings missing');
   check(!mount.querySelector('svg,iframe,script,object,embed'),'active document output');check(mount.querySelectorAll('.diagram-block img').length===(i<2?2:1),'valid sibling missing');check(!(window as any).__hostileExecuted,'document code executed');
   await sleep(40);await until(async()=>!(await snapshot()).active,'child remained active');
   const state=await snapshot();check(!state.child?.alive,'child survived');
   const attempts=network.slice(start).filter(e=>!e.url.startsWith('blob:')&&!/^(?:ipc:|http:\/\/ipc.localhost)/.test(e.url));check(attempts.length===0,`document resource attempt ${JSON.stringify(attempts)}`);
   records.push({kind:'document',mode,index:i,source:cases[i],state,attempts,result:i<2?'pixels':'localized-fallback'});
   show('# Unrelated\n\nReady','unrelated');await sleep(10);
  }
  for(const mode of ['token','job','digest','generation','version','unknown','length','dimensions','ihdr','invalid-png','oversized','malformed','truncated','header-limit']){
   await configure(mode);show(`Before\n\n\`\`\`mermaid\n${valid}\n\`\`\`\n\nAfter`,`forged-${mode}`);
   await until(()=>!!mount.querySelector('[role=alert]'),'forgery did not fail');check(!mount.querySelector('.diagram-block img'),'forged pixels displayed');
   await until(async()=>!(await snapshot()).active,'forged child remained active');records.push({kind:'forged-child',mode,state:await snapshot()});show('# Unrelated\n\nReady','unrelated');await sleep(10);
  }
  await configure('resources');show(`\`\`\`mermaid\n${valid}\n\`\`\``,'resource-probes');await until(()=>!!mount.querySelector('.diagram-block img'),'resource-probe valid render');records.push({kind:'resource-probes',state:await snapshot()});show('# Unrelated\n\nReady','unrelated');
  const busy='flowchart LR\n'+Array.from({length:100},(_,i)=>`A${i}-->A${i+1}`).join('\n');
  for(const phase of ['parse-entered','render-entered'])for(let i=0;i<10;i++){
   await configure('observe');show(`\`\`\`mermaid\n${busy}\n\`\`\``,`cancel-${phase}-${i}`);
   await until(async()=>((await snapshot()).child?.events??[]).some((l:string)=>l.includes(phase)),'no Mermaid phase',2200);
   await sleep(5);const before=await snapshot();check(before.child.alive,'execution already ended');const start=performance.now();const ackIndex=cancellationAcks.length;show('# Unrelated\n\nReady',`next-${phase}-${i}`);
   await until(async()=>!(await snapshot()).active,'cancel did not finish');await until(()=>!!mount.textContent?.includes('Ready'),'unrelated content not ready',1000);await until(()=>cancellationAcks.length>ackIndex,'native cancellation acknowledgment missing',250);const elapsed=performance.now()-start;const state=await snapshot();check(!state.child.alive,'cancel child survived');check(state.child.cancelled,'no parent cancellation observed');const ack=cancellationAcks[ackIndex];check(ack.elapsed<250,`native cancellation ack ${ack.elapsed}ms`);check(mount.textContent?.includes('Ready')&&!mount.querySelector('.diagram-block img'),'stale display');records.push({kind:'cancel',phase,index:i,before,state,elapsed,ack});
  }
  await configure('observe');
  const ownerJob='owner-'+crypto.randomUUID();const owner=api.renderDiagram(busy,ownerJob,99).catch(e=>e);
  await until(async()=>((await snapshot()).child?.events??[]).some((l:string)=>l.includes('render-entered')),'owner render entry',2200);
  await api.cancelDiagram('wrong-owner');const still=await snapshot();check(still.child.alive,'foreign cancellation killed owner');
  let busyCode='';try{await api.renderDiagram(valid,'concurrent-'+crypto.randomUUID(),100)}catch(e:any){busyCode=e.code}check(busyCode==='diagram_busy','single-flight ownership');
  await api.cancelDiagram(ownerJob);const cancelled=await owner;check(cancelled.code==='diagram_cancelled','owner cancellation outcome');
  records.push({kind:'ownership',still,state:await snapshot(),busyCode});
  const pre='pre-'+crypto.randomUUID();await api.cancelDiagram(pre);let preCode='';try{await api.renderDiagram(valid,pre,101)}catch(e:any){preCode=e.code}check(preCode==='diagram_cancelled','pre-cancel lost');records.push({kind:'pre-cancel',preCode});
  for(const phase of ['busy-parse','busy-render']){
   await configure(phase);const start=performance.now();show(`\`\`\`mermaid\n${busy}\n\`\`\``,phase);await until(()=>!!mount.querySelector('[role=alert]'),'deadline missing');const state=await snapshot();check(!state.child.alive,'deadline child survived');records.push({kind:'deadline',phase,state,elapsed:performance.now()-start});show('# Unrelated\n\nReady','unrelated');
  }
  // Hold actual successful native pixels, then navigate, replace source or close before delivery.
  const native=api.renderDiagram;
  for(const action of ['navigation','replacement','close']){
   await configure('production');let release!:(v:any)=>void;let actual:any;let entered=false;
   api.renderDiagram=async (...args:Parameters<typeof native>)=>{actual=await native(...args);entered=true;return new Promise(r=>{release=r})};
   show(`\`\`\`mermaid\n${valid}\n\`\`\``,`late-${action}`);await until(()=>entered,'real native pixels not obtained');
   if(action==='replacement')show(`\`\`\`mermaid\nflowchart broken\n\`\`\``,'replacement');else show('# Unrelated\n\nReady',action);
   release(actual);api.renderDiagram=native;await sleep(150);check(!mount.querySelector('.diagram-block img'),'late pixels applied');records.push({kind:'late-real-reply',action,state:await snapshot()});
  }
  // Renderer defense against forged transport replies made from actual decoded native output.
  for(const field of ['jobId','generation','width','bytes']){
   await configure('production');api.renderDiagram=async (...args:Parameters<typeof native>)=>{const value=await native(...args);if(field==='jobId')value.jobId='forged';if(field==='generation')value.generation++;if(field==='width')value.width=2049;if(field==='bytes')value.bytes.pop();return value};
   show(`\`\`\`mermaid\n${valid}\n\`\`\``,`renderer-forged-${field}`);await until(()=>!!mount.querySelector('[role=alert]'),'renderer accepted forged transport');check(!mount.querySelector('.diagram-block img'),'forged transport displayed');records.push({kind:'forged-transport',field});api.renderDiagram=native;show('# Unrelated\n\nReady','unrelated');await sleep(20);
  }
  // Destroy the actual native owner window while Mermaid is executing. Native completes the report.
  await configure('observe');show(`\`\`\`mermaid\n${busy}\n\`\`\``,'owner-window-close');
  await until(async()=>((await snapshot()).child?.events??[]).some((l:string)=>l.includes('render-entered')),'window-close render entry',2200);
  const beforeClose=await snapshot();check(beforeClose.child.alive,'window-close child not executing');
  nativeFinishes=true;await control('destroy-owner',undefined,{passed:true,failure:'',records,network,transportSamples,cancellationAcks,beforeClose,userAgent:navigator.userAgent,timeOrigin:performance.timeOrigin});
  return;
 }catch(e){failure=String(e);records.push({kind:'failure-state',state:await snapshot(),dom:mount.innerHTML.slice(0,2000)})}
 finally{if(!nativeFinishes){root.unmount();await control('finish',undefined,{passed,failure,records,network,transportSamples,cancellationAcks,userAgent:navigator.userAgent,timeOrigin:performance.timeOrigin})}}
}
