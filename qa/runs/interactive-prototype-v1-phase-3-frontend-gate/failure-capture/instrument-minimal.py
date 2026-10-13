from pathlib import Path
import shutil,difflib,json,hashlib
out=Path(__file__).resolve().parent;c=out/'candidate-recorder'
shutil.copy2(out/'recorder.ts',c/'qa-recorder.ts')
patches=[]
def edit(path,changes):
 p=c/path;old=p.read_text();s=old
 for a,b in changes:
  assert s.count(a)==1,(path,a,s.count(a))
  s=s.replace(a,b,1)
 p.write_text(s)
 patches.extend(difflib.unified_diff(old.splitlines(True),s.splitlines(True),fromfile=str(out/'candidate-D'/path),tofile=str(p)))
g='(globalThis as any).__fc'
edit('tests/ui/workspace-handoff.test.tsx',[
 ('import { projectAction', 'import {begin, mark, failure, end} from "../../qa-recorder";\nimport { projectAction'),
 ('beforeEach(() => {','beforeEach(() => {\n  begin(mocks);'),
 ('afterEach(() => { cleanup(); getAppearance().applyPreference("system"); });','afterEach((context) => { if(context.task.result?.state === "fail") failure(context.task.result.errors,23); cleanup(); getAppearance().applyPreference("system"); end(); });'),
 ('  render(<App />);','  mark(1); render(<App />); mark(2);'),
 ('  await screen.findByRole("button", { name: "Edit section “One”" });','  mark(20);\n  try { await screen.findByRole("button", { name: "Edit section “One”" }); mark(21); }\n  catch (error) { failure(error); throw error; }')])
edit('src/app/App.tsx',[
 ('    documentSelectionRef.current = adapter;',f'    {g}?.event(adapter ? 12 : 13,adapter?.fileId);\n    documentSelectionRef.current = adapter;'),
 ('useEffect(() => { activeIdRef.current = activeId; }, [activeId]);',f'useEffect(() => {{ {g}?.event(7,activeId); activeIdRef.current = activeId; }}, [activeId]);'),
 ('  const activeEdit = activeId ? edits[activeId] : undefined;',f'''  const activeEdit = activeId ? edits[activeId] : undefined;
  if ({g}) {g}.providers.app = () => ({{activeId, active, tabs, activeIdRef:activeIdRef.current,
    tabsRef:tabsRef.current, root, rootRef:rootRef.current, generation:generationRef.current, openSequence:openSequence.current,
    layout, documentPending, documentOpening, selectionPending, sessionReady, busy, notice, editingAvailable, sectionsByTab, sectionLayoutVersions,
    edits, activeEdit, enteringSection, enteringToken:enteringSectionRef.current, pendingRecoveries,
    documentSelection:documentSelectionRef.current, selectionAcquisition:selectionAcquisition.current,
    pendingDocumentSelection:pendingDocumentSelection.current, documentLoads:documentLoads.current,
    acquisitionTokenMatchesPending:selectionAcquisition.current?.token === documentPending?.token,
    selectionTokenMatchesAcquisition:pendingDocumentSelection.current?.loadToken === selectionAcquisition.current?.token,
    renderedMarkdown,paintedMarkdown:paintedMarkdown.current,initialReadingIntent:initialReadingIntent.current}});'''),
 ('  function activateFolder(selected: GrantInfo) {',f'  function activateFolder(selected: GrantInfo) {{\n    {g}?.event(3,selected.id,undefined,selected.generation);'),
 ('    void api.listEditSections(active.id).then((result) => {',f'''    {g}?.event(8,active.id,active.diskVersion);
    if ({g}) {g}.providers.sections = () => ({{cancelled,documentId:active.id,diskVersion:active.diskVersion}});
    void api.listEditSections(active.id).then((result) => {{
      {g}?.event(9,active.id,result.diskVersion,cancelled);'''),
 ('    return () => { cancelled = true; };\n  }, [activeId, active?.diskVersion',f'    return () => {{ cancelled = true; {g}?.event(11,active.id); }};\n  }}, [activeId, active?.diskVersion'),
 ('    }).catch(() => {\n      if (!cancelled) {\n        setSectionsByTab',f'    }}).catch(() => {{\n      {g}?.event(10,active.id);\n      if (!cancelled) {{\n        setSectionsByTab'),
 ('    const token = Symbol("section entry"), generation = generationRef.current, navigation = openSequence.current;',f'    {g}?.event(16,tabId,section.id,generationRef.current);\n    const token = Symbol("section entry"), generation = generationRef.current, navigation = openSequence.current;'),
 ('      const document = requireMarkdownResponse(await api.readDocument(request));',f'      {g}?.event(4,requestKey,sequence,generation);\n      const document = requireMarkdownResponse(await api.readDocument(request));\n      {g}?.event(5,document.fileId,document.diskVersion,generation);'),
 ('      if (!current() || (isNativeDocument(pendingName) && documentLoads.current.get(pendingId) !== token)) return;\n      if (typeof api.rememberRecentDocument',f'      if (!current() || (isNativeDocument(pendingName) && documentLoads.current.get(pendingId) !== token)) {{ {g}?.event(24,requestKey,sequence,generation); return; }}\n      if (typeof api.rememberRecentDocument'),
 ('    } catch (error) {\n      if (!current() || (isNativeDocument(pendingName)',f'    }} catch (error) {{\n      {g}?.event(6,requestKey,sequence,generation);\n      if (!current() || (isNativeDocument(pendingName)')])
