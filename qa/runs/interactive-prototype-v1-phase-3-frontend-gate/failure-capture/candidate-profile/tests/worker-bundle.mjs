import { strict as assert } from "node:assert";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const assets = join(import.meta.dirname, "..", "dist", "assets");
const workerFiles = (await readdir(assets)).filter((name) => /^markdownBudget\.worker-.*\.js$/.test(name));
assert.equal(workerFiles.length, 1, "expected one production Markdown worker bundle");

const messages = [];
const worker = { postMessage: (message) => messages.push(message) };
runInNewContext(await readFile(join(assets, workerFiles[0]), "utf8"),
  { self: worker, TextEncoder }, { timeout: 2_000 });
assert.equal(typeof worker.onmessage, "function");
worker.onmessage({ data: "# Bundled worker\n\n**GFM** &amp; text\n\n| A | B |\n| - | - |\n| 1 | 2 |" });
assert.equal(messages[0]?.kind, "parsed");
assert.equal(messages[0].tree.children[0].type, "heading");
assert.ok(messages[0].tree.children.some((node) => node.type === "table"));
messages.length = 0;
worker.onmessage({ data: "---\ntitle: Guide\n---\n# Body" });
assert.equal(messages[0]?.kind, "parsed");
assert.equal(messages[0]?.metadata?.status, "valid");
assert.deepEqual(JSON.parse(JSON.stringify(messages[0].metadata.entries)),
  [{ key: "title", value: "Guide" }]);
messages.length = 0;
worker.onmessage({ data: "---\ntitle: A\ntitle: B\n---\n# Body" });
assert.equal(messages[0]?.kind, "parsed");
assert.equal(messages[0]?.metadata?.status, "invalid");
const mixedBlock = "# Section\n\nOrdinary **strong** and *emphasis*. "
  + "Plain prose with words and punctuation. ".repeat(96)
  + "\n\n- first\n- second\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n";
messages.length = 0;
worker.onmessage({ data: mixedBlock.repeat(Math.ceil(1_048_576 / mixedBlock.length)).slice(0, 1_048_576) });
assert.equal(messages[0]?.kind, "parsed", "ordinary 1 MiB mixed Markdown must stay within the worker budget");
messages.length = 0;
worker.onmessage({ data: "> ".repeat(140) + "deep" });
assert.equal(messages[0]?.kind, "parsed");
assert.equal(messages[0].blocks[0].fallback, true);
const codeFiles = (await readdir(assets)).filter((name) => /^codeTokens\.worker-.*\.js$/.test(name));
assert.equal(codeFiles.length, 1, "expected one production code-token worker bundle");
const codeMessages = [];
const codeWorker = { postMessage: (message) => codeMessages.push(message) };
runInNewContext(await readFile(join(assets, codeFiles[0]), "utf8"),
  { self: codeWorker }, { timeout: 2_000 });
const codeSource = 'const x = "<script>";';
codeWorker.onmessage({ data: { language: "js", source: codeSource } });
assert.equal(codeMessages[0]?.kind, "tokens");
const flatCode = (tokens) => tokens.map((token) => token.text ?? flatCode(token.children)).join("");
assert.equal(flatCode(codeMessages[0].tokens), codeSource);
codeMessages.length = 0;
codeWorker.onmessage({ data: { language: "unknown", source: codeSource } });
assert.equal(codeMessages[0]?.kind, "plain");
console.log("PASS: production Markdown and code workers use bounded local parsing without document or window globals");
