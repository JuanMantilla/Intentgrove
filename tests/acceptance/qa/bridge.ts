import { listen, emit } from '@tauri-apps/api/event';
import type { createAppearanceController } from '../../../src/app/appearance';
type Options = Parameters<typeof createAppearanceController>[0];
let provider: () => unknown = () => null;
const closeTrace: { stage: string; at: number }[] = [];
export function traceClose(stage: string) {
  closeTrace.push({ stage, at: performance.now() });
  if (closeTrace.length > 128) closeTrace.shift();
}
export function observeApp(read: () => unknown) { provider = read; }
export function readAcceptanceApp() { return provider() as Record<string, any> | null; }
const ids = new WeakMap<object, number>();
let nextId = 0;
function identity(object: object | null) {
  if (!object) return null;
  if (!ids.has(object)) ids.set(object, ++nextId);
  return ids.get(object) ?? null;
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
const usableFrames: { at: number; headingId: number | null; activeIdSHA256?: string }[] = [];
const readyDOM: { at: number; headingId: number | null; activeIdSHA256?: string }[] = [];
const observedHeadings = new WeakSet<Element>();
const framedHeadings = new WeakSet<Element>();
const uiActions: { at: number; kind: number; trusted: boolean }[] = [];
const searchStops: { at: number }[] = [];
function observeUsableFrames() {
  let queued = false;
  let wasStopped = false;
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button,[role="tab"]') : null;
    const text = target?.textContent?.trim() ?? '';
    const kind = /^(Stop|Detener)$/.test(text) ? 1 : target?.getAttribute('role') === 'tab' ? 2
      : /\.(md|markdown|png)$/.test(text) ? 3 : 0;
    if (kind) { uiActions.push({ at: performance.now(), kind, trusted: event.isTrusted }); if (uiActions.length > 128) uiActions.shift(); }
  }, true);
  const inspect = () => {
    queued = false;
    const stopped = /Stopped|Detenida/.test(document.querySelector('.folder-search-status')?.textContent ?? '');
    if (stopped && !wasStopped) { searchStops.push({ at: performance.now() }); if (searchStops.length > 128) searchStops.shift(); }
    wasStopped = stopped;
    const article = document.querySelector('.markdown-body');
    const heading = article?.querySelector('h1,h2,h3,h4,h5,h6');
    const paragraph = article?.querySelector('p,ul,ol,table,pre');
    if (!heading || !paragraph || !heading.getClientRects().length || !paragraph.getClientRects().length) return;
    const app = provider() as Record<string, unknown> | null;
    if (!observedHeadings.has(heading)) {
      observedHeadings.add(heading);
      const item = { at: performance.now(), headingId: identity(heading) };
      readyDOM.push(item);
      if (readyDOM.length > 128) readyDOM.shift();
      void digest(app?.activeId ?? null).then(activeIdSHA256 => Object.assign(item, { activeIdSHA256 }));
    }
    if (framedHeadings.has(heading)) return;
    // Record completion only when both later frames actually execute and the
    // same usable nodes remain connected. A canceled opportunity is retried.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!heading.isConnected || !paragraph.isConnected || !heading.getClientRects().length || framedHeadings.has(heading)) return;
      framedHeadings.add(heading);
      const item = { at: performance.now(), headingId: identity(heading) };
      usableFrames.push(item);
      if (usableFrames.length > 128) usableFrames.shift();
      void digest(app?.activeId ?? null).then(activeIdSHA256 => Object.assign(item, { activeIdSHA256 }));
    }));
  };
  new MutationObserver(() => {
    if (!queued) { queued = true; queueMicrotask(inspect); }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
export async function startBridge() {
  observeUsableFrames();
  consumed = false;
  fault = (window as unknown as { __F002A_FAULT?: string }).__F002A_FAULT ?? 'none';
  await listen<{ id: number }>('qa:snapshot-request', async ({ payload }) => {
    const start = performance.now();
    try {
      const app = provider() as Record<string, unknown> | null;
      const editor = document.querySelector<HTMLElement>('.rich-section');
      const edits = app?.edits as Array<{ id: string; editorJson?: { selection?: unknown } }> | undefined;
      const state = edits?.find(edit => edit.id === app?.activeId)?.editorJson;
      const reader = document.querySelector<HTMLElement>('.reader-scroll');
      const observation = { editorId: identity(editor),
        selection: state?.selection ?? null,
        editorScroll: editor && reader ? [reader.scrollLeft, reader.scrollTop] : null,
        focusId: identity(document.activeElement), editorFocused: Boolean(editor?.contains(document.activeElement)) };
      const snapshot = {
        readerGeometry: (() => {
          const reader = document.querySelector('.reader-scroll');
          if (!reader) return null;
          const top = reader.getBoundingClientRect().top;
          return { top, scrollTop: reader.scrollTop, devicePixelRatio,
            headings: Array.from(reader.querySelectorAll('h1[id],h2[id],h3[id]'))
              .map(h => ({ identity: identity(h), top: h.getBoundingClientRect().top - top,
                scrollMargin: Number.parseFloat(getComputedStyle(h).scrollMarginTop) || 0 }))
              .filter(h => h.top > -500 && h.top < 500).slice(0, 16) };
        })(),
        id: payload.id, start, timeOrigin: performance.timeOrigin, ...observation,
        appSHA256: await digest(app), editorSHA256: await digest(state ?? null),
        app: await redactedApp(app),
        closeTrace: await Promise.all(closeTrace.map(async item => ({ at: item.at, stage: await digest(item.stage) }))),
        readyDOM, usableFrames, uiActions, searchStops, end: performance.now(),
      };
      await emit('qa:snapshot-response', snapshot);
    } catch { await emit('qa:snapshot-response', { id: payload.id, error: true }); }
  });
}
async function redactedApp(app: Record<string, unknown> | null) {
  if (!app) return null;
  return Object.fromEntries(await Promise.all(Object.entries(app).map(async ([key, value]) => [key, await digest(value)])));
}
