# Approved revised frontend implementation — 2026-10-10

USER-AUTHORIZED revision: /Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/designer-review-20261010-215012/html-proposals-20261010-215628/revision-20261010-220535. Authoritative handoff: /Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/designer-review-20261010-215012/html-proposals-20261010-215628/revision-20261010-220535/critique-and-handoff.md. Current user instruction: “I approve the revision identified below and authorize its scoped frontend implementation. Do not implement the superseded first draft.” Exact revision/approval/hash recorded in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/authorization.json. Older PROPOSED labels remain untouched and do not override this approval. Superseded first draft was not implemented.

IMPLEMENTATION: COMPLETE_IN_SCOPE for DR-001/002/004/005 at the approved desktop composition, with preserved overflow fallbacks described below. FUNCTIONAL_CHECKS: PASS for the named frontend suite and disposable native Save/Keep/Cancel sequence. VISUAL_REVIEW: PARTIAL; wide states reviewed, minimum-height/Atlas pinning and native resizing remain gaps. INTEGRATION: PARTIAL (real native Markdown save/search and same-process draft resume; broader recovery/error/platform matrix not certified). USER_ACCEPTANCE: PENDING. QA_BLOCKED / AWAITING_ACCEPTANCE; no deployment, installation, commit, push, cleanup or DONE_ACCEPTED.

## Scope and implementation

- DR-001: query and Search/Stop share a row; scope and Clear remain outside the results viewport. Selected mode is visible on the trigger. Options preserve all three modes, ignored-file setting and Markdown coverage. Ignored-on has an explicit indicator. Arrow/Home/End, native Tab/Space/Enter, selection focus return and Escape dismissal are wired to real state. Escape dismisses options before Projects. Counts remain available through the status disclosure; errors remain visible in its summary. Existing search jobs, cancellation, stale responses, previous-result disabling and result opening remain unchanged. Normal-size results scroll independently; height-constrained fallback is below.
- DR-002/005: full-width filename row above document-owned controls; measured middle abbreviation only after using available width. Existing fonts, tokens and icons reused. Parent context remains alongside toolbar; Document → Show path and Open documents retain complete identity. Tree rows expose complete accessible names and retain selection/height; actual 264px and 320px renderer sidebars distinguish alpha.md/beta.md. Short labels remain unchanged.
- DR-004: structured Save to file / Guardar archivo and Keep draft / Conservar borrador explanations, primary Keep, distinct Cancel/Discard. Read, tab, window, quit and folder intents have different titles; non-read copy does not say “returns to reading.” The existing resolveClose, checkpoint, save, conflict and recovery behavior is unchanged. No durability/relaunch promise was added.

## Changed implementation and tests

- /Users/juanmantilla/projects/personal/md-reader/tests/ui/close-edit.test.tsx
- /Users/juanmantilla/projects/personal/md-reader/tests/ui/folder-search.test.tsx
- /Users/juanmantilla/projects/personal/md-reader/tests/ui/workspace-handoff.test.tsx
- /Users/juanmantilla/projects/personal/md-reader/tests/ui/edit-flow.test.tsx
- /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/redesign-preview.tsx
- /Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts
- /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx
- /Users/juanmantilla/projects/personal/md-reader/src/app/DocumentLocation.tsx
- /Users/juanmantilla/projects/personal/md-reader/src/app/FolderSearchPanel.tsx
- /Users/juanmantilla/projects/personal/md-reader/src/styles/app.css
- /Users/juanmantilla/projects/personal/md-reader/src/app/MiddleFilename.tsx
- /Users/juanmantilla/projects/personal/md-reader/tests/ui/middle-filename.test.ts

Task-only diff (against preserved dirty source, not HEAD): /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/task-diff.patch. Original relevant files retained under /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/baseline/ with .baseline suffix on TS/TSX copies to avoid accidental test discovery. Package/lock/native source/config/security contracts were not edited. Generated dist/debug artifacts came from local builds. Main plan/report/STATE and /Users/juanmantilla/projects/personal/md-reader/.agents/state.md receive a new phase entry; prior dirty documentation/history is retained.

## Verification commands and outcomes

All npm commands ran in /Users/juanmantilla/projects/personal/md-reader; cargo ran in /Users/juanmantilla/projects/personal/md-reader/src-tauri.

| Command | Observed result | Evidence |
|---|---|---|
| npm test -- tests/ui/close-edit.test.tsx tests/ui/edit-flow.test.tsx tests/ui/folder-search.test.tsx tests/ui/middle-filename.test.ts | PASS, 51 tests after adapting changed copy and removing baseline files from discovery | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/focused-tests-final.log |
| npm test -- tests/ui/folder-search.test.tsx | PASS, 17 tests, including failed-start retry and empty EN/ES states | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/search-state-tests.log |
| npm test | PASS, final candidate: 556 tests in 64 files | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/full-tests-final-candidate.log |
| npm run build | PASS, type check and local Vite build; existing large-chunk warning | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/build-final-candidate.log |
| git diff --check | PASS, exit 0 | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/diff-check.log |
| TAURI_CONFIG="$(cat ../frontend-implementation/evidence/revision-20261010/runtime-overlay.json)" CARGO_NET_OFFLINE=true cargo build --bin md_reader --offline --locked --no-default-features | PASS, 11.98s; four compiler warnings, no native fixes | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-build-final.log |
| npm run dev -- --host 127.0.0.1 --port 5187 --strictPort | PASS, disposable real-App renderer; native bridge mocked | task dev-server session, screenshots |
| npm run dev -- --host 127.0.0.1 --port 5173 --strictPort | PASS, isolated native candidate served actual app source | /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-provenance.json |

