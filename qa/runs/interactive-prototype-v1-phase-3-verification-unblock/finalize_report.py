from pathlib import Path
import json,hashlib,datetime,re,subprocess,shutil
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent;maintenance=root/'qa/runs/strict-clippy-baseline-cleanup'
checks=json.loads((out/'check-results-v3.json').read_text());front=json.loads((out/'frontend-v3-results.json').read_text());isolated=json.loads((out/'frontend-close-isolated.json').read_text());now=datetime.datetime.now(datetime.timezone.utc).isoformat()
assert front['numPassedTests']==710 and front['numFailedTests']==1
assert isolated['numPassedTests']==27 and isolated['numFailedTests']==0
clippy=[]
for l in (out/'native-clippy-final-v3.log').read_text().splitlines():
 try:x=json.loads(l)
 except ValueError:continue
 if x.get('reason')=='compiler-message':clippy.append(x)
assert not clippy
snap=json.loads((out/'tested-snapshot-v3.json').read_text())['snapshot']['files'];drift=[]
for rel,m in snap.items():
 p=root/rel;st=p.stat();cur={'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':st.st_size,'mtime_ns':st.st_mtime_ns,'ctime_ns':st.st_ctime_ns,'device':st.st_dev,'inode':st.st_ino,'mode':st.st_mode}
 if any(m[k]!=v for k,v in cur.items()):drift.append(rel)
