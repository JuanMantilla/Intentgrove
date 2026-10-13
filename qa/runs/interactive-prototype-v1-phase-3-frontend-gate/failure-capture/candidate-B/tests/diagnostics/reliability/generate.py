"""Generate trace-only copies from the current canonical tests; preserve every original assertion/deadline."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[3];out=root/'tests/diagnostics/reliability/generated';out.mkdir(exist_ok=True)
manifest={}
for name in ['workspace-handoff','close-edit']:
 source=root/f'tests/ui/{name}.test.tsx';s=source.read_text();manifest[str(source.relative_to(root))]=hashlib.sha256(source.read_bytes()).hexdigest()
 s=s.replace('"../../src/','"../../../../src/')
 s+='\n' # All changes below add trace calls or replace cleanup with the same cleanup plus ordered measurements.
 s=s.replace('import App from', 'import {begin, phase, registered, removed, finish} from "../trace";\nimport App from',1)
 s=s.replace('  mocks.listeners[name] = listener;', '  registered(name,listener); mocks.listeners[name] = listener;')
 s=s.replace('if (mocks.listeners[name] === listener) delete mocks.listeners[name];','removed(name,listener); if (mocks.listeners[name] === listener) delete mocks.listeners[name];')
 s=s.replace('beforeEach(() => {','beforeEach(() => {\n  begin(mocks);',1)
 old='afterEach(() => { cleanup(); getAppearance().applyPreference("system"); });' if name=='workspace-handoff' else 'afterEach(() => { cleanup(); vi.restoreAllMocks(); });'
 new='afterEach(async () => { await finish(cleanup, act); '+('getAppearance().applyPreference("system");' if name=='workspace-handoff' else 'vi.restoreAllMocks();')+' });'
 assert old in s;s=s.replace(old,new)
 s=s.replace('  render(<App />);','  phase("setup:start"); render(<App />); phase("setup:rendered");')
 s=s.replace('fireEvent.click(await screen.findByTitle("a.md"));','fireEvent.click(await screen.findByTitle("a.md")); phase("setup:document-clicked");')
 s=s.replace('  await screen.findByRole("button", { name: "Edit section “One”" });','  await screen.findByRole("button", { name: "Edit section “One”" }); phase("setup:section-ready");')
 s=s.replace('await waitFor(() => expect(document.querySelector(".cm-editor")).toBeTruthy());','await waitFor(() => expect(document.querySelector(".cm-editor")).toBeTruthy()); phase("setup:editor-ready");')
 s=s.replace('    mocks.chooseSectionSaveAs.mockResolvedValue(null);','    mocks.chooseSectionSaveAs.mockResolvedValue(null); phase("save-as:before-click");')
 s=s.replace('    await waitFor(() => expect(mocks.chooseSectionSaveAs).toHaveBeenCalledOnce());','    await waitFor(() => expect(mocks.chooseSectionSaveAs).toHaveBeenCalledOnce()); phase("save-as:invoked");')
 s=s.replace('  const change = await screen.findByRole("button", { name: "Change and checkpoint" });','  phase("setup:editor-ready"); const change = await screen.findByRole("button", { name: "Change and checkpoint" });')
 s=s.replace('  await act(async () => fireEvent.click(change));','  await act(async () => fireEvent.click(change)); phase("setup:checkpoint-dispatched");')
 s=s.replace('  return screen.findByRole("alertdialog", { name: "Keep this section edit?" });','  phase("close:requested:"+route); const dialog=await screen.findByRole("alertdialog", { name: "Keep this section edit?" }); phase("close:dialog-ready"); return dialog;')
 s=s.replace('      fireEvent.click(within(dialog).getByRole("button", { name: choice }));','      phase("close:before-choice:"+choice); fireEvent.click(within(dialog).getByRole("button", { name: choice })); phase("close:clicked:"+choice);')
 s=s.replace('      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());','      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull()); phase("close:dialog-dismissed");')
 # Negative control holds the real awaited begin-edit adapter. No original assertion is changed.
 s=s.replace('async function '+('edit' if name=='workspace-handoff' else 'setup')+'() {', 'async function '+('edit' if name=='workspace-handoff' else 'setup')+'() {\n  if(process.env.INTENTGROVE_HOLD_EDIT==="1") mocks.beginSectionEdit.mockImplementation(()=>new Promise(()=>{}));')
 (out/f'{name}.diagnostic.tsx').write_text(s)
(out/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
