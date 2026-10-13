#!/usr/bin/env python3
"""Profile repeated build-mac.sh runs with isolated parallel frontend workloads."""
import argparse
import collections
import csv
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import statistics
import subprocess
import sys
import threading
import time

GIB = 1024 ** 3
SWIFT = '''import Foundation
switch ProcessInfo.processInfo.thermalState {
case .nominal: print("nominal")
case .fair: print("fair")
case .serious: print("serious")
case .critical: print("critical")
@unknown default: print("unknown")
}
'''


def now():
    return dt.datetime.now().astimezone().isoformat()


def positive(value):
    value = int(value)
    if value < 1:
        raise argparse.ArgumentTypeError('must be at least 1')
    return value


def capture(args):
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=15)
        return {'exit_code': r.returncode, 'stdout': r.stdout.strip(), 'stderr': r.stderr.strip()}
    except (OSError, subprocess.TimeoutExpired) as e:
        return {'exit_code': None, 'error': str(e)}


def parse_vm(raw):
    size = re.search(r'page size of (\d+)', raw)
    if not size:
        raise ValueError('vm_stat did not provide a page size')
    return int(size[1]), {k: int(v) for k, v in re.findall(r'^([^:\n]+):\s+(\d+)\.', raw, re.M)}


def parse_swap(raw):
    result = {}
    for k, v, unit in re.findall(r'(total|used|free)\s*=\s*([\d.]+)([KMG])', raw):
        result[k + '_bytes'] = int(float(v) * {'K': 1024, 'M': 1024**2, 'G': GIB}[unit])
    return result


def parse_top(raw):
    matches = list(re.finditer(r'(\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}).*?CPU usage: ([\d.]+)% user, ([\d.]+)% sys, ([\d.]+)% idle', raw, re.S))
    rows = []
    for i, match in enumerate(matches):
        end = matches[i+1].start() if i+1 < len(matches) else len(raw)
        block = raw[match.end():end]
        memory = re.search(r'PhysMem: ([\d.]+)([KMGT]) used \(([\d.]+)([KMGT]) wired, ([\d.]+)([KMGT]) compressor\), ([\d.]+)([KMGT]) unused', block)
        fields = {}
        if memory:
            for name, position in [('ram_used',1), ('ram_wired',3), ('ram_compressor',5), ('ram_unused',7)]:
                fields[name+'_bytes_rounded'] = int(float(memory[position]) * 1024**('KMGT'.index(memory[position+1])+1))
        timestamp = dt.datetime.strptime(match[1], '%Y/%m/%d %H:%M:%S').astimezone().timestamp()
        rows.append((timestamp, float(match[2]), float(match[3]), float(match[4]), fields))
    return rows


def terminate_group(process, grace=5):
    """Terminate our group even if its original leader has already exited."""
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.monotonic() + grace
    while time.monotonic() < deadline:
        process.poll()
        try:
            os.killpg(process.pid, 0)
        except ProcessLookupError:
            break
        time.sleep(.05)
    else:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    process.wait(timeout=5)


