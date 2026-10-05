import { describe, expect, it, vi } from 'vitest';
import { qaAppearance, startBridge } from '../acceptance/qa/bridge';
import { createAppearanceController } from '../../src/app/appearance';
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}), emit: vi.fn() }));
// These exercise QA adapters only; they do not claim native/UI acceptance.
describe('QA one-shot appearance adapters', () => {
  for (const fault of ['preference-read','preference-write','native-theme']) {
    it(`${fault} rejects once and delegates later calls`, async () => {
      vi.stubGlobal('window', { __F002A_FAULT: fault });
      await startBridge();
      const options = { storage: { getItem: vi.fn(() => 'saved'), setItem: vi.fn() },
        root: {} as HTMLElement, events: {} as Window,
        native: { setTheme: vi.fn(async () => {}), theme: vi.fn(async () => 'dark' as const), onThemeChanged: vi.fn(async () => () => {}) } };
      const wrapped = qaAppearance(options as Parameters<typeof createAppearanceController>[0]);
      if (fault === 'preference-read') {
        expect(() => wrapped.storage.getItem('key')).toThrow();
        expect(wrapped.storage.getItem('key')).toBe('saved');
        expect(options.storage.getItem).toHaveBeenCalledTimes(1);
      } else if (fault === 'preference-write') {
        expect(() => wrapped.storage.setItem('key','v')).toThrow();
        wrapped.storage.setItem('key','v');
        expect(options.storage.setItem).toHaveBeenCalledExactlyOnceWith('key','v');
      } else {
        await expect(wrapped.native!.setTheme('dark')).rejects.toThrow();
        await wrapped.native!.setTheme('dark');
        expect(options.native.setTheme).toHaveBeenCalledExactlyOnceWith('dark');
      }
      vi.unstubAllGlobals();
    });
  }
});
