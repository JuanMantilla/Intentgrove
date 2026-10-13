from pathlib import Path
import json,hashlib,datetime,collections,os
R=Path('/Users/juanmantilla/projects/personal/md-reader');P=R/'frontend-implementation/qa0033-0044-20261012T133129Z';Q=R/'qa/runs/qa0033-0044-v6-20261012T135000Z'
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
def write(p,s):
 with p.open('x') as f:f.write(s)
def js(p,d):write(p,json.dumps(d,indent=2)+'\n')
def link(p):return f'[{p}](<{p}>)'
def rel(p):return str(p.relative_to(R))
identity=json.loads((P/'candidate-identity-v6.json').read_text())
js(Q/'evidence/preservation-boundaries-clarification.json',{'observed_at':now,'correction':'The live_source_changed_since_start field in preservation-boundaries.json compares live files to the v5-based source-before-manifest, not a complete live pretask content baseline. The 15 native differences were already identified at task start in live-versus-v5.json. Do not infer this task changed those files. Only the three frontend/test paths were edited by this task.','initial_native_differences':json.loads((P/'evidence/live-versus-v5.json').read_text())})
write(P/'request-and-authority.md',f'''# Task authority
User explicitly requested investigation and evidence-supported bounded repairs for QA-0033 through QA-0044, sequential responsible roles, preservation of QA33–37, original replies/assertions/deadlines/maxWorkers=2 and all historical artifacts, and a new frozen source/native candidate. This authorizes the three scoped edits; no acceptance, commit, release, cleanup, or combined live-native verification was given. User assisted native observer foreground activation with “it is ready”. Active Spec Kit feature remains specs/014-interactive-prototype-v1. Current outcome PARTIAL / QA_FAILED / ACTIVE.
''')
checks=[]
for k in ['startup-isolated','affected','default-full-01','default-full-02','default-full-03']:
 d=json.loads((Q/f'evidence/{k}.json').read_text());assert d['exit_code']==0
 checks.append({'id':k,'result':'PASS','reason':{'startup-isolated':'Original standalone native=true startup-failure assertion passes; 77 unrelated cases filtered by -t. No priming test or product accommodation.','affected':'181 affected tests across11 files pass.','default-full-01':'717/717;71 files; unchanged default maxWorkers2.','default-full-02':'717/717;71 files; unchanged default maxWorkers2.','default-full-03':'717/717;71 files; unchanged default maxWorkers2.'}[k],'finished_at':d['finished_at'],'evidence_paths':[rel(Path(d['log']))]})
for c in json.loads((Q/'evidence/native-observations.json').read_text())['checks']:
 checks.append({'id':c['id'],'result':c['result'],'reason':c['observed'],'finished_at':now,'evidence_paths':[rel(Q/'evidence/native-observations.json')]})
