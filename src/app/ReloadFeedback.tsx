import { useEffect, useRef, useState, type ReactNode } from "react";

/** Manual reload feedback occupies reserved space; last results remain in target menus. */
export default function ReloadFeedback({ message, successful, dismissLabel, progress, fallback }: {
  message: string | null; successful: boolean; dismissLabel: string; progress?: ReactNode; fallback?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(5000);
  // A new outcome replaces the prior one even when the footer has been dismissed.
  useEffect(() => {
    remaining.current = 5000;
    setDismissed(false);
  }, [message]);
  useEffect(() => {
    if (!message || !successful || dismissed || hovered || focused) return;
    const started = Date.now();
    const timer = setTimeout(() => setDismissed(true), remaining.current);
    return () => { clearTimeout(timer); remaining.current = Math.max(0, remaining.current - (Date.now() - started)); };
  }, [message, successful, dismissed, hovered, focused]);
  return <div className="reload-feedback-footer" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {!dismissed && message && <>
      <span role="status" className={successful ? "reload-success" : undefined}>
        {successful && <span aria-hidden="true">✓ </span>}{message}
      </span>
      <button type="button" aria-label={dismissLabel} onClick={() => setDismissed(true)}>×</button>
    </>}
    {(dismissed || !message) && !progress && fallback && <span className="workspace-file-status">{fallback}</span>}
    {progress}
  </div>;
}
