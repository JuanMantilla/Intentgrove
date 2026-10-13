import {invoke} from '@tauri-apps/api/core';
import type {LocalView} from './documentView';
export interface PrototypeOwner {viewToken:string;generation:number}
export interface PrototypeStatus {view:LocalView;changed:boolean;reloadError:null|{code:string;message:string;package_diagnostics?:unknown}}
export const prototypeNative = {
  releaseGrant:(fileId:string)=>invoke<void>('release_prototype_grant',{fileId}),
  status:(owner:PrototypeOwner)=>invoke<PrototypeStatus>('get_prototype_document',{...owner}),
  reload:(owner:PrototypeOwner,requestId:number)=>invoke<PrototypeStatus>('reload_prototype_document',{...owner,requestId}),
  dispose:(owner:PrototypeOwner,releaseGrant=false)=>invoke<boolean>('dispose_prototype_document',{...owner,releaseGrant}),
};
