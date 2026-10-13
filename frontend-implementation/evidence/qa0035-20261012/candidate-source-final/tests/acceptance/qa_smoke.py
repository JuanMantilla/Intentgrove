#!/usr/bin/env python3
"""Empty QA-package bridge smoke check, not acceptance. Does not open documents."""
import argparse
import json
from pathlib import Path
import selectors
import subprocess
import sys
import time


def read_line(process, timeout=25):
    with selectors.DefaultSelector() as selector:
        selector.register(process.stdout, selectors.EVENT_READ)
        if not selector.select(timeout):
            raise RuntimeError('runner timeout')
        line = process.stdout.readline()
        if not line:
            raise RuntimeError('runner exited')
        return json.loads(line)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app',type=Path)
    args=parser.parse_args()
    executable = str(args.app.resolve()/'Contents/MacOS/md_reader')
    if executable in subprocess.check_output(['ps','-axo','comm='],text=True).splitlines():
        parser.error('an existing QA session is active; leave it intact')
    process=subprocess.Popen([sys.executable,'-B',str(Path(__file__).with_name('qa_runner.py')),str(args.app)],
                             stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
    try:
        metadata=read_line(process)
        deadline=time.monotonic()+25
        response=None
        while time.monotonic()<deadline:
            process.stdin.write('{"command":"snapshot"}\n'); process.stdin.flush()
            response=read_line(process)
            if response.get('renderer',{}): break
            time.sleep(0.2)
        if not response or not response.get('renderer') or 'appSHA256' not in response['renderer']:
            raise RuntimeError('renderer bridge missing')
        process.stdin.write('{"command":"arm","operation":"read-document","ordinal":1}\n'); process.stdin.flush()
        if read_line(process).get('result') != {'armed':True}: raise RuntimeError('arm failed')
        process.stdin.write('{"command":"finish"}\n'); process.stdin.flush()
        if read_line(process).get('result') != {'finished':True}: raise RuntimeError('finish failed')
        process.stdin.close()
        process.wait(timeout=5)
        print(json.dumps({'result':'PASS','meaning':'empty QA package channel/renderer smoke only',
                          'runDirectory':metadata['runDirectory'],'sha256':metadata['sha256']}))
    finally:
        if process.poll() is None:
            process.stdin.close(); process.wait(timeout=30)
        # This helper never opened a document; still use the app's normal guarded Quit.
        subprocess.run(['osascript','-e','if application id "com.juanmantilla.markdownworkspace.qa" is running then tell application id "com.juanmantilla.markdownworkspace.qa" to quit'],check=False)

if __name__=='__main__': main()
