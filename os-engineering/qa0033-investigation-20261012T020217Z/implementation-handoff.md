# QA-0033 investigation handoff

Outcome: INVESTIGATED; startup readiness rejection demonstrated in mocked runtime. Historical failing assertions NOT REPRODUCED in these attempts; their complete causal attribution remains UNRESOLVED. QA-0033 stays open. No implementation, acceptance, or release approval is implied.

## Candidate identity and changed scope

Frozen source: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source.

- Source SHA256: `2cc41faaae8acef11fb11b6b4d4cc607d5a9e5e3823c5b64b02d81f638fa7e29`. This hashes the 378 candidate-source input rows, sorted by relative path, serialized as UTF-8 JSON with sorted object keys and comma/colon separators, without a trailing newline. Exact scope and individual hashes: /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/source-manifest.json. This is an explicitly scoped input digest, not a Git commit or a hash of dependencies/build outputs.
- Frozen App SHA256: `6b4ea275a7239e452e6b3eca2a077e7454a112d427b8366ca27461295d2d140c`.
- Original New Markdown test SHA256: `844ba02eb36c82668db407939bfbc3e2ba6fe508a9ea3074155f5a7926127cca`.
- Native candidate: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/native-target/debug/bundle/macos/Intentgrove Select All Retest.app.
- Executable SHA256: `98c23a76af49d73d0abc8c530079c8c550911e7dbbf71d8ba168c9daeb01d730`.
- Bundle SHA256: `8563677182fe40690254a36779eff1cb516e1ddfe423dd36f92e63ce33f4e981`, reproduced from the original sorted JSON map of four bundle file hashes. Every bundle file still matches.

All 382 original tested input paths, including supplemental fixtures/native configuration, and 124 protected artifacts still match the pre-investigation hashes. The original 219-entry source manifest also has zero source drift. Evidence: /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/integrity-after.json and /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/candidate-identity.json.

Created only this investigation directory: report, runner, diagnostic configurations/setup files, snapshots, logs, traces, and integrity evidence. Product source, original tests/assertions/timers/configuration/fixtures, findings, prior reports, and project state were not edited. The test runner may write ordinary shared Vite/Vitest caches; these are outside the source digest. Canonical working source already differed from the frozen candidate and was not tested or modified by this investigation. No native app was operated, no profile was changed, and no install/build/permission/commit/publish/cleanup action occurred.

## Questions and observed ordering

The questions were whether activation reaches the dialog with readiness satisfied, whether duplicate delivery preserves ownership, and whether callbacks or reused per-file mocks provide an alternative explanation.

The earliest demonstrated rejection is `openNewMarkdown` in /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source/src/app/App.tsx:3109. In the full-context V4 trace, owner 2 records:

| Trace order | Event | Observation |
|---|---|---|
| 18 | Session load resolves | Original mock resolves null; callback is not cancelled. |
| 19 | Editor keyboard Cmd+T | `sessionReady=false`, `sessionReadyRef=true`; every other creation blocker is clear. Guard returns false; no dialog-opening callback runs. |
| 20 | Mock native-menu delivery | Same mounted owner now sees `sessionReady=true`; guard returns true. |
| 21 | Dialog callback | Opens the single dialog. |
| 22 | Session effect | Observes ready state. |

This proves one command is discarded between session-load resolution and a render that supplies the ready state to the handler. The two isolated diagnostic traces reproduce this keyboard rejection. The later menu delivery masks it in the passing test. An enabled visible button establishes presence, not that the handler's readiness contract has completed.

Evidence: /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/diagnostic-v4-full-01-trace.json and /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/activation-summary.json. Stack traces identify keyboard, button, Projects action, and native-menu call paths. All guard operands were captured at activation, including modal ownership, pending load/selection/edit/save/cleanup/history/native-opening state, and synchronous owner refs.

This is a frontend readiness contract exposed by premature test activation. The original tests await `findByRole` for an already-present welcome button, then activate it. The welcome button and Projects item disable only for `busy`; `newMarkdownReady` additionally requires `sessionReady` and other owners. The original Testing Library async wrapper drains through a zero-delay timer; that is not a readiness assertion or guarantee about React commits. The diagnostic did not add or modify that timer.

The native menu is different: /Users/juanmantilla/projects/personal/md-reader/qa/runs/select-all-retest-20261012T011743Z/candidate-source/src-tauri/src/lib.rs:64 applies `new_markdown_ready` plus main-window focus. The original test invokes the mocked callback directly, bypassing native menu enablement. Thus this trace does not prove a real native startup/menu defect.

