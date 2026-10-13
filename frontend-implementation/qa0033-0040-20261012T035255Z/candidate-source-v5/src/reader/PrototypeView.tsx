import type {PrototypeDocument} from '../app/documentView';
import {t,type Locale} from '../app/i18n';
/** Phase 3 metadata only. Phase 4 will consume the native validated-package session. */
export default function PrototypeView({view,locale,changed,reloadFailed,onReload}:{view:PrototypeDocument;locale:Locale;changed:boolean;reloadFailed:boolean;onReload:()=>void}) {
  return <section className="error-state" role="tabpanel" aria-label={view.name}>
    <h1>{t(locale,'prototypeTitle')}</h1><p>{view.prototype.title ?? view.name}</p>
    <p>{t(locale,'prototypeReady')}</p>
    <p>{view.prototype.viewport.width} × {view.prototype.viewport.height} · {view.prototype.sceneCount} {t(locale,'prototypeScenes')}</p>
    {reloadFailed ? <p role="status">{t(locale,'prototypeReloadFailed')}</p> : changed && <p role="status">{t(locale,'prototypeChanged')}</p>}
    <button type="button" onClick={onReload}>{t(locale,'reload')}</button>
  </section>;
}