class Profiler:
    def __init__(self, args, out):
        self.args, self.out = args, out
        self.cancel = threading.Event()
        self.monitor_stop = threading.Event()
        self.lock = threading.Lock()
        self.active = set()
        self.phase = 'setup'
        self.run = 0
        self.samples = []
        self.events = []
        self.results = []
        self.errors = []
        self.reason = None
        self.thermal_helper = None

    def event(self, kind, **fields):
        row = {'time': now(), 'monotonic': time.monotonic(), 'kind': kind, **fields}
        with self.lock:
            self.events.append(row)
            with (self.out / 'events.jsonl').open('a') as f:
                f.write(json.dumps(row) + '\n')
        return row

    def spawn(self, args, cwd, log):
        # Hold the lock through launch so cancellation cannot miss a new child.
        with self.lock:
            if self.cancel.is_set():
                return None
            p = subprocess.Popen(args, cwd=cwd, stdout=log, stderr=subprocess.STDOUT,
                                 start_new_session=True)
            self.active.add(p)
        return p

    def stop_children(self):
        self.cancel.set()
        with self.lock:
            children = list(self.active)
        for p in children:
            terminate_group(p)

    def setup_command(self, command, log_name, timeout=120):
        with (self.out / log_name).open('w') as log:
            p = self.spawn(command, self.args.project, log)
            if p is None:
                raise RuntimeError('setup cancelled')
            started = time.monotonic()
            try:
                while p.poll() is None:
                    if self.cancel.is_set():
                        raise RuntimeError('setup cancelled')
                    if time.monotonic() - started > timeout:
                        raise RuntimeError('setup command timed out: ' + command[0])
                    time.sleep(.1)
                return p.returncode
            finally:
                terminate_group(p, grace=.2)
                with self.lock:
                    self.active.discard(p)

    def sample(self):
        raw_vm = capture(['vm_stat'])
        size, vm = parse_vm(raw_vm.get('stdout', ''))
        raw_swap = capture(['sysctl', '-n', 'vm.swapusage'])
        pressure = capture(['sysctl', '-n', 'kern.memorystatus_vm_pressure_level'])
        thermal = capture(['pmset', '-g', 'therm'])
        state = capture([str(self.thermal_helper)]) if self.thermal_helper else {'stdout': 'unavailable'}
        processes = capture(['ps', '-axo', 'pid=,ppid=,%cpu=,rss=,comm='])
        row = {'time': now(), 'monotonic': time.monotonic(), 'phase': self.phase,
               'run': self.run, 'page_size': size, 'vm': vm,
               'swap': parse_swap(raw_swap.get('stdout', '')), 'raw_swap': raw_swap,
               'memory_pressure': pressure, 'thermal_state': state,
               'thermal_warnings': thermal, 'battery': capture(['pmset', '-g', 'batt']),
               'load_average': os.getloadavg(),
               'disk_available_bytes': shutil.disk_usage(self.args.project).free,
               'processes': processes}
        with self.lock:
            self.samples.append(row)
        with (self.out / 'samples.jsonl').open('a') as f:
            f.write(json.dumps(row) + '\n')
        return row

    def monitor(self):
        critical = 0
        while not self.monitor_stop.is_set():
            started = time.monotonic()
            try:
                row = self.sample()
                serious = row['memory_pressure'].get('stdout') == '4' or row['thermal_state'].get('stdout') == 'critical'
                critical = critical + 1 if serious else 0
                if critical >= 3 or row['disk_available_bytes'] < 2 * GIB:
                    self.reason = 'sustained critical pressure' if critical >= 3 else 'less than 2 GiB free disk'
                    self.event('resource_stop', reason=self.reason)
                    self.cancel.set()
            except Exception as e:
                error = {'time': now(), 'error': repr(e)}
                self.errors.append(error)
                with (self.out / 'monitor-errors.jsonl').open('a') as f:
                    f.write(json.dumps(error) + '\n')
            self.monitor_stop.wait(max(0, self.args.interval - (time.monotonic() - started)))

    def task(self, command, cwd, run, task, cycle, finished):
        name = f'run-{run:02d}-{task}-{cycle:03d}'
        with (self.out / (name + '.log')).open('w') as log:
            p = self.spawn(['/usr/bin/time', '-l', *command], cwd, log)
            if p is None:
                return None
            start = self.event('task_start', run=run, task=task, cycle=cycle,
                               command=command, cwd=str(cwd), pid=p.pid, log=name + '.log')
            interrupted = False
            reason = None
            try:
                while p.poll() is None:
                    if self.cancel.is_set() or finished.is_set():
                        interrupted = True
                        reason = self.reason or ('round finished' if finished.is_set() else 'cancelled')
                        terminate_group(p)
                        break
                    if time.monotonic() - start['monotonic'] > self.args.timeout:
                        interrupted, reason = True, 'task timeout'
                        self.reason = reason
                        self.cancel.set()
                        terminate_group(p)
                        break
                    time.sleep(.1)
            except KeyboardInterrupt:
                interrupted = True
                reason = self.reason or 'Ctrl+C'
                self.reason = reason
                self.cancel.set()
            finally:
                # Do not leave grandchildren behind if a command exits early.
                terminate_group(p, grace=.2)
                with self.lock:
                    self.active.discard(p)
            end = self.event('task_end', run=run, task=task, cycle=cycle, pid=p.pid,
                             command=command, exit_code=p.returncode,
                             seconds=round(time.monotonic() - start['monotonic'], 3),
                             interrupted=interrupted, reason=reason,
                             started_at=start['time'], log=name + '.log')
        if not interrupted and p.returncode != 0:
            self.event('task_failure', run=run, task=task, cycle=cycle, exit_code=p.returncode)
        return end

    def companion(self, worker, cwd, run, finished):
        cycle = 0
        name = 'tests' if worker % 2 else 'frontend-build'
        task = f'companion-{worker}-{name}'
        command = ['npm', 'test'] if name == 'tests' else ['npm', 'run', 'build', '--', '--outDir', str(cwd / 'profile-dist')]
        try:
            while not self.cancel.is_set() and not finished.is_set():
                cycle += 1
                result = self.task(command, cwd, run, task, cycle, finished)
                if result is None or result['interrupted'] or result['exit_code'] != 0:
                    return  # Keep failures visible; do not retry them.
        except Exception as e:
            self.event('task_failure', run=run, task=task, cycle=cycle, error=repr(e))

    def snapshots(self):
        root = self.args.project
        sandbox = self.out / 'snapshots'
        sandbox.mkdir()
        if self.args.parallel == 1:
            return []
        if not (root / 'node_modules').is_dir():
            raise RuntimeError('Parallel workloads require existing node_modules; run npm ci first.')
        print('Copying dependencies for isolated companion tasks…', flush=True)
        deps = sandbox / 'dependencies' / 'node_modules'
        deps.parent.mkdir()
        if self.setup_command(['/usr/bin/ditto', str(root / 'node_modules'), str(deps)], 'snapshot-copy.log'):
            raise RuntimeError('dependency snapshot copy failed; see snapshot-copy.log')
        copies = []
        manifest = {}
        files = list(root.glob('*config*')) + [root/'package.json', root/'package-lock.json', root/'index.html']
        for worker in range(1, self.args.parallel):
            cwd = sandbox / f'companion-{worker}'
            cwd.mkdir()
            for name in ('src', 'public', 'tests'):
                shutil.copytree(root / name, cwd / name, symlinks=True)
            for source in files:
                if source.is_file():
                    shutil.copy2(source, cwd / source.name)
                    manifest[source.name] = hashlib.sha256(source.read_bytes()).hexdigest()
            (cwd / 'node_modules').symlink_to(deps, target_is_directory=True)
            copies.append(cwd)
        (self.out / 'snapshot-config-hashes.json').write_text(json.dumps(manifest, indent=2))
        return copies

    def prepare_thermal(self):
        source = self.out / 'thermal.swift'
        source.write_text(SWIFT)
        helper = self.out / 'thermal-state'
        result = self.setup_command(['xcrun', 'swiftc', str(source), '-o', str(helper)], 'thermal-helper-build.log')
        if result == 0:
            self.thermal_helper = helper

    def execute(self):
        collectors = []
        threads = []
        try:
            self.prepare_thermal()
            copies = self.snapshots()
            for name, command in [('top', ['top', '-l', '0', '-s', str(self.args.interval), '-n', '30', '-o', 'cpu', '-stats', 'pid,command,cpu,mem']),
                                  ('iostat', ['iostat', '-d', '-w', str(self.args.interval)])]:
                log = (self.out / (name + '.log')).open('w')
                process = self.spawn(command, self.args.project, log)
                collectors.append((process, log))
            monitor = threading.Thread(target=self.monitor, daemon=True)
            monitor.start()
            self.phase = 'baseline'
            print(f'Baseline: {self.args.baseline}s', flush=True)
            self.cancel.wait(self.args.baseline)
            for run in range(1, self.args.runs + 1):
                if self.cancel.is_set():
                    break
                self.run, self.phase = run, 'build'
                finished = threading.Event()
                print(f'Run {run}/{self.args.runs}: build-mac.sh + {len(copies)} companion task groups', flush=True)
                threads = [threading.Thread(target=self.companion, args=(i, cwd, run, finished))
                           for i, cwd in enumerate(copies, 1)]
                for thread in threads:
                    thread.start()
                result = self.task(['./build-mac.sh'], self.args.project, run, 'build-mac', 1, threading.Event())
                finished.set()
                for thread in threads:
                    thread.join()
                if result:
                    self.results.append(result)
                    print(f"Run {run}: exit={result['exit_code']}, {result['seconds']:.1f}s", flush=True)
                    (self.out / 'results.json').write_text(json.dumps(self.results, indent=2))
                self.phase = 'recovery'
                self.cancel.wait(self.args.cooldown)
                if not result or result['exit_code'] != 0:
                    break
            self.phase = 'final'
        except KeyboardInterrupt:
            self.reason = 'Ctrl+C'
            self.cancel.set()
        finally:
            self.stop_children()
            for thread in threads:
                thread.join(timeout=10)
            self.monitor_stop.set()
            if 'monitor' in locals():
                monitor.join(timeout=20)
            for process, log in collectors:
                if process:
                    terminate_group(process, grace=.2)
                log.close()
            self.event('session_end', reason=self.reason, requested_runs=self.args.runs,
                       completed_runs=len(self.results), sampling_errors=len(self.errors))
            if not self.args.keep_snapshots and (self.out / 'snapshots').exists():
                shutil.rmtree(self.out / 'snapshots')  # Only this newly created sandbox.


