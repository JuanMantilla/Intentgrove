// Read-only, ordinary-host observation of this exact disposable candidate.
// Opens/closes no windows, terminates no app processes, and changes no permissions.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(run, '../../..');
const build = path.join(root, 'artifacts/windows/2026-10-05T23-35-49-946Z-3f427456');
const exe = path.join(build, 'Intentgrove.exe');
const expected = 'e1c3d306968470d6bbd25fdb61ca8cb8d97321d6eb8a89b71fed3f4c2f550559';
const receipt = JSON.parse(await readFile(path.join(build, 'build-info.json'), 'utf8'));
const result = { started: new Date().toISOString(), candidate: exe, sha256: expected,
  status: 'BLOCKED', observed: [], remaining: [], checkpoint: null };
const psQuote = value => `'${value.replaceAll("'", "''")}'`;

async function snapshot() {
  // Export only process identity/parentage; no unrelated paths or command lines.
  const code = `$ErrorActionPreference='Stop'; @(Get-CimInstance Win32_Process | ForEach-Object {
    [pscustomobject]@{ id=$_.ProcessId; parent=$_.ParentProcessId; name=$_.Name;
      created=$(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { 'unknown' });
      candidate=($_.ExecutablePath -eq ${psQuote(exe)}) }
  }) | ConvertTo-Json -Compress`;
  return new Promise((resolve, reject) => {
    const child = spawn('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', code], { windowsHide: true });
    let stdout = '', stderr = '';
    const deadline = setTimeout(() => { child.kill(); reject(new Error('Read-only process query timed out')); }, 10000);
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('error', error => { clearTimeout(deadline); reject(error); });
    child.on('close', code => {
      clearTimeout(deadline);
      if (code !== 0) reject(new Error(`Read-only process query failed: ${stderr}`));
      else { try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); } }
    });
  });
}

try {
  if (createHash('sha256').update(await readFile(exe)).digest('hex') !== expected)
    throw new Error('Candidate hash does not match');
  const owned = new Map();
  const key = process => `${process.id}:${process.created}`;
  const deadline = Date.now() + 120000;
  let announced = false, absent = 0;
  console.log('Open the repaired candidate first. This observer waits for its exact process.');
  while (Date.now() < deadline) {
    const processes = await snapshot();
    const current = new Map(processes.map(process => [key(process), process]));
    const activeParents = new Set([...owned.keys()].filter(id => current.has(id))
      .map(id => owned.get(id).id));
    for (const process of processes.filter(process => process.candidate)) {
      owned.set(key(process), process); activeParents.add(process.id);
    }
    let added = true;
    while (added) {
      added = false;
      for (const process of processes) {
        if (activeParents.has(process.parent) && !activeParents.has(process.id)) {
          owned.set(key(process), process); activeParents.add(process.id); added = true;
        }
      }
    }
    result.remaining = [...owned.keys()].filter(id => current.has(id)).map(id => current.get(id));
    if (owned.size && !announced) {
      console.log('Candidate and descendants observed. Close it normally now; no force quit.');
      announced = true;
    }
    if (owned.size && !result.remaining.length) absent++; else absent = 0;
    if (absent >= 2) { result.status = 'PASS'; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  result.observed = [...owned.values()];
  if (result.status !== 'PASS') result.reason = owned.size
    ? 'Observed candidate/descendants still present at deadline' : 'Candidate was not observed';
  // Read only the isolated candidate's continuity metadata, never file contents.
  const profile = path.join(process.env.LOCALAPPDATA, receipt.identifier);
  try {
    const record = JSON.parse(await readFile(path.join(profile, 'session/workspace.json'), 'utf8'));
    result.checkpoint = { sequence: record.payload.sequence, disposition: record.payload.exitDisposition,
      tabCount: record.payload.tabs.length, tabNames: record.payload.tabs.map(tab => tab.name) };
  } catch (error) { result.checkpointError = String(error); }
} catch (error) { result.reason = String(error); }
result.finished = new Date().toISOString();
const output = path.join(run, 'evidence', `observed-close-${result.started.replace(/[:.]/g, '-')}.json`);
await writeFile(output, JSON.stringify(result, null, 2) + '\n');
console.log(`${result.status}: read-only observed process termination; evidence: ${output}`);
console.log('No application process was terminated by this observer.');
if (result.status !== 'PASS') process.exitCode = 1;
