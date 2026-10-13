import { useEffect, useRef, type ReactNode } from "react";
import { t, type Locale } from "./i18n";

export default function DocumentLocation({ name, path, folders, locale, onReveal, revealing = false, actions, menuActions, onMenuOpen, beforeMenuOpen }:
  { name: string; path: string; folders: string | null; locale: Locale; onReveal?: () => void; revealing?: boolean;
    actions?: ReactNode; menuActions?: ReactNode; onMenuOpen?: () => void; beforeMenuOpen?: () => Promise<void> }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
    if (disclosure.current) disclosure.current.open = false;
  }, [path]);
  useEffect(() => {
    const close = () => { if (menu.current) menu.current.open = false; };
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) close(); };
    window.addEventListener("pointerdown", outside); window.addEventListener("resize", close); window.addEventListener("blur", close);
    window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("pointerdown", outside); window.removeEventListener("resize", close);
      window.removeEventListener("blur", close); window.removeEventListener("scroll", close, true); };
  }, []);
  return <div className="document-location" role="group" aria-label={name}>
    <div className="document-identity"><strong>{name}</strong>
      <span>{folders === null ? t(locale, "outsideWorkspace") : folders || t(locale, "workspaceRoot")}</span></div>
    <div className="document-location-actions">
      {actions}
      <details ref={menu} className="document-actions-disclosure" onToggle={(event) => {
        if (event.currentTarget.open) onMenuOpen?.();
      }} onKeyDown={(event) => {
        if (event.key === "Escape" && !disclosure.current?.open && menu.current?.open) {
          event.preventDefault(); event.stopPropagation(); menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}>
      <summary onClick={event=>{if(!menu.current?.open && beforeMenuOpen){event.preventDefault();void beforeMenuOpen().then(()=>{if(menu.current)menu.current.open=true;});}}}>{t(locale, "documentMenu")}</summary>
      <div className="document-actions-body" onClick={(event) => {
        if ((event.target as HTMLElement).closest("button")) {
          if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); }
        }
      }}>
      {menuActions}
      <details ref={disclosure} className="path-disclosure" onKeyDown={(event) => {
        if (event.key === "Escape" && disclosure.current?.open) {
          event.preventDefault(); event.stopPropagation(); disclosure.current.open = false;
          disclosure.current.querySelector("summary")?.focus();
        }
      }}>
        <summary>{t(locale, "showPath")}</summary>
        <div tabIndex={0} aria-label={`${t(locale, "fullPath")}: ${name}`}>{path}</div>
      </details>
      {onReveal && <button type="button" disabled={revealing} onClick={onReveal}>
        {t(locale, revealing ? "revealingFile" : "revealInExplorer")}</button>}
      </div></details>
    </div>
  </div>;
}
