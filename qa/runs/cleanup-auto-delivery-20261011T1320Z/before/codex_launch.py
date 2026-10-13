"""One launch contract for both read-only passes; parser/config probes start no thread."""
import json
import os
from pathlib import Path
import select
import shutil
import subprocess
import tempfile
import time
import file_guard as guard

VERSION = 'codex-cli 0.162.1'
DISABLED = ('hooks', 'plugins', 'apps', 'browser_use', 'browser_use_external', 'computer_use',
            'multi_agent', 'multi_agent_v2', 'remote_plugin', 'workspace_dependencies', 'memories',
            'skill_mcp_dependency_install', 'shell_snapshot', 'daemon_auto_start', 'guardian_approval')


def executable():
    found = shutil.which('codex')
    if not found:
        raise guard.GuardError('codex_missing')
    path = str(Path(found).resolve())
    result = subprocess.run([path, '--version'], capture_output=True, text=True, timeout=10)
    if result.returncode or result.stdout.strip() != VERSION:
        raise guard.GuardError('codex_version_requires_revalidation')
    return path


def configuration(home):
    overrides = ['sandbox_mode="read-only"', 'approval_policy="never"', 'approvals_reviewer="user"',
                 'web_search="disabled"', 'shell_environment_policy.inherit="none"',
                 'shell_environment_policy.set.PATH="/usr/bin:/bin"',
                 'shell_environment_policy.set.HOME=' + json.dumps(str(home)),
                 'shell_environment_policy.set.QA_CLEANUP_SESSION="1"',
                 'sandbox_workspace_write.network_access=false']
    args = []
    for value in overrides:
        args += ['-c', value]
    for feature in DISABLED:
        args += ['--disable', feature]
    return args + ['--enable', 'skip_host_skill_discovery']


def arguments(exe, home, cwd, schema):
    return [exe, '--no-daemon', 'exec', '--ignore-user-config', '--ignore-rules', '--strict-config',
            '--ephemeral', '--skip-git-repo-check', '--sandbox', 'read-only',
            '--cd', str(cwd), '--json', '--output-schema', str(schema), *configuration(home)]


def config_read(exe, home, cwd, options):
    """Read loaded sessionFlags via installed API. No thread/start or turn/start."""
    proc = subprocess.Popen([exe, '--no-daemon', *options, 'app-server', '--stdio', '--strict-config'],
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            cwd=cwd, env={'PATH': '/usr/bin:/bin', 'HOME': str(home),
                                                   'CODEX_HOME': str(home)}, start_new_session=True)
    buffer = b''
    def request(value):
        nonlocal buffer
        proc.stdin.write((json.dumps(value) + '\n').encode())
        proc.stdin.flush()
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if b'\n' not in buffer:
                if not select.select([proc.stdout], [], [], 0.2)[0]:
                    if proc.poll() is not None:
                        break
                    continue
                chunk = os.read(proc.stdout.fileno(), 65536)
                if not chunk:
                    break
                buffer += chunk
                continue
            line, buffer = buffer.split(b'\n', 1)
            event = json.loads(line)
            if event.get('id') == value['id']:
                if 'error' in event:
                    raise guard.GuardError('codex_config_read_rejected:' + str(event['error']))
                return event['result']
        raise guard.GuardError('codex_config_read_unavailable')
    try:
        request({'id': 1, 'method': 'initialize', 'params': {
            'clientInfo': {'name': 'qa-cleanup-config-probe', 'version': '1'},
            'capabilities': {'experimentalApi': True}}})
        return request({'id': 2, 'method': 'config/read', 'params': {'includeLayers': False}})
    finally:
        proc.terminate()
        try:
            proc.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()


def compatibility(exe=None):
    exe = exe or executable()
    with tempfile.TemporaryDirectory(prefix='qa-cleanup-parser-', dir='/private/tmp') as folder:
        base = Path(folder).resolve()
        home, cwd = base / 'home', base / 'input'
        home.mkdir(mode=0o700)
        cwd.mkdir(mode=0o700)
        schema = cwd / 'schema.json'
        schema.write_text('{"type":"object"}')
        # --help exercises the exact exec parser, but does not load/evaluate config.
        argv = arguments(exe, home, cwd, schema)
        parsed = subprocess.run([*argv, '--help'], capture_output=True, text=True, timeout=10,
                                cwd=cwd, env={'PATH': '/usr/bin:/bin', 'HOME': str(home), 'CODEX_HOME': str(home)})
        if parsed.returncode:
            raise guard.GuardError('codex_arguments_incompatible:' + parsed.stderr)
        loaded = config_read(exe, home, cwd, configuration(home))
        config = loaded['config']
        expected = {'sandbox_mode': 'read-only', 'approval_policy': 'never', 'approvals_reviewer': 'user'}
        for key, value in expected.items():
            if config.get(key) != value or loaded.get('origins', {}).get(key, {}).get('name', {}).get('type') != 'sessionFlags':
                raise guard.GuardError('codex_config_override_unverified:' + key)
        if config.get('mcp_servers') or (config.get('sandbox_workspace_write') or {}).get('network_access') is not False:
            raise guard.GuardError('codex_network_or_mcp_config_unverified')
        for feature in DISABLED:
            if config.get('features', {}).get(feature) is not False:
                raise guard.GuardError('codex_feature_override_unverified:' + feature)
        if config.get('features', {}).get('skip_host_skill_discovery') is not True:
            raise guard.GuardError('codex_host_skill_override_unverified')
        return {'status': 'PASS', 'executable': exe, 'version': VERSION,
                'exec_parser': 'PASS', 'loaded_overrides': expected,
                'override_origins': 'sessionFlags', 'agent_session_created': False,
                'effective_agent_restrictions': 'NOT_TESTED',
                'requested_configuration': {k: config.get(k) for k in
                    ('web_search', 'shell_environment_policy', 'sandbox_workspace_write', 'features', 'mcp_servers')}}


def model_child(exe, private_home, cwd, schema, auth_home):
    """Fresh ephemeral model process; shared auth only, no resume or transcript input."""
    auth_home = guard.canonical_root(str(auth_home))
    info = auth_home.stat()
    if info.st_uid != os.getuid() or info.st_mode & 0o777 != 0o700:
        raise guard.GuardError('private_auth_store_required')
    auth = auth_home / 'auth.json'
    auth_info = guard.inspect(auth)
    guard.regular(auth_info, content_guard=False)
    if auth_info.st_uid != os.getuid() or auth_info.st_mode & 0o777 != 0o600:
        raise guard.GuardError('private_auth_file_required')
    argv = arguments(exe, private_home, cwd, schema) + [
        '-c', 'cli_auth_credentials_store="file"', '-c', 'forced_login_method="chatgpt"',
        '-c', 'mcp_servers={}']
    env = {'PATH': '/usr/bin:/bin', 'HOME': str(private_home), 'CODEX_HOME': str(auth_home),
           'TMPDIR': str(private_home), 'QA_CLEANUP_SESSION': '1'}
    return argv, env