checks.append({'id':'exact-candidate-integrity-signature','result':'PASS','reason':'434 source hashes,455 tested input hashes,4 bundle hashes,2983 protected historical hashes unchanged; codesign strict verify passes. Old v5 bundle unchanged.','finished_at':now,'evidence_paths':[rel(Q/'evidence/integrity.json'),rel(Q/'evidence/preservation-boundaries.json'),rel(Q/'evidence/preservation-boundaries-clarification.json')]})
unknown={38:'Repeated-open rejection exceeded original5000ms; stalled failing wait and promise order not captured.',39:'Initial Edit section One missing before section-edit actions; failing read/parse/layout order not captured.',40:'Initial End heading missing before refresh actions; failing worker reply/paint order not captured.',41:'Initial remembered second heading missing before clear-state actions; failed restoration/read/render order not captured.',44:'Small4937-byte native original fixture fallback cause unknown; constructor/error/reply/deadline failure not captured. Three observer successes including hidden window do not establish cause.'}
for n,reason in unknown.items():checks.append({'id':f'QA-{n:04d}-causal-closure','result':'FAIL','reason':reason,'finished_at':now,'evidence_paths':[rel(P/'report.md'),rel(R/f'qa/findings/QA-{n:04d}.md')]})
for k,reason,res in [('held-native-and-overlay','No deterministic native IPC/refresh hold or controlled overlay available through current UI surface.','BLOCKED'),('windows','No Windows runtime exercised.','NOT_RUN'),('physical-ime','No physical IME input exercised.','NOT_RUN'),('voiceover','No VoiceOver session exercised.','NOT_RUN')]:checks.append({'id':k,'result':res,'reason':reason,'finished_at':now,'evidence_paths':[rel(Q/'evidence/native-observations.json')]})
coverage={'candidate':identity,'qa_result':'QA_FAILED','task_state':'ACTIVE','acceptance':'PENDING','checks':checks,'counts':dict(collections.Counter(c['result'] for c in checks)),'provenance':'Same agent sequential responsible roles; no independent-review claim. Mocked jsdom tests are not native integration. Build completed before final tested snapshot and is separately recorded as candidate construction evidence.'}
js(Q/'coverage.json',coverage)
report=f'''# Investigation and bounded implementation — QA-0033–0044
PARTIAL / QA_FAILED / ACTIVE. Acceptance pending. Sequential senior-software-engineer INVESTIGATE, senior-frontend-developer IMPLEMENT for product ownership, senior-qa-engineer AUTOMATE for harness ownership, then exact-candidate RETEST. No independent-review claim.

## Evidence-supported changes
QA-0042: controlled no-drain asyncWrapper counterexample preserves original test bodies, replies and deadlines but explicitly changes diagnostic scheduling. Trace65973 records visible source wheel at2410.784ms and Ctrl+wheel at2411.742ms, while enabled listener registration occurs2413.694ms. No handler receives either event. Product usePinchZoom now registers in layout effect, when enabled content commits. New deterministic first-committed-source test failed before repair on defaultPrevented=false and passes afterward. All previous tests retain their assertions. This demonstrates and repairs a reachable listener installation gap; it does not reconstruct the old default-suite failure.

QA-0043: trace65974 records picker invocation2247.435ms, null reply2249.489ms, ref release2249.499ms, second click2251.056ms while DOM button remains disabled. No rejection call reaches the mock. Harness now awaits enabled Choose folder after cancellation, preserving every original promise reply and assertion. No production picker change. The controlled altered-harness original fails before and passes after. Historical default failure was not itself traced.

Only three canonical files changed: {R/'src/reader/usePinchZoom.ts'}, {R/'tests/ui/large-source.test.tsx'}, {R/'tests/ui/new-markdown.test.tsx'}. Patch: {link(P/'evidence/implementation.patch')}.

## Investigation limitations and retained attempts
QA38–41 remain unassigned between product, harness and host scheduling. Observer full03 passed716; observer full04 overlapping native build passed716. Fixed32+32 original test sampling passed64. None closes past failures. Observer01 transform import failure and observer02 invalid dedup instrumentation/interruption are retained and excluded as product evidence. Observer03 fixes instrumentation, not product. No delays, retry configuration, skipped full-suite tests, weakened assertions, deadlines or worker-count changes were introduced.

QA44: observation-only native bundle retains complete v5 native source. Constructor/request/reply/onerror/deadline/visibility tracing returned valid parsed replies for original4937-byte fixture at52ms,39ms,162ms from construction (last hidden). None reached fallback. Provider cgWindowNotFound, ScreenCaptureKit-3812 and initial picker foreground failures were separate precondition incidents; user foreground assistance enabled access. No evidence attributes original fallback to timeout, complexity, hidden window, or parser. Full raw trace was observed through an owned TextEdit scratch; attempted Save redirected to iCloud and read was interrupted, so local raw trace export is not claimed. Transcribed milestones: {link(P/'evidence/native-worker-observed-sequences.json')}.

## Frozen boundary
v6 is exactly v5's complete434-file snapshot plus the three scoped changes. Complete src-tauri/crates boundary inherited from v5; all15 concurrent native modified files and live-only native files excluded. No live native source was overwritten, and combined live tree is unverified. Diagnostics are excluded from final source. Dependencies use existing node_modules; no installation. Native build is offline/locked, debug, task-only identifier/profile. v5 source/reports/logs/bundle untouched.

## Verification
Exact final candidate:181 affected tests; standalone native=true startup failure;3 full717/717 passes. Native immediate reopen/Cmd+A actual clipboard has all60 passages/end and no control text; Find x→xy retains ownership without visible draft mutation; Filename Cmd+A replaces its value. UI-only draft observation is not an on-disk history comparison. TypeScript/Vite/native build succeeds; strict signature and source/artifact integrity pass. Full ledger and limitations: {link(Q/'coverage.json')}.

Open QA38/39/40/41/44 causal closure remains required. Held-native/overlay blocked; Windows/physical IME/VoiceOver not run. No cleanup, worker, commit or acceptance. New exact handoff: {link(P/'implementation-handoff-v6.md')}.
'''
write(P/'report.md',report)
write(P/'implementation-handoff-v6.md',f'''# Exact v6 implementation handoff
PARTIAL / QA_FAILED / ACTIVE. QA33–37 preserved/regressed; QA42 product gap and QA43 harness ownership receive bounded verified repairs. QA38–41/44 remain causally unresolved; passing executions do not close them.

Source: {link(P/'candidate-source-v6')}
Source manifest: {link(P/'source-manifest-v6.json')}
Manifest SHA256: `{identity['manifest_sha256']}`
Native app: {link(Path(identity['bundle']))}
Executable SHA256: `{identity['bundle_files']['Contents/MacOS/md_reader']}`
Identity/bundle/config hashes: {link(P/'candidate-identity-v6.json')}
Native config: {link(P/'native-v6.config.json')}

Complete v5 native source boundary;15 concurrent modified native paths listed in {link(P/'evidence/live-versus-v5.json')} and live-only native files excluded. The combined live tree is not tested. Final source contains no observer hooks. Prior v5 is immutable. Task-only profile identifier com.juanmantilla.intentgrove.qa0033to44.r20261012t133129z. Original fixtures were only opened; no Save operation.

Implementation and causal evidence: {link(P/'report.md')}
Candidate construction log: {link(P/'evidence/logs/native-v6-build.log')}
Exact QA report: {link(Q/'report.md')}
Coverage: {link(Q/'coverage.json')}
Remaining owner prompts: {link(Q/'department-handoff.md')}
Snapshot: {link(Q/'tested-snapshot.json')}

All original promise replies/assertions/deadlines preserved; maxWorkers2. QA37 remains standalone native=true with legitimate owned window/appearance mock. QA43 adds an observable cancellation boundary; new QA42 regression removes incidental timer drain in its own scoped wrapper and restores configuration. No task acceptance or release approval.
''')
write(Q/'report.md',f'''# Exact v6 QA report
QA_FAILED / ACTIVE; acceptance pending. Same-agent sequential RETEST, not independent verification.

{coverage['counts']['PASS']} PASS, {coverage['counts']['FAIL']} FAIL causal-closure gates, {coverage['counts']['BLOCKED']} BLOCKED, {coverage['counts']['NOT_RUN']} NOT_RUN coverage records. Runtime executions: standalone startup1; affected181; three full717/717. All full runs preserve maxWorkers2/deadlines. Native3 scoped checks pass. No passing rerun erases historical failures.

QA33–37 preserve their implemented repairs. QA42's listener registration gap has a failing controlled causal regression and a bounded layout-effect repair. QA43's disabled second click has a controlled failing order and harness readiness repair. These support bounded repairs without claiming capture of the past default failures. QA38–41 and QA44 still lack their failing orders.

Frozen build and native boundary: {link(P/'implementation-handoff-v6.md')}. Construction TypeScript/Vite/offline native build passed before final baseline; signature/integrity verified after baseline. Candidate434 hashes/tested455 inputs/old2983 artifacts unchanged; earlier v5 bundle unchanged. Concurrent live native changes excluded and unverified.

Native: actual clipboard includes all60 original passages/end and excludes controls after immediate reopen Cmd+A; Find x→xy keeps focus and visible editable text unchanged; Filename Cmd+A remains local. Native evidence is transcribed AX, not saved raw screenshots or on-disk draft proof. Held-native/overlay blocked; Windows/physical IME/VoiceOver not run.

Full findings, failed diagnostic attempts and timing ownership: {link(P/'report.md')}. Coverage {link(Q/'coverage.json')}; evidence {link(Q/'evidence-index.md')}; remaining remediation prompts {link(Q/'department-handoff.md')}. No cleanup or task acceptance.
''')
prompts=['# Department handoff\n\nQA_TRIAGE owns investigation of five residual S3 provisional / P2 findings. Observation confidence HIGH; root-cause/owner confidence LOW. Role routing is not proof of cause. User already authorizes bounded evidence-supported repairs.\n']
for n,reason in unknown.items():
 prompts.append(f'''## QA-{n:04d} — S3 provisional — senior-software-engineer INVESTIGATE
{reason}

Copy-ready prompt: Use $senior-software-engineer INVESTIGATE for QA-{n:04d}. Read {R/f'qa/findings/QA-{n:04d}.md'}, {P/'report.md'} and {P/'implementation-handoff-v6.md'}. Capture the actual failing order before changing behavior. {'Observe native worker constructor, post, identity, reply, onerror and deadline together with visibility, retaining original5s budget and original fixture.' if n==44 else 'Observe original mock delivery, request identity, React/render/paint prerequisites and wall versus CPU time at the original failing wait in default full context.'} Distinguish product, harness and environment ownership; no retry/pass-based closure. Preserve all replies/assertions/deadlines/maxWorkers2, fixtures, drafts and past evidence. Implement only supported bounded repair through owning skill (QA AUTOMATE for harness), add causal regression, and create a new frozen source/native candidate with explicit native boundary before exact RETEST. Do not merge excluded live native changes silently.
''')
prompts.append(f'''## Preserved and repaired scope
QA33–37: scoped regression passes; preserve native=true standalone QA37 and current-document/cancelled stale intent / Find input ownership. QA42 FRONTEND senior-frontend-developer IMPLEMENT: bounded listener repair verified. QA43 QA_AUTOMATION senior-qa-engineer AUTOMATE: observable picker release repair verified. Historical default failure causality remains narrower than controlled counterexamples; exact evidence {P/'report.md'}.

Capability gaps: held-native load/refresh and controlled overlay BLOCKED; Windows/physical IME/VoiceOver NOT_RUN. Do not promote jsdom to native coverage. Acceptance remains user-owned and absent.
''')
write(Q/'department-handoff.md','\n'.join(prompts))
write(Q/'evidence-index.md',f'''# Evidence index
Exact inputs {link(Q/'tested-paths.json')} and precheck baseline {link(Q/'tested-snapshot.json')}.
Execution metadata and logs: {link(Q/'evidence/startup-isolated.json')}, {link(Q/'evidence/affected.json')}, {link(Q/'evidence/default-full-01.json')}, {link(Q/'evidence/default-full-02.json')}, {link(Q/'evidence/default-full-03.json')}.
Native AX transcription {link(Q/'evidence/native-observations.json')}; integrity {link(Q/'evidence/integrity.json')}; preservation {link(Q/'evidence/preservation-boundaries.json')} with mandatory field clarification {link(Q/'evidence/preservation-boundaries-clarification.json')}.
Controlled protocol {link(P/'evidence/no-drain-protocol.json')}; failing original counterexamples {link(P/'evidence/logs/no-drain-counterexample.log')}; repaired controlled originals {link(P/'evidence/logs/no-drain-after.log')}; permanent regression before repair {link(P/'evidence/logs/pinch-regression-before.log')}; focused repair {link(P/'evidence/logs/pinch-repair-focused.log')}. Raw trace65973/65974 files reside in {P/'evidence'}; invalid observer01/02 attempts remain retained alongside successful03/04, see implementation report for exclusions. Native worker transcribed successes {link(P/'evidence/native-worker-observed-sequences.json')}. No local screenshot/raw native export claimed.
''')
# Preserve finding prefixes and state bytes, including legacy non-UTF8 history.
prefixes={}
for n in range(33,45):
 f=R/f'qa/findings/QA-{n:04d}.md';old=f.read_bytes();prefixes[str(f)]={'bytes':len(old),'sha256':hashlib.sha256(old).hexdigest()}
 status='PRESERVED / SCOPED REGRESSION PASS' if n<=37 else 'BOUNDED REPAIR VERIFIED / HISTORICAL DEFAULT ORDER NOT CAPTURED' if n in [42,43] else 'UNRESOLVED / NOT REPRODUCED'
 detail='QA37 original isolated native=true test and all assertions preserved.' if n==37 else 'Controlled listener-install gap repaired in layout effect; permanent regression fails before/passes after.' if n==42 else 'Controlled second click targeted disabled picker; test now waits enabled control after cancellation. Original replies/assertions unchanged.' if n==43 else unknown.get(n,'Existing repaired behavior passes affected and full regression checks.')
 with f.open('ab') as out:out.write(f'\n\n## Exact v6 investigation / retest — {now}\n\n{status}. {detail} Three unchanged-default full runs717/717 and181 affected pass; successful executions do not establish historical causes. Native source is complete v5 boundary; concurrent live native changes excluded. Task QA_FAILED / ACTIVE, acceptance pending. Handoff {link(P/"implementation-handoff-v6.md")}; report {link(Q/"report.md")}; owner prompts {link(Q/"department-handoff.md")}. Earlier text/evidence preserved.\n'.encode())
 assert f.read_bytes()[:len(old)]==old
