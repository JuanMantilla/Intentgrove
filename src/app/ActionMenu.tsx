import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface MenuAction { label: string; run: () => void; disabled?: boolean; hint?: string; reason?: string }
export default function ActionMenu({ anchor, x, y, actions, onClose }: {
  anchor: HTMLElement; x: number; y: number; actions: MenuAction[]; onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closing = useRef(onClose); closing.current = onClose;
  const [position, setPosition] = useState({ x, y });
  useLayoutEffect(() => {
    const bounds = panel.current?.getBoundingClientRect();
    setPosition({ x: Math.max(8, Math.min(x, window.innerWidth - (bounds?.width ?? 0) - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - (bounds?.height ?? 0) - 8)) });
  }, [x, y]);
  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const dismiss = (restoreFocus = false) => { closing.current(); if (restoreFocus && anchor.isConnected) anchor.focus(); };
    const outside = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !anchor.contains(event.target as Node)) dismiss();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); dismiss(true); }
    };
    const resize = () => dismiss();
    const blur = () => closing.current();
    const scroll = (event: Event) => { if (!panel.current?.contains(event.target as Node)) dismiss(); };
    const observer = new MutationObserver(() => { if (!anchor.isConnected) closing.current(); });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("keydown", escape);
    window.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize); window.addEventListener("blur", blur);
    window.addEventListener("scroll", scroll, true);
    return () => { observer.disconnect(); window.removeEventListener("keydown", escape); window.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); window.removeEventListener("blur", blur);
      window.removeEventListener("scroll", scroll, true); };
  }, [anchor]);
  return <div ref={panel} className="context-menu action-menu" role="menu" style={{ left: position.x, top: position.y }}
    onKeyDown={(event) => {
      const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      } else if (event.key === "Escape" || event.key === "Tab") {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); }
        onClose(); if (anchor.isConnected) anchor.focus();
      }
    }}>
    {actions.map((action) => <div key={action.label}>
      <button type="button" role="menuitem" aria-label={action.label} disabled={action.disabled} aria-description={action.reason}
        onClick={() => { onClose(); if (anchor.isConnected) anchor.focus(); action.run(); }}>
        <span>{action.label}</span>{action.hint && <span className="menu-shortcut" aria-hidden="true">{action.hint}</span>}
      </button>{action.reason && <div className="context-menu-reason">{action.reason}</div>}
    </div>)}
  </div>;
}
