import type { LocalView, PrototypeDocument } from './documentView';
export const isPrototypeDocument = (name:string) => /\.igproto$/i.test(name);
export const isNativeDocument = (name:string) => /\.(?:html?|igproto)$/i.test(name);
export function validPrototypeView(view:LocalView): view is PrototypeDocument {
  const m=view?.prototype;
  return Boolean(view?.kind==='prototype' && isPrototypeDocument(view.name) && view.extension==='igproto'
    && view.viewToken && view.generation>0 && /^[a-f0-9]{64}$/.test(view.diskVersion)
    && m && m.readOnly===true && m.restoreToEntry===true && m.formatVersion===1
    && (m.title===null || typeof m.title==='string') && typeof m.entryScene==='string' && m.entryScene.length>0
    && Number.isInteger(m.sceneCount) && m.sceneCount>0 && m.sceneCount<=32
    && Number.isInteger(m.viewport?.width) && Number.isInteger(m.viewport?.height)
    && m.viewport.width>0 && m.viewport.height>0 && m.viewport.width<=4096 && m.viewport.height<=4096);
}
export function validLocalView(view:LocalView):boolean {
  return Boolean(view && ['markdown','image','html','prototype','details'].includes(view.kind)
    && ['fileId','identityKey','diskVersion','name','displayPath','extension'].every(key=>typeof view[key as keyof LocalView]==='string')
    && view.fileId && view.identityKey && Number.isSafeInteger(view.generation) && view.generation>=0
    && Number.isFinite(view.bytes) && view.bytes>=0
    && (view.kind==='prototype' ? validPrototypeView(view) : view.kind==='html'
      ? typeof view.viewToken==='string' && view.viewToken && view.generation>0 : view.viewToken===null)
    && (!isPrototypeDocument(view.name) || view.kind==='prototype'));
}
