// @vitest-environment jsdom
import { StrictMode, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { useSettingsOwner } from '../../src/app/useSettingsOwner';
import type { Preferences, SettingsSnapshot } from '../../src/app/settings-contract';
const host=vi.hoisted(()=>({listeners:new Map<number,{name:string;handler:Function}>(),next:0,hold:false,releases:[] as Array<()=>void>,getWorkspace:vi.fn(),publish:vi.fn(),acknowledge:vi.fn(),general:vi.fn(),workspace:vi.fn(),checkpoint:vi.fn(),focus:vi.fn(),opening:vi.fn()}));
vi.mock('@tauri-apps/api/core',()=>({isTauri:()=>true,invoke:vi.fn()}));
vi.mock('@tauri-apps/api/event',()=>({listen:vi.fn((name:string,handler:Function)=>{
 const id=++host.next;host.listeners.set(id,{name,handler});const stop=()=>{host.listeners.delete(id);};
 return host.hold?new Promise<()=>void>(resolve=>host.releases.push(()=>resolve(stop))):Promise.resolve(stop);
})}));
vi.mock('../../src/app/settings-contract',async original=>({...await original<typeof import('../../src/app/settings-contract')>(),settingsApi:host}));
const values:Preferences={language:'en',appearance:'system',readingFont:'roboto',readingSize:16,readingLineHeight:1.6,readingWidth:760,documentsAndImagesOnly:true};
const snapshot:SettingsSnapshot={revision:2,activation:0,group:'General',ownerAvailable:false,values,requestId:null,persistence:'saved',retryPatch:null,nativeThemeFailed:false};
function Fixture(){useSettingsOwner(values,true,host);return null;}
afterEach(async()=>{cleanup();await act(async()=>{host.releases.splice(0).forEach(done=>done());});expect(host.listeners.size).toBe(0);host.hold=false;vi.resetAllMocks();});
it('ignores an initial native preference reply that settles after its owner unmounts',async()=>{
 let resolve!: (value:SettingsSnapshot)=>void;host.getWorkspace.mockReturnValueOnce(new Promise(done=>{resolve=done;}));
 const view=render(<Fixture/>);await waitFor(()=>expect(host.getWorkspace).toHaveBeenCalledOnce());view.unmount();
 await act(async()=>resolve(snapshot));
 expect(host.general).not.toHaveBeenCalled();expect(host.publish).not.toHaveBeenCalled();
});
it('cleans a pending StrictMode registration without deleting the current owner listeners',async()=>{
 host.hold=true;host.getWorkspace.mockResolvedValue(snapshot);host.publish.mockResolvedValue({...snapshot,ownerAvailable:true});
 const view=render(<StrictMode><Fixture/></StrictMode>);
 await act(async()=>{host.releases.splice(0).forEach(done=>done());});
 // The disposed StrictMode effect stops its first registration; the live effect proceeds sequentially.
 for(let i=0;i<4;i++)await act(async()=>{host.releases.splice(0).forEach(done=>done());});
 await waitFor(()=>expect(host.publish).toHaveBeenCalledOnce());expect(host.listeners.size).toBe(4);
 const callbacks=[...host.listeners.values()];view.unmount();expect(host.listeners.size).toBe(0);
 host.general.mockClear();host.focus.mockClear();host.opening.mockClear();
 await act(async()=>{for(const {name,handler}of callbacks){if(name==='settings:state')handler({payload:snapshot});else if(name==='settings:closed'||name==='settings:opening')handler({payload:null});}});
 expect(host.general).not.toHaveBeenCalled();expect(host.focus).not.toHaveBeenCalled();expect(host.opening).not.toHaveBeenCalled();
});

it('does not send layout fields or repeatedly publish to legacy native hosts',async()=>{
 host.getWorkspace.mockResolvedValue(snapshot);host.publish.mockResolvedValue({...snapshot,ownerAvailable:true});
 function LayoutFixture(){useSettingsOwner({...values,workspaceLayout:'margin'},true,host);return null;}
 render(<LayoutFixture/>);
 await waitFor(()=>expect(host.publish).toHaveBeenCalledOnce());
 expect(host.publish).toHaveBeenCalledWith(snapshot.revision,values);
 const state=[...host.listeners.values()].find(item=>item.name==='settings:state')!;
 await act(async()=>state.handler({payload:{...snapshot,ownerAvailable:true}}));
 expect(host.publish).toHaveBeenCalledOnce();
});

it('applies a supported layout immediately and acknowledges only its completed checkpoint; failure retries retain it',async()=>{
 const initial={...snapshot,revision:0,values:{...values,workspaceLayout:'margin' as const}};
 host.getWorkspace.mockResolvedValue(initial);
 host.publish.mockResolvedValue({...initial,revision:1,ownerAvailable:true});
 host.acknowledge.mockImplementation(async(requestId,revision,persistence)=>({...initial,revision,requestId,persistence,
  ownerAvailable:true,values:{...values,workspaceLayout:'atlas'},retryPatch:persistence==='failed'?{workspaceLayout:'atlas'}:null}));
 let fail!:(error:Error)=>void;
 host.checkpoint.mockImplementationOnce(()=>new Promise((_,reject)=>{fail=reject;})).mockResolvedValueOnce(undefined);
 function Supported(){const [layout,setLayout]=useState<'margin'|'folio'|'atlas'>('margin');
  useSettingsOwner({...values,workspaceLayout:layout},true,{...host,workspace:patch=>{host.workspace(patch);if(patch.workspaceLayout)setLayout(patch.workspaceLayout);}});
  return <span>{layout}</span>;}
 const view=render(<Supported/>);
 await waitFor(()=>expect(host.publish).toHaveBeenCalledOnce());
 expect(host.publish).toHaveBeenCalledWith(0,initial.values);
 const intent=[...host.listeners.values()].find(item=>item.name==='settings:intent')!;
 await act(async()=>intent.handler({payload:{requestId:'layout-1',revision:2,patch:{workspaceLayout:'atlas'}}}));
 expect(view.container.textContent).toBe('atlas');
 expect(host.checkpoint).toHaveBeenCalledOnce();expect(host.acknowledge).not.toHaveBeenCalled();
 await act(async()=>fail(new Error('session write failed')));
 await waitFor(()=>expect(host.acknowledge).toHaveBeenCalledWith('layout-1',2,'failed'));
 expect(view.container.textContent).toBe('atlas');
 await act(async()=>intent.handler({payload:{requestId:'layout-retry',revision:3,patch:{workspaceLayout:'atlas'}}}));
 await waitFor(()=>expect(host.acknowledge).toHaveBeenCalledWith('layout-retry',3,'saved'));
 expect(view.container.textContent).toBe('atlas');
});
