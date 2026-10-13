import MiddleFilename from "./MiddleFilename";
import WorkspaceIcon from "./WorkspaceIcon";
import PreviewLoading from "../reader/PreviewLoading";
import { useEffect, useId, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, readerError, type FolderSearchBatch, type FolderSearchHit,
  type FolderSearchStarted, type GrantInfo, type OpenFolderSearchHit } from "./api";
import { htmlNative, type LocalView } from "./htmlNative";
import { isHtmlDocument } from "./htmlBoundary";
import { errorText, t, type Locale } from "./i18n";

interface Props {
  root: GrantInfo;
  scopeSegments?: string[];
  locale: Locale;
  onOpen: (result: OpenFolderSearchHit, hit: FolderSearchHit, query: string) => Promise<void>;
  onLocalOpen?: (view: LocalView) => Promise<void>;
  active?: boolean;
  captureOpenIntent?: () => () => boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  onClose?: () => void;
  onDismiss?: () => void;
}

export default function FolderSearchPanel({ root, scopeSegments = [], locale, onOpen, onLocalOpen, captureOpenIntent, active = true, query: suppliedQuery, onQueryChange, onClose, onDismiss }: Props) {
  const scopeKey = JSON.stringify(scopeSegments);
  const [confirmedScope, setConfirmedScope] = useState<string[] | null>(null);
  const [localQuery, setLocalQuery] = useState("");
  const query = suppliedQuery ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const optionsId = useId();
  const optionsRef = useRef<HTMLDivElement>(null);
  const optionsTrigger = useRef<HTMLButtonElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  function closeOptions() { setOptionsOpen(false); optionsTrigger.current?.focus(); }
  useEffect(() => {
    if (!optionsOpen) return;
    optionsRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    const outside = (event: PointerEvent) => { if (!optionsRef.current?.contains(event.target as Node)) setOptionsOpen(false); };
    window.addEventListener("pointerdown", outside);
    return () => window.removeEventListener("pointerdown", outside);
  }, [optionsOpen]);
  useEffect(() => { if (!active) setOptionsOpen(false); }, [active]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"both" | "name" | "content">("both");
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [hits, setHits] = useState<FolderSearchHit[]>([]);
  const [replacingResults, setReplacingResults] = useState(false);
  const replaceResults = useRef(false);
  const [progress, setProgress] = useState({ scanned: 0, skipped: 0, matched: 0 });
  const [status, setStatus] = useState<"idle" | FolderSearchBatch["status"]>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [listenerReady, setListenerReady] = useState(false);
  const job = useRef<FolderSearchStarted | null>(null);
  const starting = useRef<Promise<FolderSearchStarted> | null>(null);
  const sequence = useRef(0);
  const pending = useRef<FolderSearchBatch[]>([]);
  const submittedQuery = useRef("");
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);
  const stoppedJob = useRef<string | null>(null);
  const stoppedSequence = useRef<number | null>(null);
  const openSequence = useRef(0);
  useEffect(() => {
    if (!active) { openSequence.current += 1; setOpening(null); }
  }, [active]);

  function accept(batch: FolderSearchBatch) {
    if (batch.jobId !== job.current?.jobId || batch.generation !== root.generation) {
      if (!job.current && starting.current && pending.current.length < 16) pending.current.push(batch);
      return;
    }
    if (batch.errorCode === "scope_changed") {
      invalidate(); setStatus("partial"); setErrorCode("scope_changed"); return;
    }
    const replace = replaceResults.current;
    replaceResults.current = false; setReplacingResults(false);
    setHits((old) => [...(replace ? [] : old), ...batch.results].slice(0, 10_000));
    setProgress({ scanned: batch.scanned, skipped: batch.skipped, matched: batch.matched });
    setStatus(stoppedJob.current === batch.jobId
      ? "stopped" : batch.status);
    setErrorCode(batch.errorCode);
  }

  useEffect(() => {
    invalidate();
    setConfirmedScope(null);
    setListenerReady(false);
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<FolderSearchBatch>("folder-search:batch", (event) => {
      if (!disposed) accept(event.payload);
    }).then((stop) => { if (disposed) stop(); else { unlisten = stop; setListenerReady(true); } }).catch(() => {
      if (!disposed) setErrorCode("search_unavailable");
    });
    return () => {
      disposed = true;
      sequence.current += 1;
      openSequence.current += 1;
      const current = job.current;
      job.current = null;
      unlisten?.();
      if (current) void api.cancelFolderSearch(current.jobId).catch(() => {});
      void starting.current?.then((started) => api.cancelFolderSearch(started.jobId)).catch(() => {});
    };
  }, [root.id, root.generation, scopeKey]);

  function invalidate(retainResults = false) {
    sequence.current += 1;
    const previous = job.current;
    job.current = null;
    stoppedJob.current = null;
    stoppedSequence.current = null;
    openSequence.current += 1;
    setOpening(null);
    pending.current = [];
    if (previous) void api.cancelFolderSearch(previous.jobId).catch(() => {});
    if (!retainResults) setHits([]);
    replaceResults.current = retainResults; setReplacingResults(retainResults);
    setProgress({ scanned: 0, skipped: 0, matched: 0 });
    setStatus("idle");
    setErrorCode(null);
  }

  async function search(selectedIgnored = includeIgnored, selectedMode = mode) {
    invalidate(true);
    const value = query.trim();
    if (!value || !listenerReady) return;
    const current = sequence.current;
    submittedQuery.current = value;
    setStatus("searching");
    try {
      const previous = starting.current;
      if (previous) {
        const old = await previous.catch(() => null);
        if (old) await api.cancelFolderSearch(old.jobId).catch(() => {});
        if (current !== sequence.current) return;
      }
      const pendingStart = api.startFolderSearch(root.id, value, selectedMode, selectedIgnored, scopeSegments);
      starting.current = pendingStart;
      const started = await pendingStart;
      if (current !== sequence.current) {
        void api.cancelFolderSearch(started.jobId).catch(() => {});
        return;
      }
      job.current = started;
      setConfirmedScope(started.scopeSegments ?? []);
      if (stoppedSequence.current === current) {
        stoppedJob.current = started.jobId;
        await api.cancelFolderSearch(started.jobId);
        if (current !== sequence.current) return;
        setStatus("stopped");
      }
      const buffered = pending.current;
      pending.current = [];
      for (const batch of buffered) accept(batch);
    } catch (error) {
      if (current === sequence.current) {
        setStatus("partial");
        setErrorCode(readerError(error).code);
      }
    } finally {
      if (current === sequence.current) starting.current = null;
    }
  }

  async function stop() {
    const owner = sequence.current;
    stoppedSequence.current = owner;
    const current = job.current;
    if (!current) { setStatus("stopped"); return; }
    try {
      if (await api.cancelFolderSearch(current.jobId)) {
        if (owner !== sequence.current || job.current !== current) return;
        stoppedJob.current = current.jobId;
        setStatus("stopped");
      }
    } catch (error) { if (owner === sequence.current) setErrorCode(readerError(error).code); }
  }

  async function open(hit: FolderSearchHit) {
    const current = job.current;
    if (!current) return;
    const owner = ++openSequence.current;
    const ownsNavigation = captureOpenIntent?.() ?? (() => true);
    setOpening(hit.id);
    try {
      if(isHtmlDocument(hit.segments.at(-1) ?? hit.path) && onLocalOpen) {
        const view=await htmlNative.searchHit(current.jobId,hit.id);
        if(job.current!==current || owner!==openSequence.current || !ownsNavigation()) {if(view.viewToken)await htmlNative.dispose({viewToken:view.viewToken,generation:view.generation});return;}
        await onLocalOpen(view);return;
      }
      const result = await api.openSearchHit(current.jobId, hit.id);
      if (job.current !== current || owner !== openSequence.current || !ownsNavigation()) return;
      await onOpen(result, hit, submittedQuery.current);
    } catch (error) { if (job.current === current && owner === openSequence.current && ownsNavigation()) {
      const code = readerError(error).code;
      if (code === "scope_changed") invalidate();
      setErrorCode(code);
    } }
    finally { if (owner === openSequence.current) setOpening(null); }
  }

  const groups = new Map<string, FolderSearchHit[]>();
  for (const hit of hits) groups.set(hit.path, [...(groups.get(hit.path) ?? []), hit]);

  return <section className="folder-search" role="search" aria-label={t(locale, "folderSearch") }
    onKeyDown={(event) => {
      if (event.key === "Escape" && optionsOpen) {
        event.preventDefault(); event.stopPropagation(); closeOptions(); return;
      }
      if (event.key === "Escape" && (onDismiss || onClose)) {
        event.preventDefault(); event.stopPropagation(); void stop(); (onDismiss ?? onClose)?.();
      }
    }}>
    {onClose && <button type="button" onClick={() => { void stop(); onClose(); }}>{t(locale, "backToExplorer")}</button>}
    <div className="folder-search-query">
      <label className="folder-search-label">{t(locale, "folderSearch")}
        <input ref={inputRef} type="search" value={query} maxLength={256} autoComplete="off"
          placeholder={t(locale, "folderSearchPlaceholder")}
          onChange={(event) => { invalidate(Boolean(event.target.value.trim())); setQuery(event.target.value); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
      </label>
      {status !== "searching" ? <button type="button" className="primary-button" disabled={!query.trim() || !listenerReady} onClick={() => void search()}>{t(locale, "folderSearchGo")}</button>
        : <button type="button" onClick={() => void stop()}>{t(locale, "folderSearchStop")}</button>}
    </div>
    <div className="folder-search-scope-row">
      <p className="folder-search-scope" title={[root.name, ...(confirmedScope ?? scopeSegments)].join(" / ")}><WorkspaceIcon name="folder" /><span aria-label={`${t(locale, "searchScope")}: ${[root.name, ...(confirmedScope ?? scopeSegments)].join(" / ")}`}>{[root.name, ...(confirmedScope ?? scopeSegments)].join(" / ")}</span></p>
      <button type="button" aria-label={t(locale, "clearSearch")} disabled={!query} onClick={() => { invalidate(); setQuery(""); inputRef.current?.focus(); }}>{t(locale, "clearSearchShort")}</button>
    </div>
    <div className="search-options" ref={optionsRef}>
      <button ref={optionsTrigger} type="button" className="search-options-trigger" aria-expanded={optionsOpen} aria-controls={optionsId}
        onClick={() => setOptionsOpen(open => !open)}><WorkspaceIcon name="settings-2" /><span>{t(locale, mode === "name" ? "folderSearchName" : mode === "content" ? "folderSearchContent" : "folderSearchBoth")}</span><WorkspaceIcon name="chevron-down" /></button>
      {includeIgnored && <small className="search-ignored-indicator">{t(locale, "folderSearchIncludeIgnored")}: ✓</small>}
      {optionsOpen && <div id={optionsId} className="search-options-body" role="group" aria-label={t(locale, "folderSearchMode")}
        onKeyDown={event => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button, input"));
            const index = controls.indexOf(document.activeElement as HTMLElement);
            controls[event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + controls.length) % controls.length]?.focus();
          }
        }}>
        <div className="search-modes">
          {(["both", "name", "content"] as const).map(choice => <button type="button" key={choice} aria-pressed={mode === choice}
            onClick={() => { invalidate(true); setMode(choice); closeOptions(); }}>
            <span aria-hidden="true">{mode === choice ? "✓" : ""}</span>{t(locale, choice === "both" ? "folderSearchBoth" : choice === "name" ? "folderSearchName" : "folderSearchContent")}</button>)}
        </div>
        <label className="folder-search-check"><input type="checkbox" checked={includeIgnored}
          onChange={event => { setIncludeIgnored(event.target.checked); invalidate(true); }} />{t(locale, "folderSearchIncludeIgnored")}</label>
        <p className="folder-search-scope">{t(locale, "searchMarkdownCoverage")}</p>
      </div>}
    </div>
    {!query.trim() && <p className="folder-search-scope">{t(locale, "searchQueryRequired")}</p>}
    <div className="folder-search-status" role="status" aria-live="polite">
      {status !== "idle" && <strong>{progress.matched.toLocaleString(locale)} {t(locale, "searchResultCount")}</strong>}
      <details className="search-status-details"><summary>
      {errorCode ? errorText(locale, errorCode) : status === "idle"
        ? t(locale, "folderSearchGuidance") : status === "searching"
          ? <PreviewLoading inline announce={false} staticMotion={!active} label={t(locale, "folderSearchSearching")}
              progress={progress.scanned > 0 || (!replacingResults && hits.length > 0) ? {} : undefined} /> : status === "stopped"
            ? t(locale, "folderSearchStopped") : status === "partial"
              ? t(locale, "folderSearchPartial") : progress.skipped > 0
                ? t(locale, "folderSearchFinished") : hits.length === 0
                ? t(locale, "folderSearchZero") : t(locale, "folderSearchComplete")}
      </summary>
      {status !== "idle" && ` · ${progress.scanned.toLocaleString(locale)} ${t(locale, "folderSearchScanned")}, ${progress.skipped.toLocaleString(locale)} ${t(locale, "folderSearchSkipped")}`}
      {status !== "idle" && ` · ${t(locale, "searchResultCount")}: ${progress.matched.toLocaleString(locale)}`}
      </details>
    </div>
    {replacingResults && hits.length > 0 && <p className="folder-search-scope">{locale === "es" ? "Resultados anteriores; esperando la nueva búsqueda." : "Previous results; awaiting the new search."}</p>}
    <div className="folder-search-groups" tabIndex={0} role="region" aria-label={t(locale, "searchResultCount")}>{Array.from(groups, ([path, matches]) => <section key={path} aria-label={path}>
      <h3 title={path}><MiddleFilename name={path} /><span>{matches.length.toLocaleString(locale)}</span></h3>
      <ol className="folder-search-results">{matches.map((hit) => <li key={hit.id}>
        <button type="button" disabled={opening !== null || replacingResults} title={hit.path}
          aria-label={`${hit.path} · ${hit.kind === "content" ? `${t(locale, "folderSearchLine")} ${hit.line} · ` : ""}${hit.context}`}
          onClick={() => void open(hit)}>
          <span>{hit.kind === "content" ? `${t(locale, "folderSearchLine")} ${hit.line} · ` : ""}{hit.context}</span>
          {opening === hit.id && <PreviewLoading inline label={t(locale, "loading")} />}
          {hit.ignored && <small>{t(locale, "folderSearchIgnored")}</small>}
        </button>
      </li>)}</ol>
    </section>)}</div>
  </section>;
}
