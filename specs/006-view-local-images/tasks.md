# Tasks: View Local Images (F006)

**Input:** [spec](spec.md), [design](design.md), [plan](plan.md), [research](research.md), [data model](data-model.md), [decoder contract](contracts/image-decoder.md), [verification guide](quickstart.md)
**Tests:** Required by the feature's acceptance scenarios and success criteria. All fixtures are disposable.

## Phase 1: Setup

- [x] T001 Verify the approved F006 spec/design/plan hashes in `docs/approvals.md`, the current Spec Kit feature state, macOS arm64 toolchain and bundle target; record the baseline in `specs/006-view-local-images/verification.md`.
- [x] T002 Pin and audit `resvg`/`usvg` 0.48.1 and required transitive crates in the isolated `src-tauri/xpc/Cargo.toml` and `src-tauri/xpc/Cargo.lock`; verify licenses, the approved Rust 1.88 minimum and offline/release builds before enabling SVG (F006-R06/R07).
- [x] T003 [P] Create disposable format/hostile-content fixtures and record before/after hashes in `specs/006-view-local-images/evidence/` for JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, HEIC/HEIF (SC-001/004).

## Phase 2: Foundation

- [x] T004 Prototype byte-only XPC request/reply and crash/timeout containment in a bundled macOS helper under `src-tauri/xpc/`, wire its build/signing in `src-tauri/build.rs` and `src-tauri/xpc/package-app.sh`, and record packaged evidence before decoding untrusted bytes (F006-R06/R07).
- [x] T005 Define bounded image selection, stable-byte, decode-request/response and tab-state types in `src-tauri/src/image.rs` and `src/app/api.ts`; enforce <=8 MiB encoded, <=40 MP decoded, response, timeout, concurrency and generation limits in the native process (F006-R06/R07).
- [ ] T006 [P] Add disposable native contract tests for no-path XPC messages, helper crash/timeout, malformed response, cap and generation rejection in `src-tauri/src/image.rs` and `src-tauri/xpc/` (F006-AS-010/012/013).

## Phase 3: User Story 1 — Open an image (P1)

**Goal:** Read-only image tabs from the selected root and file-only picker.
**Independent test:** Open every supported format through tree and picker; duplicate open focuses one tab; hashes remain unchanged.

- [x] T007 [US1] Extend `src-tauri/src/selection.rs`, `src-tauri/src/state.rs` and `src-tauri/src/image.rs` to validate scoped regular files, case-insensitive extensions, identity and stable bytes before XPC decode; explicit picker grants one file only (R01/R07; AS-001/002).
- [x] T008 [US1] Implement ImageIO first-frame decoder and actual-type checks inside `src-tauri/xpc/`; return format, intrinsic dimensions and bounded inert pixels or typed failure (R03/R07; AS-001/012).
- [x] T009 [US1] Add image entries to the default supported-files tree, rename its filter accurately, and integrate distinct read-only image tabs, duplicate focus, close and filename/format/dimension/status in `src/app/App.tsx`, `src/app/api.ts`, `src/app/i18n.ts`, `src/styles/app.css` (R01–R03; AS-001–004).
- [ ] T010 [US1] Verify picker scope, duplicate tabs, eight-family matrix and no-write behavior in `src-tauri/src/image.rs`, `tests/ui/image-tabs.test.tsx` and `specs/006-view-local-images/verification.md` (SC-001/004).

## Phase 4: User Story 2 — Inspect an image (P1)

**Goal:** Fit, Actual Size and bounded zoom at narrow and typical widths.
**Independent test:** Large/small images fit without distortion; every edge is reachable at Actual Size by keyboard/scroll.

- [x] T011 [US2] Implement Fit, Actual Size, Zoom In/Out and center-preserving scroll with bounded surface lifetime in `src/reader/ImageView.tsx` and `src/styles/app.css` (R04; AS-005/006).
- [x] T012 [US2] Add EN/ES image controls, visible dimensions/zoom, focus and still-frame label in `src/app/i18n.ts` and `src/reader/ImageView.tsx`; respect Reduce Motion (R03/R10; AS-007).
- [ ] T013 [US2] Test zoom/resize/focus with disposable dimensions in `tests/ui/image-view.test.tsx`; verify 640/1440-point packaged edge access in `specs/006-view-local-images/verification.md` (SC-003/005).

## Phase 5: User Story 3 — View safe inline images (P1)

**Goal:** One inert pipeline for supported local inline images and image links.
**Independent test:** Valid local references render/open; unsafe, remote and out-of-scope references show a localized placeholder without a request.