assert not drift,drift
(out/'source-integrity-final.json').write_text(json.dumps({'checked_at':now,'snapshot':'tested-snapshot-v3.json','paths':len(snap),'byte_or_identity_drift':drift},indent=2))
(out/'strict-clippy-final-summary.json').write_text(json.dumps({'result':'PASS','exit_code':0,'compiler_diagnostics':0,'raw_log':'native-clippy-final-v3.log','command_record':'native-clippy-final-v3-result.json'},indent=2))
blocker='Full frontend regression suite fails one Markdown close-editor setup case: dirty editor close choices (F004-R08, R15) / window: Save to file; editor label absent before the save route executes. Isolated suite passes 27/27; broad-suite cause remains unresolved.'
report=f'''# Interactive Prototype V1 — Phase 3 verification unblock

Completed {now}. **Strict-Clippy blocker resolved by separate maintenance. Phase 3 overall verification remains PARTIAL / QA_FAILED / BLOCKED due to one frontend regression failure.** No acceptance is claimed.

## Baseline verification

**BASELINE IDENTICAL — 0 NEW: 54 baseline / 54 current-before-maintenance emissions, 31 distinct lint locations.** Category A (untouched pre-existing files): 19 emissions; B (Phase-3-touched files, unchanged diagnostic code): 35; C: 0.

Git HEAD is `7e00d3316ce46563cafb46ba928498fcb0d82880`. The actual pre-Phase-3 baseline is the original dirty source snapshot atop that HEAD, not a clean committed revision. Native originals match the recorded pre-existing hashes. The prior investigation's saved Clippy Cargo.lock did **not** match its initial hash. This run recovered the exact lockfile from {root}/qa/runs/reveal-native-20261011T214754Z/native-policy-probe/Cargo.lock, and original native integration tests from {root}/qa/runs/select-all-retest-20261012T011743Z/candidate-source/. Every recovered file matches the pre-Phase-3 inventory. Reproduction uses independent on-disk copies with no links back to mutable production source. Current-tree reset, checkout and stash were not used.

The exact same command was independently run on the isolated original baseline and current Phase-3 tree, then repeated on both preserved trees with identical explicit environments:

```text
cargo clippy --manifest-path src-tauri/Cargo.toml --offline --locked --lib --tests --message-format=json -- -D warnings
```

Both pre-maintenance trees exit 101 with 24 library + 30 library-test diagnostics. Rust/cargo 1.88.0, Clippy 0.1.88, macOS 27.0.1 arm64; implicit host target `aarch64-apple-darwin`; package `md_reader`, library/tests, default features `[]`, no explicit feature/target/workspace flags. SDKROOT and all relevant variables are recorded in environment.json. Both repeat runs explicitly set `CARGO_TARGET_DIR={root}/src-tauri/target`; exact cwd, arguments and timestamps are in baseline-repeat-commands.json. The historical run did not preserve a full environment manifest; this investigation's repeated runs do.

Comparison retains lint, target kind, file, message, primary highlighted code and columns, and proves source locations through exact unchanged-line mappings. Absolute package IDs/build paths are irrelevant. Numeric line changes are preserved in diagnostic-locations.diff and comparison.json, rather than silently discarded. diagnostics.diff contains the exact diagnostic-multiset result; compare.py reproduces it. Raw baseline/current JSONL and stderr, inventories, provenance, source copies and repeated runs are retained.

## Repository policy and resolution

**No existing approved native lint-baseline exception mechanism found. Resolution: MAINTENANCE CLEANUP.** policy-evidence.md and policy-search.txt identify inspected instructions, approvals, active specs, scripts and prior QA records. The old Phase 3 completion requires native strict Clippy and explicitly leaves its baseline unwaived. Prototype compiler-warning policy does not authorize Rust lint debt. The current user request authorizes the separate semantically neutral maintenance path under AGENTS.md.

## Separate maintenance

Plan, source delta, per-file hashes and changed-file inventory: {maintenance}/. Sixteen native Rust files changed, including one small shared flat-command argument decoder plus its IPC contract test. No prototype module, crate, frontend source, dependency, CI policy, `.igproto` contract or VectorCraft source changed by this task.

Repairs cover equivalent expression simplifications, octal test permissions, a compile-time assertion preserving the disabled default-Markdown invariant, test-module placement, proven test-only helper gating, a cohesive section byte range, and grouping native command inputs. Flat IPC field names, types, required/optional semantics, validation errors and async ownership remain; Tauri's existing per-field decoder is reused. Settings clamp explicitly retains the previous NaN-to-upper-bound behavior. No lint allowance, expectation, global disable, configuration weakening or removal of `-D warnings` was introduced.

The independent maintenance record is {maintenance}/report.md. These changes are external verification-gate resolution, not Phase 3 lifecycle implementation history.

## Final verification

| Check | Result |
|---|---|
| Whole-app strict Clippy, exact original command | **PASS — exit 0, zero compiler diagnostics** |
| Phase 1 | **PASS — 86 model tests**, included below |
| Phase 2 workspace/compiler/package/CLI | **PASS — 332 workspace tests total** |
| Phase 3 native and Markdown native regressions | **PASS — 184 tests**, five pre-existing ignored |
| Maintenance flat IPC contract | **PASS — 1 additional test**, required/missing/optional/null/invalid/unknown/nested/raw payload coverage |
| Phase 3 prototype-specific frontend | **PASS — 33 tests**, included in full suite |
| Full Phase 3 frontend regression | **FAIL — 710 pass / 1 fail, 711 total** |
| Markdown regression | **FAIL — frontend close-editor setup; native regressions pass** |
| TypeScript / Vite / native compilation | **PASS** |
| Prototype workspace strict Clippy / formatting | **PASS** |
| Scoped maintenance formatting / dependency boundaries | **PASS** |
| Final source/input integrity | **PASS — {len(snap)} paths; zero byte or identity drift** |

Unique final scope: 1,227 passed / 1 failed; five existing native ignored. Focused reruns are not added to that total. All commands, environments, timestamps and raw logs are in check-results-v3.json and its referenced files. Platform/runtime limitation: checks ran on macOS arm64; no new packaged-UI, Windows, playback or release certification is claimed.

## Remaining blocker and causal limit

{blocker}

The earlier source candidate also failed a different Markdown setup test (706/707 pass, workspace-handoff edit-button lookup). Both failures remain raw evidence. Concurrent work changed four frontend source files and four frontend tests; those changes were preserved, captured in the final immutable candidate and are not attributed to this maintenance. The final candidate matches the current canonical source snapshot. The close-editor test mocks native IPC and fails before requesting Save; a product save defect or a native-maintenance cause has **not** been established. A 27/27 isolated rerun does not waive a failing required full suite.

**Next:** diagnose/fix the broad frontend readiness/test-isolation failure in its owning scope, rerun the complete suite on frozen inputs, then request actual Phase 3 acceptance. No further Clippy cleanup or lint exception is needed. No Phase 4 work was started.

## Resulting state

Phase 3 implementation status: **PARTIAL** (lifecycle implemented; full verification remains unresolved). Phase 3 QA: **QA_FAILED / BLOCKED**, to be recorded through the existing completion helper. User acceptance remains unsatisfied. Recommendation: **FIX REMAINING GATE**. No commit, push, deploy, acceptance, cleanup deletion or worker launch occurred.
'''
(out/'report.md').write_text(report)
maintenance_report=f'''# Strict-Clippy baseline cleanup — separate maintenance

**PASS for the native maintenance gate:** exact whole-app strict command exits 0 with zero diagnostics. Pre-maintenance independent comparison: 54 unchanged baseline emissions / 0 new Phase 3 emissions. No approved baseline exception exists; user-authorized maintenance was used.

This work is separate from Interactive Prototype V1 Phase 3 lifecycle implementation. Plan: {maintenance}/plan.md. Exact 16-file changes and before/after hashes: {maintenance}/changed-files.md, {maintenance}/changed-files-hashes.json and {maintenance}/maintenance.diff. Initial bytes remain in {out}/initial-source/.

Verification: 184 native tests + 1 additional IPC-contract test PASS; workspace 332 PASS (including Phase 1 model86), package strict Clippy, native compile, TypeScript/Vite, scoped formatting and dependency boundaries PASS. The IPC test initially used a remote HTTP origin on macOS and was correctly rejected before dispatch; its final local tauri://localhost transport passes. No production permission change was made. The disabled default-Markdown assertion remains a compile-time invariant. The settings clamp test covers finite values, infinity and NaN. All original native ignored tests remain reported.

Full frontend regression remains FAIL (710/711); isolated close-editor suite27/27 passes. This does not reopen the now-clean native lint gate, but prevents Phase 3 QA acceptance. No frontend repairs were made by this maintenance. Full evidence and remaining blocker: {out}/report.md.

No lint suppression, policy weakening, dependency change, prototype functionality change, commit, push, deployment or cleanup occurred.
'''
(maintenance/'report.md').write_text(maintenance_report)
coverage=[{'requirement':c['name'],'result':'PASS' if c['exit_code']==0 else 'FAIL','command':c['command'],'evidence':str(out/c['log'])} for c in checks]
(out/'coverage.json').write_text(json.dumps(coverage,indent=2))
(out/'evidence-index.md').write_text('# Evidence index\n\n'+''.join('- '+str(out/p)+'\n' for p in ['report.md','README.md','environment.json','initial-git-status.txt','baseline-command.json','baseline-repeat-commands.json','baseline-provenance.json','recovered-originals.json','baseline-inputs.json','baseline.jsonl','baseline.stderr','current-before.jsonl','current-before.stderr','baseline-repeat.jsonl','baseline-repeat.stderr','current-before-repeat.jsonl','current-before-repeat.stderr','comparison.json','repeat-comparison.json','diagnostics.diff','diagnostic-locations.diff','diagnostic-inventory.md','diagnostic-inventory.json','policy-evidence.md','policy-search.txt','tested-snapshot-v3.json','regression-candidate-final-inputs.json','check-results-v3.json','strict-clippy-final-summary.json','source-integrity-final.json','coverage.json','frontend-v3-results.json','frontend-failure-detail.json','frontend-close-isolated.json','frontend-close-isolated.log'])+'\nMaintenance record: '+str(maintenance/'report.md')+'\n')
# Preserve Phase 3 history; add only an external maintenance follow-up.
prior=root/'qa/runs/interactive-prototype-v1-phase-3/report.md';original=prior.read_bytes();saved=out/'phase3-report-before-unblock.md';saved.write_bytes(original)
header=f'''# Verification follow-up — {now}

Whole-app strict Clippy is now **PASS: zero diagnostics**, after independent **54 baseline / 0 new** reproduction and separately authorized maintenance. This does not alter the lifecycle implementation history below. Phase 3 remains **PARTIAL / QA_FAILED / BLOCKED** because the current full frontend suite has one Markdown close-editor setup failure (710/711 PASS; isolated27/27 PASS). Actual acceptance remains pending. Full record: {out}/report.md. Separate maintenance: {maintenance}/report.md. Next: fix/retest the remaining frontend verification gate; no Phase 4.

---

'''
assert prior.read_bytes()==original
prior.write_bytes(header.encode()+original)
rel=lambda p:str(p.relative_to(root))
evidence=[rel(out/'evidence-index.md'),rel(out/'check-results-v3.json'),rel(out/'coverage.json'),rel(out/'source-integrity-final.json'),rel(maintenance/'report.md')]
required=[{'id':c['name'],'result':'PASS' if c['exit_code']==0 else 'FAIL','reason':'Command succeeded against recorded inputs.' if c['exit_code']==0 else blocker,'finished_at':c['finished_at'],'evidence_paths':[rel(out/c['log']),rel(out/(c['name']+'-result.json'))]} for c in checks]
old=json.loads((root/'qa/runs/interactive-prototype-v1-phase-3/completion.json').read_text())
artifacts=[rel(out/'report.md'),rel(out/'coverage.json'),rel(out/'evidence-index.md'),rel(maintenance/'report.md')]
retain=set(old['retain_paths'])|set(json.loads((out/'tested-paths-final.json').read_text()))
retain.update(rel(p) for folder in [out,maintenance] for p in folder.iterdir() if p.is_file())
completion={'schema_version':1,'task_id':'interactive-prototype-v1-phase-3','acceptance_version':'verification-unblock-maintenance-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'),'session_kind':'qa','qa_result':'QA_FAILED','task_state':'BLOCKED','unresolved_blockers':[blocker],'required_checks':required,'final_report':rel(out/'report.md'),'evidence_paths':evidence,'tested_snapshot_path':rel(out/'tested-snapshot-v3.json'),'artifact_paths':artifacts,'retain_paths':sorted(retain),'requirements_source_paths':old['requirements_source_paths'],'completion_requirements':[{'requirement':'Actual user acceptance of Phase 3 after review; passing individual gates alone is not acceptance.','source_path':'specs/014-interactive-prototype-v1/tasks.md','evidence_path':rel(out/'report.md'),'satisfied':False}]}
(out/'completion.json').write_text(json.dumps(completion,indent=2))
print('Reports ready; final input integrity PASS; QA_FAILED/BLOCKED for frontend gate only.')
