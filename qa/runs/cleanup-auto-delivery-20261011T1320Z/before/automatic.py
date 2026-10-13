"""Standing policy authority, separate from manual per-run confirmation."""
import datetime
import json
from pathlib import Path
import file_guard as guard


def validate(value):
    if value is None:
        return {'enabled': False}
    if not isinstance(value, dict) or type(value.get('enabled')) is not bool:
        raise guard.GuardError('invalid_automatic_policy')
    if value['enabled']:
        if set(value) != {'enabled', 'policy_id', 'task_roots', 'not_before'}:
            raise guard.GuardError('invalid_automatic_policy_fields')
        if not isinstance(value['policy_id'], str) or not value['policy_id'].strip():
            raise guard.GuardError('automatic_policy_id_required')
        roots = value['task_roots']
        if not isinstance(roots, list) or not roots or len(set(roots)) != len(roots):
            raise guard.GuardError('exact_automatic_task_roots_required')
        for root in roots:
            if not isinstance(root, str) or str(Path(root).absolute()) != root or '..' in Path(root).parts:
                raise guard.GuardError('absolute_automatic_task_root_required')
        when(value['not_before'])
    return value


def when(value):
    result = datetime.datetime.fromisoformat(value)
    if result.tzinfo is None:
        raise guard.GuardError('timezone_required')
    return result


def authority(runner, run_id):
    directory, root, body, manifest, review = runner.sealed(run_id)
    p = runner.policy()
    auto = validate(p.get('automatic_execution'))
    runner.require(auto['enabled'], 'automatic_execution_disabled')
    runner.require(str(root) in auto['task_roots'], 'outside_automatic_task_roots')
    runner.require(p['allowed_cleanup_roots'] and not p['gitlab_evidence'], 'automatic_scope_or_integrations_invalid')
    seal = runner.read(directory / 'seal.json')
    request = runner.read(runner.STATE / 'queue' / (seal['record_key'] + '.json'))
    completion = runner.read(runner.STATE / 'completions' / (seal['record_key'] + '.json'))
    runner.require(request.get('run_id') == run_id and request.get('state') in
                   ('READY_FOR_APPROVAL', 'APPLYING', 'APPLIED'), 'automatic_request_not_ready')
    runner.require(when(request['queued_at']) >= when(auto['not_before']) and
                   when(completion['recorded_at']) >= when(auto['not_before']), 'predates_standing_policy')
    expected_implementation = {'cleanup.py', 'automatic.py', 'cleanup_service.py', 'file_guard.py',
                               'codex_launch.py', 'test_context.py'}
    runner.require(set(seal.get('implementation', {})) == expected_implementation, 'sealed_implementation_required')
    for name, sha in seal['implementation'].items():
        runner.require(guard.fingerprint(runner.SCRIPTS / name, content_guard=False)['sha256'] == sha,
                       'cleanup_implementation_changed')
    expected_names = {phase + '-' + suffix for phase in ('discover', 'review')
                      for suffix in ('events.jsonl', 'process.json', 'invocation.json')}
    runner.require(set(seal.get('stage_evidence', {})) == expected_names, 'sealed_session_evidence_required')
    for name, sha in seal['stage_evidence'].items():
        runner.require(guard.fingerprint(directory / name, content_guard=False)['sha256'] == sha,
                       'model_session_evidence_changed')
    ids = []
    for phase in ('discover', 'review'):
        events = [json.loads(line) for line in (directory / (phase + '-events.jsonl')).read_text().splitlines()]
        sessions = [e['thread_id'] for e in events if e.get('type') == 'thread.started']
        runner.require(len(sessions) == 1 and sessions[0], 'independent_session_evidence_required')
        runner.require(runner.read(directory / (phase + '-process.json')).get('returncode') == 0,
                       'successful_model_stage_required')
        ids += sessions
    runner.require(ids[0] != ids[1], 'independent_sessions_required')
    return {'kind': 'standing_policy', 'policy_id': auto['policy_id'], 'policy_sha256': runner.digest(p),
            'run_id': run_id, 'manifest_sha256': runner.digest(manifest),
            'review_sha256': runner.digest(review), 'session_ids': ids}
