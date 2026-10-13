import { useEffect, useId, useRef, type ReactNode } from "react";

/** A local workspace surface; native picker and existing loss guards stay native/owned by App. */
export default function WorkspaceDialog({ title, closeLabel, onClose, children, suspended = false, closeDisabled = false, initialFocus, isolate = false }:
  { title: string; closeLabel: string; onClose: () => void; children: ReactNode; suspended?: boolean; closeDisabled?: boolean; initialFocus?: string; isolate?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const cannotClose = useRef(closeDisabled);
  const titleId = useId();
  close.current = onClose;
  cannotClose.current = closeDisabled;
  useEffect(() => {
    if (suspended) return;
    const previous = document.activeElement as HTMLElement | null;
    const isolated: Array<{ element: HTMLElement; inert: boolean }> = [];
    if (isolate) {
      let owner: HTMLElement | null = panel.current?.parentElement ?? null;
      while (owner?.parentElement && owner !== document.body) {
        for (const sibling of Array.from(owner.parentElement.children)) {
          if (sibling !== owner && sibling instanceof HTMLElement) {
            isolated.push({ element: sibling, inert: sibling.inert }); sibling.inert = true;
          }
        }
        owner = owner.parentElement;
      }
    }
    panel.current?.querySelector<HTMLElement>(initialFocus ?? "button, input, summary")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!cannotClose.current) close.current(); }
      if (event.key !== "Tab") return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, summary, [tabindex="0"]') ?? []).filter(control => !("disabled" in control && control.disabled));
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && (index === controls.length - 1 || index < 0)) {
        event.preventDefault(); controls[0]?.focus();
      }
    };
    const element = panel.current;
    element?.addEventListener("keydown", keys);
    return () => { element?.removeEventListener("keydown", keys); isolated.forEach(({ element, inert }) => { element.inert = inert; }); if (previous?.isConnected) previous.focus(); };
  }, [suspended, initialFocus, isolate]);
  return <div className="section-modal-backdrop workspace-dialog-backdrop" hidden={suspended} inert={suspended}>
    <div className="section-modal workspace-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panel}>
      <div className="workspace-dialog-heading"><h2 id={titleId}>{title}</h2>
        <button type="button" disabled={closeDisabled} onClick={onClose}>{closeLabel}</button></div>
      {children}
    </div>
  </div>;
}
