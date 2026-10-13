import { writeFileSync } from "node:fs";
import { beforeEach, afterAll, expect } from "vitest";
const rows: unknown[] = [];
let restore: (() => void) | undefined;
beforeEach(() => {
  if (!expect.getState().testPath?.endsWith("/appearance-operations.test.tsx") || restore) return;
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop")!;
  Object.defineProperty(Element.prototype, "scrollTop", { ...descriptor, set(value) {
    const before = descriptor.get!.call(this);
    if (this.classList.contains("reader-scroll")) rows.push({ order:rows.length, at:performance.now(), test:expect.getState().currentTestName, event:"scroll-write", before, value, stack:before === 170 && value === 0 ? new Error().stack : undefined });
    descriptor.set!.call(this, value);
  }});
  restore = () => Object.defineProperty(Element.prototype, "scrollTop", descriptor);
});
afterAll(() => {
  if (rows.length) writeFileSync("/Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0034-investigation-20261012T022335Z/evidence/dom-trace-" + process.pid + ".json",JSON.stringify(rows,null,2));
  restore?.();
});
