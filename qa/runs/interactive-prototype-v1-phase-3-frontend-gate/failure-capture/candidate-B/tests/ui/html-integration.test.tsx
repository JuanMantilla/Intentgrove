import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
// Real App + HtmlView, actual native shapes, mocked Tauri transport. No native pixels claimed.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../src/app/App';
import type { LocalView, HtmlState } from '../../src/app/htmlNative';
const mocks=vi.hoisted(()=>({listNativeEntries:vi.fn(),acceptNativeEntry:vi.fn(),selectFile:vi.fn(),openImage:vi.fn(),selectRoot:vi.fn(),listEntries:vi.fn(),readDocument:vi.fn(),listEditSections:vi.fn(),loadSectionRecovery:vi.fn(),open:vi.fn(),mount:vi.fn(),viewport:vi.fn(),dispose:vi.fn(),capture:vi.fn(),location:vi.fn(),state:vi.fn(),link:vi.fn(),cancelOpen:vi.fn(),focus:vi.fn(),find:vi.fn(),reload:vi.fn()}));
const events=vi.hoisted(()=>new Map<string,Set<(event:{payload:unknown})=>void>>());
vi.mock('../../src/app/api',async original=>({...await original<typeof import('../../src/app/api')>(),api:mocks}));
vi.mock('../../src/app/htmlNative',()=>({htmlNative:mocks}));
vi.mock('@tauri-apps/api/window',()=>({getCurrentWindow:()=>({isFocused:async()=>true})}));
vi.mock('@tauri-apps/api/event',()=>({listen:vi.fn(async(name,callback)=>{if(!events.has(name))events.set(name,new Set());events.get(name)!.add(callback);return()=>events.get(name)?.delete(callback);})}));
const layoutChange=vi.hoisted(()=>({current:null as null|((values:{workspaceLayout:"margin"|"folio"|"atlas"})=>void)}));
vi.mock('../../src/app/useSettingsOwner',()=>({useSettingsOwner:(_values:unknown,_ready:boolean,handlers:{workspace:NonNullable<typeof layoutChange.current>})=>{layoutChange.current=handlers.workspace;}}));
const location={headingId:'start',offset:0,scrollTop:0,scrollLeft:0,zoom:1};
function view(name:string):LocalView{return {fileId:name,identityKey:`identity:${name}`,diskVersion:'v1',name,displayPath:`/tmp/fixture/${name}`,kind:'html',viewToken:`token:${name}`,generation:1,bytes:100,extension:name.split('.').at(-1)!};}
function state(token:string,requestId=1):HtmlState{return {viewToken:token,generation:1,requestId,revision:1,state:'ready',reasonCode:null,headings:[{key:'start',authoredId:'start',level:1,text:'Authored heading'}],issues:[],location};}
beforeEach(()=>{vi.clearAllMocks();events.clear();localStorage.clear();
 mocks.listNativeEntries.mockResolvedValue([]);
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({x:20,y:120,width:600,height:400,left:20,top:120,right:620,bottom:520,toJSON(){}});
 mocks.selectRoot.mockResolvedValue({id:'root',name:'fixture',displayPath:'/tmp/fixture',generation:1});
 mocks.listEntries.mockResolvedValue({entries:[{name:'page.html',kind:'html'},{name:'dark.htm',kind:'html'},{name:'notes.md',kind:'markdown'}],nextOffset:null});
 mocks.open.mockImplementation(async target=>view(target.fileId ?? target.segments.at(-1)));
 mocks.mount.mockImplementation(async owner=>state(owner.viewToken,owner.requestId));mocks.state.mockImplementation(async owner=>state(owner.viewToken));
 mocks.viewport.mockResolvedValue(undefined);mocks.dispose.mockResolvedValue(true);mocks.cancelOpen.mockResolvedValue(true);mocks.focus.mockResolvedValue(undefined);
 mocks.capture.mockResolvedValue({location});mocks.location.mockImplementation(async(_owner,l)=>({location:l}));mocks.find.mockResolvedValue({location,count:2,current:1});
 mocks.readDocument.mockResolvedValue({fileId:'notes.md',identityKey:'md',name:'notes.md',displayPath:'/tmp/fixture/notes.md',diskVersion:'v1',content:'# Notes\n\nOriginal Markdown'});
 mocks.listEditSections.mockResolvedValue({diskVersion:'v1',sections:[]});mocks.loadSectionRecovery.mockResolvedValue(null);
});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
async function start(){render(<App/>);fireEvent.click(projectAction("Open folder"));await screen.findByTitle('page.html');}
async function openHtml(){await start();fireEvent.click(screen.getByTitle('page.html'));await waitFor(()=>expect(mocks.viewport).toHaveBeenCalled());await waitFor(()=>expect(screen.getByRole('button',{name:'Outline'}).hasAttribute('disabled')).toBe(false));}
function emit(name:string,payload:unknown){for(const handler of events.get(name)??[])handler({payload});}
it('opens HTML via the real local-view adapter and never asks Markdown editing/recovery to read it',async()=>{await openHtml();expect(mocks.open).toHaveBeenCalledWith({rootId:'root',segments:['page.html']},expect.any(String));expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');expect(mocks.readDocument).not.toHaveBeenCalled();expect(mocks.listEditSections).not.toHaveBeenCalled();expect(mocks.loadSectionRecovery).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Edit section'})).toBeNull();expect(screen.getByText('JavaScript off')).toBeTruthy();});
it('deduplicates identity and disposes an unused acquired token',async()=>{await openHtml();mocks.open.mockResolvedValue({...view('page.html'),fileId:'new-grant',viewToken:'unused'});fireEvent.click(screen.getByTitle('page.html'));await waitFor(()=>expect(mocks.dispose).toHaveBeenCalledWith({viewToken:'unused',generation:1}));expect(screen.getAllByRole('tab')).toHaveLength(1);});
it('commits a ready HTML link and traverses back without duplicate tabs',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'html',fileId:'dark.htm',anchor:'end',requestedPath:null,accessId:null,reason:null});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'n',location}));await waitFor(()=>expect(screen.getByRole('tab',{name:'dark.htm'}).getAttribute('aria-selected')).toBe('true'));fireEvent.click(screen.getByRole('button',{name:'Back'}));await waitFor(()=>expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true'));expect(screen.getAllByRole('tab')).toHaveLength(2);expect(screen.getByRole('button',{name:'Forward'}).hasAttribute('disabled')).toBe(false);});
it('failed HTML destination rendering retains the source and forward branch',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'html',fileId:'dark.htm',anchor:null,requestedPath:null,accessId:null,reason:null});mocks.mount.mockImplementation(async owner=>({...state(owner.viewToken),state:'failed',reasonCode:'html_render_failed'}));await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'bad',location}));await screen.findAllByText('The HTML document could not be rendered.');expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(true);});
it('keeps the source when a fragment fails and does not commit a passage visit',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'anchor',fileId:null,anchor:'absent',requestedPath:null,accessId:null,reason:null});mocks.location.mockRejectedValue({code:'anchor_missing',message:'Missing ID'});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'fragment',location}));await screen.findByText('The requested section was not found.');expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(true);});
it('renders File details as a successful visit without automatically launching anything',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'details',fileId:'other.txt',anchor:null,requestedPath:null,accessId:null,reason:null});mocks.open.mockResolvedValue({...view('other.txt'),kind:'details',viewToken:null});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'details',location}));await screen.findByText('Preview unavailable');expect(screen.getByRole('button',{name:'Open in default app'}).hasAttribute('disabled')).toBe(true);expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(false);});
it('uses native Find acknowledgments for the visible result count',async()=>{await openHtml();await act(async()=>emit('html:shortcut',{viewToken:'token:page.html',generation:1,key:'f',shift:false}));fireEvent.change(screen.getByRole('searchbox',{name:'Find in document'}),{target:{value:'visible'}});await waitFor(()=>expect(mocks.find).toHaveBeenCalled());expect(await screen.findByText('1 of 2')).toBeTruthy();});

