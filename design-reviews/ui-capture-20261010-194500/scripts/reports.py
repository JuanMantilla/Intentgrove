from pathlib import Path
import json,collections,datetime
r=Path(__file__).resolve().parents[1];p=r/'manifest.json';m=json.loads(p.read_text());cs=m['captures'];inv=m['inventory']
for n,c in enumerate(cs,1):c['capture_id']=f"{c['id']}-C{n:03d}"
for s in inv:
 if s.get('shared_capture'):
  matches=[c for c in cs if c['accepted'] and c['screenshot'] in s['screenshots']]
  if matches:s['shared_capture']=matches[0]['capture_id']
for sheet in m['contact_sheets']:
 sheet['captures']=[c['capture_id'] for c in cs if c['accepted'] and c['capture_id'].rsplit('-C',1)[0]+'-C'+str(int(c['capture_id'].rsplit('-C',1)[1])) in sheet['captures']]
# Recompute duplicate groups, source metadata counts, and check all manifest paths.
g=collections.defaultdict(list)
for c in cs:
 assert (r/c['screenshot']).is_file();assert c['reproduction_steps'];assert c['capture_pixel_dimensions']['width']>0
 if c['accepted']:g[c['sha256']].append(c['capture_id'])
m['redundant_capture_groups']=[v for v in g.values() if len(v)>1]
m['status_counts']=dict(collections.Counter(s['status'] for s in inv));p.write_text(json.dumps(m,indent=2))
link=lambda path:f'[{path}]({path})'
accepted=[c for c in cs if c['accepted']];native=[c for c in accepted if 'browser' not in c['runtime']];preview=[c for c in accepted if 'browser' in c['runtime']]
rows=['# Coverage — PARTIAL_CAPTURE','',f"Generated from {link(p)}.",'',f"Discovered inventory: **{len(inv)}**. Captured with best-effort JPEG evidence: **{m['status_counts']['captured']}**; blocked: **{m['status_counts']['blocked']}**; not attempted: **{m['status_counts']['not attempted']}**; not applicable: **{m['status_counts']['not applicable']}**.",'',f"Acquisition records: {len(cs)}; accepted images: {len(accepted)} ({len(native)} native, {len(preview)} browser preview); rejected records: {len(cs)-len(accepted)}. Unique files: {len(set(c['screenshot'] for c in cs))}. Lossless PNG originals: **0**. Captured counts describe visually verified states, not fulfillment of the lossless/full-native-window requirement.",'','## Why partial','', 'All available screenshot exports returned JPEG bytes (signature checked). An early PNG filename assumption and invalid PNG-header dimension readings were corrected by byte-preserving rename and AppKit decode; no JPEG-to-PNG conversion was substituted. Acquisition stopped after this export blocker was confirmed. The 17 not-attempted states are disclosed rather than marked captured or assigned invented app failures.','', 'The isolated native bundle is version0.1.0 and predates the latest Margin Projects header close control. Its image/diagram helpers are absent. Browser evidence runs the actual current renderer in the existing test harness with mocked native operations; it does not prove native behavior.','', 'Native coordinate/drag/scroll actions repeatedly failed with noWindowsAvailable / ScreenCaptureKit -3811 or -3812. Separate native menus could not be captured. HTML child views were blank or stale after raising their parent. One rejected HTML capture contains body content plus an unsupported-file warning; it is retained as a failure, not silently accepted.','', '## Representative combinations','', '| Runtime | Theme / language | Sizes and areas |','|---|---|---|','| Native isolated Tauri | dark EN; light EN; light ES | Baseline main window1280×820 independently measured; settings800×720; zoomed wide workspace; welcome, readers, editing, dialogs, storage, layouts |','| Browser preview | dark EN; light ES |1280×800 app viewport;640×480 Spanish layout; Projects controls, menus, find/search, reader |','', 'Pixel dimensions belong to each image and are decoder-measured in the manifest. Native window bounds are separate snapshots in window-metadata.json and window-metadata-final.json. Historical wide bounds and native viewport dimensions were not independently measured at capture time. Some wide frames differ in pixel scale; do not equate image pixels with window points. Browser viewport/DPR measurements are per record where available. No stitched composites or detail crops were created.','', 'Windows, Linux, Retina/high DPI, Safari/Edge, native narrow-window behavior, and the full theme × language × size product were not tested. No claims of functional correctness or accessibility compliance.','', '## Area counts','', '| Area | Captured | Blocked | Not attempted | Not applicable |','|---|---:|---:|---:|---:|']
for area in sorted(set(s['surface'] for s in inv)):
 ct=collections.Counter(s['status'] for s in inv if s['surface']==area);rows.append(f"| {area} | {ct['captured']} | {ct['blocked']} | {ct['not attempted']} | {ct['not applicable']} |")
