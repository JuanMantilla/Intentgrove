import io
import json
from pathlib import Path
import subprocess
import sys
import unittest
from startup_trial import await_ready, continuous
from qa_runner import send_command


class StartupToolsTests(unittest.TestCase):
    def test_ready_requires_explicit_ready_event(self):
        process = subprocess.Popen([sys.executable, '-c', 'print(\'{"event":"ready","time":12}\', flush=True)'], stdout=subprocess.PIPE, text=True)
        try:
            self.assertEqual(await_ready(process, 2)['time'], 12)
        finally:
            process.wait(timeout=2); process.stdout.close()

    def test_early_exit_does_not_become_readiness(self):
        process = subprocess.Popen([sys.executable, '-c', 'print(\'{"event":"error"}\', flush=True)'], stdout=subprocess.PIPE, text=True)
        try:
            with self.assertRaises(RuntimeError): await_ready(process, 2)
        finally:
            process.wait(timeout=2); process.stdout.close()

    @unittest.skipUnless(sys.platform == 'darwin', 'native clock')
    def test_native_clock_monotonic(self):
        self.assertLessEqual(continuous(), continuous())

    def test_oversized_command_is_not_sent(self):
        class Connection:
            def sendall(self, _): raise AssertionError('must reject before send')
        with self.assertRaises(ValueError):
            send_command(Connection(), io.BytesIO(), {'command':'x'*4096}, 'a'*64, 'b'*32, 1)

    def test_response_sequence_and_size_checked(self):
        class Connection:
            def sendall(self, _): pass
        for response in [b'{"sequence":2}\n', b'x'*65537]:
            with self.assertRaises(ValueError):
                send_command(Connection(), io.BytesIO(response), {'command':'snapshot'}, 'a'*64, 'b'*32, 1)

if __name__ == '__main__': unittest.main()
