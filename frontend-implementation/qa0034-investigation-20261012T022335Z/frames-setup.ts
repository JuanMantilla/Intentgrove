import { beforeEach, afterAll, expect } from "vitest";
let original: typeof setTimeout | undefined;
beforeEach(() => {
  if (!expect.getState().testPath?.endsWith("/appearance-operations.test.tsx") || original) return;
  original = globalThis.setTimeout;
  let serial = 0;
  globalThis.setTimeout = ((callback: (...args: any[]) => void, delay: number, ...args: any[]) => {
    if (typeof callback !== "function" || !callback.toString().includes("fn(0)")) return original!(callback, delay, ...args);
    const frame = ++serial;
    (globalThis as any).__qa34?.("raf-scheduled", { frame, delay, stack:new Error().stack });
    return original!((...values: any[]) => { (globalThis as any).__qa34?.("raf-running", { frame, scrollTop:document.querySelector(".reader-scroll")?.scrollTop }); callback(...values); },delay,...args);
  }) as typeof setTimeout;
});
afterAll(() => { if (original) globalThis.setTimeout = original; });
