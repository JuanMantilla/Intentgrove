"""Offline evidence intake, not a recorder or an application acceptance verdict.

Usage: python3 tests/acceptance/f002a_evidence.py report.json EXPECTED_EXECUTABLE_SHA256
The report and referenced raw files must be inside the same disposable run directory.
Only validated, complete records become eligible for human review. Never closes tasks.
"""
import hashlib
import json
import math
from pathlib import Path
import re
import sys


class Incomplete(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Incomplete(message)


def number(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0


def zero(value):
    return type(value) is int and value == 0


def artifact(root, entry):
    require(isinstance(entry, dict), 'missing raw artifact')
    name = entry.get('path')
    require(isinstance(name, str) and name and not Path(name).is_absolute(), 'artifact path must be relative')
    require('..' not in Path(name).parts, 'artifact traversal is forbidden')
    path = root / name
    require(not any(p.is_symlink() for p in [path, *path.parents] if p != root.parent), 'symlink artifact is forbidden')
    require(path.is_file() and path.resolve().is_relative_to(root.resolve()), 'artifact missing or outside run')
    require(path.stat().st_size > 0, 'empty raw artifact')
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    require(digest.hexdigest() == entry.get('sha256'), 'raw artifact hash mismatch')
    return digest.hexdigest()


def startup_timeline(root, entry, ready, end):
    """Validate recorder metadata, never infer visual coverage from cadence alone."""
    configs, readiness, endings, frames = [], [], [], 0
    with (root / entry['path']).open() as source:
        for count, line in enumerate(source):
            require(count < 100000 and len(line) <= 65536, 'timeline exceeds bounds')
            try:
                row = json.loads(line)
            except ValueError:
                raise Incomplete('invalid timeline JSON')
            require(isinstance(row, dict) and row.get('kind') != 'invalid', 'recorder reported invalid acquisition')
            kind = row.get('kind')
            if kind == 'configuration':
                configs.append(row)
                require(row.get('clock') == 'mach-continuous-seconds' and row.get('audio') is False, 'capture configuration missing')
                require(number(row.get('refreshHz')) and row['refreshHz'] > 0, 'display cadence missing')
            elif kind == 'ready':
                readiness.append(row.get('time'))
            elif kind == 'end':
                endings.append(row.get('time'))
                require(row.get('acquisitionValid') is True, 'recorder did not finish cleanly')
            elif kind == 'frame':
                anchor = row.get('anchor', {})
                values = [anchor.get(k) for k in ('continuousBefore', 'continuousAfter', 'hostSeconds', 'absoluteTicks', 'tickSeconds')]
                require(all(number(v) for v in values) and values[0] <= values[1] and values[4] > 0, 'frame clock conversion missing')
                require(number(row.get('pts')) and type(row.get('status')) is int, 'frame PTS/status missing')
                if row['status'] == 0:
                    bounds = row.get('displayContinuousBounds')
                    require(isinstance(bounds, list) and len(bounds) == 2 and all(number(v) for v in bounds) and bounds[0] <= bounds[1], 'display timestamp mapping missing')
                    frames += 1
    require(len(configs) == 1 and readiness == [ready] and endings == [end] and frames > 0, 'timeline/report boundaries disagree')


def inspect_report(report, root, expected):
    """Return intake findings. A PASS here certifies metadata/coverage only."""
    try:
        require(isinstance(report, dict), 'report must be an object')
        require(re.fullmatch('[a-f0-9]{64}', expected) is not None, 'expected executable hash is required')
        require(report.get('schema') == 1, 'unsupported schema')
        require(report.get('executableSHA256') == expected, 'different executable')
        require(report.get('buildKind') == 'production', 'instrumented evidence is supplemental only')
        require(report.get('clock') == 'mach-continuous-seconds', 'use one documented monotonic clock')
        kind = report.get('kind')
        if kind == 'startup':
            trials = report.get('trials', [])
            require(isinstance(trials, list) and len(trials) == 10, 'ten complete cold trials required')
            calibration = report.get('calibration', {})
            for phase in ('before', 'after'):
                control = calibration.get(phase, {})
                require(control.get('oneRefreshFlashObserved') is True, 'single-refresh flash calibration required before/after')
                artifact(root, control.get('recording'))
                artifact(root, control.get('timeline'))
            ids, recordings = set(), set()
            previous_end = -1
            for trial in trials:
                require(isinstance(trial, dict), 'invalid trial')
                identity = trial.get('id')
                require(isinstance(identity, str) and identity and identity not in ids, 'unique trial IDs required')
                ids.add(identity)
                require(trial.get('coldLaunch') is True and trial.get('savedMode') == 'dark', 'cold saved-Dark launch required')
                times = [trial.get(k) for k in ('captureReady', 'launch', 'firstAppFrame', 'firstDocumentFrame', 'captureEnd')]
                require(all(number(v) for v in times) and times == sorted(times) and times[0] < times[1], 'capture must be ready before launch on the same clock')
                require(times[0] > previous_end, 'cold trial intervals must be distinct and sequential')
                previous_end = times[-1]
                require(trial.get('fullAppContentReview') is True, 'full app-content frames must be reviewed; color probes alone are insufficient')
                require(zero(trial.get('droppedFrames')) and trial.get('unobservedIntervals') == [], 'frame coverage gap')
                require(trial.get('captureScope') == 'isolated-test-display', 'prelaunch capture needs an explicitly isolated display')
                recording = artifact(root, trial.get('recording'))
                require(recording not in recordings, 'recording reused across cold trials')
                recordings.add(recording)
                artifact(root, trial.get('frameTimeline'))
                startup_timeline(root, trial['frameTimeline'], times[0], times[-1])
                require(trial.get('clockMappingReviewed') is True, 'sample/continuous clock mapping required')
                require(trial.get('frameStatusReviewed') is True, 'raw frame status and idle/drop review required')
                require(trial.get('displayCoverageReviewed') is True, 'display rate, bounds and occlusion review required')
                require(zero(trial.get('lightDocumentFrames')), 'light document frame observed or review missing')
        elif kind == 'requests':
            require(report.get('scope') == 'app-and-owned-webkit', 'app and owned WebKit attribution required')
            require(report.get('capturesOtherApps') is False, 'unrelated app capture forbidden')
            require(report.get('requestAttemptsCovered') is True and report.get('cspViolationsCovered') is True, 'connection/socket-only observation is insufficient')
            times = [report.get(k) for k in ('observerReady', 'journeyStart', 'journeyEnd', 'observerEnd')]
            require(all(number(v) for v in times) and times == sorted(times) and times[0] < times[1] < times[2], 'observer must span the entire journey')
            require(zero(report.get('droppedEvents')) and report.get('unobservedIntervals') == [], 'request observation gap')
            for phase in ('before', 'after'):
                control = report.get('controls', {}).get(phase, {})
                require(control.get('resourceObserved') is True and control.get('blockedAttemptObserved') is True, 'positive and CSP-blocked controls required before/after')
                artifact(root, control.get('raw'))
            artifact(root, report.get('rawEvents'))
            artifact(root, report.get('processAttribution'))
            require(zero(report.get('remoteAttemptsDuringJourney')), 'remote attempt observed or missing journey count')
        else:
            raise Incomplete('unknown report kind')
        require(report.get('reviewer') and isinstance(report['reviewer'], str), 'named human review required')
        return {'result': 'PASS', 'meaning': 'Evidence intake checks only; human review must verify raw recordings, attribution and coverage. No task closed.'}
    except (Incomplete, TypeError, KeyError, AttributeError, OSError) as error:
        return {'result': 'BLOCKED', 'reason': str(error), 'meaning': 'Insufficient evidence; no application PASS or task closure.'}


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    path = Path(sys.argv[1]).resolve()
    try:
        report = json.loads(path.read_text())
        result = inspect_report(report, path.parent, sys.argv[2])
    except (OSError, ValueError) as error:
        result = {'result': 'BLOCKED', 'reason': str(error)}
    print(json.dumps(result, indent=2))
    return 0 if result['result'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
