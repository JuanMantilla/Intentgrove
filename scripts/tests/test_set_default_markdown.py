"""Disposable script-contract tests. Fake executable; never invoke the real app."""
import os
import pathlib
import plistlib
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'set-default-markdown.sh'

class ConsentScript(unittest.TestCase):
    def test_bundle_and_status(self):
        with tempfile.TemporaryDirectory(prefix='ig-consent-') as root:
            bundle = pathlib.Path(root) / 'space $literal Intentgrove.app'
            macos = bundle / 'Contents' / 'MacOS'
            macos.mkdir(parents=True)
            executable = macos / 'Intentgrove'
            marker = pathlib.Path(root) / 'args'
            executable.write_text('#!/bin/bash\nprintf "%s\\n" "$@" > "$IG_TEST_MARKER"\nexit "$IG_TEST_EXIT"\n')
            executable.chmod(0o700)
            info = dict(CFBundleIdentifier='com.juanmantilla.markdownworkspace', CFBundleExecutable='Intentgrove', IGMarkdownDefaultConsent=True)
            plist = bundle / 'Contents' / 'Info.plist'
            def run(args):
                return subprocess.run([str(SCRIPT), *args], env={**os.environ, 'IG_TEST_MARKER': str(marker), 'IG_TEST_EXIT': str(status)}, capture_output=True)
            for status in (0, 2, 3, 4):
                plist.write_bytes(plistlib.dumps(info))
                self.assertEqual(run([str(bundle)]).returncode, status)
                self.assertEqual(marker.read_text(), '--request-default-markdown\n')
            for key, value in [('CFBundleIdentifier', 'com.juanmantilla.markdownworkspace.qa'), ('CFBundleExecutable', '../escape'), ('IGMarkdownDefaultConsent', False)]:
                invalid = {**info, key: value}
                plist.write_bytes(plistlib.dumps(invalid)); marker.unlink(missing_ok=True)
                self.assertEqual(run([str(bundle)]).returncode, 4)
                self.assertFalse(marker.exists())
            self.assertEqual(run([str(bundle), 'extra']).returncode, 4)
            self.assertEqual(run([str(bundle) + '-missing']).returncode, 4)
            plist.write_bytes(b'broken'); self.assertEqual(run([str(bundle)]).returncode, 4)

if __name__ == '__main__':
    unittest.main()