rows+=['','## Outstanding inventory','', '| ID / state | Status | Route | Limitation |','|---|---|---|---|']
for s in inv:
 if s['status']!='captured':rows.append('| '+s['id']+' '+s['title']+' | '+s['status']+' | '+'; '.join(s['reproduction_steps']).replace('|','/')+' | '+'; '.join(s.get('limitations',[])).replace('|','/')+' |')
rows+=['','## Reconciliation and preservation','',f"All {len(cs)} referenced originals exist, have bytes, and decoded in AppKit. All accepted captures have reproduction steps. All ten labeled contact sheets map to accepted originals. Original bytes are SHA256-hashed in the manifest. One exact-byte redundant pair (find empty vs cleared) is retained for different triggers. Multiple inventory states may intentionally cite one original; these do not inflate screenshot counts.",'','One early failed Spanish capture was overwritten by a filename collision before numbered-attempt naming began. The failure record explicitly discloses that its original raw frame is unavailable. No replacement image was fabricated. Remaining failed originals are retained.','', 'Source files, user profile, hooks, and prior dirty work were preserved. Vite used installed dependencies and automatically optimized its local cache; no dependencies were installed, and no application bundle rebuilt. Disposable fixture02 was saved after the documented garden edit; its current content is the handoff baseline. No destructive confirmation was accepted, no cleanup ran, and no commits/push/deploy occurred.']
(r/'coverage.md').write_text('\n'.join(rows)+'\n')
index=['# Intentgrove screenshot index','',link(r/'designer-handoff.md'),'','Status: PARTIAL_CAPTURE. This is acquisition/documentation, not a completed designer review.','',link(r/'coverage.md'),'','## Contact sheets','']+[link(r/s['path']) for s in m['contact_sheets']]+['','## Inventory and originals','','| ID / state | Status | Reproduction | Originals |','|---|---|---|---|']
for s in inv:index.append('| '+s['id']+' '+s['title']+' | '+s['status']+' | '+'; '.join(s['reproduction_steps']).replace('|','/')+' | '+'; '.join(link(r/x) for x in s['screenshots'])+' |')
index+=['','## Retained rejected attempts','']
for c in cs:
 if not c['accepted']:index.append(f"- {c['capture_id']} {c['title']}: {link(r/c['screenshot'])} — {c['visual_verification']}"+(' — '+c.get('raw_preservation_exception','') if c.get('raw_preservation_exception') else ''))