The historical dirty-draft failures in both complete frozen logs point to `fillName` from test line 164: the first creation click, before creating a file or a dirty draft. The historical empty/Projects failure points to the first dialog wait at line 63, before Projects activation. These failures do not establish second-create draft loss or Projects-specific failure. They remain consistent with the readiness race, but no historical activation-time trace proves that attribution.

## Ownership, callbacks, and isolation

The full V4 dirty-draft journey opens on keyboard activation at order 84. Duplicate menu delivery at order 88 is rejected specifically by `newMarkdownOwner` and the existing modal. The unchanged assertions verify the second native identity, return to the original dirty draft, enabled Save, and no discard call. Both button/Projects opening and focus-return assertions pass in that trace.

Session-load callbacks are cancellation guarded; native listeners forward through the current `menuActionRef` and dispose late subscriptions. Session, reader-checkpoint, sidebar, worker, and painting timers have cleanup paths. Dialog close schedules a focus-restoration animation callback; HTML overlay opening can await retained handles. The observed Markdown journeys had zero HTML handles. Source excerpts and relevant cleanup paths are retained in /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/source-excerpts.txt.

Original per-file `beforeEach` resets mocks/storage/menu pointer; `afterEach` unmounts the React tree. The mock listener assigns the menu pointer synchronously and returns an empty unsubscribe function. The appearance controller is a module singleton reused within a test file; clearing localStorage does not reset it. Installed Vitest defaults use file isolation, and this project changes only maxWorkers to 2. The captured deliveries belong to the current mount; no trace proves stale session/menu delivery caused the rejection. All unrelated animation callbacks, queues, and singleton state were not exhaustively traced, so broader interference remains unexcluded.

## Checks and limitations

All attempts ran from the frozen source, retaining maxWorkers 2 and every original fixture/assertion/deadline. Commands, timestamps, environments, raw failures, and results are in /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0033-investigation-20261012T020217Z/evidence/check-results.json.

| Attempt | Result | Tests / limitation |
|---|---|---|
| Unchanged isolated four original journeys | PASS | 4 passed; 73 intentionally unselected. |
| Unchanged default full suite 01 | PASS | 670/670, 67 files; 48.85s. |
| Initial diagnostic isolated / full | PASS | 4 / 670 passed; recorder produced no usable runtime trace. Retained as inconclusive for ordering. |
| Diagnostic V2 / V3 isolated | PASS | 4 passed each; both trace the early keyboard rejection. Their broad `load-cleanup` label also covers another cancellation effect and must not identify session cleanup alone. |
| Diagnostic V4 full | FAIL | 664 passed / 6 failed, 67 files; all 77 New Markdown tests passed. Six failures belong to workspace-handoff/workspace-layout. V4 narrows the session-cleanup observation label. |
| Unchanged default full suite 02 | PASS | 670/670, 67 files; 111.54s. |
| Native startup / creation / dirty draft | NOT TESTED | Candidate bytes verified; prior ready-native result preserved. No native interaction or repair in this turn. |

Diagnostic configurations transform modules in memory to observe existing guards/callbacks and write traces. They do not mutate the candidate on disk or replace original test actions. Their added work and setup can alter scheduling; they are mechanism evidence, not unchanged gate passes. No sleeps, deadline changes, assertion weakening, fixture return changes, worker changes, or retry mechanism was introduced.

Host load rose substantially during unrelated concurrent test activity; isolated diagnostics still passed, and the second unchanged full suite passed. This does not establish host load as the cause. The six diagnostic-suite failures remain recorded and untriaged within this bounded finding.

## Implementation and QA RETEST boundary

No repair is proposed as proven or ready for implementation. The strongest supported conclusion is a startup-readiness race in mocked command delivery plus a visible-action/handler contract mismatch. The specific historical failed assertions, native startup applicability, and possible harness/environment contributions remain unresolved.

Next investigation should capture a failing original button activation with the same complete guard/readiness record, without changing its test actions, and separately establish the intended startup interaction contract. Do not replace `sessionReady` with its ref merely from this trace: restoration ownership and queued state must also be respected. No test-only readiness change can be represented as a product repair satisfying the user's unchanged-actions expectation.

Product changes require a separate user implementation instruction. After an authorized repair, a fresh QA RETEST must freeze/hash the actual repaired source and native candidate, pass repeated unchanged `npm test -- --dir tests` at maxWorkers 2 with all fixtures, and verify native empty/Projects opening plus second creation while preserving an existing dirty draft and keyboard/menu deduplication. Preserve all historical failures and ownership/history evidence. A serial or isolated pass does not clear the default-context finding.

This document is the implementation/QA handoff, not a fix-completion claim. No DONE_ACCEPTED record or cleanup eligibility was published.
