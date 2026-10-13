import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from f002a_evidence import inspect_report


class IntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        (self.root / 'raw.txt').write_text('synthetic checker test data, not native evidence')
        raw = {'path': 'raw.txt', 'sha256': hashlib.sha256((self.root / 'raw.txt').read_bytes()).hexdigest()}
        self.startup = {'schema': 1, 'kind': 'startup', 'buildKind': 'production', 'clock': 'mach-continuous-seconds', 'executableSHA256': 'a' * 64,
            'reviewer': 'synthetic-test', 'trials': [dict(id=str(i), coldLaunch=True, savedMode='dark', captureReady=1+i*10, launch=2+i*10,
                firstAppFrame=3+i*10, firstDocumentFrame=4+i*10, captureEnd=5+i*10, fullAppContentReview=True, droppedFrames=0,
                unobservedIntervals=[], captureScope='isolated-test-display', recording=raw, frameTimeline=raw,
                lightDocumentFrames=0, clockMappingReviewed=True, frameStatusReviewed=True, displayCoverageReviewed=True) for i in range(10)]}
        self.startup['calibration'] = {phase: {'oneRefreshFlashObserved': True, 'recording': raw, 'timeline': raw} for phase in ('before','after')}
        for i, trial in enumerate(self.startup['trials']):
            path = self.root / f'recording-{i}.txt'
            path.write_text(f'Synthetic recording {i}; NOT app evidence')
            trial['recording'] = {'path': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
            timeline = self.root / f'timeline-{i}.jsonl'
            rows = [dict(kind='configuration', clock='mach-continuous-seconds', audio=False, refreshHz=60),
                    dict(kind='frame', pts=1, status=0, displayContinuousBounds=[1,1.01],
                         anchor=dict(continuousBefore=1, continuousAfter=1.01, hostSeconds=1, absoluteTicks=1, tickSeconds=0.01)),
                    dict(kind='ready', time=trial['captureReady']),
                    dict(kind='end', time=trial['captureEnd'], acquisitionValid=True)]
            timeline.write_text(''.join(json.dumps(row)+'\n' for row in rows))
            trial['frameTimeline'] = {'path':timeline.name, 'sha256':hashlib.sha256(timeline.read_bytes()).hexdigest()}
        self.requests = {'schema': 1, 'kind': 'requests', 'buildKind': 'production', 'clock': 'mach-continuous-seconds', 'executableSHA256': 'a' * 64,
            'reviewer': 'synthetic-test', 'scope': 'app-and-owned-webkit', 'capturesOtherApps': False,
            'requestAttemptsCovered': True, 'cspViolationsCovered': True, 'observerReady': 1, 'journeyStart': 2,
            'journeyEnd': 3, 'observerEnd': 4, 'droppedEvents': 0, 'unobservedIntervals': [],
            'controls': {phase: {'resourceObserved': True, 'blockedAttemptObserved': True, 'raw': raw} for phase in ('before', 'after')},
            'rawEvents': raw, 'processAttribution': raw, 'remoteAttemptsDuringJourney': 0}

    def tearDown(self):
        self.temp.cleanup()

    def result(self, report):
        return inspect_report(report, self.root, 'a' * 64)['result']

    def test_complete_metadata_is_only_intake_pass(self):
        for report in (self.startup, self.requests):
            self.assertEqual(self.result(report), 'PASS')
            self.assertIn('No task closed', inspect_report(report, self.root, 'a' * 64)['meaning'])

    def test_startup_gaps_and_probe_only_reports_are_blocked(self):
        for key, value in [('captureReady', 2.1), ('launch', float('nan')), ('droppedFrames', 1),
                           ('unobservedIntervals', [[2, 3]]), ('fullAppContentReview', False),
                           ('clockMappingReviewed', False), ('frameStatusReviewed', False), ('displayCoverageReviewed', False), ('lightDocumentFrames', 1), ('savedMode', 'system'), ('coldLaunch', False)]:
            with self.subTest(key=key):
                report = copy.deepcopy(self.startup); report['trials'][0][key] = value
                self.assertEqual(self.result(report), 'BLOCKED')

    def test_missing_duplicate_and_instrumented_trials_are_blocked(self):
        for field, value in [('trials', self.startup['trials'][:4]), ('buildKind', 'instrumented'), ('executableSHA256', 'b' * 64)]:
            report = copy.deepcopy(self.startup); report[field] = value
            self.assertEqual(self.result(report), 'BLOCKED')
        self.startup['trials'][1]['id'] = '0'
        self.assertEqual(self.result(self.startup), 'BLOCKED')

    def test_timeline_metadata_is_required_even_with_review_flags(self):
        trial = self.startup['trials'][0]
        path = self.root / trial['frameTimeline']['path']
        path.write_text('{}\n')
        trial['frameTimeline']['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.assertEqual(self.result(self.startup), 'BLOCKED')

    def test_missing_flash_calibration_is_blocked(self):
        for phase in ('before', 'after'):
            report = copy.deepcopy(self.startup)
            report['calibration'][phase]['oneRefreshFlashObserved'] = False
            self.assertEqual(self.result(report), 'BLOCKED')

    def test_socket_only_unscoped_or_missing_controls_are_blocked(self):
        for key, value in [('requestAttemptsCovered', False), ('cspViolationsCovered', False), ('capturesOtherApps', True),
                           ('remoteAttemptsDuringJourney', 1), ('controls', {}), ('observerReady', 2.5), ('droppedEvents', 1)]:
            with self.subTest(key=key):
                report = copy.deepcopy(self.requests); report[key] = value
                self.assertEqual(self.result(report), 'BLOCKED')

    def test_changed_missing_or_escaping_artifacts_are_blocked(self):
        for path in ['../raw.txt', '/tmp/raw.txt', 'missing.txt']:
            report = copy.deepcopy(self.requests); report['rawEvents']['path'] = path
            self.assertEqual(self.result(report), 'BLOCKED')
        (self.root / 'raw.txt').write_text('modified')
        self.assertEqual(self.result(self.requests), 'BLOCKED')

    def test_symlink_and_invalid_input_are_blocked(self):
        (self.root / 'alias').symlink_to(self.root / 'raw.txt')
        self.requests['rawEvents']['path'] = 'alias'
        self.assertEqual(self.result(self.requests), 'BLOCKED')
        for value in (None, [], {}, {'schema': 1}):
            self.assertEqual(self.result(value), 'BLOCKED')

    def test_reused_recording_and_overlapping_trials_are_blocked(self):
        report = copy.deepcopy(self.startup)
        report['trials'][1]['recording'] = report['trials'][0]['recording']
        self.assertEqual(self.result(report), 'BLOCKED')
        report = copy.deepcopy(self.startup)
        report['trials'][1]['captureReady'] = 4
        self.assertEqual(self.result(report), 'BLOCKED')


if __name__ == '__main__':
    unittest.main()
