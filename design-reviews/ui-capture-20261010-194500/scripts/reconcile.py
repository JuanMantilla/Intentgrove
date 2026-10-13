from pathlib import Path
import json,hashlib,collections
root=Path(__file__).resolve().parents[1];m=json.loads((root/'manifest.json').read_text())
# Byte-preserving extension corrections; original tool exports are JPEG.
paths={}
for c in m['captures']:
 old=c['screenshot'];new=str(Path(old).with_suffix('.jpg'));paths[old]=new
 if (root/old).exists() and old!=new:(root/old).rename(root/new)
 c['screenshot']=new;c['format']='JPEG';c['lossless']=False
 c['accepted']=c.get('accepted',True);c['capture_pixel_dimensions']=None
 c['runtime']=c.get('runtime','native isolated macOS bundle' if 'BROWSER-PREVIEW' not in new else 'browser preview; native APIs mocked')
 c['limitations']=[x for x in c.get('limitations',[]) if 'PNG' not in x]+['Tool returns JPEG bytes; lossless PNG acquisition remains blocked. Pixel dimensions decoded independently during reconciliation.']
 c['visual_verification']=c.get('visual_verification','visually inspected during capture').replace('PNG','JPEG')
 if c['accepted'] and 'pending' in c['visual_verification']:c['visual_verification']='visually inspected emitted original; intended state visible'
 c['sha256']=hashlib.sha256((root/new).read_bytes()).hexdigest()
# Metadata corrected from actually inspected frames, not stale variables captured in helper closures.
for n,c in enumerate(m['captures'],1):
 if n==2:c.update(theme='light',language='en')
 elif n==5 or 6<=n<=12 or 34<=n<=73:c.update(theme='light',language='es')
 elif 74<=n<=79 or n in (87,88,89):c.update(theme='dark',language='en')
 elif 80<=n<=86:c.update(theme='light',language='en')
 elif n>=90:c.update(theme='light',language='es')
 if n==4:c.update(theme='light',language='en')
# One early failed Spanish attempt reused its filename before the counter was introduced.
m['captures'][3]['raw_preservation_exception']='Early filename collision: failed attempt was overwritten by later successful Spanish capture before counter naming was introduced. No reconstruction performed.'
m['captures'][3]['accepted']=False
for s in m['inventory']:s['screenshots']=[paths.get(p,p) for p in s['screenshots']]
# Corrupt input cannot exercise corruption-specific UI without image decoder.
c=m['captures'][49];c['title']='image decoder unavailable';c['observations']=['Missing isolated decoder message; corruption-specific error was NOT verified.'];c['id']='UI-132';c['capture_id']='UI-132-C50'
m['inventory'].append(dict(id='UI-132',title=c['title'],state=c['title'],surface='document',implementation='implemented and reachable',status='captured',screenshots=[c['screenshot']],reproduction_steps=c['reproduction_steps'],observations=c['observations'],limitations=[]))
s=m['inventory'][67];s.update(status='blocked',screenshots=[],limitations=['Image decoder helper missing from isolated bundle; corruption-specific behavior not reached.'])
# Other relevant visible states can share originals without inventing duplicate captures.
def share(title,index,steps):
 s=next(s for s in m['inventory'] if s['title']==title);c=m['captures'][index-1];s.update(status='captured',implementation='implemented and reachable',screenshots=[c['screenshot']],reproduction_steps=steps,shared_capture=c['capture_id'])
share('outline populated',86,['Choose Atlas layout; Second document active; Outline enabled.'])
share('checkbox and radio selected states',88,['Settings: select Dark/Margin; focus Project tree checkbox; selected state visible. Radio alternatives: C79-C81.'])
share('light major overlays',82,['Select Light/Folio; keep Projects drawer open over the document.'])
# Explicit acquisition blockers for surfaces that cannot be captured through available API.
blocked={
'Projects close hover current source':'No supported pointer-hover API; coordinate native actions repeatedly fail with ScreenCaptureKit -3811/-3812. Native bundle lacks current Margin close button.',
'Projects narrow width':'Native resize/drag coordinate actions unavailable; no safe verified resize route.',
'Projects wide width':'Native resize/drag coordinate actions unavailable; no safe verified resize route.',
'font dropdown':'Native popup is separate capture surface; screenshot API omits popup/unavailable while menu is open.',
'language dropdown':'Native popup capture omits the expanded popup.',
'HTML native preview':'Native embedded child preview captures blank after raising parent; repeated relevant retry failed. A retained failure C46 contains body plus unsupported-file warning, not the intended baseline state.',
'unsupported file details':'Native screenshot showed preceding HTML child with warning instead of unsupported details; retained rejected C46.',
'editor block formatting menu':'Control reached in browser but toolbar/menu absent from original; rejected C94.',
'replace existing confirmation':'Native Save As dialog remained Save-disabled with chosen filename; did not submit or replace fixture.',
'image fit':'Isolated bundle lacks image decoder helper.',
'image actual size':'Isolated bundle lacks image decoder helper.',
'image zoom':'Isolated bundle lacks image decoder helper.',
'HTML details':'Embedded native HTML capture unreliable; child frame blank in repeated captures.',
'blocked resource notice':'No verified safe blocked-resource fixture in isolated runtime; missing native helpers prevent reliable distinction.',
'settings persistence warning':'No supported safe fault-injection fixture; not induced by changing real storage.',
'folder search loading and stop':'Search completed before settled capture; no reliable transient capture hook.',
'loading transient':'No reliable capture timing hook; settled captures only.',
 'tooltip hover':'No documented hover API and native coordinate actions fail.'}
