import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, readerError, type FolderSearchBatch, type FolderSearchHit,
  type FolderSearchStarted, type GrantInfo, type OpenFolderSearchHit } from "./api";
import { errorText, t, type Locale } from "./i18n";

interface Props {
  root: GrantInfo;
  locale: Locale;
  onOpen: (result: OpenFolderSearchHit, hit: FolderSearchHit, query: string) => Promise<void>;
  active?: boolean;
  query?: string;
  onQueryChange?: (value: string) => void;
  onClose?: () => void;
}

export default function FolderSearchPanel({ root, locale, onOpen, active = true, query: suppliedQuery, onQueryChange, onClose }: Props) {
  const [localQuery, setLocalQuery] = useState("");
  const query = suppliedQuery ?? localQuery;
  const setQuery = onQueryChange ?? setLocalQuery;
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"both" | "name" | "content">("both");
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [hits, setHits] = useState<FolderSearchHit[]>([]);
  const [progress, setProgress] = useState({ scanned: 0, skipped: 0, matched: 0 });
  const [status, setStatus] = useState<"idle" | FolderSearchBatch["status"]>("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [listenerReady, setListenerReady] = useState(false);
  const [currentJob, setCurrentJob] = useState<FolderSearchStarted | null>(null);
  const job = useRef<FolderSearchStarted | null>(null);
  const starting = useRef<Promise<FolderSearchStarted> | null>(null);
  const sequence = useRef(0);
  const pending = useRef<FolderSearchBatch[]>([]);
  const submittedQuery = useRef("");
  useEffect(() => { if (active) inputRef.current?.focus(); }, [active]);
  const stoppedJob = useRef<string | null>(null);

  function accept(batch: FolderSearchBatch) {
    if (batch.jobId !== job.current?.jobId || batch.generation !== root.generation) {
      if (!job.current && pending.current.length < 16) pending.current.push(batch);
      return;
    }
    setHits((old) => [...old, ...batch.results].slice(0, 10_000));
    setProgress({ scanned: batch.scanned, skipped: batch.skipped, matched: batch.matched });
    setStatus(stoppedJob.current === batch.jobId && batch.status === "searching"
      ? "stopped" : batch.status);
    setErrorCode(batch.errorCode);
  }

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<FolderSearchBatch>("folder-search:batch", (event) => {
      if (!disposed) accept(event.payload);
    }).then((stop) => { if (disposed) stop(); else { unlisten = stop; setListenerReady(true); } }).catch(() => {
      if (!disposed) setErrorCode("search_unavailable");
    });
    return () => {
      disposed = true;
      unlisten?.();
      const current = job.current;
      if (current) void api.cancelFolderSearch(current.jobId).catch(() => {});
      void starting.current?.then((started) => api.cancelFolderSearch(started.jobId)).catch(() => {});
    };
  }, [root.id, root.generation]);

  function invalidate() {
    sequence.current += 1;
    const previous = job.current;
    job.current = null;
    setCurrentJob(null);
    stoppedJob.current = null;
    pending.current = [];
    if (previous) void api.cancelFolderSearch(previous.jobId).catch(() => {});
    setHits([]);
    setProgress({ scanned: 0, skipped: 0, matched: 0 });
    setStatus("idle");
    setErrorCode(null);
  }

  async function search(selectedIgnored = includeIgnored, selectedMode = mode) {
    invalidate();
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
      const pendingStart = api.startFolderSearch(root.id, value, selectedMode, selectedIgnored);
      starting.current = pendingStart;
      const started = await pendingStart;
      if (current !== sequence.current) {
        void api.cancelFolderSearch(started.jobId).catch(() => {});
        return;
      }
      job.current = started;
      setCurrentJob(started);
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
    const current = job.current;
    if (!current) return;
    try {
      if (await api.cancelFolderSearch(current.jobId)) {
        stoppedJob.current = current.jobId;
        setStatus("stopped");
      }
    } catch (error) { setErrorCode(readerError(error).code); }
  }

  async function open(hit: FolderSearchHit) {
    const current = job.current;
    if (!current) return;
    setOpening(hit.id);
    try {
      const result = await api.openSearchHit(current.jobId, hit.id);
      if (job.current !== current) return;
      await onOpen(result, hit, submittedQuery.current);
    } catch (error) { setErrorCode(readerError(error).code); }
    finally { setOpening(null); }
  }

  const groups = new Map<string, FolderSearchHit[]>();
  for (const hit of hits) groups.set(hit.path, [...(groups.get(hit.path) ?? []), hit]);

  return <section className="folder-search" role="search" aria-label={t(locale, "folderSearch") }
    onKeyDown={(event) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault(); event.stopPropagation(); void stop(); onClose();
      }
    }}>
    {onClose && <button type="button" onClick={() => { void stop(); onClose(); }}>{t(locale, "backToExplorer")}</button>}
    <label className="folder-search-label">{t(locale, "folderSearch")}
      <input ref={inputRef} type="search" value={query} maxLength={256} autoComplete="off"
        placeholder={t(locale, "folderSearchPlaceholder")}
        onChange={(event) => { invalidate(); setQuery(event.target.value); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
    </label>
    <p className="folder-search-scope">{t(locale, "searchScope")}: {root.name} · {t(locale,
      mode === "name" ? "folderSearchName" : mode === "content" ? "folderSearchContent" : "folderSearchBoth")}</p>
    <div className="search-modes" role="group" aria-label={t(locale, "folderSearchMode")}>
      {(["both", "name", "content"] as const).map((choice) => <button type="button" key={choice}
        aria-pressed={mode === choice} onClick={() => { invalidate(); setMode(choice); }}>
        {mode === choice && <span aria-hidden="true">✓ </span>}
        {t(locale, choice === "both" ? "folderSearchBoth" : choice === "name" ? "folderSearchName" : "folderSearchContent")}
      </button>)}
    </div>
    <p className="folder-search-scope">{t(locale, "searchMarkdownCoverage")}</p>
    <label className="folder-search-check"><input type="checkbox" checked={includeIgnored}
      onChange={(event) => { const checked = event.target.checked; setIncludeIgnored(checked);
        invalidate(); }} />
      {t(locale, "folderSearchIncludeIgnored")}</label>
    <div className="folder-search-actions">
      {status !== "searching" && <button type="button" disabled={!query.trim() || !listenerReady} onClick={() => void search()}>{t(locale, "folderSearchGo")}</button>}
      {status === "searching" && <button type="button" disabled={!currentJob}
        onClick={() => void stop()}>{t(locale, "folderSearchStop")}</button>}
      <button type="button" disabled={!query} onClick={() => { invalidate(); setQuery(""); inputRef.current?.focus(); }}>{t(locale, "clearSearch")}</button>
    </div>
    {!query.trim() && <p className="folder-search-scope">{t(locale, "searchQueryRequired")}</p>}
    <p className="folder-search-status" role="status" aria-live="polite">
      {errorCode ? errorText(locale, errorCode) : status === "idle"
        ? t(locale, "folderSearchGuidance") : status === "searching"
          ? t(locale, "folderSearchSearching") : status === "stopped"
            ? t(locale, "folderSearchStopped") : status === "partial"
              ? t(locale, "folderSearchPartial") : hits.length === 0
                ? t(locale, "folderSearchZero") : t(locale, "folderSearchComplete")}
      {status !== "idle" && ` · ${progress.scanned.toLocaleString(locale)} ${t(locale, "folderSearchScanned")}, ${progress.skipped.toLocaleString(locale)} ${t(locale, "folderSearchSkipped")}`}
      {status !== "idle" && ` · ${t(locale, "searchResultCount")}: ${hits.length.toLocaleString(locale)}`}
    </p>
    <div className="folder-search-groups">{Array.from(groups, ([path, matches]) => <section key={path} aria-label={path}>
      <h3 title={path}>{path}<span>{matches.length.toLocaleString(locale)}</span></h3>
      <ol className="folder-search-results">{matches.map((hit) => <li key={hit.id}>
        <button type="button" disabled={opening !== null} title={hit.path}
          aria-label={`${hit.path} · ${hit.kind === "content" ? `${t(locale, "folderSearchLine")} ${hit.line} · ` : ""}${hit.context}`}
          onClick={() => void open(hit)}>
          <span>{hit.kind === "content" ? `${t(locale, "folderSearchLine")} ${hit.line} · ` : ""}{hit.context}</span>
          {hit.ignored && <small>{t(locale, "folderSearchIgnored")}</small>}
        </button>
      </li>)}</ol>
    </section>)}</div>
  </section>;
}