(r/'index.md').write_text('\n'.join(index)+'\n')
handoff=f'''# Intentgrove designer handoff — PARTIAL_CAPTURE

Entry point: {link(r/'index.md')}. Coverage: {link(r/'coverage.md')}. Source of truth: {link(p)}.

This package is CAPTURE AND DOCUMENTATION ONLY. No designer was invoked and no design conclusions are supplied. It contains {m['status_counts']['captured']} inventory states with accepted evidence, {len(native)} native and {len(preview)} supplemental browser images, plus explicit failed/unattempted inventory.

## Later reviewer and scope

Use the existing **uiux-marketing-designer** skill at {link(Path('/Users/juanmantilla/projects/personal/.agents/skills/uiux-marketing-design/SKILL.md'))}. The repository also has the project role **md-ux-designer** at {link(Path('/Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-ux-designer/SKILL.md'))}; this is a reference to the existing role, not a newly invented replacement. The capture skill was **app-screenshots** at {link(Path('/Users/juanmantilla/.codex/skills/app-screenshots/SKILL.md'))}.

Any later invocation must be **REVIEW_ONLY**: critique existing evidence; no implementation or redesign yet. Inspect original image files before judging details. Cite inventory IDs and capture IDs. Separate directly observed conditions from hypotheses and from capture/runtime limitations. Do not treat screenshots as functional or accessibility certification.

Review topics: hierarchy, spacing, alignment, consistency, typography, contrast, discoverability, density, and layout adaptation. Evaluate these independently; no prewritten conclusions are included.

## Navigation

Use labeled contact sheets to locate an area, then open the corresponding original from the index or manifest. The contact sheets are PNG navigation aids made from resized thumbnails; they are not single application states and are not lossless original acquisitions. `originals` contains untouched JPEG tool outputs with corrected file extensions. `details` is intentionally empty. IDs are stable per discovered state; numbered capture attempts preserve multiple triggers/variants. Shared originals and exact-byte duplicates are explicit in the manifest.

For each capture, consult theme/language, runtime, fixture, reproduction steps, decoder-measured pixel dimensions, timestamp, observations and limitations. The original acquisition filenames are kept as provenance in metadata. Independent native window/display measurements are in {link(r/'window-metadata.json')} and {link(r/'window-metadata-final.json')}; do not derive window points from image size.

## Reproduction boundary

Native app: {link(Path(m['environment']['native_bundle']))}, bundle identifier `com.juanmantilla.markdownworkspace.links-smoke`, version0.1.0. Current source HEAD: `7e00d3316ce46563cafb46ba928498fcb0d82880`, with many pre-existing dirty files recorded verbatim in shared environment metadata. No embedded commit binds the existing bundle to that source state. Real app/profile were not used.

Fixtures: {link(r/'fixtures')}; open `project` as the native folder. `01-visual-reference.md` covers frontmatter, GFM, tables, code, local image, Mermaid and25 sections. Other fixtures cover empty/no-heading documents, long names, deeply nested folders,50 tree entries, HTML, invalid UTF8, unsupported extension, corrupt image and12MiB source. Fixture02 now contains the saved garden edit. None contains credentials or private content.

Browser supplement used existing `tests/fixtures/redesign-preview.html?layout=margin&theme=dark&locale=en&longTree=1&search=1&editor=1` on task-local Vite port5187. It mounts the real current renderer but mocks native APIs and uses synthetic in-memory paths; do not open those `/fixture` paths as real files. The `theme-states.svg` tab represents embedded document content, not the live shell. Server has stopped and temporary viewport was reset. To resume, start the same existing Vite executable with installed dependencies and revisit the documented route; do not install or rebuild automatically.

## Limits and further investigation

Every original is lossy JPEG because both native and browser screenshot APIs returned JPEG. PNG/full-resolution acquisition remains outstanding. Native menus are separate surfaces and unavailable through app screenshots; pickers/About captures show their own window and exclude the parent. Native HTML child capture was unreliable; image/diagram helper services were missing from this isolated bundle. Inactive grey native window controls in some images reflect capture focus state. These conditions require separate verification before assigning app defects.

Projects priority: current-source header close normal/focus and closed/reopened are in UI-006/UI-008/UI-004/UI-005 browser originals; native close behavior for latest Margin header is unverified. Hover, sidebar drag resizing, and tree-bottom scroll are incomplete. UI-011 shows long tree and footer but does not show the final row. UI-031 is a zoomed native layout; UI-116 is a640×480 browser viewport, not a native supported-size claim. Relevant shell boundaries are visible; do not modify them to make a capture look correct.

See the generated coverage table for every blocker and the17 unattempted items, particularly recovery/session restoration, external conflicts, editor context/selection, folder-scoped search and full scroll tails. No final designer review or QA acceptance has occurred. Keep all evidence and do not enqueue cleanup.
'''
(r/'designer-handoff.md').write_text(handoff)
(r/'STATE.md').write_text(f'''# Capture state

Status: PARTIAL_CAPTURE. Reconciled {datetime.datetime.now(datetime.timezone.utc).isoformat()}.

Inventory {len(inv)}: {m['status_counts']}. Accepted images {len(accepted)}; acquisition records {len(cs)}. All references decoded;10 contact sheets created. No lossless PNG originals; export blocker confirmed. Review entry point: {r/'designer-handoff.md'}.

Native isolated bundle remains open with synthetic evidence workspace, Dark/English/Margin. Fixture02 saved; no user documents touched. Browser viewport reset; task Vite process86615 stopped. No cleanup, reset, commit, build or designer invocation.

Resume from manifest statuses, not from memory. Preserve originals and failed attempts. First obtain a documented PNG-capable full-native-window capture facility and a separately isolated current native bundle containing its helpers; rebuild/install requires user approval. Never use the real profile. Retry blocked captures and the17 not-attempted items after prerequisites are resolved. Capture scripts are acquisition/reconciliation artifacts, not idempotent automation: do not rerun prepare/reconcile/finalize over this preserved package. reports.py and contact-sheets.swift regenerate documentation/navigation from manifest.

Shared project .agents/state.md and pre-existing dirty work were preserved; capture state is localized here under the user’s data-protection instruction. This is not a DONE_ACCEPTED QA record; no cleanup integration worker is authorized.
''')
print(m['status_counts']);print('reports written; original references verified')
