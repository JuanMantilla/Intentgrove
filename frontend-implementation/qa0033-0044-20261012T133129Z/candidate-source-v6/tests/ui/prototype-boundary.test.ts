import {expect,it,vi} from 'vitest';
import {isPrototypeDocument,validLocalView} from '../../src/app/documentBoundary';
import {api} from '../../src/app/api';
import type {PrototypeDocument} from '../../src/app/documentView';
const invoke=vi.hoisted(()=>vi.fn());vi.mock('@tauri-apps/api/core',()=>({invoke}));
export const prototypeView:PrototypeDocument={fileId:'a',identityKey:'1:2',name:'a.igproto',displayPath:'/tmp/a.igproto',diskVersion:'a'.repeat(64),viewToken:'token-a',generation:1,kind:'prototype',extension:'igproto',bytes:6022,prototype:{title:null,entryScene:'login',viewport:{width:390,height:844},formatVersion:1,sceneCount:3,readOnly:true,restoreToEntry:true}};
it.each(['a.igproto','A.IGPROTO'])( 'recognizes %s',name=>expect(isPrototypeDocument(name)).toBe(true));
it.each(['a.zip','a.igproto.md','a.igproto?query','a.html'])( 'preserves unrelated type %s',name=>expect(isPrototypeDocument(name)).toBe(false));
it('accepts safe validated metadata',()=>expect(validLocalView(prototypeView)).toBe(true));
it.each([{kind:'markdown',viewToken:null},{viewToken:null},{prototype:undefined},{prototype:{...prototypeView.prototype,readOnly:false}},{prototype:{...prototypeView.prototype,formatVersion:2}},{diskVersion:'unvalidated'}])('rejects malformed or fallback descriptor %#',change=>expect(validLocalView({...prototypeView,...change} as unknown as PrototypeDocument)).toBe(false));
it('rejects prototype bytes through privileged Markdown read/refresh/search APIs',async()=>{
 const doc={fileId:'a',identityKey:'1:2',name:'a.igproto',displayPath:'/tmp/a.igproto',content:'untrusted',diskVersion:'v1'};
 invoke.mockResolvedValue(doc);await expect(api.readDocument({fileId:'a'})).rejects.toMatchObject({code:'prototype_invalid'});await expect(api.getConfirmedDocument('a','v1',1)).rejects.toMatchObject({code:'prototype_invalid'});
 invoke.mockResolvedValue({document:doc,line:1,ordinal:null,changed:false,matchMoved:false});await expect(api.openSearchHit('job','hit')).rejects.toMatchObject({code:'prototype_invalid'});
});
