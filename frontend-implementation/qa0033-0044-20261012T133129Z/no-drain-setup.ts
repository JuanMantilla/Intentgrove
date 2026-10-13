import {writeFileSync} from 'node:fs';
import {beforeEach,afterEach,afterAll,expect} from 'vitest';
import {configure,getConfig} from '@testing-library/dom';
const rows:unknown[]=[];
const selected=()=>/session.test|large-source.test|approved-navigation.test|edit-flow.test|automatic-refresh.test|new-markdown.test/.test(expect.getState().testPath??'');
(globalThis as any).__qaTrace=(event:string,data:object={})=>{if(selected())rows.push({at:performance.now(),cpu:process.cpuUsage(),test:expect.getState().currentTestName,event,...data});};
const trace=(event:string,data:object={})=>(globalThis as any).__qaTrace?.(event,data);
const snapshot=()=>({headings:[...document.querySelectorAll('h1,h2')].map(x=>x.textContent),buttons:[...document.querySelectorAll('button')].filter(x=>/Edit section|Choose folder/.test(x.textContent??'')||/Edit section/.test(x.getAttribute('aria-label')??'')).map(x=>({text:x.textContent,label:x.getAttribute('aria-label'),disabled:x.disabled})),source:document.querySelector('.large-source-text')?.textContent,zoom:(document.querySelector('.large-source-text') as HTMLElement)?.dataset.sourceZoom,worker:typeof Worker});
const originalError=getConfig().getElementError;
configure({getElementError(message,container){trace('query-error',{message,...snapshot()});return originalError(message,container);}});
function input(e:Event){const el=e.target as HTMLElement;trace(e.type,{text:el.textContent?.slice(0,80),title:el.getAttribute?.('title'),class:el.className,disabled:(el as HTMLButtonElement).disabled,ctrl:(e as WheelEvent).ctrlKey,delta:(e as WheelEvent).deltaY,...(e.type==='wheel'?snapshot():{})});}
beforeEach(()=>{if(!selected())return;configure({asyncWrapper: async cb => await cb()});trace('case-start');document.addEventListener('click',input,true);document.addEventListener('wheel',input,true);});
afterEach(()=>{if(!selected())return;trace('case-end',snapshot());document.removeEventListener('click',input,true);document.removeEventListener('wheel',input,true);});
afterAll(()=>{if(rows.length)writeFileSync("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0033-0044-20261012T133129Z/evidence"+'/trace-'+process.pid+'-'+Date.now()+'.json',JSON.stringify(rows,null,2));delete(globalThis as any).__qaTrace;});
