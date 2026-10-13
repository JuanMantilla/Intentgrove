from pathlib import Path
import shutil,json,hashlib,difflib
out=Path(__file__).resolve().parent;root=out.parents[3];src=out/'candidate-recorder';dst=out/'candidate-profile'
shutil.copytree(src,dst,ignore=shutil.ignore_patterns('node_modules'))
nm=dst/'node_modules';nm.mkdir()
for entry in (root/'node_modules').iterdir():
 if entry.name!='.vite':(nm/entry.name).symlink_to(entry,target_is_directory=entry.is_dir())
shutil.copytree(out/'cache-seed',nm/'.vite')
p=dst/'qa-recorder.ts';s=p.read_text();s='import {execFileSync} from "node:child_process";\nimport {loadavg,freemem} from "node:os";\nimport {Session} from "node:inspector";\nimport {monitorEventLoopDelay} from "node:perf_hooks";\n'+s
s=s.replace("'SELECTION_REQUEST_COMPLETED'];", "'SELECTION_REQUEST_COMPLETED','HEADING_LOOKUP_SYNC_RETURN','FILE_CLICK_BEGIN','FILE_CLICK_END'];")
s=s.replace('const capacity=512;', '''const profiler=new Session();
const loop=monitorEventLoopDelay({resolution:20});
let profileStarted=false,profileStopped=false;
let testCpu=process.cpuUsage();
const capacity=512;''')
s=s.replace('  count=0;captured=false;', '''  if(!profileStarted){
    profiler.connect();profiler.post('Profiler.enable');
    profiler.post('Profiler.setSamplingInterval',{interval:2000});profiler.post('Profiler.start');
    profileStarted=true;loop.enable();
  }
  loop.reset();testCpu=process.cpuUsage();
  count=0;captured=false;''')
s=s.replace('  const failureTime=performance.now();','''  const failureTime=performance.now();
  const resource={loadavg:loadavg(),freeMemory:freemem(),clock:{hrtimeUs:Number(process.hrtime.bigint()/1000n),performanceMs:performance.now()},testCpu:process.cpuUsage(testCpu),loopMaxMs:loop.max/1e6,loopMeanMs:loop.mean/1e6,loopP99Ms:loop.percentile(99)/1e6,cpu:process.cpuUsage(),memory:process.memoryUsage()};''')
s=s.replace('  mkdirSync(dir,{recursive:true});','''  mkdirSync(dir,{recursive:true});
  writeFileSync(resolve(dir,'resource-at-failure.json'),JSON.stringify(resource,null,2));
  if(!profileStopped){profileStopped=true;profiler.post('Profiler.stop',(error,result)=>{
    writeFileSync(resolve(dir,'failure.cpuprofile'),JSON.stringify(error?{error:String(error)}:result.profile));
    profiler.disconnect();loop.disable();
  });}''')
s=s.replace("  writeFileSync(resolve(dir,'focused-dom.txt'),JSON.stringify(dom,null,2));", "  writeFileSync(resolve(dir,'focused-dom.txt'),JSON.stringify(dom,null,2));\n  try { writeFileSync(resolve(dir,'processes-after-failure.txt'), execFileSync('/bin/ps',['-axo','pid,ppid,pcpu,pmem,etime,comm'],{encoding:'utf8'}).split('\\n').filter(line=>/PID|node|cargo|rustc|clang|Python/.test(line)).join('\\n')); } catch {}")
p.write_text(s)
p=dst/'tests/ui/workspace-handoff.test.tsx';s=p.read_text().replace('  fireEvent.click(await screen.findByTitle("a.md"));','  const file = await screen.findByTitle("a.md"); mark(29); fireEvent.click(file); mark(30);',1).replace('try { await screen.findByRole("button", { name: "Edit section “One”" }); mark(21); }','try { const lookup = screen.findByRole("button", { name: "Edit section “One”" }); mark(28); await lookup; mark(21); }',1);p.write_text(s)
manifest={str(p.relative_to(dst)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','tests'] for p in (dst/folder).rglob('*') if p.is_file()};manifest['qa-recorder.ts']=hashlib.sha256((dst/'qa-recorder.ts').read_bytes()).hexdigest()
(out/'profile-inputs.json').write_text(json.dumps(manifest,indent=2))
patch=[]
for name in ['qa-recorder.ts','tests/ui/workspace-handoff.test.tsx']:
 a=src/name;b=dst/name;patch.extend(difflib.unified_diff(a.read_text().splitlines(True),b.read_text().splitlines(True),fromfile=str(a),tofile=str(b)))
(out/'profile.patch').write_text(''.join(patch))
print('Prepared separate resource-profile candidate, no running source modified.')
