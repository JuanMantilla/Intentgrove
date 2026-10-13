import {invoke} from '@tauri-apps/api/core';
import {readAcceptanceApp} from '../qa/bridge';
import { settingsApi } from '../../../src/app/settings-contract';
import { ownerObservation, readerResult, unmountQA, waitOwnerStops } from './observer';
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function until<T>(read:()=>T|Promise<T>,accept:(v:T)=>boolean,ms=4000):Promise<T>{const start=performance.now();let value:T;do{value=await read();if(accept(value))return value;await sleep(25);}while(performance.now()-start<ms);throw Error('bounded runtime condition failed: '+JSON.stringify(value!));}
function assert(value:unknown,message:string):asserts value{if(!value)throw Error(message);}
const records:any[]=[];
export async function runSettingsProbe(){
 let calls=0;const get=settingsApi.get;settingsApi.get=()=>{calls++;return get();};
 try{
  const before=await until(()=>settingsApi.get(),s=>s.ownerAvailable&&s.persistence==='saved');
  assert(before.values.readingSize===16&&before.values.language==='en','probe requires unchanged16px/English QA test preferences');
  await until(()=>document.querySelector<HTMLInputElement>('input[type="number"]'),e=>Boolean(e));
  assert(!document.querySelector('fieldset:disabled'),'available owner controls disabled');
  assert(ownerObservation().listeners===0,'Settings registered workspace event listeners');
  records.push({case:'initialization',snapshot:before,ownerListeners:ownerObservation().listeners});
  const input=document.querySelector<HTMLInputElement>('input[type="number"]')!;
  input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'22');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
  const changed=await until(()=>settingsApi.get(),s=>s.values.readingSize===22&&s.persistence==='saved');
  assert(changed.revision>before.revision&&changed.requestId,'native acknowledgment not correlated');
  await until(()=>({value:input.value,disabled:input.closest('fieldset')!.disabled}),v=>v.value==='22'&&!v.disabled);
  records.push({case:'acknowledged-reading',snapshot:changed});
  input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'16');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new FocusEvent('focusout',{bubbles:true}));
  const restored=await until(()=>settingsApi.get(),s=>s.values.readingSize===16&&s.persistence==='saved'&&s.revision>changed.revision);
  records.push({case:'restored-reading',snapshot:restored});
  unmountQA();const atUnmount=calls;await sleep(1100);assert(calls===atUnmount,'Settings poll continued after unmount');assert(ownerObservation().listeners===0,'Settings acquired owner listeners');
  records.push({case:'settings-cleanup',callsAtUnmount:atUnmount,callsAfter:calls,ownerListeners:0});
  show({passed:true,records});
 }catch(error){show({passed:false,error:String(error),records});}
}
function show(report:any){for(const record of report.records??[]){const row=document.createElement('p');row.textContent=JSON.stringify(record);document.body.append(row);}const verdict=document.createElement('p');verdict.textContent=report.passed?'QA Settings probe PASS':'QA Settings probe FAIL: '+report.error;document.body.append(verdict);const output=document.createElement('textarea');output.readOnly=true;output.setAttribute('aria-label','QA Settings evidence');output.style.cssText='width:95vw;height:70vh';output.value=JSON.stringify(report);document.body.append(output);}
export async function observeReaderProbe(){
 try{
  const first=await until(()=>readAcceptanceApp(),a=>Boolean(a?.sessionReady||a?.restorePending),10000);
  if(first?.restorePending){
   assert(first.restoreTabCount===0&&!first.restoreHasRoot,'probe refuses to restore a nonempty QA checkpoint');
   const before=await settingsApi.getWorkspace();assert(!before.ownerAvailable&&ownerObservation().listeners===0,'restoration gate did not withhold ownership');
   readerResult.restorationGateBefore={sessionReady:first.sessionReady,restorePending:true,snapshot:before,ownerListeners:0};
   const restore=Array.from(document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button')).find(b=>b.textContent==='Restore workspace');
   assert(restore,'actual Restore workspace action missing');restore.click();
  }
  const app=await until(()=>readAcceptanceApp(),a=>Boolean(a?.sessionReady),4000);
  const ready=await until(()=>settingsApi.getWorkspace(),s=>s.ownerAvailable,4000);
  readerResult.restorationGateAfter={sessionReady:app?.sessionReady,snapshot:ready,ownerListeners:ownerObservation().listeners};
  assert(app&&app.tabs.length===0&&app.edits.length===0,'probe refuses an occupied QA workspace');
  await until(()=>ownerObservation(),o=>o.accepted22&&o.restoredAfter22,120000);
  unmountQA();await waitOwnerStops();assert(ownerObservation().pendingNativeStops===0&&ownerObservation().stopFailures.length===0,"native unlisten acknowledgments incomplete");assert(ownerObservation().listeners===0,'reader owner listeners survived unmount');readerResult.passed=true;
 }catch(error){readerResult.error=String(error);}finally{readerResult.done=true;}
 const snapshot=await settingsApi.getWorkspace();
 // Allow the operator to capture the Settings-local result before the owned QA process exits.
 await sleep(20000);
 await invoke('diagram_acceptance',{action:'finish',report:{kind:'settings-integration',passed:readerResult.passed,readerResult,snapshot,owner:ownerObservation()}});
}

