#!/usr/bin/env python3
"""One production cold launch after recorder readiness. Never declares visual acceptance."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import selectors
import subprocess
import tempfile
import time


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def continuous():
    class Timebase(ctypes.Structure):
        _fields_ = [('numer', ctypes.c_uint32), ('denom', ctypes.c_uint32)]
    library = ctypes.CDLL('/usr/lib/libSystem.B.dylib')
    library.mach_continuous_time.restype = ctypes.c_uint64
    info = Timebase()
    library.mach_timebase_info(ctypes.byref(info))
    return library.mach_continuous_time() * info.numer / info.denom / 1e9


def await_ready(process, timeout=20):
    with selectors.DefaultSelector() as selector:
        selector.register(process.stdout, selectors.EVENT_READ)
        deadline = time.monotonic()+timeout
        while time.monotonic() < deadline:
            if not selector.select(max(0, deadline-time.monotonic())):
                break
            line = process.stdout.readline()
            if not line:
                break
            value = json.loads(line)
            if value.get('event') == 'ready':
                return value
            if value.get('event') == 'error':
                break
    raise RuntimeError('recorder not ready; app was not launched')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--recorder', type=Path, required=True)
    parser.add_argument('--app', type=Path, required=True)
    parser.add_argument('--isolated-display', type=int, required=True,
                        help='operator confirms this display contains only synthetic test content, including notifications')
    parser.add_argument('--saved-dark-confirmed', action='store_true', required=True)
    parser.add_argument('--seconds', type=int, default=45, choices=range(25,121))
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    identifier = subprocess.check_output(['/usr/libexec/PlistBuddy','-c','Print :CFBundleIdentifier',str(app/'Contents/Info.plist')],text=True).strip()
    if identifier != 'com.juanmantilla.markdownworkspace':
        parser.error('production package required')
    executable = app/'Contents/MacOS/md_reader'
    subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
    if subprocess.run(['pgrep','-x','md_reader'],stdout=subprocess.DEVNULL).returncode == 0:
        parser.error('quit all md_reader processes normally before cold launch')
    run = Path(tempfile.mkdtemp(prefix='f002a-startup-',dir='/private/tmp')); os.chmod(run,0o700)
    with (run/'recorder-error.log').open('x') as errors:
        recorder = subprocess.Popen([str(args.recorder.resolve(strict=True)), '--isolated-display',str(args.isolated_display),
                                     str(run/'capture'),'--seconds',str(args.seconds)],
                                    stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=errors,text=True,bufsize=1)
        try:
            ready = await_ready(recorder)
            # Readiness is after persisted first frame. No app launch before this point.
            before = continuous()
            with (run/'application.log').open('x') as log:
                app_process = subprocess.Popen([str(executable)],stdout=log,stderr=log)
            after = continuous()
            launch = {'event':'launch','pid':app_process.pid,'before':before,'after':after}
            recorder.stdin.write(json.dumps(launch)+'\n'); recorder.stdin.flush()
            print(json.dumps({'runDirectory':str(run),'pid':app_process.pid,'captureReady':ready['time'],'launchBounds':[before,after]}),flush=True)
            recorder.stdin.close()
            events = [json.loads(line) for line in recorder.stdout]
            result = recorder.wait(timeout=args.seconds+15)
            manifest = {'schema':1,'buildKind':'production','clock':'mach-continuous-seconds',
                        'executableSHA256':sha256(executable),
                        'captureReady':ready['time'],'launchBounds':[before,after], 'pid':app_process.pid,
                        'coldLaunch':True,'savedMode':'dark','captureScope':'isolated-test-display',
                        'recorderExit':result,'events':events,'result':'NOT TESTED',
                        'requiredReview':'Full frames, coverage, calibration and first document; populate startup report separately'}
            manifest['artifacts'] = [{'path':str(p.relative_to(run)), 'sha256':sha256(p)}
                                     for p in (run/'capture').iterdir() if p.is_file()]
            (run/'acquisition.json').write_text(json.dumps(manifest,indent=2))
            if result:
                raise RuntimeError('recording invalid; retained diagnostics at '+str(run))
        finally:
            if recorder.poll() is None:
                recorder.terminate(); recorder.wait(timeout=5)
            # The production app remains under normal user control; no forced quit/draft deletion.
            print('Acquisition retained at '+str(run)+'. Quit the app normally before another trial.',flush=True)

if __name__ == '__main__':
    main()
