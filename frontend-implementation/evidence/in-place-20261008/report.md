# Direct in-place section editing — 2026-10-08

IMPLEMENTATION: PARTIAL. The source/split authoring experience is removed. Native Edit-menu ownership and complete cross-platform/visual/native acceptance remain open. USER_ACCEPTANCE: PENDING.

## Authority and scope

USER-AUTHORIZED current explicit IMPLEMENT instruction and approval-all-2026-10-05. Approved interaction/handoff/mockup hashes were recorded at investigation (see plan and command evidence). The later approved direct editor supersedes the older F004 source/live-preview UX. Canonical feature002 spec/design/plan carry that explicit reconciliation; historical approval records and SVGs are preserved. Spec Kit inspected using feature002 NO_PERSIST; global013 remains selected.

Worktree was extensively dirty before this task (`worktree-before.txt`). Separate HTML integration continued changing App/API/i18n and adding HtmlView/controller/tests during this session; these were preserved. Broad repository diffs are not attributable solely to this editor slice. No dependency, native implementation, privilege, persistence schema, installation, commit, push or deployment changes were made by this slice.

## Implemented

- `MarkdownView` mounts the editor exactly where the original native section's rendered blocks were, suppressing their original duplicate rendering. The native byte span must decode to the original section source and must not cut a rendered block. Recovered sessions use that native descriptor even when a fresh full section list is unavailable. Other sections stay readable in the same reader-scroll surface.
- `RichSection` edits actual heading, paragraph, list/task, table-cell and literal code content. DOM beforeinput/paste/cut/composition commit localized source transactions. Plain paste inserts text, never clipboard HTML. Noncancelable text replacements reconcile one mapped leaf then rebuild safe DOM. There is no whole-section DOM-to-Markdown serializer.
- `rich-source` maps UTF-16 text boundaries back to original syntax offsets, including backslash escapes/entities/emoji. Unchanged entry and unchanged property Apply do not change source. All unmodified source units remain intact; the native byte splice retains file bytes outside the selected original section.
- Return splits paragraphs/continues safe lists; empty item Return exits; Backspace/Delete safely join adjacent plain paragraphs/sibling items; supported list indent/outdent and table traversal do not broaden scope. Explicit table row/column/alignment operations preserve surviving cell spelling; whole-table/header/last-column destruction is refused. Wide tables scroll locally.
- Selection formatting provides Bold/Italic/Inline code/Strikethrough/Link and More with blockquote/rule; Cmd+B/I use source transactions. Existing links/images have local target/label/title property fields; unchanged Apply preserves original syntax. Code language fields retain fence and metadata. Unsafe transformations, reference-target rewrites, fence-breaking edits and heading-level remapping are refused.
- CodeMirror EditorState/historyField remains the source transaction and checkpoint engine with no CodeMirror view mounted. Undo/Redo, selection and schema1 checkpoint history remain compatible in both directions. Invalid/mismatched state blocks editing and checkpoint replacement with a reason, retaining the draft and original checkpoint. Source History is never silently reset.
- Native Save/Save As/conflict/dirty close/Keep draft APIs remain wired as before. Save holds input; failed Save/cancelled Save As retain the draft; Save returns to reading only after acknowledgment. Draft heading edits update outline labels while retaining the original anchor identity during the session. Find uses the current source draft and reveals mapped rendered positions.
- YAML, Mermaid, raw HTML, definitions/unknown or unmappable constructs remain source-backed opaque blocks. Recognizable unfamiliar extension blocks are locked. Non-LF sections are read-only and do not enter/checkpoint a normalized engine. This explicitly preserves the CRLF Save deferral; it is not a CRLF repair.
- EN/ES status, locks, safe-refusal and property labels; existing theme/reading CSS variables and responsive wrapping. Test-only QA observation hashes the actual source checkpoint JSON and rendered-owner identity instead of looking for a removed CodeMirror DOM.

## Verification boundaries

Actual rendered editing and client workflows are exercised through DOM input and UI controls, not a fabricated engine callback. App tests mock native APIs. Rust editing/recovery tests use real disposable files/storage; they do not prove the combined packaged frontend/native workflow.

Commands and recorded results:

