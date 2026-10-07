import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = 'x86_64-pc-windows-msvc';
const toolchain = '1.88.0';
const tasksPath = 'specs/013-windows-desktop/tasks.md';
const help = `Usage: build-windows.cmd [--no-bundle | --preflight] [--restore] [--verify-native]

Default: checked release build plus unsigned current-user NSIS installer.
Installer construction requires completed F007W T012 and T024 desktop gates.
--no-bundle      Build a read-only verification executable with isolated app data.
--preflight      Inspect prerequisites/configuration without compiling or downloading.
--restore        Run npm.cmd ci even if installed dependencies are already valid.
--verify-native  Also run full and serial native tests in executable-only mode.

Outputs: artifacts/windows/<unique build>/ (files, SHA256SUMS.txt, receipt, logs).
Never installs or launches the application. No signing or publication.`;

export function parseOptions(args) {
  const known = new Set(['--no-bundle', '--preflight', '--restore', '--verify-native', '--help']);
  for (const arg of args) if (!known.has(arg)) throw new Error(`Unknown argument: ${arg}\n${help}`);
  if (args.includes('--no-bundle') && args.includes('--preflight')) throw new Error('Choose --no-bundle or --preflight.');
  return Object.fromEntries([...known].map(arg => [arg.slice(2), args.includes(arg)]));
}

export function desktopGateComplete(tasks) {
  return ['T012', 'T024'].every(id => new RegExp(`^- \\[x\\] ${id}\\b`, 'm').test(tasks));
}

export function validatePackaging(base, windows, manifest) {
  const bundle = windows.bundle;
  if (JSON.stringify(bundle?.targets) !== '["nsis"]' || bundle.fileAssociations?.length !== 0 ||
      bundle.windows?.nsis?.installMode !== 'currentUser' ||
      bundle.windows?.webviewInstallMode?.type !== 'skip' || bundle.windows?.allowDowngrades !== false) {
    throw new Error('Windows packaging must remain NSIS/currentUser, without associations or WebView2 downloads.');
  }
  for (const config of [base, windows]) {
    const b = config.bundle ?? {};
    if (b.resources?.length || (b.resources && !Array.isArray(b.resources) && Object.keys(b.resources).length) ||
        b.externalBin?.length || b.windows?.signCommand || b.windows?.certificateThumbprint ||
        b.windows?.nsis?.installerHooks || b.windows?.nsis?.template || config.build?.beforeBundleCommand ||
        (config === windows && config.build?.beforeBuildCommand)) {
      throw new Error('Custom resources, sidecars, signing or installer/build hooks need packaging review.');
    }
  }
  if (base.build?.beforeBuildCommand !== 'npm run build' ||
      manifest.scripts?.build !== 'tsc --noEmit && vite build' ||
      manifest.scripts?.test !== 'vitest run' ||
      manifest.scripts?.['test:bundle-worker'] !== 'node tests/worker-bundle.mjs' ||
      manifest.scripts?.tauri !== 'tauri' ||
      ['preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'prepare', 'postprepare',
       'prebuild', 'postbuild', 'pretest', 'posttest',
       'pretauri', 'posttauri', 'pretest:bundle-worker', 'posttest:bundle-worker'].some(k => manifest.scripts?.[k])) {
    throw new Error('Application lifecycle/build scripts changed; review them before running this builder.');
  }
}

export function runProcess(executable, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd ?? root, env: options.env ?? process.env,
      windowsHide: true, windowsVerbatimArguments: options.verbatim ?? false,
    });
    let output = '';
    const collect = data => {
      output += data.toString();
      if (!options.quiet) process.stdout.write(data);
    };
    child.stdout.setEncoding('utf8').on('data', collect);
    child.stderr.setEncoding('utf8').on('data', collect);
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal, output }));
  });
}

export function requireSuccess(result, label) {
  if (result.code !== 0) throw new Error(`${label} failed (exit ${result.code}, signal ${result.signal ?? 'none'}). See the build logs.`);
  return result.output;
}

export function unexpectedDependencies(output) {
  const system = new Set(['advapi32.dll', 'bcrypt.dll', 'bcryptprimitives.dll', 'comctl32.dll',
    'comdlg32.dll', 'dwmapi.dll', 'gdi32.dll', 'kernel32.dll', 'ntdll.dll', 'ole32.dll',
    'oleaut32.dll', 'shell32.dll', 'shlwapi.dll', 'user32.dll', 'ucrtbase.dll', 'ws2_32.dll',
    'version.dll', 'winmm.dll', 'imm32.dll', 'msvcrt.dll', 'secur32.dll', 'propsys.dll']);
  const imports = [...output.matchAll(/^\s+([\w.-]+\.dll)\s*$/gim)].map(m => m[1].toLowerCase());
  if (imports.length === 0) throw new Error('Could not inspect PE imports; refusing to claim companion files are complete.');
  return [...new Set(imports)].filter(dll => !system.has(dll) && !/^api-ms-win-(core|crt)-/.test(dll));
}