- [x] T014 [US3] Add bounded SVG XML preflight and resvg/usvg rasterization inside `src-tauri/xpc/`: reject DTD/entities, scripts, handlers, foreign content, external/data references, imports and nonfragment URLs; deny both image resolvers and use bundled fonts (R06/R07; AS-010).
- [x] T015 [US3] Route inline references and image links through the native scoped image command in `src-tauri/src/assets.rs`, `src/reader/MarkdownView.tsx` and `src/app/App.tsx`; preserve alt text and block remote/escape/symlink paths before decode (R05/R06/R11; AS-008–010).
- [ ] T016 [US3] Add malformed/active SVG, image-link, alt-text, remote, escape and no-request fixtures to `src-tauri/src/image.rs`, `tests/ui/inline-images.test.tsx` and `specs/006-view-local-images/verification.md` (SC-001/004).

## Phase 6: User Story 4 — Refresh and recover (P2)

**Goal:** Image tabs reflect confirmed changes and give specific retryable errors.
**Independent test:** External replacement updates root image, explicit replacement needs reselection, and stale pixels never appear as current.

- [x] T017 [US4] Integrate generation-bound image reload with existing native refresh events in `src/app/App.tsx`; invalidate old blobs/cache on change, close or root switch and retain tab/tree context (R08; AS-011/013).
- [x] T018 [US4] Map mismatch, corrupt, missing, denied, over-limit and uncertain failures to EN/ES Retry/Reload states in `src/app/i18n.ts` and `src/reader/ImageView.tsx` (R07/R08/R10; AS-012/013).
- [ ] T019 [US4] Test external writer, unstable read, cancelled decode, root vs explicit replacement and no-write behavior in `src-tauri/src/image.rs`, `tests/ui/image-refresh.test.tsx` and `specs/006-view-local-images/verification.md` (SC-002/004).

## Phase 7: Cross-cutting verification

- [x] T020 Run full UI/native tests, bundle guards and a local signed `.app`/`.dmg`; record toolchain, commands, hashes, helper bundling/signing and failures in `specs/006-view-local-images/verification.md`.
- [ ] T021 Run the disposable packaged matrix in `specs/006-view-local-images/quickstart.md`, including 20 timing/memory trials, EN/ES keyboard at 640/1440, source hashes and app-request observation; mark AS-001–013 and SC-001–005 PASS/FAIL/BLOCKED/NOT TESTED in `specs/006-view-local-images/verification.md`.

## Dependencies and order

T001–T003 establish the approved build/fixture baseline. T004–T006 block all image content handling. US1 establishes the image tab and scoped decode contract. US2 and US3 depend on US1 but can be implemented separately. US4 depends on the tab contract. T020–T021 follow all stories. The XPC and SVG security boundary must be proven before enabling SVG or reporting F006-R06/R07 complete.

## Parallel examples

T003 can run while T002 audits dependencies. After T005, T006 fixtures can be prepared separately from XPC implementation. After US1, US2 viewer controls and US3 SVG preflight touch different files; integrate shared `App.tsx` changes sequentially.

## Implementation strategy

Complete the foundation, then US1 as the first independently useful slice. Add viewer controls, inline safety and refresh in order. Validate each story with disposable fixtures. Do not mark packaged acceptance from compilation or unit tests.

## Phase 8: QA convergence — 2026-09-29

The [fresh QA bugs](qa-bugs-2026-09-29.md) were reproduced against the signed decoder. Existing T006/T010/T013/T016/T019/T021 remain open for their original acceptance work.

- [ ] T022 Restore safe SVG text for common system and generic font-family lists, including the unmodified `specs/007-dark-theme/design/theme-states.svg`; verify the signed helper and packaged tab/inline display with disposable copies (F006-R01/R05, AS-001/008, SC-001; partial).
- [ ] T023 Provide effective bundled glyph fallback for common SVG symbols, and verify `☰`, `✓`, and `⌄` in the disposable symbol fixture and packaged viewer (F006-R01/R05, SC-001; partial).
- [x] T024 Restrict SVG URL/resource checks to executable references rather than visible text; accept a literal URL in `<text>` while preserving rejection of actual external/data resources (F006-R06/R07, AS-008/010; partial).
- [x] T025 Accept quoted local fragment paint references such as `url('#g')`, while still rejecting external/data references; verify raster output and source hashes (F006-R06/R07, AS-008/010; partial).
- [x] T026 Make `tests/native/xpc-format-matrix.sh` wait for the result of each probe invocation with a bounded timeout and explicit launch/decode errors; rerun the eight-family matrix (T020/T021; partial).

