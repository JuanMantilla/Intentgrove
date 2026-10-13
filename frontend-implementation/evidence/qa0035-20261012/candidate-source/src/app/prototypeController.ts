import {prototypeNative, type PrototypeStatus} from './prototypeNative';
import type {PrototypeDocument} from './documentView';
import {validLocalView,validPrototypeView} from './documentBoundary';
/** Lifecycle owner survives tab switching. Full restore creates a new owner; no playback state exists. */
export class PrototypeController {
  private sequence=0;
  private closed=false;
  private queue:Promise<unknown>=Promise.resolve();
  constructor(public view:PrototypeDocument) {}
  get owner(){return {viewToken:this.view.viewToken,generation:this.view.generation};}
  async reload():Promise<PrototypeStatus> {
    const next=this.queue.catch(()=>{}).then(async()=>{
      if(this.closed) throw {code:'stale_view'};
      const result=await prototypeNative.reload(this.owner,++this.sequence);
      if(this.closed) throw {code:'stale_view'};
      if(!result || !validLocalView(result.view) || !validPrototypeView(result.view)
        || result.view.viewToken!==this.view.viewToken || result.view.identityKey!==this.view.identityKey
        || result.view.generation<this.view.generation || typeof result.changed!=='boolean'
        || !(result.reloadError===null || (typeof result.reloadError.code==='string' && typeof result.reloadError.message==='string')))
        throw {code:'prototype_invalid',message:'Invalid prototype reload response'};
      this.view=result.view; return result;
    });
    this.queue=next; return next;
  }
  async dispose(releaseGrant=false) {
    if(this.closed)return;
    this.closed=true;
    // Reload may be running: native close revokes its owner, preventing late publication.
    await prototypeNative.dispose(this.owner,releaseGrant);
  }
}
