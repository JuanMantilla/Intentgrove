# QA-0018 / QA-0019 repair — 2026-10-08

USER-AUTHORIZED: “please fix these bugs” with senior-frontend-developer. IMPLEMENT scope: frontend lifecycle/state wiring and regressions. Existing unrelated work and dependency/native changes preserved. Spec Kit paths-only reports selected 013-windows-desktop; selection unchanged. These are retained macOS defects, not implementation of feature 013.

| Finding | Implemented behavior | Evidence | Remaining gap |
| --- | --- | --- | --- |
| QA-0018 | Stable Markdown component types preserve diagram consumers during language/layout updates. Locale, copy source, file identity and callbacks remain current through refs. A source-keyed LRU retains only validated successful PNGs across tab remounts; maximum eight entries / 8 MiB of typed pixel buffers. Cancelled/invalid/error results are not cached. Existing authentication, PNG validation, queue limits, cancellation and native deadlines remain. | Regression detects locale cancellation before repair. Component tests cover pending EN→ES/layout transitions and flowchart/sequence tab remount. Host tests cover reuse, eviction, failed-request retry, cancellation and malformed/forged output. | Original native intermittent failure had no causal trace; unnecessary lifecycle churn is demonstrated, but helper deadline/transport failure is not ruled out. Rebuilt native transition matrix still required. |
| QA-0019 | Retained image refresh preserves root/path and explicit-file metadata. Manual Reload matches the same derived root target as the visible Reload action, including tabs previously missing request metadata. A successful fresh read replaces the error in the same tab. | Regression reproduces a prior successful refresh stripping target metadata, corruption settling, and restored-byte Reload issuing no read. Same identity, replacement identity and explicit-file cases now recover; Retry regression retained. | Native disk/inode operations were modeled through the bridge; final packaged macOS retest still required. |

Commands run from repository root:

- Pre-fix control: temporarily remove only these App/renderer wiring fixes, run `npm test -- tests/ui/image-refresh.test.tsx tests/ui/diagram-block.test.tsx`, restore current files in `finally`: expected FAIL, three new regressions fail (`before-regressions.log`). This isolates frontend defects; it does not claim a deterministic reproduction of the original native QA-0018 sequence.
- `npm test -- tests/ui/image-refresh.test.tsx tests/ui/diagram-block.test.tsx tests/ui/diagram-host.test.ts`: PASS, 20 tests before the additional tab-remount regression (`focused.log`).
- Final `npm test`: PASS, 364 tests / 53 files, 157.76 seconds (`tests.log`). Earlier intermediate source also passed 362 tests / 53 files. Final rerun followed explicit-file metadata and tab-remount coverage additions.
- `npm run build`: PASS, TypeScript and Vite; existing large-chunk warning (`build.log`).
- `npm run test:bundle-worker`: PASS (`worker.log`).
- `git diff --check`: PASS.

Original QA screenshots `png-minimal-recovery-reload-settled.jpg` and `es900-fallback-source-exact.jpg` were visually inspected: stale mismatch alert despite success footer, and valid sequence source fallback alongside a successful flowchart. This is historical evidence, not a visual retest.

FUNCTIONAL_CHECKS: PASS for the automated frontend scope. INTEGRATION: MOCKED_ONLY. VISUAL_REVIEW / native packaged application: NOT RUN. CUA browser selection returned “No browser is available”; no screenshots or native acceptance claimed. No application build was installed and no historical QA candidate/acceptance ledger was relabeled. User acceptance PENDING.

Next native retest: rebuilt frozen package, flowchart and sequence at 640/900/1440 widths, EN/ES, rich/image tab switching and Settings transitions; preserve rejected-source fallbacks. For PNG, valid→corrupt→settled error→restore→Reload with same/replacement inode and explicit/root files, then confirm Retry, tab/tree retention and no stale pixels. Capture authenticated request/helper trace if a diagram failure recurs.
