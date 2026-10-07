import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  desktopGateComplete, freshInstallers, parseOptions, requireSuccess,
  runProcess, unexpectedDependencies, validatePackaging,
} from './build-windows.mjs';

const configs = () => ({
  base: { build: { beforeBuildCommand: 'npm run build' } },
  windows: { bundle: { targets: ['nsis'], fileAssociations: [], windows: {
    nsis: { installMode: 'currentUser' }, webviewInstallMode: { type: 'skip' }, allowDowngrades: false,
  } } },
  manifest: { scripts: { build: 'tsc --noEmit && vite build', test: 'vitest run',
    'test:bundle-worker': 'node tests/worker-bundle.mjs', tauri: 'tauri' } },
});

test('installer gate requires both completed desktop tasks, not historical prose', () => {
  assert.equal(desktopGateComplete('- [ ] T012 desktop\n- [x] T024 desktop\nT012 PASS'), false);
  assert.equal(desktopGateComplete('- [x] T012 desktop\n- [ ] T024 desktop'), false);
  assert.equal(desktopGateComplete('- [x] T012 desktop\n- [x] T024 desktop'), true);
});

test('invalid CLI arguments cannot silently change the requested build', () => {
  assert.throws(() => parseOptions(['--skip-tests']), /Unknown argument/);
  assert.throws(() => parseOptions(['--no-bundle', '--preflight']), /Choose/);
  assert.equal(parseOptions(['--no-bundle'])['no-bundle'], true);
});

test('packaging refuses elevation, runtime downloads and associations', () => {
  const { base, windows, manifest } = configs();
  validatePackaging(base, windows, manifest);
  windows.bundle.windows.nsis.installMode = 'perMachine';
  assert.throws(() => validatePackaging(base, windows, manifest), /currentUser/);
  windows.bundle.windows.nsis.installMode = 'currentUser';
  windows.bundle.windows.webviewInstallMode.type = 'downloadBootstrapper';
  assert.throws(() => validatePackaging(base, windows, manifest), /WebView2/);
  windows.bundle.windows.webviewInstallMode.type = 'skip';
  windows.bundle.fileAssociations.push({ ext: ['md'] });
  assert.throws(() => validatePackaging(base, windows, manifest), /associations/);
});

test('unreviewed lifecycle scripts, sidecars and custom installer hooks stop construction', () => {
  for (const mutate of [
    c => { c.manifest.scripts.postinstall = 'something'; },
    c => { c.windows.build = { beforeBuildCommand: 'something' }; },
    c => { c.windows.bundle.externalBin = ['worker']; },
    c => { c.windows.bundle.resources = { secret: 'secret' }; },
    c => { c.windows.bundle.windows.nsis.installerHooks = 'hooks.nsh'; },
    c => { c.windows.bundle.windows.nsis.template = 'template.nsi'; },
    c => { c.windows.bundle.windows.signCommand = 'something'; },
  ]) {
    const c = configs(); mutate(c);
    assert.throws(() => validatePackaging(c.base, c.windows, c.manifest), /review|scripts changed/);
  }
});

test('stale and unrelated installer files are not delivered', () => {
  const before = { 'old-setup.exe': '123:456' };
  assert.deepEqual(freshInstallers(before, [
    { name: 'old-setup.exe', size: 123, mtimeMs: 456 },
    { name: 'unrelated.exe', size: 30, mtimeMs: 900 },
  ]), []);
  assert.deepEqual(freshInstallers(before, [{ name: 'new-setup.exe', size: 20, mtimeMs: 901 }])
    .map(f => f.name), ['new-setup.exe']);
});

test('unknown companion imports and missing inspection evidence are not called portable', () => {
  assert.deepEqual(unexpectedDependencies('    KERNEL32.dll\n    api-ms-win-crt-runtime-l1-1-0.dll\n'), []);
  assert.deepEqual(unexpectedDependencies('    KERNEL32.dll\n    WebView2Loader.dll\n    VCRUNTIME140.dll\n'),
    ['webview2loader.dll', 'vcruntime140.dll']);
  assert.throws(() => unexpectedDependencies('inspection failed'), /Could not inspect/);
});

test('real child exit failures propagate; Unicode/spaced working directories work', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'Intentgrove café build '));
  try {
    const result = await runProcess(process.execPath,
      ['-e', 'console.log(process.cwd()); process.exit(7)'], { cwd: directory, quiet: true });
    assert.equal(result.code, 7);
    assert.ok(result.output.includes(directory));
    assert.throws(() => requireSuccess(result, 'deliberate failure'), /exit 7/);
    await assert.rejects(runProcess(path.join(directory, 'missing.exe'), [], { quiet: true }), /ENOENT/);
  } finally { await rm(directory, { recursive: true }); }
});

test('CLI rejects unsupported flags with a nonzero process exit before building', async () => {
  const result = await runProcess(process.execPath, ['scripts/build-windows.mjs', '--skip-tests'], { quiet: true });
  assert.equal(result.code, 1);
  assert.match(result.output, /Unknown argument/);
});
