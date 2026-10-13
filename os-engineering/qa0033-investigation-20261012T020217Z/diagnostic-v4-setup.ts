import { writeFileSync } from "node:fs";
import { beforeEach, afterAll, expect } from "vitest";
let rows: unknown[] = []; let sequence = 0; const owners = new WeakMap<object, number>();
beforeEach(() => {
 if (!expect.getState().testPath?.endsWith("/new-markdown.test.tsx")) return;
 (globalThis as any).__qa33 = (owner: object, event: string, data: object = {}) => {
  if (!owners.has(owner)) owners.set(owner, ++sequence);
  rows.push({ order: rows.length, at: performance.now(), test: expect.getState().currentTestName, owner: owners.get(owner), event, ...data });
 };
});
afterAll(() => { if (rows.length) writeFileSync("/Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/runtime-trace-" + process.pid + ".json", JSON.stringify(rows,null,2)); delete (globalThis as any).__qa33; });