T022–T023 have passing signed-helper pixel evidence in [the engineering verification](engineering-fix-2026-09-29.md); their packaged tab/inline observations remain open for visible QA.

## Phase 9: Convergence

- [ ] T027 Add deterministic disposable fault-injection coverage for helper crash/timeout, malformed replies, generation mismatch, encoded/decoded caps, and bounded recovery while the app remains usable per F006-AS-010/012/013 (missing)
- [ ] T028 Add disposable standalone-tab and inline-image acceptance fixtures covering the eight format families, picker scope, duplicate focus, hostile/malformed/remote/out-of-scope references, alt text, no-request behavior, and unchanged source hashes per F006-SC-001/004 (missing)
- [ ] T029 Run visible packaged macOS acceptance for Fit/Actual Size/zoom, edge access at 640/1440 points, resize, EN/ES keyboard journeys, focus, Reduce Motion, picker, and repaired SVG text/symbol rendering per F006-SC-003/005 and F006-R01/R05 (partial)
- [ ] T030 Exercise packaged external-writer and manual/automatic reload journeys for root-relative replacement, explicit-file identity replacement/reselect, unstable reads, cancelled decodes, stale-pixel prevention, and before/after fixture hashes per F006-AS-011/013 and F006-SC-004 (missing)
- [ ] T031 Measure 20 end-to-end packaged trials, including response time, peak memory, 8 MiB encoded inputs, 40 MP decoded inputs, and specific error completion, and record target-Mac evidence per F006-SC-002 (partial)

## Phase 10: Convergence

- [ ] T032 Add deterministic disposable XPC fault-injection probes for malformed replies, helper termination, timeout, generation mismatch, encoded/decoded cap rejection, and recoverable tab behavior per F006-AS-010/012/013 (missing)
- [ ] T033 Add and execute a packaged image-tab matrix for tree and file-picker opens across all eight format families, duplicate focus, read-only close/switch, sibling-scope denial, and before/after source plus neighboring-file hashes per F006-AS-001–004 and F006-SC-001/004 (missing)
- [ ] T034 Run visible packaged viewer acceptance at 640 and 1440 points for Fit, Actual Size, zoom, edge reachability, resize, focus, EN/ES keyboard journeys, and Reduce Motion per F006-AS-005–007 and F006-SC-003/005 (partial)
- [ ] T035 Run visible packaged inline/link acceptance for valid local images, repaired SVG text and symbols, alt text, malformed/unsafe/remote/out-of-scope references, and app-request observation per F006-AS-008–010 and F006-R01/R05/R06 (partial)
- [ ] T036 Run packaged external-writer and reload/recovery acceptance for root replacement, explicit-file reselection, unstable reads, cancelled decode, stale-pixel prevention, and source hashes per F006-AS-011–013 and F006-SC-004 (partial)
- [ ] T037 Measure 20 complete app journeys with peak memory and response time for bounded 8 MiB/40 MP fixtures, record all AS/SC statuses and evidence metadata, and verify the repaired SVG in the packaged app per F006-SC-002 and F006-R01/R05 (partial)

## Phase 11: QA convergence — 2026-10-01

- [ ] T038 Align the draft/proposal status statements in `spec.md`, `design.md`, and `plan.md` with the recorded approval state in `docs/approvals.md`, without changing approved requirements or design/architecture content; verify the approved artifact hashes per Constitution V (partial).

## Phase 12: Approved shared-shell maintenance — 2026-10-05

Current user IMPLEMENT request and `design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.json` authorize these bounded client changes. Installed Spec Kit resolves F006 through its supported feature-directory override with NO_PERSIST; global F007W state and Windows proposals are preserved. F006 original behavior/architecture/security scope is retained. Mapping: `frontend-maintenance-2026-10-05.md`.

- [x] T039 Verify existing D history, tabs, image/Markdown navigation and loading fixes before editing; classify every approved requirement and preserve completed features in `frontend-implementation/plan.md`.
- [x] T040 Complete folder/tab/Projects contextual actions using existing commands; preserve per-tab loss guards for batch close and cause-aware dismissal/focus. Approved frontend criteria 5–6,13; F006-R09/R10.
- [x] T041 Put manual reload outcomes in reserved neutral footer space, retain target status, and make search pending-start/stale cancellation safe without new native contracts. Approved frontend criteria 4,17–19; F006-R08/R10.
- [x] T042 Verify final suite/build/worker and rendered EN/ES/light/dark/narrow/enlarged states; record native checks separately and retain architecture requests IR-01–05. Approved frontend criteria 1–24; F006-R09/R10 and SC-003/005.
