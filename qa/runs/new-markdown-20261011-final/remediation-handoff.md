# New Markdown Option B — remediation handoff supplement

Created 2026-10-11 from the completed independent QA RUN. This supplement adds executable handoff prompts; it contains no new testing or fixes and does not supersede the original evidence, verdict, or completion receipt.

Project: /Users/juanmantilla/projects/personal/md-reader
Original report: /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/report.md
Coverage: /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/coverage.json
Evidence index: /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/index.md
Approved Option B: /Users/juanmantilla/projects/personal/design-review/intentgroove/new-markdown-20261011/index.html
Tested snapshot: /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/tested-snapshot.json

Verdict remains QA_FAILED / BLOCKED; acceptance pending. Ledger: 116 rows, 48 PASS, 3 FAIL, 45 BLOCKED, 18 NOT_RUN, 2 NOT_APPLICABLE. Real macOS, browser/mock, supporting unit tests, and unavailable real Windows remain separate. Native candidate SHA-256: c595fd6796fcf7230fc0e390ce2bcf883993f7dec305ddbed5f94ca1e82133a6; isolated unsigned wrapper, not the installed user application.

## Routing

| Finding | Severity / suggested priority | Primary skill and mode | Supporting owner | Required outcome |
|---|---|---|---|---|
| QA-0027 | S3 Medium / P2 | $senior-frontend-developer IMPLEMENT | $os-senior-expert | Own Save followed by Recent reopen works while external replacement protections remain intact |
| QA-0028 | S3 Medium / P2 | $senior-frontend-developer IMPLEMENT | $os-senior-expert | UI rejects native-reserved and C1-control names with accessible inline errors |
| QA-0030 | S3 Medium / P2 | $senior-frontend-developer IMPLEMENT | $os-senior-expert IMPLEMENT; UI_UX/PRODUCT only if changing approved policy | UI/native follow approved trailing-space and competing-extension rules |
| QA-0029 | NOT_APPLICABLE (environment blocker) / P1 | $os-senior-expert DIAGNOSE | QA_AUTOMATION | Establish supported isolated file/folder picker confirmation and discriminate root cause |
| QA-0025 | NOT_APPLICABLE (environment blocker) / P2 | $senior-qa-engineer RUN | $os-senior-expert DIAGNOSE | Establish real native geometry/scroll access without changing protections |

Ownership is evidence-based routing, not proof of cause. Existing Option B authorization is retained; the prior QA turn explicitly prohibited product fixes. These prompts define subsequent scoped IMPLEMENT/DIAGNOSE/RETEST work and do not launch it. Follow applicable approval gates; do not seek duplicate approval for already authorized repairs. No dependencies, installed-app replacement, OS protection changes, publish, commit/push, existing artifact deletion, cleanup, or DONE_ACCEPTED.

## Copy-ready fix prompt — QA-0027

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Fix QA-0027 (S3 Medium; suggested priority P2).
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0027.md and its evidence, especially /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-after-save.json and /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-recents-reselection.txt.
Observed on real macOS: New -> first content -> explicit Save -> close -> Recent reopen requires reselection without an external writer; Save replaced the inode and the saved file remains intact.
Required: acknowledge the app's own successful Save in the durable Recent identity so the saved document reopens normally. First compare native grant identity and Recent identity; stale frontend Recent metadata is a hypothesis, not a proven complete cause. Coordinate $os-senior-expert if native identity publication is implicated. Use CodeGraph before inspecting indexed code.
Preserve external replacement detection, grants, unrelated dirty drafts, user data, and existing worktree edits. Do not weaken security checks or treat a failed/uncertain Save as acknowledged success.
Verify both granted-root and token-picked New -> first Save -> close -> Recent reopen and restart; saved bytes intact. Verify an external replacement still requires the existing protected recovery path. Include relevant save-failure and conflict regressions. Label native versus mocked evidence separately.
Return exact changed paths, source/candidate/build identity, observed checks, limitations, and a full absolute implementation handoff path for QA RETEST. Apply only the existing authorized Option B repair scope; no installation, dependencies, OS protection changes, publishing, commit/push, or deletion of existing artifacts.
```

## Copy-ready fix prompt — QA-0028

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Fix QA-0028 (S3 Medium; suggested priority P2).
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0028.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/browser-events.json, and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/new-markdown-20261011-native-request.md.
Observed in the actual browser App with a mocked bridge: CON .txt and a filename containing interior U+0085 leave Create enabled; authoritative native validation rejects their reserved/control forms. Actual native rejection interaction was NOT_RUN.
Align frontend validation with authoritative portable native policy, including reserved-basename space handling and C1 controls. Display associated accessible inline errors and disable Create for invalid inputs. Keep native validation decisive; coordinate $os-senior-expert for contract discrepancies. Use CodeGraph before indexed code inspection.
Preserve valid Unicode, emoji, dotted basenames, UTF-8 byte limits, filename text after errors, focus return, and existing grants. Verify invalid forms plus Niño, emoji, dotted names, byte boundaries and keyboard submission. Native malformed requests must still fail without writing or false success. Keep mocked results distinct from real filesystem/native results.
Return exact changed paths, check results, candidate identity, limitations and full absolute handoff path for QA RETEST. Stay within authorized Option B repairs and preserve unrelated changes; no install, dependencies, OS protection changes, publish, commit/push or existing-artifact deletion.
```

