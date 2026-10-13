import { useSyncExternalStore } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type AppearanceMode = "system" | "light" | "dark";
export type ResolvedAppearance = "light" | "dark";
export const APPEARANCE_KEY = "md-reader-appearance";
export interface AppearanceState {
  preference: AppearanceMode;
  resolved: ResolvedAppearance;
  persistenceWarning: boolean;
  nativeWarning: boolean;
}
interface NativeAppearance {
  setTheme: (theme: ResolvedAppearance | null) => Promise<void>;
  theme: () => Promise<ResolvedAppearance | null>;
  onThemeChanged: (handler: (event: { payload: ResolvedAppearance }) => void) => Promise<() => void>;
}
interface AppearanceOptions {
  storage: Pick<Storage, "getItem" | "setItem">;
  media?: MediaQueryList;
  root: HTMLElement;
  events: Window;
  native?: NativeAppearance;
}
const validMode = (mode: unknown): mode is AppearanceMode =>
  mode === "system" || mode === "light" || mode === "dark";

export function readPreference(raw: string | null): AppearanceMode {
  if (!raw || raw.length > 256) return "system";
  try {
    const record: unknown = JSON.parse(raw);
    if (record && typeof record === "object" && "schema" in record && "mode" in record
      && record.schema === 1 && validMode(record.mode)) return record.mode;
  } catch { /* Invalid preferences have no filesystem authority and fall back to System. */ }
  return "system";
}

export function createAppearanceController({ storage, media, root, events, native }: AppearanceOptions) {
  let preference: AppearanceMode = "system";
  let persistenceWarning = false;
  try { preference = readPreference(storage.getItem(APPEARANCE_KEY)); }
  catch { persistenceWarning = true; }
  const systemAppearance = (): ResolvedAppearance => media?.matches ? "dark" : "light";
  let state: AppearanceState = { preference, resolved: preference === "system" ? systemAppearance() : preference,
    persistenceWarning, nativeWarning: false };
  let disposed = false;
  let sequence = 0;
  let nativeReady = 0;
  let nativeQueue = Promise.resolve();
  let unlistenNative: (() => void) | undefined;
  let nativeListenerFailed = false;
  const listeners = new Set<() => void>();
  const publish = (next: AppearanceState) => {
    if (disposed) return;
    state = next;
    root.dataset.theme = state.resolved;
    root.style.colorScheme = state.resolved;
    listeners.forEach((listener) => listener());
  };
  publish(state); // Synchronous: before the first React content render.

  const synchronizeNative = () => {
    if (!native) return;
    const request = ++sequence;
    const mode = state.preference;
    nativeReady = 0;
    nativeQueue = nativeQueue.then(async () => {
      if (disposed || request !== sequence) return;
      try {
        await native.setTheme(mode === "system" ? null : mode);
        if (disposed || request !== sequence) return;
        const effective = mode === "system" ? await native.theme() : mode;
        if (disposed || request !== sequence) return;
        nativeReady = request;
        publish({ ...state, resolved: effective === "light" || effective === "dark" ? effective : systemAppearance(),
          nativeWarning: nativeListenerFailed });
      } catch {
        if (!disposed && request === sequence) publish({ ...state, nativeWarning: true });
      }
    });
  };
  const applyPreference = (mode: AppearanceMode, persist = true) => {
    if (disposed || !validMode(mode)) return;
    let warning = false;
    if (persist) {
      try { storage.setItem(APPEARANCE_KEY, JSON.stringify({ schema: 1, mode })); }
      catch { warning = true; }
    }
    publish({ ...state, preference: mode, resolved: mode === "system" ? systemAppearance() : mode,
      persistenceWarning: warning });
    synchronizeNative();
  };
  const onMediaChange = () => {
    if (state.preference === "system" && (!native || nativeReady === sequence || state.nativeWarning))
      publish({ ...state, resolved: systemAppearance() });
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === APPEARANCE_KEY || event.key === null) applyPreference(readPreference(event.newValue), false);
  };
  media?.addEventListener("change", onMediaChange);
  events.addEventListener("storage", onStorage);
  if (native) {
    void native.onThemeChanged(({ payload }) => {
      if (state.preference === "system" && nativeReady === sequence
        && (payload === "light" || payload === "dark")) publish({ ...state, resolved: payload });
    }).then((unlisten) => {
      if (disposed) unlisten(); else unlistenNative = unlisten;
    }).catch(() => {
      nativeListenerFailed = true;
      if (!disposed) publish({ ...state, nativeWarning: true });
    });
    synchronizeNative();
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    applyPreference,
    dispose: () => {
      disposed = true; sequence += 1;
      media?.removeEventListener("change", onMediaChange);
      events.removeEventListener("storage", onStorage);
      unlistenNative?.(); listeners.clear();
    }
  };
}

let appearance: ReturnType<typeof createAppearanceController> | undefined;
export function getAppearance() {
  if (!appearance) {
    // Accessing window.localStorage itself may throw in a restricted WebView.
    const storage = {
      getItem: (key: string) => window.localStorage.getItem(key),
      setItem: (key: string, value: string) => window.localStorage.setItem(key, value)
    };
    appearance = createAppearanceController({ storage, root: document.documentElement, events: window,
      media: typeof window.matchMedia === "function" ? window.matchMedia("(prefers-color-scheme: dark)") : undefined,
      native: isTauri() && !new URLSearchParams(location.search).has("settings") ? getCurrentWindow() : undefined });
  }
  return appearance;
}
export function useAppearance() {
  const controller = getAppearance();
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  return { ...state, applyPreference: controller.applyPreference };
}