def export(profile):
    out = profile.out
    data = profile.samples
    raw = (out/'top.log').read_text() if (out/'top.log').exists() else ''
    cpu = parse_top(raw)
    rows = []
    for sample in data:
        timestamp = dt.datetime.fromisoformat(sample['time']).timestamp()
        nearby = [x for x in cpu if 0 <= timestamp-x[0] <= profile.args.interval+1]
        c = nearby[-1] if nearby else None
        vm = sample['vm']
        row = {'time':sample['time'], 'phase':sample['phase'], 'run':sample['run'],
               'cpu_user_pct': c[1] if c else '', 'cpu_system_pct':c[2] if c else '',
               'cpu_idle_pct':c[3] if c else '', 'cpu_busy_pct':100-c[3] if c else '',
               'memory_pressure_level':sample['memory_pressure'].get('stdout','unavailable'),
               'thermal_state':sample['thermal_state'].get('stdout','unavailable'),
               'compressor_bytes':vm.get('Pages occupied by compressor',0)*sample['page_size'],
               'load_1':sample['load_average'][0], 'load_5':sample['load_average'][1],
               'load_15':sample['load_average'][2], 'disk_available_bytes':sample['disk_available_bytes'],
               'page_size':sample['page_size'], **sample['swap']}
        row.update({'vm_'+k.replace(' ','_').lower():v for k,v in vm.items()})
        if c:
            row.update(c[4])
        rows.append(row)
    if rows:
        columns=list(dict.fromkeys(k for row in rows for k in row))
        with (out/'timeline.csv').open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=columns); writer.writeheader(); writer.writerows(rows)
    summaries=[]
    for result in profile.results:
        a=[x for x in rows if x['run']==result['run'] and x['phase']=='build']
        cp=[x['cpu_busy_pct'] for x in a if x['cpu_busy_pct']!='']
        summary={'run':result['run'], 'seconds':result['seconds'], 'exit_code':result['exit_code'],
                 'samples':len(a), 'cpu_busy_mean_pct':round(statistics.mean(cp),1) if cp else None,
                 'cpu_busy_peak_pct':round(max(cp),1) if cp else None,
                 'compressor_peak_GiB':round(max((x['compressor_bytes']/GIB for x in a),default=0),2),
                 'pressure_levels':dict(collections.Counter(x['memory_pressure_level'] for x in a)),
                 'thermal_states':dict(collections.Counter(x['thermal_state'] for x in a))}
        if a:
            summary.update(swap_start_MiB=round(a[0].get('used_bytes',0)/1024**2,2),
                           swap_peak_MiB=round(max(x.get('used_bytes',0) for x in a)/1024**2,2),
                           swapout_pages=a[-1].get('vm_swapouts',0)-a[0].get('vm_swapouts',0))
        summaries.append(summary)
    failures=[x for x in profile.events if x['kind']=='task_failure']
    result={'runs':summaries, 'task_failures':failures, 'stop_reason':profile.reason,
            'requested_runs':profile.args.runs, 'parallel_task_groups':profile.args.parallel,
            'sampling_errors':profile.errors}
    (out/'summary.json').write_text(json.dumps(result,indent=2))
    report=['Mac build performance profile', 'Command: ./build-mac.sh, unmodified.',
            f'Parallel task groups: {profile.args.parallel}; requested runs: {profile.args.runs}.',
            'Companions alternate complete frontend test suites and frontend production builds.',
            'Companions repeat while the main build runs; final incomplete cycles are interrupted and labeled.',
            'Warm existing Rust caches retained. Locked npm dependencies are reinstalled by build-mac.sh.',
            'CPU is host-wide; ps CPU is a lifetime average and RSS can double-count shared pages.',
            'Sampling can miss brief peaks. CPU CSV is aligned to a preceding top sample within one sampling interval.',
            'VM columns are raw page counts except explicitly named byte fields; not all categories are additive.',
            'Compressor bytes means physical storage occupied by compressed memory, not uncompressed size.',
            'Thermal pressure/warnings measured; actual temperatures, CPU frequency and SoC power unavailable without privileged telemetry.',
            'Battery and power settings are saved; background apps remain running.',
            'iostat first row covers time since boot; later rows cover the configured interval.',
            'Raw logs include top, iostat, per-process samples, VM, battery, pmset, events, task output and /usr/bin/time.',
            'No app UI latency or GUI correctness measured.', '',json.dumps(result,indent=2)]
    (out/'report.txt').write_text('\n'.join(report)+'\n')
    print(f'Logs: {out}\nSummary: {out/"report.txt"}',flush=True)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs',type=positive,help='number of macOS build rounds')
    parser.add_argument('--parallel',type=positive,default=4,help='task groups including main build (default: 4; max: 8)')
    parser.add_argument('--project',type=Path,default=Path(__file__).resolve().parent.parent)
    parser.add_argument('--output',type=Path,help='new output directory; must not already exist')
    parser.add_argument('--interval',type=positive,default=2,help='sampling seconds (default: 2)')
    parser.add_argument('--baseline',type=positive,default=15)
    parser.add_argument('--cooldown',type=positive,default=15)
    parser.add_argument('--timeout',type=positive,default=1800,help='maximum seconds per task cycle')
    parser.add_argument('--keep-snapshots',action='store_true')
    args=parser.parse_args()
    args.project=args.project.resolve()
    if sys.platform!='darwin': parser.error('this profiler requires macOS')
    if args.parallel>8: parser.error('--parallel must be between 1 and 8')
    if not (args.project/'build-mac.sh').is_file(): parser.error('project has no build-mac.sh')
    if shutil.disk_usage(args.project).free < 3*GIB: parser.error('at least 3 GiB free disk is required')
    out=args.output or args.project.parent/'diagnostics'/('mac-parallel-'+dt.datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    out=out.resolve(); out.mkdir(parents=True,exist_ok=False)
    profile=Profiler(args,out)
    metadata={'time':now(),'settings':{k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()},
              'hardware':capture(['sysctl','hw.model','hw.memsize','hw.ncpu']),
              'os':capture(['sw_vers']), 'node':capture(['node','--version']),
              'rust':capture(['rustc','--version']), 'power_settings':capture(['pmset','-g','custom']),
              'battery':capture(['pmset','-g','batt']),
              'powermetrics_probe':capture(['powermetrics','-n','1','-i','100','-s','cpu_power,thermal'])}
    (out/'metadata.json').write_text(json.dumps(metadata,indent=2))
    # SIGTERM uses the same owned-child cleanup and evidence export as Ctrl+C.
    def interrupted(signum,_frame):
        profile.reason = 'signal ' + str(signum)
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,interrupted)
    try:
        profile.execute()
    except Exception as e:
        profile.reason=repr(e)
        print('Profiler error: '+repr(e),file=sys.stderr)
    result=export(profile)
    if result['stop_reason'] or len(profile.results)!=args.runs: return 2
    if result['task_failures'] or profile.errors: return 1
    return 0


if __name__=='__main__':
    sys.exit(main())
