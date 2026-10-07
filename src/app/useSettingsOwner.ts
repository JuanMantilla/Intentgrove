import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { newerSettings, settingsApi, type Preferences, type PreferencePatch, type SettingsIntent, type SettingsSnapshot } from "./settings-contract";

/** Workspace remains the only writer of session data. Settings never sees that data. */
export function useSettingsOwner(values: Preferences, enabled: boolean, handlers: {
  general: (values: Preferences) => void;
  workspace: (patch: PreferencePatch) => void;
  checkpoint: () => Promise<void>;
  focus: () => void;
  opening?: () => void;
}) {
  const latest = useRef({ values, handlers }); latest.current = { values, handlers };
  const notify = useRef<() => void>(() => {});
  useEffect(() => {
    if (!isTauri() || !enabled) return;
    let disposed = false;
    let snapshot: SettingsSnapshot | null = null;
    let initialized = false;
    let queue = Promise.resolve();
    const stops: Array<() => void> = [];
    const publish = () => {
      queue = queue.catch(() => {}).then(async () => {
        if (disposed || !snapshot || snapshot.persistence === "pending") return;
        if (initialized && JSON.stringify(snapshot.values) === JSON.stringify(latest.current.values)) return;
        snapshot = await settingsApi.publish(snapshot.revision, latest.current.values);
        initialized = true;
      }).catch(async () => { if (!disposed) snapshot = await settingsApi.getWorkspace(); });
    };
    notify.current = publish;
    const accept = (next: SettingsSnapshot) => {
      const previous = snapshot;
      snapshot = newerSettings(snapshot, next);
      if (initialized) {
        // An uncommitted workspace menu choice made after dispatch wins at the
        // next revision, instead of being erased by the older acknowledgment.
        const values = { ...snapshot.values,
          language: previous && latest.current.values.language !== previous.values.language ? latest.current.values.language : snapshot.values.language,
          appearance: previous && latest.current.values.appearance !== previous.values.appearance ? latest.current.values.appearance : snapshot.values.appearance };
        latest.current.values = { ...latest.current.values, language: values.language, appearance: values.appearance };
        latest.current.handlers.general(values);
        if (snapshot.persistence !== "pending") publish();
      } else {
        // Settings may change General while the workspace is still restoring.
        // Seed only Reading/tree from that restored workspace, retaining newer
        // app-scoped General choices and resuming after their acknowledgment.
        if (snapshot.revision > 0) {
          latest.current.values = { ...latest.current.values, language: snapshot.values.language, appearance: snapshot.values.appearance };
          latest.current.handlers.general(snapshot.values);
        }
        if (snapshot.persistence !== "pending") publish();
      }
    };
    void (async () => {
      for (const [event, handler] of [
        ["settings:state", (event: { payload: SettingsSnapshot }) => accept(event.payload)],
        ["settings:intent", (event: { payload: SettingsIntent }) => {
          queue = queue.catch(() => {}).then(async () => {
            if (disposed) return;
            const intent = event.payload;
            if (snapshot && intent.revision < snapshot.revision) return;
            latest.current.handlers.workspace(intent.patch);
            let persistence: "saved" | "failed" = "saved";
            try { await latest.current.handlers.checkpoint(); } catch { persistence = "failed"; }
            if (!disposed) accept(await settingsApi.acknowledge(intent.requestId, intent.revision, persistence));
          }).catch(async () => {
            // A timed-out owner may have applied the value. Reconcile the real
            // workspace state; never turn a late acknowledgment into a write.
            if (!disposed) { snapshot = await settingsApi.getWorkspace(); publish(); }
          });
        }],
        ["settings:closed", () => latest.current.handlers.focus()],
        ["settings:opening", () => latest.current.handlers.opening?.()]
      ] as const) {
        const stop = await listen(event, handler as (event: { payload: unknown }) => void);
        if (disposed) { stop(); return; } stops.push(stop);
      }
      if (!disposed) accept(await settingsApi.getWorkspace());
    })().catch(() => {});
    return () => { disposed = true; notify.current = () => {}; stops.forEach(stop => stop()); };
  }, [enabled]);
  useEffect(() => { notify.current(); }, [values.language, values.appearance, values.readingFont,
    values.readingSize, values.readingLineHeight, values.readingWidth, values.documentsAndImagesOnly, enabled]);
}