js(Q/'evidence/finding-prefix-preservation.json',prefixes)
summary=f'''# QA-0033–0044 v6 — {now}

PARTIAL / QA_FAILED / ACTIVE; acceptance PENDING. Spec Kit014 unchanged. QA33–37 preserved/regressed. QA42 layout-effect input ownership and QA43 picker harness cancellation readiness repaired with controlled failing evidence. Only three frontend/test files changed. QA38–41/44 actual failed order remains unknown; no pass-based closure.

PASS: standalone native=true startup failure;181 affected;3 full717/717; native reopen clipboard60, Find x→xy and Filename ownership; frozen434 source/455 tested hashes,2983 old artifact hashes and v5 bundle unchanged. Complete v5 native boundary excludes live concurrent native changes; combined live tree unverified. Held-native/overlay BLOCKED; Windows/IME/VoiceOver NOT_RUN.

Handoff {P/'implementation-handoff-v6.md'}
Report {Q/'report.md'}
Next: capture five residual failing orders and evidence-supported owner repairs, then new exact RETEST. No acceptance, commit, release or cleanup.

---

'''
for f in [R/'.agents/state.md',R/'frontend-implementation/STATE.md',R/'qa/STATE.md']:
 old=f.read_bytes();f.write_bytes(summary.encode()+old)
