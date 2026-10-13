import {writeFileSync} from 'node:fs';
import {beforeEach,afterEach,afterAll,expect} from 'vitest';
const rows:unknown[]=[]; let owner=0;const owners=new WeakMap<object,number>();
const selected=()=>/new-markdown|appearance-operations|approved-navigation|edit-flow|automatic-refresh/.test(expect.getState().testPath??'');
(globalThis as any).__qaTrace=(event:string,data:object={})=>{if(selected())rows.push({n:rows.length,at:performance.now(),test:expect.getState().currentTestName,event,...data});};
beforeEach(()=>{if(!selected())return;
 document.addEventListener('click',click,true);document.addEventListener('scroll',scroll,true);
 const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'scrollTop')!;
 const setter=function(this:Element,value:number){if(this.classList.contains('reader-scroll'))(globalThis as any).__qaTrace('scroll-write',{before:descriptor.get!.call(this),value,stack:new Error().stack});descriptor.set!.call(this,value);};
 Object.defineProperty(Element.prototype,'scrollTop',{...descriptor,set:setter});restore=()=>Object.defineProperty(Element.prototype,'scrollTop',descriptor);
});
let restore:(()=>void)|undefined;
function click(e:Event){const el=e.target as HTMLElement;(globalThis as any).__qaTrace('click',{text:el.textContent?.slice(0,100),title:el.getAttribute('title'),disabled:(el as HTMLButtonElement).disabled});}
function scroll(e:Event){const el=e.target as HTMLElement;if(el.classList.contains('reader-scroll'))(globalThis as any).__qaTrace('scroll',{value:el.scrollTop});}
afterEach(()=>{if(!selected())return;(globalThis as any).__qaTrace('case-end',{headings:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent),dialogs:document.querySelectorAll('[role=dialog]').length,loading:[...document.querySelectorAll('[role=status]')].map(x=>x.textContent)});restore?.();restore=undefined;document.removeEventListener('click',click,true);document.removeEventListener('scroll',scroll,true);});
afterAll(()=>{if(rows.length)writeFileSync("/Users/juanmantilla/projects/personal/md-reader/qa/runs/qa0033-0040-final-retest-20261012T044500Z"+'/evidence/trace-final-'+process.pid+'-'+Date.now()+'.json',JSON.stringify(rows,null,2));delete(globalThis as any).__qaTrace;});
