import { writeFileSync } from "node:fs";
import { beforeEach, afterAll, expect } from "vitest";
const out = "/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0034-investigation-20261012T022335Z";
const rows: unknown[] = [];
let restore: (() => void) | undefined;
beforeEach(() => {
  if (!expect.getState().testPath?.endsWith("/appearance-operations.test.tsx")) return;
  (globalThis as any).__qa34 = (event: string, data: object = {}) => {
    rows.push({ order: rows.length, at: performance.now(), test: expect.getState().currentTestName, event, ...data });
  };
  if (restore) return;
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop")!;
  Object.defineProperty(Element.prototype, "scrollTop", { ...descriptor, set(value) {
    if (this.classList.contains("reader-scroll")) (globalThis as any).__qa34?.("scroll-write", {before:descriptor.get!.call(this),value,stack:new Error().stack});
    descriptor.set!.call(this, value);
  }});
  const scroll = (event: Event) => { if ((event.target as Element)?.classList?.contains("reader-scroll")) (globalThis as any).__qa34?.("scroll-event", {scrollTop:(event.target as Element).scrollTop}); };
  const theme = (event: Event) => { if ((event.target as Element)?.getAttribute("aria-label") === "Appearance") (globalThis as any).__qa34?.("theme-change", {scrollTop:document.querySelector(".reader-scroll")?.scrollTop}); };
  document.addEventListener("scroll", scroll, true); document.addEventListener("change", theme, true);
  restore = () => { Object.defineProperty(Element.prototype, "scrollTop", descriptor); document.removeEventListener("scroll",scroll,true); document.removeEventListener("change",theme,true); };
});
afterAll(() => {
  if (rows.length) writeFileSync(out + "/evidence/runtime-trace-" + process.pid + ".json", JSON.stringify(rows,null,2));
  restore?.(); delete (globalThis as any).__qa34;
});
