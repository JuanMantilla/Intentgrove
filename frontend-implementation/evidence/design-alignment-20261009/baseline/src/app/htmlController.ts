import { htmlNative, type HtmlState, type HtmlRequest, type HtmlLocation, type LocalView } from './htmlNative';

export function validLocalView(view: LocalView): boolean {
  return Boolean(view && ['markdown', 'image', 'html', 'details'].includes(view.kind)
    && ['fileId', 'identityKey', 'diskVersion', 'name', 'displayPath', 'extension'].every(key => typeof view[key as keyof LocalView] === 'string')
    && view.fileId && view.identityKey && Number.isSafeInteger(view.generation) && view.generation >= 0
    && Number.isFinite(view.bytes) && view.bytes >= 0
    && (view.kind === 'html' ? typeof view.viewToken === 'string' && view.viewToken && view.generation > 0 : view.viewToken === null));
}
export function validHtmlView(view: LocalView): boolean {
  return validLocalView(view) && view.kind === 'html';
}
export function validHtmlLocation(location: HtmlLocation): boolean {
  return Boolean(location && (location.headingId === null || typeof location.headingId === 'string')
    && [location.offset, location.scrollTop, location.scrollLeft, location.zoom].every(Number.isFinite)
    && location.scrollTop >= 0 && location.zoom >= 0.5 && location.zoom <= 3);
}
/** One queue and request sequence per native owner. Inspection cannot supersede reload/mount. */
export class HtmlController {
  private sequence = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private closed = false;
  private revision = -1;
  location: HtmlLocation = { headingId: null, offset: 0, scrollTop: 0, scrollLeft: 0, zoom: 1 };
  constructor(readonly view: LocalView, private publish: (state: HtmlState) => void) {
    if (!validHtmlView(view)) throw new Error('invalid_html_response');
  }
  get owner() { return { viewToken: this.view.viewToken!, generation: this.view.generation }; }
  accept(state: HtmlState) {
    if (this.closed || !state || state.viewToken !== this.owner.viewToken || state.generation !== this.owner.generation
      || !Number.isSafeInteger(state.revision) || state.revision < this.revision
      || !['opening', 'ready', 'empty', 'failed'].includes(state.state)
      || !Number.isSafeInteger(state.requestId) || state.requestId < 0
      || !(state.reasonCode === null || typeof state.reasonCode === 'string')
      || !Array.isArray(state.headings) || state.headings.length > 1000
      || state.headings.some(h => !h || typeof h.key !== 'string' || typeof h.text !== 'string'
        || !(h.authoredId === null || typeof h.authoredId === 'string') || !Number.isInteger(h.level) || h.level < 1 || h.level > 6)
      || !Array.isArray(state.issues) || state.issues.length > 128
      || state.issues.some(i => !i || [i.id, i.declaredUrl, i.kind, i.reason].some(value => typeof value !== 'string'))
      || !validHtmlLocation(state.location)) return false;
    this.revision = state.revision; this.location = state.location; this.publish(state); return true;
  }
  run<T>(operation: (request: HtmlRequest) => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => {}).then(async () => {
      if (this.closed) throw { code: 'stale_view', message: 'View disposed' };
      const result = await operation({ ...this.owner, requestId: ++this.sequence });
      if (this.closed) throw { code: 'stale_view', message: 'View disposed' };
      return result;
    });
    this.queue = next; return next;
  }
  async capture() {
    const result = await this.run(request => htmlNative.capture(request));
    if (!result || !validHtmlLocation(result.location)) throw {code:'html_view_unavailable', message:'Invalid HTML location response'};
    this.location = result.location; return result.location;
  }
  async locate(location: HtmlLocation) {
    const result = await this.run(request => htmlNative.location(request, location));
    if (!result || !validHtmlLocation(result.location)) throw {code:'html_view_unavailable', message:'Invalid HTML location response'};
    this.location = result.location; return result.location;
  }
  async dispose() {
    if (this.closed) return;
    this.closed = true;
    // Revoke immediately; do not wait behind a hung inspection or picker.
    await htmlNative.dispose(this.owner);
  }
}
