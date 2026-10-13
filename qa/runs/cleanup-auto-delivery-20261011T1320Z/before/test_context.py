"""Explicit harness-selected disposable context; never selected from task data."""
import os
from pathlib import Path
import re
import stat
import file_guard as guard

KEYS = ('QA_CLEANUP_MODE', 'QA_CLEANUP_CONTEXT', 'QA_CLEANUP_CONTEXT_ID')


def require(ok, reason):
    if not ok:
        raise guard.GuardError(reason)


def private(path, directory=False):
    info = guard.inspect(path, directory=directory)
    if not directory:
        guard.regular(info, content_guard=False)
    require(info.st_uid == os.getuid() and stat.S_IMODE(info.st_mode) == (0o700 if directory else 0o600),
            'test_context_must_be_private_and_owned')
    return (info.st_dev, info.st_ino)


def selected(production_workspace, production_state, expected=None):
    values = [os.environ.get(k) for k in KEYS]
    if not any(v is not None for v in values):
        require(expected is None, 'test_context_missing')
        return None
    mode, filename, context_id = values
    require(mode == 'test' and filename and context_id, 'test_context_incomplete')
    require(re.fullmatch(r'[0-9a-f]{32}', context_id) is not None, 'invalid_test_context_id')
    require(expected is None or expected == context_id, 'test_context_id_mismatch')
    path = guard.absolute(filename, required=True)
    directory = guard.canonical_root(str(path.parent))
    require(path.name == 'context.json' and directory.parent == Path('/private/tmp') and
            directory.name.startswith('qa-cleanup-integration-'), 'test_context_not_disposable')
    production_state = Path(os.path.realpath(production_state))
    require(not (directory == production_state or directory in production_state.parents or
                 production_state in directory.parents), 'test_context_overlaps_production')
    identity = private(directory, directory=True)
    descriptor_identity = private(path)
    value = guard.read_json(path)
    require(value == {'schema_version': 1, 'id': context_id, 'directory': str(directory),
                      'production_workspace': str(production_workspace)}, 'test_context_descriptor_mismatch')
    fixture, state = directory / 'fixture', directory / 'state'
    identities = [private(p, directory=True) for p in (fixture, state)]
    return {'id': context_id, 'descriptor': str(path), 'directory': directory,
            'workspace': fixture, 'state': state,
            'identity': (identity, descriptor_identity, *identities), 'value': value}


def environment(context):
    return dict(zip(KEYS, ('test', context['descriptor'], context['id'])))