- Initial rich editor test run:16PASS (`focused-initial.log`). Intermediate structural23 run:22PASS/1FAIL (ambiguous status query; fixed with precise visible-message query), retained in `structural.log`.
- Serial six-file editor integration:52PASS (`integration-second.log`). Initial concurrent run43PASS/9FAIL retained; obsolete raw-source assertion repaired, unchanged test deadlines. Recovered-native-span placement defect was fixed; session/rich rerun47PASS (`recovery-integration.log`).
- Initial full run:401PASS/5FAIL (`full-initial.log`), on changing inputs. Second full run interrupted after repeated timing/initial-render failures while another test process was active (`full-second.log`); not a full PASS. A twelve-file run:118PASS/2FAIL (`focused-final.log`): startup timeout and stale checkpoint observation. The latter test now waits for its existing editingActive assertion to become durable rather than inspecting an earlier checkpoint; no assertion/deadline removed.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml --lib editing::`:22PASS (`native-editing.log`), actual disposable native Save/Save As/conflict/source-byte tests.
- `cargo test --offline --manifest-path src-tauri/Cargo.toml --lib recovery::`:16PASS/1IGNORED (`native-recovery.log`), existing schema/migration/owner/checksum/atomic retention/process-exit and100-checkpoint tests. Existing ignored test is not a PASS.
- Local production TypeScript/Vite builds PASS at named intermediate checkpoints (`build-initial.log`, `build-second.log`, `build-fifth.log`, `build-final.log`, `build-latest.log`, `build-frozen.log`). Intermediate build-third FAIL due to corrected editor narrowing; build-fourth FAIL while concurrent new HTML translation keys were incomplete. Preserve both logs. Large chunk warnings remain.
- Worker guard PASS (`worker.log`, `worker-latest.log`). `git diff --check` PASS at checkpoint (`diff-check.log`). Final verification is appended below.

## Real interface review

Approved SVG was rendered with Quick Look and visually inspected (`02-in-place-editing.svg.png`, reference only). Real Chrome frontend on macOS with disposable synthetic native bridge was inspected at1440×900 dark/English (`dark-en-1440.png`). Observed single column, thin left boundary, named editing section, clean/recovery statuses, rendered typography/lists, reachable Save/Return and Undo/Redo; no source pane/preview. Real sequential browser typing updated rendered paragraph text. Corrected initial extra empty paragraph and tight-list spacing during review. Screenshot covers an intermediate source checkpoint; it is not final-source or native acceptance.

Browser transport subsequently timed out/reset and reported no available browsers. Further900/640, light/Spanish, enlarged text, final-source captures, physical IME, VoiceOver and packaged WebKit checks: NOT TESTED. Frozen disposable renderer build succeeded (`renderer-build.log`), but opening that snapshot failed with the unavailable browser. Requested viewport reset could not be completed after transport loss; no user-owned preference was changed intentionally. Runtime/model composition tests are not a physical input-method certification.

## Remaining scope and dependencies

Native Edit menu Undo/Redo currently owns WebView DOM history, while direct authoring commits source transactions. Native Format menu/state/focused-owner dispatch needs the concrete minimal [IR-01 request](../../in-place-native-request-20261008.md). The skill says “Do not silently … alter backend/API/authentication contracts” and “Raise a specific change request for work outside the authorized frontend scope”; no native extension was silently applied. This is the only new native contract proposed by this slice; a rich checkpoint schema2/dependency is unnecessary for the implemented engine.

Conservative safety limits are visible: verified LF adapter; section parser budget128KiB; arbitrary selections across multiple text leaves/opaque blocks cannot be replaced/deleted as one operation; unsafe mixed/nested structural transformations and heading-level changes are refused. Literal code remains editable but does not currently retain syntax-token highlighting during editing. These limitations, complete native menu routing and full platform acceptance prevent declaring the entire approved experience complete. No raw-source editing fallback is offered.

Next: resolve native Edit-menu owner routing; extend verified rich transactions where safe; perform the exact packaged LF Save/Save As/conflict/dirty exit/restart and final theme/locale/size/input matrix. Preserve the existing CRLF deferral and unrelated HTML work. Do not relabel historical native candidates or user acceptance.

## Final scoped verification ledger

- `npm test -- --maxWorkers=1 tests/ui/rich-section.test.tsx`:29PASS (`rich-blur-final.log`), including the final composition-focus-exit change. Visible IME text commits/checkpoints before a control/tab takes focus, without double-committing a late compositionend. This remains simulated DOM input, not physical WebKit IME acceptance. Earlier28PASS is retained in `rich-final.log`.
- `npm test -- --maxWorkers=1 tests/ui/workspace-handoff.test.tsx`:20PASS (`workspace-isolated.log`), selected-section boundaries, unchanged surroundings, renamed outline/original anchor and tab/Save/Save As workflows.
- Twelve-file serial run:101PASS/22FAIL (`focused-frozen.log`). Inputs were not actually frozen throughout; code language/outline changes occurred after its launch. Preserve the filename and do not interpret “frozen” as an immutable source certification.
- Ten-file current workflow run:73PASS/2FAIL (`workflows-current.log`). Appearance isolated reproduced a fixture defect (`appearance-isolated.log`): JSX string attributes contained literal backslash+n rather than LF. Corrected only the fixture to actual newline expressions; rerun1PASS (`appearance-corrected.log`).
- Close isolated run22PASS/1FAIL (`close-isolated.log`): Keep draft assertion sampled tab presence after the dialog closed but before the asynchronous close completed. Current closeTabs explicitly awaits hideHtml before updating tabs. The test now awaits its existing tab-absence assertion, with the original deadline/assertion preserved. Result recorded below.
- Latest `npm run build`:PASS (`build-verified-final.log`), TypeScript and Vite; large chunk warnings retained. Previous `build-current.log` failed on two new test query options (`exact` unsupported for ByRole); string name queries already match exactly, so options were removed. `build-current-second.log` and `build-final-current.log` PASS at their respective checkpoints.
- `node tests/worker-bundle.mjs`:PASS (`worker-current.log`); `git diff --check`:PASS.

Browser inventory was retried and again returned no browsers. Task-owned preview/dev servers were stopped. Separate sessions continued editing App and running whole-suite/native release processes; those processes and edits were not stopped or altered. The earlier current-source manifest detected App drift while this slice's editor files matched. Final source hashes identify the delivered checkpoint; they do not certify an atomic shared-worktree snapshot for every historical command. No overall regression/complete native/complete visual PASS is claimed.

Final close-choice rerun: `npm test -- --maxWorkers=1 tests/ui/close-edit.test.tsx`:23PASS (`close-completion.log`). These tests mock SectionEditor/native APIs and verify dirty close routing; actual rendered editing is covered separately by the29 rich tests and20 App workspace tests. All11 delivered-source.sha256 entries matched at the last check. `git diff --check`PASS recorded in diff-delivered.log. No test/assertion/deadline disabled or increased.
