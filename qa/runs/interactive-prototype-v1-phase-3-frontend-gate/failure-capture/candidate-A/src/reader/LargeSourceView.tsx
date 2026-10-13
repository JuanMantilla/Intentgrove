import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { api, readerError, type LargeOpened, type SourceWindow } from "../app/api";
import { errorText, t, type Locale } from "../app/i18n";
import { usePinchZoom } from "./usePinchZoom";
import PreviewLoading from "./PreviewLoading";

interface Props {
  opened: LargeOpened;
  locale: Locale;
  onReload: () => void;
  zoom?: number;
  onZoom?: (value: number) => void;
}

export default function LargeSourceView({ opened, locale, onReload, zoom = 1, onZoom }: Props) {
  const [windowData, setWindowData] = useState<SourceWindow | null>(null);
  const [position, setPosition] = useState(0);
  const [line, setLine] = useState("1");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [findProgress, setFindProgress] = useState<{ scannedBytes: number; totalBytes: number } | null>(null);
  const request = useRef(0);
  const findRequest = useRef(0);
  const lastMatch = useRef<number | null>(null);
  const sourceRef = useRef<HTMLPreElement>(null);
  const lastScrollTop = useRef(0);
  const zoomAnchor = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  usePinchZoom(sourceRef, opened.fileId, Boolean(windowData) && Boolean(onZoom), zoom, (next, point) => {
    const source = sourceRef.current;
    if (!source) return;
    const bounds = source.getBoundingClientRect(), styles = getComputedStyle(source);
    const offsetX = point.x - bounds.left - (parseFloat(styles.paddingLeft) || 0);
    const offsetY = point.y - bounds.top - (parseFloat(styles.paddingTop) || 0);
    zoomAnchor.current = { x: (source.scrollLeft + offsetX) / zoom, y: (source.scrollTop + offsetY) / zoom, offsetX, offsetY };
    onZoom?.(next);
  });
  useLayoutEffect(() => {
    const source = sourceRef.current, anchor = zoomAnchor.current;
    zoomAnchor.current = null;
    if (!source || !anchor) return;
    source.scrollLeft = anchor.x * zoom - anchor.offsetX;
    source.scrollTop = anchor.y * zoom - anchor.offsetY;
    lastScrollTop.current = source.scrollTop;
  }, [zoom]);

  async function load(offset: number, preserveFind = false, owner?: number) {
    if (!preserveFind) lastMatch.current = null;
    const generation = owner ?? ++request.current;
    setLoading(true);
    setNotice(null);
    try {
      const current = await api.readSourceWindow(opened.snapshotId, Math.max(0, offset));
      if (request.current !== generation) return;
      setWindowData(current);
      setPosition(current.startByte);
      setLine(String(current.lineNumber));
      lastScrollTop.current = 0;
      if (sourceRef.current) sourceRef.current.scrollTop = 0;
    } catch (error) {
      if (request.current === generation) {
        setNotice(errorText(locale, readerError(error).code));
      }
    } finally {
      if (request.current === generation) setLoading(false);
    }
  }

  useEffect(() => {
    lastMatch.current = null; setWindowData(null); setFindProgress(null);
    void load(0);
    return () => { request.current += 1; findRequest.current += 1;
      void api.cancelLargeFind().catch(() => {}); };
  }, [opened.snapshotId]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<{
      snapshotId: string; requestId: number; scannedBytes: number; totalBytes: number;
    }>("large-source:find_progress", (event) => {
      if (!disposed && event.payload.snapshotId === opened.snapshotId
        && event.payload.requestId === findRequest.current) setFindProgress(event.payload);
    }).then((stop) => { if (disposed) stop(); else unlisten = stop; }).catch(() => {});
    return () => { disposed = true; unlisten?.(); };
  }, [opened.snapshotId]);

  async function goToLine() {
    const target = Number(line);
    if (!Number.isSafeInteger(target) || target < 1 || target > opened.lineCount) return;
    const owner = ++request.current;
    setLoading(true); setNotice(null);
    try {
      const offset = await api.sourceLineOffset(opened.snapshotId, target);
      if (owner === request.current) await load(offset, false, owner);
    } catch (error) { if (owner === request.current) setNotice(errorText(locale, readerError(error).code)); }
    finally { if (owner === request.current) setLoading(false); }
  }

  async function findNext() {
    if (!query) return;
    const generation = ++findRequest.current;
    setFindProgress({ scannedBytes: 0, totalBytes: Math.max(0, opened.sizeBytes - (lastMatch.current ?? windowData?.startByte ?? 0)) });
    try {
      const found = await api.findLargeSource(opened.snapshotId, query,
        lastMatch.current === null ? windowData?.startByte ?? 0 : lastMatch.current + 1, generation);
      if (findRequest.current !== generation) return;
      setFindProgress(null);
      if (found === null) { setNotice(t(locale, "largeSourceNoMatch")); return; }
      lastMatch.current = found;
      await load(found, true);
    } catch (error) {
      if (findRequest.current === generation) {
        setFindProgress(null);
        setNotice(errorText(locale, readerError(error).code));
      }
    }
  }

  async function copySelection() {
    const selection = window.getSelection();
    const node = sourceRef.current?.firstChild;
    if (!selection?.rangeCount || !node || !windowData) {
      setNotice(t(locale, "largeSourceCopyFailed")); return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed || range.startContainer !== node || range.endContainer !== node) {
      setNotice(t(locale, "largeSourceCopyFailed")); return;
    }
    const encoder = new TextEncoder();
    const source = windowData.text;
    const startByte = windowData.startByte + encoder.encode(source.slice(0, range.startOffset)).length;
    const endByte = windowData.startByte + encoder.encode(source.slice(0, range.endOffset)).length;
    try {
      const text = await api.copySourceSelection(opened.snapshotId, startByte, endByte);
      await navigator.clipboard.writeText(text);
      setNotice(t(locale, "largeSourceCopied"));
    } catch (error) { setNotice(readerError(error).code === "unknown"
      ? t(locale, "largeSourceCopyFailed") : errorText(locale, readerError(error).code)); }
  }

  function scrollSource() {
    const element = sourceRef.current;
    if (!element || !windowData || loading) return;
    const previous = lastScrollTop.current;
    const current = element.scrollTop;
    lastScrollTop.current = current;
    if (current > previous && current + element.clientHeight >= element.scrollHeight - 16
      && windowData.endByte < opened.sizeBytes) {
      void load(windowData.endByte);
    } else if (current < previous && current <= 16 && windowData.startByte > 0) {
      void load(Math.max(0, windowData.startByte - 64 * 1024));
    }
  }

  return <section className="large-source" aria-label={t(locale, "largeSourceMode")}>
    <div className="large-source-toolbar">
      <strong>{t(locale, "largeSourceMode")}</strong>
      <span>{Math.ceil(opened.sizeBytes / 1024 / 1024)} MiB · {opened.lineCount.toLocaleString(locale)} {t(locale, "largeSourceLines")}</span>
      <button type="button" onClick={onReload}>{t(locale, "largeSourceReload")}</button>
    </div>
    <div className="large-source-controls">
      <button type="button" onClick={() => void load(0)}>{t(locale, "largeSourceStart")}</button>
      <button type="button" disabled={!windowData || windowData.startByte === 0}
        onClick={() => void load(Math.max(0, (windowData?.startByte ?? 0) - 64 * 1024))}>
        {t(locale, "largeSourcePrevious")}</button>
      <button type="button" disabled={!windowData || windowData.endByte >= opened.sizeBytes}
        onClick={() => void load(windowData?.endByte ?? 0)}>{t(locale, "largeSourceNext")}</button>
      <button type="button" onClick={() => void load(Math.max(0, opened.sizeBytes - 64 * 1024))}>
        {t(locale, "largeSourceEnd")}</button>
      <label>{t(locale, "largeSourceLine")}
        <input type="number" min={1} max={opened.lineCount} value={line}
          onChange={(event) => setLine(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void goToLine(); }} /></label>
      <button type="button" onClick={() => void goToLine()}>{t(locale, "largeSourceLine")}</button>
      <label>{t(locale, "largeSourceFind")}
        <input type="search" value={query} maxLength={4096}
          onChange={(event) => { findRequest.current += 1; lastMatch.current = null;
            setFindProgress(null); void api.cancelLargeFind().catch(() => {}); setQuery(event.target.value); }}
          onKeyDown={(event) => { if (event.key === "Enter") void findNext(); }} /></label>
      <button type="button" disabled={!query || findProgress !== null} onClick={() => void findNext()}>{t(locale, "largeSourceFind")}</button>
      {findProgress && <button type="button" onClick={() => { findRequest.current += 1;
        setFindProgress(null); void api.cancelLargeFind().catch(() => {}); }}>
        {t(locale, "largeSourceStopFind")}</button>}
      <button type="button" onClick={() => void copySelection()}>{t(locale, "largeSourceCopy")}</button>
    </div>
    <input className="large-source-range" type="range" min={0} max={Math.max(1, opened.sizeBytes - 1)}
      value={position} aria-label={t(locale, "largeSourceWindow")}
      onChange={(event) => void load(Number(event.target.value))} />
    <div className="large-source-status" role={loading || (!windowData && !notice) ? undefined : "status"}>
      {findProgress ? <PreviewLoading label={t(locale, "largeSourceSearching")} announce={false}
        progress={{ completed: findProgress.scannedBytes, total: findProgress.totalBytes }}
        detail={`${findProgress.scannedBytes.toLocaleString(locale)} / ${findProgress.totalBytes.toLocaleString(locale)} bytes`} />
        : loading ? <PreviewLoading inline label={t(locale, "largeSourceLoading")} /> : notice ?? (windowData
        ? `${windowData.startByte.toLocaleString(locale)}–${windowData.endByte.toLocaleString(locale)} / ${opened.sizeBytes.toLocaleString(locale)} bytes · ${t(locale, "largeSourceLine")} ${windowData.lineNumber}`
        : <PreviewLoading inline label={t(locale, "largeSourceLoading")} />)}
    </div>
    <pre ref={sourceRef} className="large-source-text" style={{ fontSize: `${12 * zoom}px` }} data-source-zoom={zoom} tabIndex={0} aria-label={t(locale, "largeSourceWindow")}
      onScroll={scrollSource}>{windowData?.text ?? ""}</pre>
  </section>;
}
