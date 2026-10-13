from pathlib import Path
import json,collections,hashlib,datetime
root=Path(__file__).resolve().parents[1];m=json.loads((root/'manifest.json').read_text());cs=m['captures'];inv=m['inventory']
cs[38]['id']='UI-128';cs[38]['capture_id']='UI-128-C39'
c=cs[20];c.update(id='UI-133',capture_id='UI-133-C21',title='tab context menu')
inv.append(dict(id='UI-133',title=c['title'],state=c['title'],surface='shell',status='captured',implementation='implemented and reachable in browser preview only',screenshots=[c['screenshot']],reproduction_steps=c['reproduction_steps'],observations=[],limitations=['Browser fixture mocks native APIs.']))
inv[22]['screenshots']=[cs[21]['screenshot']]
for title,n,steps in [('Spanish dialogs',63,['Native ES/light; edit Second document paragraph; modify orchard to garden; Return to reading; cancel prompt.']),('button keyboard focus',14,['Current-source preview: focus Projects header; Tab moves to Close Projects sidebar.'])]:
 s=next(s for s in inv if s['title']==title);s.update(status='captured',implementation='implemented and reachable',screenshots=[cs[n-1]['screenshot']],reproduction_steps=steps,shared_capture=cs[n-1]['capture_id'])
for title in ['folder search options expanded','folder search result expanded']:
 s=next(s for s in inv if s['title']==title);s.update(status='not applicable',implementation='not implemented as expandable controls',screenshots=[],reproduction_steps=['Open Search folder; mode buttons and grouped results display directly.'],limitations=['Current src/app/FolderSearchPanel.tsx lines189–258 has always-visible mode controls and headings/list groups; no expand/collapse control.'])
s=next(s for s in inv if s['title']=='storage inventory empty');s.update(status='blocked',implementation='referenced, unverified in running app',limitations=['Initial empty profile storage screen was not captured before fixtures were opened. Returning to empty would require clearing isolated stored session/recovery data; user prohibited confirming destructive actions. No reset performed.'])
# Canonical acquisition names now agree with ID and corrected environment metadata.
pathmap={}
for n,c in enumerate(cs,1):
 old=c['screenshot']
 if old in pathmap:continue
 owners=[(i,x) for i,x in enumerate(cs,1) if x['screenshot']==old]
 owner=next(((i,x) for i,x in owners if x['accepted']),owners[-1]);i,x=owner
 name=f"originals/{x['id']}_C{i:03d}_{x['title'].replace(' ','-')}_{x['theme']}_{x['language']}"+('_BROWSER-PREVIEW' if 'browser' in x['runtime'] else '_NATIVE')+'.jpg'
 (root/old).rename(root/name);pathmap[old]=name
for c in cs:
 c['acquisition_filename']=c['screenshot'];c['screenshot']=pathmap[c['screenshot']];c['requirement_compliant_lossless_capture']=False
 c['window_variant']='wide/zoomed native' if c is cs[77] or c in cs[81:85] else 'normal or independent dialog'
 if 'browser' in c['runtime']:c['window_variant']='browser viewport only';c['limitations'].append('Viewport excludes Chrome window chrome; not full native desktop window.')
 if c['title'] in ['native Open file dialog','native Save As dialog','About dialog']:c['limitations'].append('Separate native picker/dialog captured; parent application window excluded by selected capture surface.')
for s in inv:
 s['screenshots']=[pathmap[p] for p in s['screenshots']];s['lossless_requirement_met']=False if s['status']=='captured' else None
 if s['status']=='captured' and all('BROWSER-PREVIEW' in p for p in s['screenshots']):s['implementation']='implemented and reachable in browser preview only; native unverified'
# Add precise reproduction routes for unsampled states.
routes={'empty folder':'Open folder > fixtures/empty-folder.','back history contextual dialog':'Open two disposable files; context click Back to inspect its history UI.','folder context menu':'Open fixtures/project; context click deep folder in Projects tree.','narrow desktop layout':'Resize isolated native window using supported bounds; record actual native bounds independently.','long document scroll':'Open 01-visual-reference.md; scroll through Sections01–25 and lower images/code.','editor context menu':'Open 02-second-document.md; Edit section Second document; context click editor paragraph.','editor selected text':'Edit Second document; select garden in the editable paragraph.','pending section confirmation':'Modify disposable Second document paragraph; click Edit section Secondary heading; cancel prompt.','large file over limit':'Use safe fixture beyond backend large-source limit; Open file; do not damage any existing file.','conflict banner':'Edit disposable fixture; safely change same fixture on disk; await external-change notification.','inspect disk version':'From disposable-file conflict banner, activate inspect disk version.','discard conflict confirmation':'From disposable-file conflict banner, activate discard/reload then cancel.','recovery offer':'Keep a draft of disposable fixture, restart isolated bundle, inspect recovery offer without deleting.','restore session dialog':'Save disposable fixtures; quit/relaunch isolated bundle; inspect session restore offer.','restored session':'Accept non-destructive restore of isolated synthetic session, verify tabs/tree.','folder search subfolder scope':'Project tree deep-folder context menu > Search folder; run orchard query.','folder search scroll':'Run orchard in project root; scroll grouped results to bottom.'}
for s in inv:
 if s['title'] in routes and s['status']!='captured':s['reproduction_steps']=[routes[s['title']]]
 if s['title']=='Projects long tree and footer':s['observations']=['Long tree and footer visible; document49 active; tree-bottom/last-row scroll NOT established.']
# Exact-byte redundant frames are retained and explicitly grouped.
groups=collections.defaultdict(list)
for c in cs:
 c['sha256']=hashlib.sha256((root/c['screenshot']).read_bytes()).hexdigest()
 if c['accepted']:groups[c['sha256']].append(c['capture_id'])
m['redundant_capture_groups']=[g for g in groups.values() if len(g)>1]
m['environment']['source_inventory_evidence']=['CodeGraph first; stale-index warnings followed by scoped reads of App, SettingsWindow, StorageManagement, FolderSearchPanel, SectionEditor, image/large-source views, native startup configuration, and relevant existing UI tests.','Existing workflow: os-engineering/individual-links-20261010/native-approval/smoke-config.json; startup uses existing Links Test bundle; browser Vite existing tests/fixtures/redesign-preview.html. No fresh bundle built.']
m['environment']['version']='Native isolated bundle 0.1.0; no embedded commit provenance tying bundle to current dirty tree. Browser uses current dirty source.'
m['environment']['bounds_evidence']=['window-metadata.json','window-metadata-final.json'];m['environment']['runtime_versions']={'node':'20.19.6','rust':'1.88','python':'3.9.6','os':'macOS27.0.1 build26A434 arm64','native':'Tauri WKWebView; exact WebKit build unrecorded','browser':'Chrome extension; exact Chrome version unrecorded'}
m['status_counts']=dict(collections.Counter(s['status'] for s in inv));m['final_status']='PARTIAL_CAPTURE';m['reconciled_at']=datetime.datetime.now(datetime.timezone.utc).isoformat()
# Regeneration of sheets uses corrected originals and labels.
m.pop('contact_sheets',None);m.pop('file_validation',None)
(root/'manifest.json').write_text(json.dumps(m,indent=2))