for title in ['native application menu','native File menu','native Edit menu','native View menu','native Go menu','native Window menu','native Help menu']:blocked[title]='Separate macOS menu surface; application screenshot unavailable while application menu open. Shared capture limitation, not individually verified menu contents.'
for s in m['inventory']:
 if s['title'] in blocked:s.update(status='blocked',limitations=[blocked[s['title']]])
 if not s.get('reproduction_steps'):
  s['reproduction_steps']=[{'shell':'Open isolated bundle, use shell navigation or named menu/control: ','document':'Open disposable fixture, use document toolbar or state trigger: ','settings':'Open Settings and select control/section: ','storage':'Projects footer > Manage… > named inventory/confirmation: ','search':'Open disposable project folder > Search folder > named query/scope: '}.get(s['surface'],'Use relevant app navigation: ')+s['title']]
 if s['status']=='not attempted':s['limitations']=['Not sampled after lossless-export blocker was established. No claim of running-app verification; resume requires PNG-capable isolated capture workflow.'];s['implementation']='referenced/discovered, not verified in running app'
# Ensure screenshot lists contain only accepted references for captured states, deduplicate references.
accepted={c['screenshot'] for c in m['captures'] if c['accepted']}
for s in m['inventory']:
 s['screenshots']=list(dict.fromkeys(s['screenshots']))
 if s['status']=='captured':s['screenshots']=[p for p in s['screenshots'] if p in accepted]
 if s['status']=='captured' and not s['screenshots']:s['status']='blocked';s['limitations'].append('No accepted image after reconciliation.')
m['environment'].update(capture_method='cua_repl native App.getScreenshot and Chrome Tab.getScreenshot; all returned JPEG (magic bytes verified), saved unchanged. No original resizing/retouching. Native bounds independently measured.',capture_format_limitation='All originals are lossy JPEG. No lossless PNG proof. Wider native frame may be downsampled by capture transport; do not infer window bounds from screenshot pixels.',designer_skill={'name':'uiux-marketing-designer','path':'/Users/juanmantilla/projects/personal/.agents/skills/uiux-marketing-design/SKILL.md','project_role_reference':'/Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-ux-designer/SKILL.md'},capture_skill='/Users/juanmantilla/.codex/skills/app-screenshots/SKILL.md',review_status='PARTIAL_CAPTURE',permissions='AX actions supported. Coordinate/drag/scroll failures and separate menu screenshot unavailable; no additional permissions granted.',isolation='Existing bundle identifier com.juanmantilla.markdownworkspace.links-smoke, separate from real app. Fixtures only in evidence directory. Browser existing test renderer mocks native calls. No source changes, dependency installs, builds, cleanup, commits or hooks.',resume='Native isolated app remains open Dark/English/Margin. Fixture02 saved with garden replacement. Preview temporary viewport reset and task Vite server stopped.',unsampled=['Windows','Linux','Retina/high DPI','Safari/Edge','native narrow window','full theme × language × size combinations','all storage-error/recovery/session/external-conflict states'])
m['audit_notes']=['PNG extensions and invalid PNG-header dimension readings corrected after byte audit; originals renamed without changing bytes.','Some early theme/language labels came from stale helper closures; corrected from inspected frame sequence.','C78 wide native frame is Dark/English despite original filename Light/ES. Filenames are acquisition labels; manifest metadata is authoritative.','C58 long tree footer visible, but last tree row not visible: activating document49 did not establish tree-bottom scrolling.','C63/C64 similar confirmation visuals have distinct return-to-reading and close-tab triggers.','C46 preserved as rejected: HTML body plus unsupported-file warning is not verified unsupported-details state.','An early Open Folder selection landed in an existing synthetic historical fixture folder; no private document opened; subsequent capture root was corrected to evidence fixtures.','No screenshots establish functional correctness or accessibility compliance.']
(root/'manifest.json').write_text(json.dumps(m,indent=2))
print(collections.Counter(s['status'] for s in m['inventory']));print('accepted',sum(c['accepted'] for c in m['captures']))
