import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { htmlNative, type HtmlState, type HtmlBaseline, type HtmlLocation, type LocalView, type HtmlLink, type HtmlBounds } from '../app/htmlNative';
import { validHtmlLocation, HtmlController } from '../app/htmlController';
import { errorText, t, type Locale } from '../app/i18n';
import { readerError } from '../app/api';
import WorkspaceDialog from '../app/WorkspaceDialog';

export interface HtmlHandle { capture: () => Promise<HtmlLocation>; locate: (location: HtmlLocation) => Promise<HtmlLocation>; reload: () => Promise<void>; find: (query: string, backwards?: boolean) => Promise<{count: number; current: number}>; hide: () => Promise<void>; details: () => Promise<void>; focus: () => Promise<void> }
export default function HtmlView({ view, active, blocked, outlineOpen = false, locale, baseline, initialLocation, fallbackHeadings = [], register, onState, onLocation, onReplace, onLink, onPassage, onShortcut, onClose }:
 { view: LocalView; active: boolean; blocked: boolean; outlineOpen?: boolean; locale: Locale; baseline: HtmlBaseline; initialLocation?: HtmlLocation; fallbackHeadings?: string[];
 register: (handle: HtmlHandle | null) => void; onState: (state: HtmlState) => void; onLocation: (location: HtmlLocation) => void;
 onReplace: (view: LocalView, location: HtmlLocation, fallbackHeadings?: string[]) => void; onLink: (link: HtmlLink, view?: LocalView) => Promise<void>;
 onPassage?: (before: HtmlLocation, after: HtmlLocation, anchor: string) => void;
 onShortcut: (key: string, shift: boolean) => void; onClose: () => void }) {
  const region = useRef<HTMLDivElement>(null);
  const stateRef=useRef<HtmlState | null>(null);
  const reloadInFlight=useRef(false);
  const baselineKey=useRef(JSON.stringify(baseline));
  const focused=useRef(true);
  const [state, setState] = useState<HtmlState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [access, setAccess] = useState<HtmlLink | null>(null);
  const [picker, setPicker] = useState(false);
  const callbacks = useRef({onState, onLocation, onReplace, onLink, onPassage, onShortcut});
  callbacks.current = {onState, onLocation, onReplace, onLink, onPassage, onShortcut};
  const activeRef=useRef(active); activeRef.current=active;
  const visible = useRef(false);
  visible.current = active && !blocked && !details && !access && !picker;
  const controller = useRef<HtmlController | null>(null);
  const mountedRef = useRef(false);
  const lastBounds = useRef<HtmlBounds | null>(null);
  const bounds = () => {
    let r = region.current?.getBoundingClientRect();
    // An inactive destination can be prepared hidden before committing navigation.
    if ((!r || r.width < 1 || r.height < 1) && !lastBounds.current) r=region.current?.closest('.reader-scroll')?.getBoundingClientRect();
    if (!r || r.width < 1 || r.height < 1) return lastBounds.current;
    const x = Math.max(0, r.x), y = Math.max(0, r.y);
    lastBounds.current={x,y,width:Math.min(r.width,window.innerWidth-x),height:Math.min(r.height,window.innerHeight-y)};
    return lastBounds.current;
  };
  const clearNavigationError=()=>setError(previous=>previous==='anchor_missing'?null:previous);
  const report = (e: unknown) => { const code = readerError(e).code; if (!['stale_view','stale_request','cancelled'].includes(code)) setError(code); };
  const viewport = async (show = visible.current) => {
    const c = controller.current, b = bounds();
    if (c && b && mountedRef.current) await c.run(async request => {
      if(show)focused.current=await getCurrentWindow().isFocused();
      return htmlNative.viewport(request,b,show && visible.current && focused.current && stateRef.current?.state !== 'empty');
    });
  };
  const reload = async () => {
    const c = controller.current; if (!c || reloadInFlight.current) return;
    reloadInFlight.current=true;
    try {
      const location = await c.capture(); callbacks.current.onLocation(location);
      const next = await c.run(request => htmlNative.reload(request));
      const headings=stateRef.current?.headings ?? [];
      const index=headings.findIndex(h=>(h.authoredId ?? h.key)===location.headingId);
      callbacks.current.onReplace(next, location, headings.slice(0,Math.max(0,index)).reverse().map(h=>h.authoredId ?? h.key));
    } catch (e) { report(e); } finally {reloadInFlight.current=false;}
  };
  useEffect(() => {
    let disposed = false; let mounted = false; let restored = false;
    const stops: Array<() => void> = [];
    const c = new HtmlController(view, next => {
      if (disposed) return;
      stateRef.current=next; setState(next);
      const firstReady=(next.state==='ready' || next.state==='empty') && !restored;
      if(!firstReady)callbacks.current.onState(next);
      if ((next.state === 'ready' || next.state === 'empty') && !restored) {
        restored = true;
        void (initialLocation ? c.locate(initialLocation).catch(async e => {
          if (readerError(e).code !== 'anchor_missing') throw e;
          setError('anchor_missing');
          const surviving=fallbackHeadings.find(key=>next.headings.some(h=>(h.authoredId ?? h.key)===key));
          return c.locate({...initialLocation, headingId: surviving ?? null, offset: surviving ? 0 : initialLocation.offset});
        }) : Promise.resolve(c.location)).then(location => {
          callbacks.current.onLocation(location); callbacks.current.onState(next); return viewport();
        }).catch(report);
      }
    });
    controller.current = c;
    const handle: HtmlHandle = {
      capture: async () => {const location = await c.capture(); callbacks.current.onLocation(location); return location;},
      locate: async location => {const actual = await c.locate(location);clearNavigationError(); callbacks.current.onLocation(actual); return actual;},
      reload,
      find: async (query, backwards = false) => {
        const before=await c.capture();
        const result=await c.run(r=>htmlNative.find(r,query,backwards));
        if(!result || !validHtmlLocation(result.location) || !Number.isSafeInteger(result.count) || result.count<0 || !Number.isSafeInteger(result.current) || result.current<0 || result.current>result.count)
          throw {code:'html_view_unavailable',message:'Invalid HTML Find response'};
        if(result.count && callbacks.current.onPassage)callbacks.current.onPassage(before,result.location,`find:${query}:${result.current}`);
        else callbacks.current.onLocation(result.location);
        return result;
      },
      hide: () => viewport(false),
      details: async () => {await viewport(false);setDetails(true);},
      focus: async () => {try {await viewport();await c.run(r=>htmlNative.focus(r));}catch(e){report(e);throw e;}},
    };
    register(handle);
    const subscribe = async <T,>(name: string, handler: (payload: T) => void) => {
      const stop = await listen<T>(name, ({payload}) => {if (!disposed) handler(payload);});
      if (disposed) stop(); else stops.push(stop);
    };
    const owns = (p: {viewToken: string; generation: number}) => p.viewToken === view.viewToken && p.generation === view.generation;
    void (async () => {
      await Promise.all([
        subscribe<HtmlState>('html:view_state', p => c.accept(p)),
        subscribe<HtmlState>('html:location_changed', p => {if(c.accept(p)) callbacks.current.onLocation(p.location);}),
        subscribe<{viewToken:string;generation:number;navigationId:string;location:HtmlLocation}>('html:link_activated', p => {
          if (!owns(p) || !visible.current) return;
          void c.run(() => htmlNative.link(c.owner, p.navigationId)).then(async link => {
            const location = await c.capture(); callbacks.current.onLocation(location);
            if (link.kind === 'anchor') {
              const actual=await c.locate({...location, headingId: link.anchor || null, offset:0, scrollTop:0, scrollLeft:0});
              clearNavigationError();callbacks.current.onPassage?.(location,actual,link.anchor ?? '');
            } else if (link.kind === 'access_required') {await viewport(false); setAccess(link);}
            else await callbacks.current.onLink(link);
          }).catch(report);
        }),
        subscribe<{viewToken:string;generation:number;key:string;shift:boolean}>('html:shortcut', p => {if(owns(p) && visible.current) callbacks.current.onShortcut(p.key,p.shift);}),
        subscribe('html:viewport_invalidated', () => {if(mounted) void viewport().catch(report);}),
        // Native window focus owns visibility. DOM blur also occurs when focus
        // transfers into the isolated child WebView and must not hide it.
        subscribe('tauri://focus', () => {focused.current=true;if(mounted)void viewport().catch(report);}),
        subscribe('tauri://blur', () => {focused.current=false;if(mounted)void viewport(false).catch(report);})
      ]);
      if (disposed) return;
      const b = bounds(); if (!b) throw {code:'invalid_viewport',message:'No valid reading viewport'};
      const result = await c.run(r => htmlNative.mount(r,b,false,baseline)); mounted = true; mountedRef.current=true; if(!c.accept(result) && !stateRef.current)throw {code:'html_view_unavailable',message:'Invalid HTML state response'};
    })().catch(report);
    const poll = setInterval(() => {
      if (!disposed && mounted && activeRef.current) void c.run(() => htmlNative.state(c.owner)).then(s => c.accept(s)).catch(report);
    }, 1500);
    return () => {disposed = true; mountedRef.current=false; clearInterval(poll); stops.forEach(stop => stop()); register(null); void c.dispose().catch(() => {}); if(controller.current===c) controller.current=null;};
  }, [view.viewToken]);
  useLayoutEffect(() => {
    const c = controller.current;
    if (!c) return;
    if (!active) void c.capture().then(location => callbacks.current.onLocation(location)).catch(() => {});
    void viewport().catch(report);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {void viewport().catch(report);}) : null;
    if(region.current) observer?.observe(region.current);
    return () => {observer?.disconnect();};
  }, [active, blocked, details, access, picker, state?.state]);
  useEffect(()=>{
    const key=JSON.stringify(baseline);
    if(key===baselineKey.current)return;
    baselineKey.current=key;
    const timer=setTimeout(()=>{if(stateRef.current?.state==='ready' || stateRef.current?.state==='empty')void reload();},300);
    return()=>clearTimeout(timer);
  },[baseline.font,baseline.size,baseline.lineHeight]);
  async function choose(issueId?: string) {
    const c = controller.current; if (!c) return;
    await viewport(false); setPicker(true);
    try {const next = issueId ? await htmlNative.resource(c.owner,issueId) : await htmlNative.resourceFolder(c.owner); if(next) {c.accept(next); setError('resources_changed');}}
    catch(e) {report(e);} finally {setPicker(false);}
  }
  const ready = state?.state === 'ready' || state?.state === 'empty';
  return <section className="html-view" hidden={!active} aria-label={view.name}>
    <div className="html-metadata"><span>{t(locale,'htmlMetadata')}</span><span>{t(locale,'javascriptOff')}</span>
      <label>{t(locale,'htmlZoom')} <select value={state?.location.zoom ?? initialLocation?.zoom ?? 1} disabled={!ready} onChange={e => {
        const requestedZoom=Number(e.target.value);const c=controller.current;if(c) void c.capture().then(l => c.locate({...l,zoom:requestedZoom})).then(l => {callbacks.current.onLocation(l); return htmlNative.state(c!.owner);}).then(s => c!.accept(s)).catch(report);
      }}>{![.5,.75,1,1.25,1.5,2,3].includes(state?.location.zoom ?? initialLocation?.zoom ?? 1) && <option value={state?.location.zoom ?? initialLocation?.zoom}>{Math.round((state?.location.zoom ?? initialLocation?.zoom ?? 1)*100)}%</option>}{[.5,.75,1,1.25,1.5,2,3].map(z=><option key={z} value={z}>{Math.round(z*100)}%</option>)}</select></label>
    </div>
    {(error || state?.reasonCode || state?.issues.length) ? <div className="notice" role="status">
      <span>{error ? errorText(locale,error) : state?.reasonCode ? errorText(locale,state.reasonCode) : t(locale,state?.issues.some(i=>['css','stylesheet'].includes(i.kind))?'htmlStyleWarning':state?.issues.some(i=>i.kind==='image')?'htmlImageWarning':'htmlResourceWarning')}</span>
      <button type="button" onClick={async () => {await viewport(false);setDetails(true);}}>{t(locale,'viewDetails')}</button>
      <button type="button" onClick={() => void reload()}>{t(locale,'reload')}</button>
    </div> : null}
    <div className="html-content">
    <div ref={region} className="html-native-region" tabIndex={ready ? 0 : -1} aria-label={t(locale,'htmlSurface')} onFocus={() => {
      const c=controller.current;if(c && visible.current && ready) void c.run(r=>htmlNative.focus(r)).catch(report);
    }}>
      {!ready && <div className="error-state" role={state?.state==='failed' || error ? 'alert' : 'status'}>
        {state?.state==='failed' || error ? errorText(locale,error ?? state?.reasonCode ?? 'html_render_failed') : t(locale,'openingHtml')}
        {(state?.state==='failed' || error) && <><button onClick={() => void reload()}>{t(locale,'retry')}</button><button onClick={onClose}>{t(locale,'closeTab')}</button></>}
      </div>}
      {state?.state==='empty' && <p role="status">{t(locale,'htmlEmpty')}</p>}
    </div>
    {outlineOpen && <nav className="html-outline" aria-label={t(locale,'outline')}>
      {!state?.headings.length && <p role="status">{t(locale,'outlineEmpty')}</p>}
      {state?.headings.map(h=><button type="button" key={h.key} onClick={() => {
        const c=controller.current;if(c) void c.capture().then(async before=>{const after=await c.locate({...before,headingId:h.authoredId ?? h.key,offset:0});clearNavigationError();callbacks.current.onPassage?.(before,after,h.authoredId ?? h.key);}).catch(report);
      }}>{h.text}</button>)}
    </nav>}
    </div>
    {details && <WorkspaceDialog title={t(locale,'viewDetails')} closeLabel={t(locale,'closeSurface')} onClose={() => setDetails(false)}>
      <p className="selectable-path" tabIndex={0}>{view.displayPath}</p><p>{t(locale,'htmlMetadata')} · {t(locale,'javascriptOff')}</p><p>{t(locale,'htmlScriptDetail')}</p>
      <h3>{t(locale,'resourceIssues')}</h3>
      {!state?.issues.length && <p>{t(locale,'noResourceIssues')}</p>}
      <ul>{state?.issues.map(i=><li key={i.id}><span className="selectable-path">{i.declaredUrl}</span> — {errorText(locale,i.reason)}
        {['outside_grant','denied','html_denied'].includes(i.reason) && <button disabled={picker} onClick={() => void choose(i.id)}>{t(locale,'chooseResource')}</button>}</li>)}</ul>
      <p>{t(locale,'resourceFolderDetail')}</p><button disabled={picker} onClick={() => void choose()}>{t(locale,'chooseResourceFolder')}</button>
      <button onClick={() => {setDetails(false);void reload();}}>{t(locale,'reload')}</button>
    </WorkspaceDialog>}
    {access && <WorkspaceDialog title={t(locale,'htmlAccessRequired')} closeLabel={t(locale,'cancel')} onClose={() => setAccess(null)}>
      <p className="selectable-path" tabIndex={0}>{access.requestedPath}</p><p>{t(locale,'htmlAccessDetail')}</p>
      <button autoFocus onClick={() => setAccess(null)}>{t(locale,'cancel')}</button>
      <button disabled={picker} onClick={async () => {const c=controller.current;if(!c || !access.accessId)return;setPicker(true);try{
        const selected=await htmlNative.chooseLink(c.owner,access.accessId);if(selected){await callbacks.current.onLink({...access,kind:selected.view.kind==='markdown'?'document':selected.view.kind,fileId:selected.view.fileId,anchor:selected.anchor},selected.view);setAccess(null);}
      }catch(e){report(e);}finally{setPicker(false);}}}>{t(locale,'htmlChooseFile')}</button>
    </WorkspaceDialog>}
  </section>;
}