## Copy-ready fix prompts — QA-0030

### Frontend primary

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Fix QA-0030 (S3 Medium; suggested priority P2), coordinating the native companion prompt below.
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0030.md, /Users/juanmantilla/projects/personal/design-review/intentgroove/new-markdown-20261011/index.html, /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/approved-option-b-text.txt, and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/new-markdown-20261011-native-request.md.
Observed in browser/mock: trailing-space "note " becomes note.md and file.txt becomes file.txt.md with Create enabled. Approved Option B blocks trailing spaces/dots and competing extensions; later terminal .md normalization authorization did not waive these rules.
Implement the approved policy with accessible inline feedback, retaining explicitly authorized .md/.MD/repeated terminal extension normalization and valid dotted basenames such as release.v2.md. Resolve any genuine conflicting approval provenance at its source; tests are not approval evidence and do not invent a broader extension policy. If proposing a changed policy, route only that decision through UI_UX/PRODUCT and the existing approval workflow.
Use CodeGraph before indexed code inspection. Verify trailing spaces/dots and file.txt rejection, release.v2.md acceptance, note.MD and repeated terminal md behavior, Unicode/byte boundaries, retained fields, Enter, Tab/Shift+Tab, Escape and focus return. Coordinate UI/native agreement with $os-senior-expert and obtain a real create journey when access permits.
Return changed paths, approved-rule provenance, checks, candidate identity, limitations and full absolute handoff path. Preserve unrelated edits, user files, authority/grants and QA evidence; no unapproved redesign, installation, dependency changes, OS protection changes, publish, commit/push or existing-artifact deletion.
```

### Native companion

```text
Use $os-senior-expert IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Support QA-0030 (S3 Medium; suggested priority P2); coordinate $senior-frontend-developer IMPLEMENT.
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0030.md, /Users/juanmantilla/projects/personal/md-reader/os-engineering/new-markdown-20261011/frontend-handoff.md, and /Users/juanmantilla/projects/personal/design-review/intentgroove/new-markdown-20261011/index.html.
Use CodeGraph before inspecting indexed code. Align authoritative native filename policy with approved trailing-space/dot and competing-extension rejection while preserving authorized terminal .md/.MD/repeated suffix normalization and dotted basenames. Keep native rejection independent of UI controls. Do not silently resolve a genuine requirement ambiguity by changing the selected design.
Verify rejected direct native requests cause no created file, overwrite, grant expansion or false-success response. Preserve exclusive create, duplicate/race protection, valid Unicode/UTF-8 limits, retained destination grants, save/conflict/recovery behavior and the shipped Windows write gate. A gate change requires its own supported authorization and real Windows proof.
Return exact changed paths, frontend contract impact, source/build identity, checks and limitations, and a full absolute native handoff path for QA RETEST. Stay within authorized Option B repairs; do not replace the installed application, install dependencies, change OS protections, publish, commit/push or delete existing artifacts.
```

## Copy-ready diagnostic prompt — QA-0029

```text
Use $os-senior-expert DIAGNOSE.
Project: /Users/juanmantilla/projects/personal/md-reader
Investigate QA-0029 (ENVIRONMENT_BLOCKER; severity NOT_APPLICABLE; suggested priority P1). Product defect/root cause UNKNOWN.
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0029.md and /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-candidate.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-file-picker-blocked.txt, and /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-second-picker.txt.
Initial isolated native folder selection/create succeeded. Later valid disposable file/folder selections kept Open disabled, including fresh-process attempts. Discriminate package/wrapper, NSOpenPanel filter/validation, effective filesystem access, and host/provider behavior. Compare folder selection before any file picker, after cancellation, and after own-save reselection. Obtain supported native rejection reasons where available. Use CodeGraph before indexed code inspection.
Keep product code/configuration read-only in DIAGNOSE. Use disposable data and isolated profiles/ordinary supported local packaging. Do not change OS protections, broaden grants, inject arbitrary path authority, replace the installed app, install dependencies, or discard earlier successful/blocked attempts.
Return reproducible diagnosis, evidence, identified candidate/configuration, and a precise next action. If a product cause is established, hand off a bounded IMPLEMENT task; do not implement in this diagnostic pass. Verify both file and folder confirmation plus cancellation retaining fields/grants, or explicitly report BLOCKED. Native access must be restored before claiming the remaining create/discard/conflict/recovery journeys pass.
```

## Copy-ready access prompt — QA-0025

```text
Use $senior-qa-engineer RUN for scoped access verification.
Project: /Users/juanmantilla/projects/personal/md-reader
Investigate QA-0025 (ENVIRONMENT_BLOCKER; severity NOT_APPLICABLE; suggested priority P2), with $os-senior-expert DIAGNOSE support if host/window targeting evidence requires it.
Read /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0025.md and /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/evidence/native-errors.json.
Semantic access/screenshots work, but real native edge drag/scroll reports noWindowsAvailable. Establish supported window targeting/coordinate access with the actual available tool documentation. Do not assume browser viewport resizing proves native geometry, alter OS protections or install a provider.
Verify measured real native wide/narrow window content, geometry, reachable editor/actions and scrolling, respecting the native 640 minimum width. Check Light/Dark/System and EN/ES; distinguish current System resolution from an actual live appearance transition. Preserve prior attempts and record inaccessible controls as BLOCKED or NOT_RUN. Product code/configuration stays read-only; use only isolated profiles and disposable data.
Save new access evidence in a new unique QA directory, return exact paths/tool capability limitations and supported next steps. No product fixes, installation, OS protection changes, publish, commit/push, acceptance or cleanup.
```

## Copy-ready retest prompt — fixes and residual coverage

```text
Use $senior-qa-engineer RETEST.
Project: /Users/juanmantilla/projects/personal/md-reader
Retest QA-0027, QA-0028 and QA-0030 (each S3 Medium/P2) on the identified fixed candidate; re-evaluate QA-0029 (blocker/P1) and QA-0025 (blocker/P2) only on supplied supported access. Do not claim fixes before implementation handoffs and exact candidate/build identity exist.
Read /Users/juanmantilla/projects/personal/md-reader/qa/runs/new-markdown-20261011-final/remediation-handoff.md, the five canonical finding files under /Users/juanmantilla/projects/personal/md-reader/qa/findings, the original report/coverage/evidence index, and supplied frontend/native implementation handoffs. Read applicable AGENTS.md and /Users/juanmantilla/projects/personal/.agents/qa-cleanup-integration.md. Use CodeGraph before indexed code inspection.
Capture a new baseline before checks; use a new unique run directory under /Users/juanmantilla/projects/personal/md-reader/qa/runs. Append finding history and preserve the original run and completion receipt. Product source/configuration stays read-only.
Verify each prompt's criteria and nearby regressions: own-save Recent close/reopen/restart versus external replacement; reserved/control/trailing-space/competing-extension parity with Unicode, long UTF-8 and authorized terminal suffixes; actual exclusive duplicates/races and create/write failures without overwrite or false success.
Complete residual reachable coverage from the original ledger: Projects/empty/native File menu/Cmd+T/Ctrl+T; editor-focused, combined native/DOM, repeat, dirty-draft/modal/picker ownership; destination defaults, individual-file parent restrictions, destination cancellation/changes and retained grants; zero-byte identity, first content, explicit Save, close/reopen, discard leaving empty file, conflicts and dirty-exit/relaunch recovery; Tab/Shift+Tab, Enter/Escape, accessible errors and focus return; measured wide/narrow Light/Dark/System EN/ES and live System behavior.
Report browser/mock, real macOS and real Windows separately. Real Windows runner access is still missing; retain BLOCKED/NOT_RUN if unavailable. Passing builds/tests do not establish native behavior, and the shipped Windows write gate must not be weakened to obtain a PASS. Preserve every prior failed/intermittent attempt.
Do not install dependencies, replace the installed user application, change OS protections, publish, commit/push, delete existing artifacts or fix product code. Finalize new coverage/evidence and department prompts, record actual QA completion without DONE_ACCEPTED, and do not start cleanup. Passing QA is not user acceptance.
```

No IMPLEMENT, DIAGNOSE or RETEST execution was started by creating this supplement. Prior unresolved findings and missing real Windows access remain open.