edit('src/reader/MarkdownView.tsx',[
 ('    if (renderReady && painted >= blocks.length) paintedCallback.current?.(fileId, content);',f'    if (renderReady && painted >= blocks.length) {{ {g}?.event(14,fileId,painted,generation.current); paintedCallback.current?.(fileId, content); }}'),
 ('    if (!layoutPending && renderReady && painted >= blocks.length) renderedCallback.current?.(fileId, content);',f'    if (!layoutPending && renderReady && painted >= blocks.length) {{ {g}?.event(15,fileId,painted,generation.current); renderedCallback.current?.(fileId, content); }}'),
 ('      setSelectionRequest(null); return;',f'      {g}?.event(25,fileId,undefined,generation.current); setSelectionRequest(null); return;'),
 ('    if (layoutPending || !selectionReady) return;',f'    if (layoutPending || !selectionReady) {{ {g}?.event(26,fileId,layoutPending,generation.current); return; }}'),
 ('      selectDocumentContents(selectionRoot.current);',f'      {g}?.event(27,fileId,undefined,generation.current);\n      selectDocumentContents(selectionRoot.current);'),
 ('  const editRange = useMemo(() => {',f'''  if ({g}) {g}.providers.markdown = () => ({{fileId,content,sections,sectionMapValid:sectionMap?.valid,
    firstOffsets:sectionMap?.firstOffsets,hasWorker,parsed,retaining,overBudget,renderReady,sourceFallback,selectionReady,
    layoutPending,painted,blocks:blocks.length,generation:generation.current,selectionRequest,
    selectionRootConnected:selectionRoot.current?.isConnected,editingSection,hasSectionEditor:Boolean(sectionEditor)}});
  const editRange = useMemo(() => {{'''),
 ('    return <div className="section-heading">',f'    if(editable && !retaining && onEditSection) {g}?.heading(fileId,section.id);\n    return <div className="section-heading">')])
edit('src/reader/RichSection.tsx',[
 ('    alive.current = true;',f'    {g}?.event(17,props.fileId,props.sessionId);\n    alive.current = true;'),
 ('    return () => { alive.current = false;',f'    return () => {{ {g}?.event(18,props.fileId,props.sessionId); alive.current = false;')])
(out/'recorder.patch').write_text(''.join(patches))
(out/'recorder-inputs.json').write_text(json.dumps({str(p.relative_to(c)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [c/'qa-recorder.ts',c/'src/app/App.tsx',c/'src/reader/MarkdownView.tsx',c/'src/reader/RichSection.tsx',c/'tests/ui/workspace-handoff.test.tsx']},indent=2))
print('Recorder installed only in disposable candidate.')