write(P/'STATE.md',summary)
artifacts=[]
for base in [P,Q]:
 for folder,dirs,files in os.walk(base):
  dirs[:]=[d for d in dirs if d not in ['node_modules','native-target','target','.git']]
  for n in files:artifacts.append(rel(Path(folder)/n))
artifacts+=json.loads((Q/'tested-paths.json').read_text())
artifacts=sorted(set(artifacts))
completion={'schema_version':1,'task_id':'qa0033-0044-repairs-20261012T133129Z','acceptance_version':'v6-partial-failed-20261012T1400Z','session_kind':'qa','qa_result':'QA_FAILED','task_state':'ACTIVE','unresolved_blockers':[f'QA-{n:04d}: {s}' for n,s in unknown.items()]+['Held-native/overlay unavailable; Windows/physical IME/VoiceOver not run.','Combined live native tree excluded and unverified.','Authentic task acceptance absent.'],'required_checks':checks,'final_report':rel(Q/'report.md'),'evidence_paths':[rel(Q/x) for x in ['report.md','coverage.json','evidence-index.md','department-handoff.md']]+[rel(P/'report.md'),rel(P/'implementation-handoff-v6.md')],'tested_snapshot_path':rel(Q/'tested-snapshot.json'),'artifact_paths':artifacts,'retain_paths':artifacts,'requirements_source_paths':['AGENTS.md','docs/approvals.md',rel(P/'request-and-authority.md')],'completion_requirements':[{'requirement':'Evidence-supported repairs and causal closure for all QA33–44','source_path':rel(P/'request-and-authority.md'),'evidence_path':rel(Q/'report.md'),'satisfied':False},{'requirement':'New exact frozen source/native boundary and scoped verification preserving earlier evidence','source_path':rel(P/'request-and-authority.md'),'evidence_path':rel(P/'implementation-handoff-v6.md'),'satisfied':True},{'requirement':'Actual user task acceptance','source_path':'AGENTS.md','evidence_path':rel(P/'request-and-authority.md'),'satisfied':False}]}
js(Q/'completion.json',completion)
print(json.dumps({'coverage_counts':coverage['counts'],'artifacts':len(artifacts),'handoff':str(P/'implementation-handoff-v6.md')}))
