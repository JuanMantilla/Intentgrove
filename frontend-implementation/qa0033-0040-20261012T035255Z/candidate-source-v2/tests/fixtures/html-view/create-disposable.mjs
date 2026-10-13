// Creates only a new temporary test root; never edits source fixtures or user files.
import { mkdtemp, cp, copyFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = await mkdtemp(join(tmpdir(), 'intentgrove-html-'));
const fixture = fileURLToPath(new URL('.', import.meta.url));
await cp(fixture, join(root, 'workspace'), { recursive: true, filter: p => !p.endsWith('create-disposable.mjs') });
await copyFile(fileURLToPath(new URL('../../../src/assets/fonts/Roboto[wdth,wght].ttf', import.meta.url)), join(root, 'workspace/assets/font.ttf'));
await writeFile(join(root, 'workspace/assets/pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1cAAAAASUVORK5CYII=', 'base64'));
await mkdir(join(root, 'outside'));
await writeFile(join(root, 'outside/denied.html'), '<h1>Outside selected workspace grant</h1>');
await writeFile(join(root, 'outside/denied.css'), 'body { color: red }');
await writeFile(join(root, 'workspace/empty.html'), '');
await writeFile(join(root, 'workspace/unstyled.html'), '<h1>Unstyled baseline</h1><p>Visible text</p>');
await writeFile(join(root, 'workspace/malformed.html'), '<h1>Recoverable<p>Malformed<div>content');
process.stdout.write(JSON.stringify({ root, workspace: join(root, 'workspace'), status: 'FIXTURES_ONLY_NOT_TESTED' }) + '\n');
