#!/usr/bin/env python3
"""Launch only the QA package; accept bounded JSON commands on stdin. No document automation."""
import argparse
import ctypes
import hashlib
import json
import os
from pathlib import Path
import secrets
import socket
import stat
import struct
import subprocess
import tempfile
import time

FAULTS = ('none', 'preference-read', 'preference-write', 'native-theme', 'fixture-read', 'fixture-save')


def send_command(connection, reader, command, token, run, sequence):
    message = dict(command, schema=1, token=token, run=run, sequence=sequence)
    payload = json.dumps(message, separators=(',', ':')).encode() + b'\n'
    if len(payload) > 4096:
        raise ValueError('message too large')
    connection.sendall(payload)
    line = reader.readline(65537)
    if len(line) > 65536 or not line.endswith(b'\n'):
        raise ValueError('invalid/closed QA response')
    response = json.loads(line)
    if response.get('sequence') != sequence:
        raise ValueError('response sequence mismatch')
    return response


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app', type=Path)
    parser.add_argument('--fault', choices=FAULTS, default='none')
    args = parser.parse_args()
    app = args.app.resolve(strict=True)
    identifier = subprocess.check_output(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleIdentifier', str(app/'Contents/Info.plist')], text=True).strip()
    if identifier != 'com.juanmantilla.markdownworkspace.qa':
        parser.error('refusing a non-QA package')
    executable = app/'Contents/MacOS/md_reader'
    subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
    run_dir = Path(tempfile.mkdtemp(prefix='f002a-qa-', dir='/private/tmp'))
    os.chmod(run_dir, 0o700)
    path = run_dir/'control.sock'
    token, run = secrets.token_hex(32), secrets.token_hex(16)
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as server:
        server.bind(str(path)); os.chmod(path, 0o600); server.listen(1); server.settimeout(20)
        read_fd, write_fd = os.pipe()
        environment = dict(os.environ, F002A_BOOTSTRAP_FD=str(read_fd))
        with (run_dir/'host.log').open('xb') as log:
            process = subprocess.Popen([str(executable)], env=environment, pass_fds=(read_fd,), stdout=log, stderr=log)
        os.close(read_fd)
        with os.fdopen(write_fd, 'wb') as pipe:
            pipe.write(json.dumps(dict(socket=str(path), token=token, run=run, fault=args.fault)).encode())
        print(json.dumps({'runDirectory': str(run_dir), 'pid': process.pid,
                          'buildKind': 'instrumented', 'sha256': hashlib.sha256(executable.read_bytes()).hexdigest()}), flush=True)
        try:
            connection, _ = server.accept()
            # Darwin SOL_LOCAL / LOCAL_PEERPID. UID is also checked by the native peer.
            if struct.unpack('i', connection.getsockopt(0, 2, 4))[0] != process.pid:
                raise ValueError('unexpected peer PID')
            uid, gid = ctypes.c_uint(), ctypes.c_uint()
            system = ctypes.CDLL('/usr/lib/libSystem.B.dylib')
            if system.getpeereid(connection.fileno(), ctypes.byref(uid), ctypes.byref(gid)) or uid.value != os.getuid():
                raise ValueError('unexpected peer UID')
            metadata = path.lstat()
            if not stat.S_ISSOCK(metadata.st_mode) or stat.S_IMODE(metadata.st_mode) != 0o600 or metadata.st_uid != os.getuid():
                raise ValueError('socket ownership changed')
            with connection, connection.makefile('rb') as reader, (run_dir/'protocol.jsonl').open('x') as trace:
                connection.settimeout(5)
                sequence = 0
                import sys
                for line in sys.stdin:
                    if len(line.encode()) > 4096:
                        raise ValueError('oversized command')
                    command = json.loads(line)
                    # Refuse injected envelope fields. The native parser validates command keys/enums.
                    if not isinstance(command, dict) or any(k in command for k in ('schema','run','token','sequence')):
                        raise ValueError('command only; authentication is runner-owned')
                    sequence += 1
                    response = send_command(connection, reader, command, token, run, sequence)
                    # Never log token or request text. Responses contain bounded observations.
                    trace.write(json.dumps(response)+'\n'); trace.flush()
                    print(json.dumps(response), flush=True)
                    if isinstance(response.get('result'), dict) and response['result'].get('finished'):
                        break
        finally:
            # Disconnect cancels unreleased native gates. Never kill an app with drafts/inflight writes.
            path.unlink(missing_ok=True)
            print('Runner disconnected; quit the QA app normally. Retained evidence: '+str(run_dir), flush=True)

if __name__ == '__main__':
    main()
