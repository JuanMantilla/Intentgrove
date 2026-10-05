import { listen, emit } from '@tauri-apps/api/event';
import { EditorView } from '@codemirror/view';
import { historyField } from '@codemirror/commands';
import type { createAppearanceController } from '../../../src/app/appearance';
type Options = Parameters<typeof createAppearanceController>[0];
let provider: () => unknown = () => null;
export function observeApp(read: () => unknown) { provider = read; }
const ids = new WeakMap<object, number>();
let nextId = 0;
function identity(object: object | null) {
  if (!object) return null;
  if (!ids.has(object)) ids.set(object, ++nextId);
  return ids.get(object);
}
async function digest(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 32 * 1024 * 1024) throw new Error('snapshot input oversized');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(v => v.toString(16).padStart(2, '0')).join('');
}
let fault = 'none';
let consumed = false;
export function qaAppearance(options: Options): Options {
  return { ...options, storage: {
    getItem(key) {
      if (fault === 'preference-read' && !consumed) { consumed = true; throw new Error('QA preference read'); }
      return options.storage.getItem(key);
    },
    setItem(key, value) {
      if (fault === 'preference-write' && !consumed) { consumed = true; throw new Error('QA preference write'); }
      options.storage.setItem(key, value);
    }
  }, native: options.native && {
    theme: () => options.native!.theme(),
    onThemeChanged: handler => options.native!.onThemeChanged(handler),
    setTheme: async theme => {
      if (fault === 'native-theme' && !consumed) { consumed = true; throw new Error('QA native theme'); }
      await options.native!.setTheme(theme);
    }
  } };
}
export async function startBridge() {
  consumed = false;
  fault = (window as unknown as { __F002A_FAULT?: string }).__F002A_FAULT ?? 'none';
  await listen<{ id: number }>('qa:snapshot-request', async ({ payload }) => {
    const start = performance.now();
    try {
      const dom = document.querySelector('.cm-content');
      const editor = dom ? EditorView.findFromDOM(dom as HTMLElement) : null;
      const state = editor?.state.toJSON({ history: historyField });
      const app = provider() as Record<string, unknown> | null;
      const observation = { editorId: identity(editor ?? null),
        selection: editor?.state.selection.toJSON() ?? null,
        editorScroll: editor ? [editor.scrollDOM.scrollLeft, editor.scrollDOM.scrollTop] : null,
        focusId: identity(document.activeElement), editorFocused: editor?.hasFocus ?? false };
      const snapshot = {
        id: payload.id, start, timeOrigin: performance.timeOrigin, ...observation,
        appSHA256: await digest(app), editorSHA256: await digest(state ?? null),
        app: await redactedApp(app), end: performance.now(),
      };
      await emit('qa:snapshot-response', snapshot);
    } catch { await emit('qa:snapshot-response', { id: payload.id, error: true }); }
  });
}
async function redactedApp(app: Record<string, unknown> | null) {
  if (!app) return null;
  return Object.fromEntries(await Promise.all(Object.entries(app).map(async ([key, value]) => [key, await digest(value)])));
}
