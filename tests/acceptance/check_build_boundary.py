#!/usr/bin/env python3
"""Read-only supplement to Cargo guards; verify asset and binary QA separation."""
import argparse
from pathlib import Path
import subprocess

MARKERS = [b'qa:snapshot-request', b'__F002A_FAULT', b'F002A-acceptance-harness-v1']


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('kind', choices=['production','qa'])
    p.add_argument('assets', type=Path)
    p.add_argument('executable', type=Path)
    args = p.parse_args()
    qa = args.kind == 'qa'
    contents = b''.join(f.read_bytes() for f in args.assets.rglob('*') if f.is_file())
    found = [marker in contents for marker in MARKERS]
    if (qa and not all(found)) or (not qa and any(found)):
        p.error('frontend QA boundary mismatch')
    # Binary feature evidence is combined with cfg/build guards and runtime checks, not relied on alone.
    strings = subprocess.check_output(['strings', '-a', str(args.executable)])
    # Tauri's asset map retains filenames even when file bodies are compressed.
    for asset in args.assets.rglob('*'):
        if asset.is_file() and asset.suffix in ('.js', '.css') and asset.name.encode() not in strings:
            p.error('package does not embed the current asset set: '+asset.name)
    native = b'F002A_BOOTSTRAP_FD' in strings
    if native != qa:
        p.error('native QA boundary mismatch')
    if not qa and any(marker in strings for marker in MARKERS):
        p.error('QA frontend embedded in production')
    if not qa and any(marker in contents or marker in strings for marker in [b'diagram_acceptance', b'INTENTGROVE_DIAGRAM_ACCEPTANCE', b'INTENTGROVE_DIAG:', b'__diagMode', b'QA Settings evidence', b'QA Settings probe', b'bounded owner trace exceeded']):
        p.error('diagram diagnostic capability in production')
    print('PASS: '+args.kind+' asset/binary marker boundary; runtime verification remains separate')

if __name__ == '__main__': main()
