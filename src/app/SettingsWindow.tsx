import { useEffect, useRef, useState } from "react";
import ReadingSettings from "./ReadingSettings";
import { settingsApi, newerSettings, type PreferencePatch, type SettingsSnapshot } from "./settings-contract";
import { getAppearance, useAppearance, APPEARANCE_KEY } from "./appearance";
import { t } from "./i18n";

/** Preference-only entry. Never mounts App or its document/session listeners. */
export default function SettingsWindow() {
  const [state, setState] = useState<SettingsSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastPatch = useRef<PreferencePatch | null>(null);
  const appearance = useAppearance();
  const accept = (snapshot: SettingsSnapshot) => setState(current => newerSettings(current, snapshot));
  useEffect(() => {
    let disposed = false;
    const refresh = () => { void settingsApi.get().then(next => { if (!disposed) accept(next); })
      .catch(() => { if (!disposed) setError(true); }); };
    refresh();
    const timer = setInterval(refresh, 500);
    return () => { disposed = true; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!state) return;
    document.documentElement.lang = state.values.language;
    getAppearance().applyPreference(state.values.appearance, false);
  }, [state?.values.language, state?.values.appearance]);
  useEffect(() => {
    if (!state) return;
    const id = { General: "settings-general", Reading: "settings-reading", ProjectTree: "settings-project-tree" }[state.group];
    const target = document.getElementById(id);
    target?.scrollIntoView?.({ block: "start" }); target?.focus();
  }, [state?.group, state?.activation]);
  async function change(patch: PreferencePatch) {
    if (!state || busy || state.persistence === "pending") return;
    setBusy(true); setError(false); lastPatch.current = patch;
    try {
      const next = await settingsApi.apply(crypto.randomUUID(), state.revision, patch);
      accept(next);
      if (patch.language !== undefined || patch.appearance !== undefined) {
        let saved = true;
        try {
          if (patch.language !== undefined) localStorage.setItem("md-reader-locale", next.values.language);
          if (patch.appearance !== undefined) localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ schema: 1, mode: next.values.appearance }));
        } catch { saved = false; }
        accept(await settingsApi.acknowledge(next.requestId!, next.revision, saved ? "saved" : "failed"));
      }
    } catch { setError(true); try { accept(await settingsApi.get()); } catch { /* Keep the last acknowledged values. */ } }
    finally { setBusy(false); }
  }
  const locale = state?.values.language ?? "en";
  const es = locale === "es";
  return <main className="native-settings" onKeyDown={event => {
    if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); void settingsApi.close(); }
  }}>
    <h1>{es ? "Ajustes" : "Settings"}</h1>
    {!state ? <p role="status">{error ? (es ? "No se pudieron cargar los ajustes." : "Could not load preferences.") : (es ? "Cargando…" : "Loading…")}</p> : <>
      <section aria-labelledby="settings-general"><h2 id="settings-general" tabIndex={-1}>General</h2>
        <fieldset disabled={busy || state.persistence === "pending"}>
          <label>{t(locale, "language")}<select value={state.values.language} onChange={event => void change({ language: event.target.value as "en" | "es" })}>
            <option value="en">English</option><option value="es">Español</option>
          </select></label>
          <label>{t(locale, "appearance")}<select value={state.values.appearance} onChange={event => void change({ appearance: event.target.value as "system" | "light" | "dark" })}>
            <option value="system">{t(locale, "appearanceSystem")}</option><option value="light">{t(locale, "appearanceLight")}</option><option value="dark">{t(locale, "appearanceDark")}</option>
          </select></label>
        </fieldset>
      </section>
      {!state.ownerAvailable && <p role="status">{es ? "El espacio de trabajo no está disponible. Lectura y árbol de proyecto están desactivados." : "The workspace owner is unavailable. Reading and Project tree are disabled."}</p>}
      <section aria-labelledby="settings-reading"><h2 id="settings-reading" tabIndex={-1}>{es ? "Lectura" : "Reading"}</h2>
        <fieldset disabled={!state.ownerAvailable || busy || state.persistence === "pending"}>
          <ReadingSettings locale={locale} value={state.values} onChange={value => void change({ readingFont: value.readingFont, readingSize: value.readingSize, readingLineHeight: value.readingLineHeight, readingWidth: value.readingWidth })} />
        </fieldset>
      </section>
      <section aria-labelledby="settings-project-tree"><h2 id="settings-project-tree" tabIndex={-1}>{es ? "Árbol de proyecto" : "Project tree"}</h2>
        <fieldset disabled={!state.ownerAvailable || busy || state.persistence === "pending"}>
          <label><input type="checkbox" checked={state.values.documentsAndImagesOnly} onChange={event => void change({ documentsAndImagesOnly: event.target.checked })} />{t(locale, "filterMarkdown")}</label>
        </fieldset>
      </section>
      {(error || state.persistence === "failed" || state.persistence === "ownerUnavailable" || state.nativeThemeFailed || appearance.nativeWarning) && <p role="status">
        {es ? "No se pudo guardar o confirmar el cambio. El valor aplicado se conserva." : "The change could not be saved or confirmed. The applied value is retained."}
        <button disabled={busy || !(state.retryPatch ?? lastPatch.current)} onClick={() => {
          const patch = state.retryPatch ?? lastPatch.current; if (patch) void change(patch);
        }}>{t(locale, "retry")}</button>
      </p>}
      {state.persistence === "pending" && <p role="status">{es ? "Confirmando…" : "Waiting for acknowledgment…"}</p>}
    </>}
    <footer><button onClick={() => void settingsApi.close()}>{es ? "Listo" : "Done"}</button></footer>
  </main>;
}
