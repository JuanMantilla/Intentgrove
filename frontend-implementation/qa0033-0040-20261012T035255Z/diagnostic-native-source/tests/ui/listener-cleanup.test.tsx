// @vitest-environment jsdom
// Actual App lifecycle, native subscription doubles with independent listener IDs.
import { StrictMode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import App from '../../src/app/App';
const host=vi.hoisted(()=>({next:0,listeners:new Map<number,string>(),reject:'',hold:false,releases:[] as Array<()=>void>}));
vi.mock('../../src/app/api',async original=>({...await original<typeof import('../../src/app/api')>(),api:{}}));
vi.mock('@tauri-apps/api/core',()=>({isTauri:()=>false,invoke:vi.fn()}));
vi.mock('@tauri-apps/api/event',()=>({listen:vi.fn((name:string)=>{
 if(name===host.reject)return Promise.reject(Error('controlled subscription refusal'));
 const id=++host.next;host.listeners.set(id,name);
 const stop=()=>{host.listeners.delete(id);};
 return host.hold?new Promise<()=>void>(resolve=>host.releases.push(()=>resolve(stop))):Promise.resolve(stop);
})}));
afterEach(async()=>{cleanup();await act(async()=>{host.releases.splice(0).forEach(done=>done());});host.listeners.clear();host.reject='';host.hold=false;vi.clearAllMocks();});
it('releases successful native subscriptions even when a sibling subscription rejects',async()=>{
 host.reject='refresh:directory_changed';const view=render(<App/>);
 await waitFor(()=>expect(host.listeners.size).toBeGreaterThan(0));
 await act(async()=>{await Promise.resolve();});view.unmount();
 expect([...host.listeners.values()]).toEqual([]);
});
it('releases late registrations from both StrictMode generations after unmount',async()=>{
 host.hold=true;const view=render(<StrictMode><App/></StrictMode>);
 expect(host.releases.length).toBeGreaterThan(0);view.unmount();
 await act(async()=>{host.releases.splice(0).forEach(done=>done());});
 expect([...host.listeners.values()]).toEqual([]);
});