it('keeps the source and history when a destination HTML fragment is missing',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'html',fileId:'dark.htm',anchor:'absent',requestedPath:null,accessId:null,reason:null});mocks.location.mockRejectedValue({code:'anchor_missing',message:'Missing ID'});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'cross-fragment',location}));await screen.findByText('The requested section was not found.');expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(true);});
it('restores the native source surface after a Markdown destination read fails',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'document',fileId:'notes.md',anchor:null,requestedPath:null,accessId:null,reason:null});mocks.open.mockResolvedValue({...view('notes.md'),kind:'markdown',viewToken:null});mocks.readDocument.mockRejectedValue({code:'missing',message:'Removed after resolution'});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'failed-markdown',location}));await waitFor(()=>expect(mocks.focus).toHaveBeenCalledWith(expect.objectContaining({viewToken:'token:page.html'})));expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(true);});

it('clears a failed-navigation notice only after a subsequent HTML destination succeeds',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'missing',fileId:null,anchor:null,requestedPath:null,accessId:null,reason:'missing'});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'missing',location}));await screen.findByText('This file is missing');mocks.link.mockResolvedValue({kind:'html',fileId:'dark.htm',anchor:null,requestedPath:null,accessId:null,reason:null});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'success',location}));await waitFor(()=>expect(screen.getByRole('tab',{name:'dark.htm'}).getAttribute('aria-selected')).toBe('true'));expect(screen.queryByText('This file is missing')).toBeNull();});
it('retains native source and explains a failed image destination',async()=>{await openHtml();mocks.link.mockResolvedValue({kind:'image',fileId:'pixel.png',anchor:null,requestedPath:null,accessId:null,reason:null});mocks.open.mockResolvedValue({...view('pixel.png'),kind:'image',viewToken:null});mocks.openImage.mockRejectedValue({code:'missing',message:'Removed image'});await act(async()=>emit('html:link_activated',{viewToken:'token:page.html',generation:1,navigationId:'image-failure',location}));await screen.findByText('This file is missing');await waitFor(()=>expect(mocks.focus).toHaveBeenCalledWith(expect.objectContaining({viewToken:'token:page.html'})));expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');expect(screen.getByRole('button',{name:'Back'}).hasAttribute('disabled')).toBe(true);});

it('rebinds an explicit HTML identity to a deliberately selected root without adding a tab',async()=>{mocks.selectFile.mockResolvedValue({id:'page.html',name:'page.html',displayPath:'/tmp/fixture/page.html',generation:1});await start();fireEvent.keyDown(window,{key:'o',metaKey:true});await waitFor(()=>expect(mocks.viewport).toHaveBeenCalled());mocks.open.mockResolvedValue({...view('page.html'),fileId:'root-file',viewToken:'root-view'});fireEvent.click(screen.getByTitle('page.html'));await waitFor(()=>expect(mocks.mount).toHaveBeenCalledWith(expect.objectContaining({viewToken:'root-view'}),expect.anything(),false,expect.anything()));expect(screen.getAllByRole('tab')).toHaveLength(1);expect(mocks.dispose).toHaveBeenCalledWith({viewToken:'token:page.html',generation:1});await waitFor(()=>expect(mocks.location).toHaveBeenCalledWith(expect.objectContaining({viewToken:'root-view'}),location));});

it('automatically opens an HTML file from a native drop using the existing isolated view boundary',async()=>{
 mocks.listNativeEntries.mockResolvedValue([{id:'html-drop',source:'drop',name:'page.html',displayPath:'/tmp/fixture/page.html',kind:'document',errorCode:null}]);
 mocks.acceptNativeEntry.mockImplementation(async()=>{mocks.listNativeEntries.mockResolvedValue([]);return {kind:'document',grant:{id:'page.html',name:'page.html',displayPath:'/tmp/fixture/page.html',generation:1}};});
 render(<App/>);
 await waitFor(()=>expect(mocks.mount).toHaveBeenCalled());
 expect(mocks.acceptNativeEntry).toHaveBeenCalledExactlyOnceWith('html-drop',true);
 expect(mocks.open).toHaveBeenCalledWith({fileId:'page.html'},expect.any(String));
 expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');
 expect(mocks.readDocument).not.toHaveBeenCalled();
});
it('automatically routes an image received from Finder to the image opener',async()=>{
 mocks.listNativeEntries.mockResolvedValue([{id:'image-finder',source:'finder',name:'pixel.png',displayPath:'/tmp/fixture/pixel.png',kind:'document',errorCode:null}]);
 mocks.acceptNativeEntry.mockImplementation(async()=>{mocks.listNativeEntries.mockResolvedValue([]);return {kind:'document',grant:{id:'pixel.png',name:'pixel.png',displayPath:'/tmp/fixture/pixel.png',generation:1}};});
 mocks.openImage.mockRejectedValue({code:'missing',message:'Removed after grant'});
 render(<App/>);
 await waitFor(()=>expect(mocks.openImage).toHaveBeenCalledWith({fileId:'pixel.png',explicitFile:true}));
 expect(await screen.findByText('This file is missing')).toBeTruthy();
 expect(mocks.readDocument).not.toHaveBeenCalled();
});

it('keeps the HTML surface visible beside wide Folio Projects and retains its owner on close/reopen',async()=>{
 await openHtml();
 act(()=>layoutChange.current!({workspaceLayout:'folio'}));
 const rail=document.querySelector<HTMLButtonElement>('.folio-rail button[aria-label="Projects"]')!;
 fireEvent.click(rail);
 await waitFor(()=>expect(mocks.viewport.mock.calls.at(-1)?.[2]).toBe(true));
 const mounts=mocks.mount.mock.calls.length;
 fireEvent.click(screen.getByRole('button',{name:'Close Projects sidebar'}));
 expect(document.activeElement).toBe(rail);
 fireEvent.click(rail);
 await waitFor(()=>expect(mocks.viewport.mock.calls.at(-1)?.[2]).toBe(true));
 expect(screen.getByRole('tab',{name:'page.html'}).getAttribute('aria-selected')).toBe('true');
 expect(mocks.mount).toHaveBeenCalledTimes(mounts);
 expect(mocks.dispose).not.toHaveBeenCalled();
});
