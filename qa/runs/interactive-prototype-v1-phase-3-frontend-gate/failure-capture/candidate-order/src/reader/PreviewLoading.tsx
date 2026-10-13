import { useEffect, useRef, useState } from "react";

/** Shared local feedback. Totals must come from the operation, never elapsed time. */
export default function PreviewLoading({ label, inline = false, visibleLabel = false, progress,
  detail, placeholder = false, staticMotion = false, announce = true }: {
  label: string; inline?: boolean; visibleLabel?: boolean;
  progress?: { completed?: number; total?: number };
  detail?: string; placeholder?: boolean; staticMotion?: boolean; announce?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    let intersecting = true;
    const update = () => setVisible(intersecting && !document.hidden);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
      intersecting = entries[0]?.isIntersecting ?? false; update();
    });
    if (ref.current) observer?.observe(ref.current);
    document.addEventListener("visibilitychange", update);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);
  const measured = progress && Number.isFinite(progress.total) && progress.total! > 0
    && Number.isFinite(progress.completed) && progress.completed! >= 0;
  const value = measured ? Math.min(progress!.total!, progress!.completed!) : undefined;
  return <span ref={ref} className={`preview-loading${inline ? " preview-loading-inline" : ""}${progress ? " preview-loading-progress" : ""}${placeholder ? " preview-loading-placeholder" : ""}`}
    data-motion={visible && !staticMotion ? "on" : "off"} role={announce ? "status" : undefined} aria-label={announce ? label : undefined}>
    <span className={visibleLabel ? "loading-label" : "sr-only"}>{label}</span>
    {progress ? <span className="loading-track" role="progressbar" aria-label={label}
      aria-valuemin={measured ? 0 : undefined} aria-valuemax={measured ? progress.total : undefined}
      aria-valuenow={value} data-measured={Boolean(measured)}>
      <i style={measured ? { width: `${100 * value! / progress.total!}%` } : undefined} />
    </span> : placeholder ? <span className="loading-rows" aria-hidden="true"><i /><i /><i /></span>
      : <span className="preview-loading-dots" aria-hidden="true"><i /><i /><i /></span>}
    {detail && <span className="loading-detail">{detail}</span>}
  </span>;
}
