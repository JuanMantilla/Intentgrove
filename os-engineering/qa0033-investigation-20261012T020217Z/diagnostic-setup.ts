import { beforeAll, afterAll, expect } from "vitest";
let rows: unknown[] = []; let sequence = 0; const owners = new WeakMap<object, number>();
beforeAll(() => {
 if (!expect.getState().testPath?.endsWith("/new-markdown.test.tsx")) return;
 (globalThis as any).__qa33 = (owner: object, event: string, data: object = {}) => {
  if (!owners.has(owner)) owners.set(owner, ++sequence);
  rows.push({ order: rows.length, at: performance.now(), test: expect.getState().currentTestName, owner: owners.get(owner), event, ...data });
 };
});
afterAll(() => { if (rows.length) console.log("QA33_TRACE " + JSON.stringify(rows)); delete (globalThis as any).__qa33; });
