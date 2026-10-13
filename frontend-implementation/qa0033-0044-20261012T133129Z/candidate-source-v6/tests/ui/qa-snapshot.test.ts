// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { startBridge, traceClose } from '../acceptance/qa/bridge';
const events = vi.hoisted(() => ({ listener: null as null | ((event: { payload: { id: number } }) => Promise<void>), emit: vi.fn(async () => {}) }));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (_name, listener) => { events.listener = listener; return () => {}; }),
  emit: events.emit
}));
afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('keeps geometry and close observations within the native redacted-snapshot protocol', async () => {
  vi.stubGlobal('crypto', webcrypto);
  document.body.innerHTML = '<div class="reader-scroll"><h2 id="owned" style="scroll-margin-top:24px">Task fixture</h2></div>';
  await startBridge();
  traceClose('resolve:save:app');
  await events.listener!({ payload: { id: 7 } });
  expect(events.emit).toHaveBeenCalledOnce();
  const [name, value] = events.emit.mock.calls[0] as unknown as [string, Record<string, any>];
  expect(name).toBe('qa:snapshot-response');
  expect(value.readerGeometry.headings).toHaveLength(1);
  expect(value.readerGeometry.headings[0].scrollMargin).toBe(24);
  expect(value.closeTrace).toHaveLength(1);
  // The native privacy boundary admits only numbers, booleans, null, bounded
  // containers, alphanumeric field names, and 64-character digest strings.
  const compatible = (item: unknown): boolean => {
    if (item === null || typeof item === 'boolean' || typeof item === 'number') return true;
    if (typeof item === 'string') return /^[a-f\d]{64}$/i.test(item);
    if (Array.isArray(item)) return item.length <= 256 && item.every(compatible);
    return typeof item === 'object' && Object.keys(item!).length <= 32
      && Object.entries(item!).every(([key, v]) => /^[a-z\d]{1,40}$/i.test(key) && compatible(v));
  };
  expect(compatible(value)).toBe(true);
});
