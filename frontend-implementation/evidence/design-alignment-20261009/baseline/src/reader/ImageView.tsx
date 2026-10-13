import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../app/api";
import type { ImageResponse } from "../app/api";
import { t, type Locale } from "../app/i18n";
import { boundZoom, usePinchZoom } from "./usePinchZoom";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
type Tile = { x: number; y: number; width: number; height: number; url: string };
export type ImageViewState = { mode: "fit" | "manual"; scale: number; left: number; top: number };

export default function ImageView({ image, locale, hideIdentity = false, initialView, onViewChange }: {
  image: ImageResponse; locale: Locale; hideIdentity?: boolean;
  initialView?: ImageViewState; onViewChange?: (view: ImageViewState) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [fitMeasured, setFitMeasured] = useState(false);
  const [mode, setMode] = useState<"fit" | "manual">(initialView?.mode ?? "fit");
  const [manualScale, setManualScale] = useState(initialView?.scale ?? 1);
  const viewChange = useRef(onViewChange);
  viewChange.current = onViewChange;
  const zoomAnchor = useRef<{ viewport: HTMLDivElement; surface: HTMLElement; x: number; y: number; focus: { x: number; y: number } } | null>(null);
  const pendingView = useRef(initialView);
  const [viewportTick, setViewportTick] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [tileError, setTileError] = useState(false);
  const tileCache = useRef(new Map<string, Tile>());
  const tilePending = useRef(new Set<string>());
  const tileFailed = useRef(new Set<string>());
  const tileWanted = useRef(new Set<string>());
  const tileGeneration = useRef(0);
  const previewWidth = image.bytes.length >= 24
    ? image.bytes.slice(16, 20).reduce((value, byte) => value * 256 + byte, 0) : image.width;
  const previewHeight = image.bytes.length >= 24
    ? image.bytes.slice(20, 24).reduce((value, byte) => value * 256 + byte, 0) : image.height;

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    if (!image.bytes?.length) return;
    const objectUrl = URL.createObjectURL(new Blob([new Uint8Array(image.bytes)], { type: "image/png" }));
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [image.bytes]);

  useLayoutEffect(() => {
    return () => { zoomAnchor.current = null; };
  }, [image.fileId]);

  useEffect(() => {
    tileGeneration.current += 1;
    for (const tile of tileCache.current.values()) URL.revokeObjectURL(tile.url);
    tileCache.current.clear();
    tilePending.current.clear();
    tileFailed.current.clear();
    tileWanted.current.clear();
    setTiles([]);
    setTileError(false);
    return () => {
      tileGeneration.current += 1;
      for (const tile of tileCache.current.values()) URL.revokeObjectURL(tile.url);
      tileCache.current.clear();
    };
  }, [image.fileId, image.diskVersion, image.bytes]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => {
      setFitScale(Math.min(1,
        Math.max(1, viewport.clientWidth - 24) / image.width,
        Math.max(1, viewport.clientHeight - 24) / image.height));
      setViewportTick((tick) => tick + 1);
      setFitMeasured(true);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(viewport);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [image.width, image.height]);

  const scale = mode === "fit" ? fitScale : manualScale;
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !url || !fitMeasured || !pendingView.current) return;
    viewport.scrollLeft = pendingView.current.left;
    viewport.scrollTop = pendingView.current.top;
    pendingView.current = undefined;
  }, [url, fitMeasured]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && url && fitMeasured && !pendingView.current)
      viewChange.current?.({ mode, scale, left: viewport.scrollLeft, top: viewport.scrollTop });
  }, [mode, scale, url, fitMeasured]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const needsTiles = fitMeasured && (previewWidth < image.width || previewHeight < image.height)
      && scale >= 0.75;
    const wanted = new Set<string>();
    if (needsTiles) {
      const left = Math.max(0, viewport.scrollLeft / scale);
      const top = Math.max(0, viewport.scrollTop / scale);
      const right = Math.min(image.width - 1, (viewport.scrollLeft + viewport.clientWidth) / scale);
      const bottom = Math.min(image.height - 1, (viewport.scrollTop + viewport.clientHeight) / scale);
      for (let y = Math.floor(top / 1024) * 1024; y <= bottom; y += 1024) {
        for (let x = Math.floor(left / 1024) * 1024; x <= right; x += 1024) {
          if (wanted.size < 16) wanted.add(`${x}:${y}`);
        }
      }
    }
    tileWanted.current = wanted;
    let changed = false;
    for (const [key, tile] of tileCache.current) {
      if (!wanted.has(key)) {
        URL.revokeObjectURL(tile.url);
        tileCache.current.delete(key);
        changed = true;
      }
    }
    if (changed) setTiles([...tileCache.current.values()]);
    const generation = tileGeneration.current;
    for (const key of wanted) {
      if (tilePending.current.size >= 4) break;
      if (tileCache.current.has(key) || tilePending.current.has(key) || tileFailed.current.has(key)) continue;
      tilePending.current.add(key);
      const [x, y] = key.split(":").map(Number);
      void api.openImageTile(image.fileId, image.diskVersion, x, y).then((tile) => {
        if (generation !== tileGeneration.current || !tileWanted.current.has(key)
          || tile.fileId !== image.fileId || tile.diskVersion !== image.diskVersion
          || tile.x !== x || tile.y !== y || tile.width < 1 || tile.height < 1
          || tile.width > 1024 || tile.height > 1024) return;
        const url = URL.createObjectURL(new Blob([new Uint8Array(tile.bytes)], { type: "image/png" }));
        tileCache.current.set(key, { x, y, width: tile.width, height: tile.height, url });
        setTileError(tileFailed.current.size > 0);
        setTiles([...tileCache.current.values()]);
      }).catch(() => {
        if (generation === tileGeneration.current && tileWanted.current.has(key)) {
          tileFailed.current.add(key);
          setTileError(true);
        }
      }).finally(() => {
        if (generation === tileGeneration.current) {
          tilePending.current.delete(key);
          setViewportTick((tick) => tick + 1);
        }
      });
    }
  }, [image, previewWidth, previewHeight, scale, viewportTick, fitMeasured]);
  function changeScale(next: number, point?: { x: number; y: number }) {
    const viewport = viewportRef.current;
    const surface = viewport?.querySelector<HTMLElement>(".image-surface");
    const bounds = surface?.getBoundingClientRect();
    const viewportBounds = viewport?.getBoundingClientRect();
    const focus = point ?? { x: (viewportBounds?.left ?? 0) + (viewport?.clientWidth ?? 0) / 2,
      y: (viewportBounds?.top ?? 0) + (viewport?.clientHeight ?? 0) / 2 };
    const x = bounds ? (focus.x - bounds.left) / scale : 0;
    const y = bounds ? (focus.y - bounds.top) / scale : 0;
    const bounded = boundZoom(next);
    setManualScale(bounded);
    setMode("manual");
    zoomAnchor.current = viewport && surface ? { viewport, surface, x, y, focus } : null;
  }
  useLayoutEffect(() => {
    const pending = zoomAnchor.current;
    zoomAnchor.current = null;
    if (!pending || !pending.surface.isConnected) return;
    const bounds = pending.surface.getBoundingClientRect();
    pending.viewport.scrollLeft += bounds.left + pending.x * scale - pending.focus.x;
    pending.viewport.scrollTop += bounds.top + pending.y * scale - pending.focus.y;
    viewChange.current?.({ mode, scale, left: pending.viewport.scrollLeft, top: pending.viewport.scrollTop });
  }, [scale, mode]);
  usePinchZoom(viewportRef, image.fileId, Boolean(url) && !failed, scale, changeScale);
  function stepZoom(direction: -1 | 1) {
    const next = direction > 0
      ? ZOOM_STEPS.find((step) => step > scale + 0.001) ?? 4
      : [...ZOOM_STEPS].reverse().find((step) => step < scale - 0.001) ?? 0.25;
    changeScale(next);
  }

  return <section className="image-page" role="tabpanel" aria-label={image.name}>
    <div className="image-header">
      {!hideIdentity && <div className="document-eyebrow" title={image.displayPath}>{image.displayPath}</div>}
      <div className="image-meta">
        {!hideIdentity && <strong>{image.name}</strong>}
        <span>{t(locale, "imageFormat")}: {image.format.toUpperCase()}</span>
        <span>{t(locale, "imageDimensions")}: {image.width} × {image.height}</span>
        {image.still && <span>{t(locale, "imageStill")}</span>}
      </div>
      <div className="image-controls" aria-label={image.name}>
        <button type="button" aria-pressed={mode === "fit"} onClick={() => setMode("fit")}>{t(locale, "imageFit")}</button>
        <button type="button" aria-pressed={mode === "manual" && manualScale === 1}
          onClick={() => changeScale(1)}>{t(locale, "imageActual")}</button>
        <button type="button" aria-label={t(locale, "imageZoomOut")} disabled={scale <= 0.25}
          onClick={() => stepZoom(-1)}>−</button>
        <output aria-live="polite">{Math.round(scale * 100)}%</output>
        <button type="button" aria-label={t(locale, "imageZoomIn")} disabled={scale >= 4}
          onClick={() => stepZoom(1)}>+</button>
      </div>
      {tileError && <p className="image-detail-error" role="status">{t(locale, "imageDetailUnavailable")}</p>}
    </div>
    <div className="image-viewport" ref={viewportRef} tabIndex={0} aria-label={image.name}
      onScroll={(event) => {
        setViewportTick((tick) => tick + 1);
        viewChange.current?.({ mode, scale, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop });
      }}>
      {failed ? <p role="alert">{t(locale, "imageCorrupt")}</p>
        : url ? <div className="image-stage" style={{
          width: Math.max(image.width * scale, viewportRef.current?.clientWidth ?? 0),
          height: Math.max(image.height * scale, viewportRef.current?.clientHeight ?? 0)
        }}><div className="image-surface" style={{ width: image.width * scale, height: image.height * scale }}>
          <img src={url} alt={image.name} draggable={false} onError={() => setFailed(true)}
            style={{ width: image.width * scale, height: image.height * scale }} />
          {tiles.map((tile) => <img key={`${tile.x}:${tile.y}`} className="image-tile" src={tile.url}
            alt="" aria-hidden="true" draggable={false} onError={() => {
              const key = `${tile.x}:${tile.y}`;
              if (tileWanted.current.has(key)) tileFailed.current.add(key);
              tileCache.current.delete(key);
              URL.revokeObjectURL(tile.url);
              setTiles([...tileCache.current.values()]);
              if (tileWanted.current.has(key)) setTileError(true);
            }} style={{ left: tile.x * scale, top: tile.y * scale,
              width: tile.width * scale, height: tile.height * scale }} />)}
        </div></div>
          : <p role="status">{t(locale, "imageLoading")}</p>}
    </div>
  </section>;
}
