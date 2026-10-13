from pathlib import Path
import shutil,json
out=Path(__file__).resolve().parent;root=out.parents[2];c=out/'diagnostic-candidate'
shutil.copytree(out/'current-candidate',c,ignore=shutil.ignore_patterns('node_modules','target','dist','.vite'))
(c/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
(c/'gate-trace.ts').write_text('''import {appendFileSync} from 'node:fs';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {expect} from 'vitest';
const delay=monitorEventLoopDelay({resolution:10});
let mocks:any={};let start=0;let previous=0;let observer:MutationObserver|undefined;
function state(){return {tabs:[...document.querySelectorAll('[role=tab]')].map(x=>[x.textContent,x.getAttribute('aria-selected')]),headingLabels:[...document.querySelectorAll('[aria-label]')].map(x=>x.getAttribute('aria-label')).filter(x=>x?.includes('Edit section')),reader:document.querySelector('.document-page')?.textContent,editors:document.querySelectorAll('.rich-section,.cm-editor').length,mocks:Object.fromEntries(Object.entries(mocks).filter(([,v]:any)=>v?.mock).map(([k,v]:any)=>[k,{calls:v.mock.calls,results:v.mock.results.map((r:any)=>r.type)}])),listeners:Object.keys(mocks.listeners??{}),worker:typeof Worker,fakeTimer:(setTimeout as any).clock!==undefined};}
export function trace(phase:string,extra:any={}){const now=performance.now();appendFileSync(process.env.GATE_TRACE!,JSON.stringify({test:expect.getState().currentTestName,pid:process.pid,phase,ms:now,elapsed:now-start,gap:now-previous,loopMax:delay.max/1e6,...extra})+'\\n');previous=now;}
export function begin(m:any){mocks=m;start=performance.now();previous=start;delay.reset();delay.enable();trace('beforeEach',{state:state()});(globalThis as any).__gateTrace=trace;observer=new MutationObserver(()=>trace('DOM',{state:state()}));observer.observe(document.body,{childList:true,subtree:true});}
export function phase(label:string){trace(label,{state:state()});}
export function end(){phase('after-cleanup');observer?.disconnect();delay.disable();delete (globalThis as any).__gateTrace;}
export async function query<T>(f:()=>Promise<T>):Promise<T>{phase('query-start');try {const v=await f();phase('query-success');return v;}catch(e){trace('query-failure',{state:state(),html:document.body.innerHTML});throw e;}}
''')
for name in ['close-edit','workspace-handoff']:
 p=c/f'tests/ui/{name}.test.tsx';s=p.read_text();s='import {begin,phase,end,query} from "../../gate-trace";\n'+s;s=s.replace('beforeEach(() => {','beforeEach(() => {\n  begin(mocks);',1);s=s.replace('afterEach(() => { cleanup();','afterEach(() => { phase("before-cleanup"); cleanup(); end();',1)
 if name=='close-edit':s=s.replace('await screen.findByLabelText("Edit section: One")','await query(() => screen.findByLabelText("Edit section: One"))',1)
 else:s=s.replace('await screen.findByRole("button", { name: "Edit section “One”" });','await query(() => screen.findByRole("button", { name: "Edit section “One”" }));',1)
 s=s.replace('  render(<App />);','  phase("render-start"); render(<App />); phase("render-end");',1);s=s.replace('  fireEvent.click(await screen.findByTitle("a.md"));','  phase("file-lookup-start"); const file = await screen.findByTitle("a.md"); phase("file-click-start"); fireEvent.click(file); phase("file-click-end");',1);p.write_text(s)
p=c/'src/app/App.tsx';s=p.read_text();s=s.replace('const active = tabs.find((tab) => tab.id === activeId) ?? null;','const active = tabs.find((tab) => tab.id === activeId) ?? null;\n  (globalThis as any).__gateTrace?.("App-render",{activeId,active,sectionsByTab});',1);s=s.replace('void api.listEditSections(active.id).then((result) => {','(globalThis as any).__gateTrace?.("sections-effect",{active});\n    void api.listEditSections(active.id).then((result) => {\n      (globalThis as any).__gateTrace?.("sections-result",{cancelled,result});',1);p.write_text(s)
p=c/'src/reader/MarkdownView.tsx';s=p.read_text();s=s.replace('  const editRange = useMemo(() => {','  (globalThis as any).__gateTrace?.("Markdown-render",{fileId,sections,hasWorker,retaining,layoutPending,mapValid:sectionMap?.valid});\n  const editRange = useMemo(() => {',1);p.write_text(s)
order=['close-edit.test.tsx','workspace-handoff.test.tsx'];(out/'current-prefix.config.mjs').write_text('import {mergeConfig} from '+json.dumps(str(root/'node_modules/vite/dist/node/index.js'))+';\nimport {BaseSequencer} from '+json.dumps(str(root/'node_modules/vitest/dist/node.js'))+';\nimport base from '+json.dumps(str(c/'vitest.config.ts'))+';\nimport {basename} from "node:path";\nconst order='+json.dumps(order)+';\nclass Order extends BaseSequencer{async sort(files){return [...files].sort((a,b)=>order.indexOf(basename(a.moduleId))-order.indexOf(basename(b.moduleId)));}}\nexport default mergeConfig(base,{test:{sequence:{sequencer:Order}}});\n')