export function freshInstallers(before, after) {
  return after.filter(file => /-setup\.exe$/i.test(file.name) &&
    (!before[file.name] || before[file.name] !== `${file.size}:${file.mtimeMs}`));
}

async function snapshot(directory) {
  if (!existsSync(directory)) return [];
  return Promise.all((await readdir(directory)).filter(name => /-setup\.exe$/i.test(name)).map(async name => {
    const info = await stat(path.join(directory, name));
    return { name, size: info.size, mtimeMs: info.mtimeMs };
  }));
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) { console.log(help); return; }
  if (process.platform !== 'win32') throw new Error('This build script supports Windows x64 only. Linux is unsupported.');
  const json = async name => JSON.parse(await readFile(path.join(root, name), 'utf8'));
  const base = await json('src-tauri/tauri.conf.json');
  const windows = await json('src-tauri/tauri.windows.conf.json');
  const manifest = await json('package.json');
  validatePackaging(base, windows, manifest);
  const gate = desktopGateComplete(await readFile(path.join(root, tasksPath), 'utf8'));
  if (!options.preflight && !options['no-bundle'] && !gate) {
    throw new Error(`Installer BLOCKED: F007W T012/T024 desktop verification is incomplete (${tasksPath}).\nUse build-windows.cmd --no-bundle to compile the read-only executable. No gate override is provided.`);
  }

  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const outputDir = path.join(root, 'artifacts', 'windows', id);
  await mkdir(path.join(outputDir, 'logs'), { recursive: true });
  const receipt = { started: new Date().toISOString(), status: 'RUNNING', type: options.preflight ? 'preflight' :
    options['no-bundle'] ? 'unsigned x64 release, no bundle' : 'unsigned x64 release, currentUser NSIS',
    target, toolchain, desktopGate: gate ? 'COMPLETE' : 'INCOMPLETE', commands: [], artifacts: [],
    applicationInstalled: false, signed: false, published: false, desktopTest: 'NOT RUN by builder',
    macOS: 'NOT RUN', linux: 'UNSUPPORTED', nativeTests: 'NOT RUN' };
  let env = { ...process.env };
  const comspec = process.env.ComSpec ?? path.join(process.env.SystemRoot, 'System32', 'cmd.exe');
  let step = 0;
  const run = async (label, exe, args, settings = {}) => {
    console.log(`\n${label}`);
    const result = await runProcess(exe, args, { env, ...settings });
    const log = `logs/${String(++step).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.txt`;
    await writeFile(path.join(outputDir, log), result.output);
    receipt.commands.push({ label, executable: exe, arguments: args, exit: result.code, signal: result.signal, log });
    if (!settings.allowFailure) requireSuccess(result, label);
    return result;
  };
  const cmd = (label, command, settings) => run(label, comspec, ['/d', '/v:off', '/s', '/c', command], { verbatim: true, ...settings });
  try {
    const cargoBin = path.join(process.env.USERPROFILE, '.cargo', 'bin');
    const rustup = path.join(cargoBin, 'rustup.exe');
    const cargo = path.join(cargoBin, 'cargo.exe');
    if (!existsSync(rustup) || !existsSync(cargo)) throw new Error('Missing rustup/Cargo: install Rust 1.88.0 from https://rustup.rs/ then rustup toolchain install 1.88.0 --profile minimal.');
    const versions = await run('Rust toolchains', rustup, ['toolchain', 'list'], { quiet: true });
    if (!versions.output.split(/\r?\n/).some(line => line.startsWith(`${toolchain}-`))) throw new Error('Missing Rust 1.88.0. Run: rustup toolchain install 1.88.0 --profile minimal');
    const targets = await run('Rust installed targets', rustup, ['target', 'list', '--installed', '--toolchain', toolchain], { quiet: true });
    if (!targets.output.split(/\r?\n/).includes(target)) throw new Error(`Missing Rust target. Run: rustup target add ${target} --toolchain ${toolchain}`);
    const vswhere = path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio', 'Installer', 'vswhere.exe');
    if (!existsSync(vswhere)) throw new Error('Missing Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/ (C++ x64 tools and Windows SDK).');
    const vs = await run('Find MSVC tools', vswhere, ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath'], { quiet: true });
    const installation = vs.output.trim();
    if (!installation) throw new Error('Install the MSVC C++ x64 tools and Windows SDK using Visual Studio Installer.');
    env.INTENTGROVE_VS_DEVCMD = path.join(installation, 'Common7', 'Tools', 'VsDevCmd.bat');
    if (!existsSync(env.INTENTGROVE_VS_DEVCMD) || /[%"\r\n]/.test(env.INTENTGROVE_VS_DEVCMD)) throw new Error('Unsupported or missing VsDevCmd path.');
    // Capture only build variables; never persist the full environment or credentials.
    const dev = await runProcess(comspec, ['/d', '/v:off', '/s', '/c', 'call "%INTENTGROVE_VS_DEVCMD%" -arch=x64 -host_arch=x64 >nul && set'], { env, verbatim: true, quiet: true });
    requireSuccess(dev, 'MSVC developer environment');
    for (const line of dev.output.split(/\r?\n/)) {
      const match = /^([^=]+)=(.*)$/.exec(line);
      if (match && /^(path|include|lib|libpath|windowssdkdir|windowssdkversion|vctoolsinstalldir|vctoolsversion|vcinstalldir|vsinstalldir|universalcrtsdkdir|ucrtversion)$/i.test(match[1])) {
        const key = Object.keys(env).find(k => k.toLowerCase() === match[1].toLowerCase()) ?? match[1];
        env[key] = match[2];
      }
    }
    const getEnv = key => Object.entries(env).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
    if (!getEnv('WindowsSdkDir') || !getEnv('WindowsSDKVersion')) throw new Error('Windows SDK missing from MSVC environment; add a Windows 10/11 SDK in Visual Studio Installer.');
    const pathKey = Object.keys(env).find(k => k.toLowerCase() === 'path') ?? 'PATH';
    env[pathKey] = `${cargoBin};${env[pathKey]}`;
    env.RUSTUP_TOOLCHAIN = toolchain;
    // Reuse the already restored feature cache; --locked still protects Cargo.lock.
    if (!env.CARGO_HOME && existsSync(path.join(root, '.cache/cargo-f007w/registry'))) env.CARGO_HOME = path.join(root, '.cache/cargo-f007w');
    const temp = path.join(root, '.cache', 'windows-build', id);
    await mkdir(temp, { recursive: true });
    env.TEMP = temp; env.TMP = temp;
    // A caller's target/profile/features must not silently alter the delivered build.
    delete env.CARGO_TARGET_DIR;
    delete env.TAURI_CONFIG;
    receipt.toolVersions = { node: process.version, rust: (await run('Rust compiler version', path.join(cargoBin, 'rustc.exe'), [`+${toolchain}`, '--version'], { quiet: true })).output.trim(),
      msvc: getEnv('VCToolsVersion'), sdk: getEnv('WindowsSDKVersion'), visualStudio: installation,
      npm: (await cmd('npm version', 'npm.cmd --version', { quiet: true })).output.trim() };
    requireSuccess(await cmd('MSVC linker and PE inspector', 'where.exe link.exe && where.exe dumpbin.exe', { quiet: true }), 'MSVC tools');
    console.log(`MSVC ${receipt.toolVersions.msvc}; SDK ${receipt.toolVersions.sdk}; Rust ${toolchain}`);
    console.log(`Desktop installer gate: ${receipt.desktopGate}. WebView2 must be installed separately; this builder never installs it.`);
    receipt.bundlerTools = 'Tauri-managed official NSIS tools, project target cache; acquired only during bundling';
    if (!options.preflight) {
      const beforeHashes = {};
      for (const name of ['package.json', 'package-lock.json', 'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock',
        'src-tauri/tauri.conf.json', 'src-tauri/tauri.windows.conf.json', 'scripts/build-windows.mjs', 'build-windows.cmd']) {
        beforeHashes[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
      }
      receipt.inputs = beforeHashes;
      const tree = await cmd('Inspect installed npm dependencies', 'npm.cmd ls --depth=0', { quiet: true, allowFailure: true });
      if (options.restore || tree.code !== 0) await cmd('Restore locked npm dependencies', 'npm.cmd ci --no-audit --no-fund');
      await cmd('Frontend tests', 'npm.cmd test');
      await cmd('Frontend production build', 'npm.cmd run build');
      await cmd('Worker bundle check', 'npm.cmd run test:bundle-worker');
      const cargoArgs = [`+${toolchain}`, 'check', '--manifest-path', 'src-tauri/Cargo.toml', '--locked', '--all-targets', '--target', target];
      await run('Windows all-target check', cargo, cargoArgs);
      if (!options['no-bundle'] || options['verify-native']) {
        const native = [`+${toolchain}`, 'test', '--manifest-path', 'src-tauri/Cargo.toml', '--locked', '--target', target];
        await run('Windows full native tests', cargo, native);
        await run('Windows serial filesystem storage tests', cargo, [...native, '--test', 'windows_scoped', '--', '--test-threads=1']);
        receipt.nativeTests = 'PASS';
      }
      const config = { bundle: { useLocalToolsDir: true, createUpdaterArtifacts: false } };
      if (options['no-bundle']) config.identifier = `${base.identifier}.windowsfixture${id.replace(/[^a-z0-9]/gi, '')}`;
      receipt.identifier = config.identifier ?? base.identifier;
      receipt.configurationOverride = config;
      const configFile = path.join(temp, 'tauri.build.json');
      await writeFile(configFile, JSON.stringify(config, null, 2));
      env.INTENTGROVE_WINDOWS_BUILD_CONFIG = configFile;
      const release = path.join(root, 'src-tauri', 'target', target, 'release');
      const installerDir = path.join(release, 'bundle', 'nsis');
      const before = Object.fromEntries((await snapshot(installerDir)).map(f => [f.name, `${f.size}:${f.mtimeMs}`]));
      await cmd('Windows release build', `npm.cmd run tauri -- build --target ${target} --no-sign --config "%INTENTGROVE_WINDOWS_BUILD_CONFIG%" ${options['no-bundle'] ? '--no-bundle' : '--bundles nsis'} -- --locked`);
      for (const [name, hash] of Object.entries(beforeHashes)) {
        if (createHash('sha256').update(await readFile(path.join(root, name))).digest('hex') !== hash) throw new Error(`Build input changed: ${name}. Refusing to deliver artifacts.`);
      }
      const exe = path.join(release, 'md_reader.exe');
      const pe = await readFile(exe);
      const offset = pe.readUInt32LE(0x3c);
      if (pe.toString('ascii', offset, offset + 4) !== 'PE\0\0' || pe.readUInt16LE(offset + 4) !== 0x8664) throw new Error('Release executable is not an x64 PE image.');
      env.INTENTGROVE_WINDOWS_EXE = exe;
      const imports = await cmd('Inspect executable dependencies', 'dumpbin.exe /dependents "%INTENTGROVE_WINDOWS_EXE%"', { quiet: true });
      const unknown = unexpectedDependencies(imports.output);
      if (unknown.length) throw new Error(`Unresolved companion/runtime DLLs: ${unknown.join(', ')}. Review and include licensed companions before delivery.`);
      const files = [{ source: exe, name: 'Intentgrove.exe' }];
      if (!options['no-bundle']) {
        const fresh = freshInstallers(before, await snapshot(installerDir));
        if (fresh.length !== 1) throw new Error(`Expected exactly one newly produced NSIS installer, found ${fresh.length}; stale artifacts will not be delivered.`);
        files.push({ source: path.join(installerDir, fresh[0].name), name: fresh[0].name });
      }
      for (const file of files) {
        await copyFile(file.source, path.join(outputDir, file.name));
        const bytes = await readFile(path.join(outputDir, file.name));
        receipt.artifacts.push({ file: file.name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
      await writeFile(path.join(outputDir, 'SHA256SUMS.txt'), receipt.artifacts.map(f => `${f.sha256}  ${f.file}`).join('\n') + '\n');
      await writeFile(path.join(outputDir, 'README.txt'), `Intentgrove ${base.version} - ${receipt.type}\n\nOpen Intentgrove.exe directly to run without installation.\n${options['no-bundle'] ? 'No installer was constructed. This build uses disposable, isolated app data.' : `To install later, open ${receipt.artifacts[1].file}. The installer is unsigned and current-user only. Installation has NOT been tested or performed.`}\n\nRequirements: Windows 11 x64, local NTFS documents, installed usable Microsoft Edge WebView2 runtime.\nNo automatic WebView2 download; missing runtime must be installed separately from Microsoft.\nFrontend/browser-worker assets are embedded. Inspected PE imports need only Windows system/UCRT DLLs; do not copy those DLLs.\nWindows editing/Save/Save As remain disabled in the current F007W candidate.\nApplication identifier: ${receipt.identifier}\nDesktop/DPI verification, Mac regressions and release readiness are separate from building.\nSee build-info.json, logs/ and SHA256SUMS.txt for exact results and hashes.\n`);
    }
    receipt.status = 'PASS';
    console.log(`\n${options.preflight ? 'Preflight' : 'Build'} PASS. Output: ${outputDir}`);
    if (receipt.artifacts.length) console.log('Open Intentgrove.exe in that folder to run the application.');
  } catch (error) {
    receipt.status = 'FAIL'; receipt.error = error.message;
    console.error(`\nFAILED: ${error.message}\nLogs: ${outputDir}`);
    process.exitCode = 1;
  } finally {
    receipt.finished = new Date().toISOString();
    await writeFile(path.join(outputDir, 'build-info.json'), JSON.stringify(receipt, null, 2) + '\n');
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
