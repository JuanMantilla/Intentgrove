import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { layoutCopy, workspaceLayout, workspaceLayouts } from "./workspaceLayout";
import PreviewLoading from "../reader/PreviewLoading";
import ReadingSettings from "./ReadingSettings";
import SelectChevron from "./SelectChevron";
import { settingsApi, newerSettings, type PreferencePatch, type SettingsSnapshot } from "./settings-contract";
import { getAppearance, useAppearance, APPEARANCE_KEY } from "./appearance";
import { t } from "./i18n";

/** Preference-only entry. Never mounts App or its document/session listeners. */
export default function SettingsWindow() {
  const [state, setState] = useState<SettingsSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastPatch = useRef<PreferencePatch | null>(null);
  const appearance = useAppearance();
  const accept = (snapshot: SettingsSnapshot) => setState(current => newerSettings(current, snapshot));
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); void settingsApi.close();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    let disposed = false;
    const refresh = () => { void settingsApi.get().then(next => { if (!disposed) { accept(next); setLoadError(false); } })
      .catch(() => { if (!disposed) setLoadError(true); }); };
    refresh();
    const timer = setInterval(refresh, 500);
    return () => { disposed = true; clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (!state) return;
    document.documentElement.lang = state.values.language;
    getAppearance().applyPreference(state.values.appearance, false);
  }, [state?.values.language, state?.values.appearance]);
  useLayoutEffect(() => {
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
  const [initialLocale] = useState<"en" | "es">(() => { try { return localStorage.getItem("md-reader-locale") === "es" ? "es" : "en"; } catch { return "en"; } });
  const locale = state?.values.language ?? initialLocale;
  const es = locale === "es";
  const patch = busy ? lastPatch.current : state?.retryPatch ?? lastPatch.current;
  const pending = busy || state?.persistence === "pending";
  const pendingGroup = patch?.language !== undefined || patch?.appearance !== undefined ? "general"
    : patch?.workspaceLayout !== undefined ? "layout" : patch?.documentsAndImagesOnly !== undefined ? "tree" : "reading";
  const feedback = (group: string) => pending && pendingGroup === group
    ? <PreviewLoading inline visibleLabel label={es ? "Aplicando preferencia" : "Applying preference"} /> : null;
  return <main className="native-settings">
    <div className="settings-body"><h1>{es ? "Ajustes" : "Settings"}</h1>
    {!state ? <p role="status">{loadError ? (es ? "No se pudieron cargar los ajustes." : "Could not load preferences.") : <PreviewLoading placeholder label={t(locale, "loading")} announce={false} />}</p> : <>
      <section aria-labelledby="settings-general"><h2 id="settings-general" tabIndex={-1}>General</h2>{feedback("general")}
        <fieldset disabled={busy || state.persistence === "pending"}>
          <div className="settings-row">
            <label htmlFor="settings-language">{t(locale, "language")}</label>
            <div className="settings-field"><div className="select-field">
              <select id="settings-language" aria-describedby="language-help" value={state.values.language} onChange={event => void change({ language: event.target.value as "en" | "es" })}>
                <option value="en">English</option><option value="es">Español</option>
              </select><SelectChevron /></div>
              <p id="language-help">{t(locale, "languageHelp")}</p>
            </div>
          </div>
          <div className="settings-row">
            <span id="appearance-label">{t(locale, "appearance")}</span>
            <div className="settings-field">
              <div className="appearance-choices" role="radiogroup" aria-labelledby="appearance-label" aria-describedby="appearance-help">
                {(["system", "light", "dark"] as const).map(mode => <label key={mode}>
                  <input type="radio" name="appearance" value={mode} checked={state.values.appearance === mode}
                    onChange={() => void change({ appearance: mode })} />
                  {t(locale, mode === "system" ? "appearanceSystem" : mode === "light" ? "appearanceLight" : "appearanceDark")}
                </label>)}
              </div><p id="appearance-help">{t(locale, "appearanceHelp")}</p>
            </div>
          </div>
        </fieldset>
      </section>
      <section aria-labelledby="settings-layout"><h2 id="settings-layout">{layoutCopy(locale).label}</h2>{feedback("layout")}
        <fieldset className="workspace-layout-choices" aria-labelledby="settings-layout"
          aria-describedby={state.values.workspaceLayout === undefined ? "layout-unavailable" : undefined}
          disabled={!state.ownerAvailable || busy || state.persistence === "pending" || state.values.workspaceLayout === undefined}>
          {workspaceLayouts.map((layout, index) => <label key={layout}>
            <input type="radio" name="workspace-layout" value={layout}
              checked={workspaceLayout(state.values.workspaceLayout) === layout}
              onChange={() => void change({ workspaceLayout: layout })} />
            <span><strong>{layout[0].toUpperCase() + layout.slice(1)}</strong><small>{layoutCopy(locale).descriptions[index]}</small></span>
          </label>)}
        </fieldset>
        {state.values.workspaceLayout === undefined && <p id="layout-unavailable">{layoutCopy(locale).unavailable}</p>}
      </section>
      {!state.ownerAvailable && <p role="status">{es ? "El espacio de trabajo no está disponible. Lectura y árbol de proyecto están desactivados." : "The workspace owner is unavailable. Reading and Project tree are disabled."}</p>}
      <section aria-labelledby="settings-reading"><h2 id="settings-reading" tabIndex={-1}>{es ? "Lectura" : "Reading"}</h2>{feedback("reading")}
        <fieldset disabled={!state.ownerAvailable || busy || state.persistence === "pending"}>
          <ReadingSettings locale={locale} value={state.values} onChange={value => void change({ readingFont: value.readingFont, readingSize: value.readingSize, readingLineHeight: value.readingLineHeight, readingWidth: value.readingWidth })} />
        </fieldset>
      </section>
      <section aria-labelledby="settings-project-tree"><h2 id="settings-project-tree" tabIndex={-1}>{es ? "Árbol de proyecto" : "Project tree"}</h2>{feedback("tree")}
        <fieldset disabled={!state.ownerAvailable || busy || state.persistence === "pending"}>
          <label className="tree-preference"><input type="checkbox" aria-describedby="tree-help" checked={state.values.documentsAndImagesOnly} onChange={event => void change({ documentsAndImagesOnly: event.target.checked })} />{t(locale, "filterMarkdown")}</label>
          <p id="tree-help" className="settings-help">{t(locale, "treeVisibilityHelp")}</p>
        </fieldset>
      </section>
      {(error || loadError || state.persistence === "failed" || state.persistence === "ownerUnavailable" || state.nativeThemeFailed || appearance.nativeWarning) && <p role="status">
        {es ? "No se pudo guardar o confirmar el cambio. El valor aplicado se conserva." : "The change could not be saved or confirmed. The applied value is retained."}
        <button disabled={busy || !(state.retryPatch ?? lastPatch.current)} onClick={() => {
          const patch = state.retryPatch ?? lastPatch.current; if (patch) void change(patch);
        }}>{t(locale, "retry")}</button>
      </p>}

    </>}
    </div><footer><p>{t(locale, "preferencesHelp")}</p><button className="primary-button" onClick={() => void settingsApi.close()}>{es ? "Listo" : "Done"}</button></footer>
  </main>;
}