Initial focused run failed because saved baseline tests were discovered and some old-copy expectations were still used. Baseline copies were renamed, affected expectations updated, and regressions corrected (duplicate title attributes removed). An initial native overlay preparation used the wrong relative directory and failed; corrected build succeeded. All failed logs are retained. No failure is dismissed as pre-existing without evidence.

CodeGraph was consulted first and reported affected files drifted from its index; current source was then read directly. Installed Spec Kit check-prerequisites.sh --paths-only --json reports global 013-windows-desktop. This explicit cross-feature frontend revision did not change global feature state or alter the unrelated Windows specification.

## Actual rendered evidence

Ten approved PNGs and seven relevant original native PNGs were visually inspected using the local image tool, without accessing the blocked browser file route. Chrome rendered the actual App and real components at 1280×820, EN/dark and ES/light, using an opt-in disposable synthetic bridge fixture. It is not native integration proof. Native WKWebView captures are separate PNGs, 1280×820 including 32px native chrome, and use real filesystem commands.

- Final shared-icon renderer: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/final-search-en-dark.jpg and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/final-search-options-en-dark.jpg.
- Matching-state pairs: all ten actual renderer images have full absolute links in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/evidence-index.md.
- Measured header: 80px for short and long reading identities at 1280×820; result scrolling moved inner scrollTop to 820 while outer scrollTop remained 0 and query top remained 275 in both locales. Exact records: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/render-metrics-en.json and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/render-metrics-es.json.
- Full disclosure: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/full-path-disclosure.jpg and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/open-documents-disclosure.jpg.
- Native integration/visuals: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-draft-en.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-keep-reading.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-save-reading.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-search-en.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-search-later-en.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-search-es-light.png, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-identity-es-light.png. Native captures precede the final decorative chevron substitution; save/state logic and layout are unchanged by that substitution. Final renderer captures include it.
- Sidebar widths/supported sizes/layouts: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/tree-320-es-light.jpg, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/width-1024-es-light.jpg, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/search-640-fallback-es-light.jpg, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/atlas-search-en-dark.jpg, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/folio-search-en-dark.jpg. Row height measured 37px at both sidebar widths. No document-level horizontal overflow observed at the checked widths.

The design is a qualitative reference, not a pixel-perfect regression baseline. Existing native/renderer tokens and font metrics are preserved. The long fixture fits the static mockup but needs middle abbreviation in the actual 16px font; its meaningful ending remains visible. Editing header can grow beyond 80px because existing Save/progress helper text is preserved. No text was shrunk to force the reference geometry.

## Disposable native Save / Keep / Cancel

Candidate: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/Intentgrove UI Revision.app; unique compiled identifier com.juanmantilla.intentgrove.frontendrevision.r202610102230, main incognito, original debug binary copied without signing. Original installed process 5266 at /Applications/Intentgrove.app/Contents/MacOS/md_reader remained running and untouched. Settings and auxiliary surfaces were not opened. Native app was quit through its own Quit shortcut after verification.

Fixture: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-fixtures/cancel.md. Cancel kept the edited section active and disk SHA256 unchanged. Keep returned to reading, retained one unsaved edit, and left disk unchanged. Reopening that same section restored “validationneedle cancel-fixture document match.” Save from the confirmation updated the disk, cleared the edit and displayed the changed text in reading. Only the edited section changed; existing serializer emitted cancel\-fixture in Markdown. The initial expectation of an unescaped hyphen failed; the actual serialized bytes and rendered meaning were inspected, not hidden. Evidence: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-cancel-bytes.json, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-keep-bytes.json, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-save-bytes.json, /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-keep-ax.txt and /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-save-ax.txt. This verifies same-process draft retention and a real primary-file save; it does not verify relaunch durability or every conflict/failure path.

## Remaining validation and deviations

| Item | Status | Concrete gap |
|---|---|---|
| DR-001 pinning at short height / Atlas | PARTIAL | Existing chrome/footer leave insufficient height (640×480 search host measured 75px; Atlas host 157px). Restored existing outer scroll fallback plus a 96px independent results viewport keeps controls/results reachable, but controls cannot all stay pinned in these constrained views. No new narrow composition introduced. |
| DR-003 narrow native behavior | BLOCKED / DEFERRED | CUA native drag reports noWindowsAvailable. Native resizing/second sidebar width cannot be certified. Renderer 640×480 shows existing sidebar pixels even after its accessible collapsed state; captured evidence is not accepted native narrow UX. |
| Second native sidebar width | BLOCKED | Same native drag capability failure; two widths verified only in actual Chrome renderer. |
| Native ignored-file discovery, stopped/error/conflict/relaunch matrix | NOT RUN | Covered frontend state/requests and existing mocked regressions; no exhaustive real-native failure injection or restart pass. |
| Screen reader, 200% zoom, measured full contrast conformance | NOT RUN | No VoiceOver/zoom/conformance pass; screenshots and build are not acceptance evidence for these. |
| Final user acceptance | PENDING | Design approval authorizes implementation, not final acceptance. |

No browser local-file workaround, dependency installation, backend contract, privilege change, release installation, deployment or cleanup was performed. Native fixture baseline hashes were captured before native actions in /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-provenance.json; QA helper snapshots explicitly cover listed frontend source/config/test inputs, not all native transitive dependencies or the entire repository. Final file-byte/module audit: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/native-byte-audit-final.json confirms the saved disk hash and unchanged App module from the native-flow baseline. This is an audit of earlier live evidence, not a second live native execution. Final tested source snapshot: /Users/juanmantilla/projects/personal/md-reader/qa/runs/frontend-revision-20261010/tested-snapshot-v6.json.

Exact next step: user reviews this implementation handoff; a separate permitted native resize/narrow/accessibility/relaunch validation pass remains. Deployment and final acceptance are separate.

Coverage ledger: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/evidence/revision-20261010/coverage.md
