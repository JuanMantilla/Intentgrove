import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location('profile_mac_build', Path(__file__).resolve().parents[1] / 'profile-mac-build.py')
profile = importlib.util.module_from_spec(spec)
spec.loader.exec_module(profile)


class ProfileTests(unittest.TestCase):
    def test_top_aligns_cpu_and_ram_with_the_same_sample(self):
        raw = '''Processes: 10 total
2026/10/08 23:00:00
CPU usage: 20.0% user, 10.0% sys, 70.0% idle
PhysMem: 15G used (2000M wired, 6000M compressor), 200M unused.
Processes: 12 total
2026/10/08 23:00:02
CPU usage: 80.0% user, 20.0% sys, 0.0% idle
PhysMem: 15G used (2100M wired, 7000M compressor), 100M unused.
'''
        rows = profile.parse_top(raw)
        self.assertEqual(rows[0][3], 70)
        self.assertEqual(rows[1][3], 0)
        self.assertEqual(rows[0][4]['ram_unused_bytes_rounded'], 200 * 1024**2)
        self.assertEqual(rows[1][4]['ram_compressor_bytes_rounded'], 7000 * 1024**2)

    def test_vm_page_size_and_swap_units(self):
        page_size, pages = profile.parse_vm('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 42.\nSwapouts: 8.\n')
        self.assertEqual(page_size * pages['Pages free'], 688128)
        self.assertEqual(pages['Swapouts'], 8)
        self.assertEqual(profile.parse_swap('total = 2.00G used = 512.00M free = 1.50G')['used_bytes'], 536870912)
        with self.assertRaises(ValueError):
            profile.parse_vm('permission denied')

    def test_cancellation_reaches_child_without_touching_other_process(self):
        with tempfile.TemporaryDirectory() as folder:
            marker = Path(folder) / 'child-stopped'
            ready = Path(folder) / 'child-ready'
            child_code = f'''import signal,time
from pathlib import Path

def stop(*args):
 Path({str(marker)!r}).write_text('stopped')
 raise SystemExit(0)
signal.signal(signal.SIGTERM,stop)
Path({str(ready)!r}).write_text('ready')
time.sleep(30)
'''
            parent_code = f'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c",{child_code!r}]); time.sleep(30)'
            parent = subprocess.Popen([sys.executable, '-c', parent_code], start_new_session=True)
            unrelated = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(30)'], start_new_session=True)
            try:
                deadline = time.monotonic() + 5
                while not ready.exists() and time.monotonic() < deadline:
                    time.sleep(.02)
                self.assertTrue(ready.exists())
                profile.terminate_group(parent, grace=.5)
                self.assertEqual(marker.read_text(), 'stopped')
                self.assertIsNone(unrelated.poll())
            finally:
                profile.terminate_group(parent, grace=.1)
                profile.terminate_group(unrelated, grace=.1)

    def test_rejects_launch_after_cancellation(self):
        import argparse
        with tempfile.TemporaryDirectory() as folder:
            p = profile.Profiler(argparse.Namespace(), Path(folder))
            p.cancel.set()
            with (Path(folder)/'task.log').open('w') as log:
                self.assertIsNone(p.spawn([sys.executable,'-c','raise SystemExit(99)'], folder, log))
            self.assertEqual(len(p.active), 0)

    def test_marks_incomplete_companion_as_interrupted(self):
        import argparse,threading
        with tempfile.TemporaryDirectory() as folder:
            p = profile.Profiler(argparse.Namespace(timeout=10), Path(folder))
            finished = threading.Event()
            finished.set()
            result = p.task([sys.executable,'-c','import time; time.sleep(30)'], folder, 1, 'companion', 1, finished)
            self.assertTrue(result['interrupted'])
            self.assertEqual(result['reason'], 'round finished')
            self.assertFalse(any(x['kind']=='task_failure' for x in p.events))
            self.assertEqual(len(p.active), 0)


if __name__ == '__main__':
    unittest.main()
