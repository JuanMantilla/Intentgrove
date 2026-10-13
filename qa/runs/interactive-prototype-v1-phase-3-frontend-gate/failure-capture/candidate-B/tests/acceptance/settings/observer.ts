// QA-only, no native capabilities. Observe actual lifecycle operations, never substitute results.
const events: Array<{at:number;phase:string;name?:string;size?:number;persistence?:string}> = [];
let stopRoot: (()=>void)|undefined;
let count=0;
const nativeStops=new Set<Promise<void>>();
const stopFailures:string[]=[];
let accepted22=false, restoredAfter22=false;
export function rootOwner(stop:()=>void){stopRoot=stop;}
export function unmountQA(){stopRoot?.();}
export function ownerTrace(phase:string,value?:any){
 if(phase==='register')count++;if(phase==='remove')count--;
 if(phase==='accept'&&value?.persistence==='saved'){
  if(value.values.readingSize===22)accepted22=true;
  if(accepted22&&value.values.readingSize===16)restoredAfter22=true;
 }
 events.push({at:performance.now(),phase,...(typeof value==='string'?{name:value}:value?.values?{size:value.values.readingSize,persistence:value.persistence}:{})});
 if(events.length>256)throw Error('bounded owner trace exceeded');
}
export function stopOwner(name:string,stop:()=>void){
 ownerTrace('remove-request',name);
 const pending=Promise.resolve(stop());nativeStops.add(pending);
 pending.then(()=>{ownerTrace('remove',name);nativeStops.delete(pending);},error=>{stopFailures.push(String(error));ownerTrace('remove-failed',name);nativeStops.delete(pending);});
 return pending;
}
export async function waitOwnerStops(){await Promise.all([...nativeStops]);if(stopFailures.length)throw Error('native unlisten failed: '+stopFailures.join(','));}
export function ownerObservation(){return {listeners:count,pendingNativeStops:nativeStops.size,stopFailures:stopFailures.slice(),accepted22,restoredAfter22,events:events.slice()};}
export const readerResult:{done:boolean;passed:boolean;error:string;restorationGateBefore?:unknown;restorationGateAfter?:unknown}={done:false,passed:false,error:''};
