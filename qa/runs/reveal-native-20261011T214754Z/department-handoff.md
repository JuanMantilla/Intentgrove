# Department handoff

QA_FAILED/BLOCKED. Candidate SHA256154f1893045c6dd1dfb08a6986cbe349d7bceb398e0b0d4ba6dbed7eaf4ff0b9. Full report /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/report.md. No repair work started; prompts are scoped handoffs, not implementation permission or user acceptance.

| Primary | Finding / severity / priority | Support | Next step | Retest |
|---|---|---|---|---|
| FRONTEND | QA-0031 S3/P2 | OS_ENGINEERING | Respect known missing/unavailable menu state | Both menus, live races, saved dirty exception, keyboard, EN/ES |
| OS_ENGINEERING | QA-0032 S3/P2 | FRONTEND | Bind unopened listed/menu targets to native identity | Before/after menu replacement rejection, valid current reveal, exact native selection |
| QA_AUTOMATION | B01 NOT_APPLICABLE/P2 | OS provider owner | Obtain reliable native overlay capture using supported tools | Four blocked menu visual cases |
| QA | Windows NOT_RUN | Windows host owner | Provide available native Windows host | Both menus select clicked file |

## QA-0031 — copy-ready remediation

```text
Use $senior-frontend-developer IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: QA-0031 S3 Medium; suggested P2.
Read: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0031.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/report.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/unavailable-tab-menu.txt, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/missing-dirty-menu.txt, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/source-review.txt.
Observed: current macOS app exposes enabled Reveal on known missing root-backed and dirty explicit tabs. Expected: unavailable targets hide/disable action per task item5; saved existing files with unsaved edits remain revealable.
Fix menu state composition in both entry points; preserve native grant-only payloads, graceful in-flight errors, drafts, existing keyboard/focus behavior, translations and nearby actions. Do not save to enable reveal or discard edits.
Authorization: this QA handoff grants none; retain applicable design/implementation gates and obtain scoped user instruction before code repair.
Verify both menus after known missing state, saved dirty availability, rename during open menu, root and explicit grants, keyboard/focus, EN/ES and light/dark. Return exact source/build hashes, changed scope, validation and absolute implementation handoff for independent native QA RETEST.
```

## QA-0032 — copy-ready remediation

```text
Use $os-senior-expert IMPLEMENT.
Project: /Users/juanmantilla/projects/personal/md-reader
Finding: QA-0032 S3 Medium; suggested P2.
Read: /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0032.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/report.md, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/race-verify-mutation.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/race-verify-finder.png, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/race-verify-selection-copy.txt, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/replacement-probe-final.log, /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/source-review.txt.
Observed: unopened explorer root-file request accepts a replacement inode after listing/menu entry and native Finder selects replacement. Opened grants reject it correctly. Expected: no unintended replacement selection per task item6.
Bind unopened targets to identity owned/validated by native code from selected/listed item; reject or safely dismiss stale targets before OS reveal. Coordinate the narrow renderer/menu contract with Frontend. Preserve root/file grant boundaries and deny arbitrary renderer absolute-path authority; no shell interpolation, protections/dependency/platform support changes, draft or document writes. Avoid claiming to eliminate normal post-validation OS races.
Authorization: QA handoff grants none; scoped implementation authorization remains separate.
Verify real filesystem before/after menu rename/delete/replace, opened/unopened root and explicit targets, valid fresh reveal, exact Finder selection; on available Windows host verify both menus with File Explorer. Report unavailable Windows tests honestly. Return source/build identities, changed paths, narrow policy tests and absolute implementation handoff for QA RETEST.
```

## Copy-ready QA retest

```text
Use $senior-qa-engineer RETEST. Project: /Users/juanmantilla/projects/personal/md-reader
Retest QA-0031 S3 and QA-0032 S3 on an identified fixed candidate. Read both canonical findings and /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/report.md / /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/coverage.json / current implementation handoff. Capture snapshot before checks. Keep product/config and all prior evidence read-only; disposable fixtures and isolated profile only. Verify complete native menu-to-Finder/File Explorer journeys, missing/dirty states, rename/delete/replace before and after menu entry, exact selection readback (cross-check stale Finder AX URLs with Copy as Pathname), keyboard/focus and nearby actions. Complete blocked menu theme/placement screenshots with supported native tooling. Windows absent = NOT_RUN; Linux remains unsupported. Save new run; passing QA is not user acceptance and authorizes no cleanup.
```

B01 investigation prompt: Use $senior-qa-engineer RUN with supported native provider access. Read /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z/evidence/provider-errors.txt; reproduce overlay omission/ScreenCaptureKit failures with disposable candidate. Do not change OS permissions, inject alternate input APIs or bypass restrictions. Capture actual menu pixels or retain BLOCKED. No AUTOMATE implementation requested.
