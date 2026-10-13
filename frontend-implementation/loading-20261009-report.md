# Loading system implementation — 2026-10-09

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

Implemented the approved 34-scenario loading package using the existing `PreviewLoading.tsx` system and actual frontend/native-promise state. [Scenario matrix](loading-20261009-matrix.md) records each owner, implementation, test evidence, deviation and integration limit. User acceptance remains pending.

Shared dots now pause when hidden/offscreen, use 3 px travel, and support known-row placeholders and truthful measured/indeterminate progress. Local state covers section entry, recent activation, initial Settings/recents, selection/reselection, image detail and HTML reload. Save/copy, recovery, cleanup and preference acknowledgment stay distinct. Same-file Markdown trees, source windows, current image previews and existing search results remain readable during replacement where their lifecycle supports retention.

Fixed related pending-state defects: Save As awaits the actual copy write; dialogs cannot dismiss an irreversible write through Escape; section entry prevents duplicate acquisition and disposes late sessions after navigation/close; delayed source-line lookups cannot override newer navigation; recent-list replies use generation ownership. Loading presentation preserves existing error/retry/reselection/cancellation flows and tab middle-click/whole-tab keyboard feedback. No dependencies, native code/contracts, CI, installation, commits, publishing or deployment changed. Original dirty source is preserved in `evidence/loading-20261009/baseline/`; the task-only source diff is `implementation.patch`.

## Verification

All commands ran from `/Users/juanmantilla/projects/personal/md-reader`.

| Command / check | Result | Evidence / limit |
|---|---|---|
| `npm test` | PASS — 506 tests / 62 files | `evidence/loading-20261009/tests-final.log`; full suite before final first-document placement and storage/status refinements. |
| `npm test -- tests/ui/workspace.test.tsx tests/ui/session.test.tsx tests/ui/approved-navigation.test.tsx tests/ui/folder-search.test.tsx` | PASS — 79 tests | `tests-final-navigation.log`; includes added first-document loading → success check after final placement refinement. |
| `npm test -- tests/ui/workspace-handoff.test.tsx tests/ui/session.test.tsx tests/ui/settings-window.test.tsx tests/ui/settings-initial-effect.test.tsx` | PASS — 62 tests | `tests-final-management.log`; final cleanup/status refinements. |
| `npm run build` | PASS | `build-final.log`; TypeScript and local Vite build, existing >500 kB chunk warning. No native packaging. |
| `git diff --check` | PASS | No whitespace errors. |
| Original design hashes | PASS | All approved source files match captured `design-hashes.json`. |
| Chrome real frontend + disposable mocked bridge | PASS for reviewed scope | Both themes in Margin/Folio/Atlas; 1440×1000 and representative 390×844 states; PNGs and `browser-review.json`. |
| Keyboard / middle-click | PASS for reviewed scope | Tab-close outline `none`, underline and whole-tab fill; background middle-click closes intended tab; pending section action retains focus. |
| Reduced-motion CSS simulation | PASS | Production reduced-motion rules yielded animation `none`; hidden/intersection unit checks also passed. Actual OS preference/media-query/native runtime NOT TESTED. |
| Native integration / screen readers | NOT TESTED | Browser APIs are mocked, no native builds or user-file operations performed. |

Initial diagnostic failures and an intermediate new-test query failure remain in their logs for traceability; the subsequent passing runs above are the final evidence. No timing/throughput claims or exhaustive 34×theme×layout×size visual claim is made.

## Remaining integration limits

- Combined native picker/grant calls expose no exact picker-dismissed verification phase. A native operation-correlated phase event would be needed for that precision; current feedback reflects the real outstanding promise.
- Native HTML decides when an old surface/token must be hidden/disposed. Guaranteed old-surface retention until replacement readiness needs native atomic activation/retention support; the existing geometry issue requires native review.
- Recovery Resume already has its acknowledged payload and is synchronous: no fake pending animation was introduced (E05). Open-ended folder scans remain indeterminate because totals are unavailable.
- Native file writes, cancellation, preference ownership, webview geometry, OS Reduce Motion and screen-reader announcements still need exact-candidate native verification.

Implementation: COMPLETE_IN_SCOPE. Functional checks: PASS for named scope. Visual review: PARTIAL / matches reviewed scope. Integration: MOCKED_ONLY. User acceptance: PENDING.
