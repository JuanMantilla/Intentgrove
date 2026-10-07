# Reading controls and remaining integrations — 2026-10-06

USER-AUTHORIZED: “$senior-frontend-developer please work on those,” referring to QA-0004 and Settings/rich-editing/HTML/details/subtree work. IMPLEMENT within existing frontend contracts; additional technical/native changes are proposed separately.

IMPLEMENTATION: COMPLETE_IN_SCOPE for Reading controls/preview and preference retries; PARTIAL for the full requested package. FUNCTIONAL_CHECKS: PASS for named frontend checks. VISUAL_REVIEW: PARTIAL. INTEGRATION: MOCKED_ONLY. USER_ACCEPTANCE: PENDING. QA-0004/T039 stays OPEN for native retest.

## Baseline and authority

Read AGENTS.md, project/frontend state, relevant skill references, frontend handoff and integration requests. No `.codegraph` or nested affected-path instructions. Installed Spec Kit prerequisites confirm F007W, and F002R through supported temporary NO_PERSIST override; global feature state unchanged.

Design authority: approval-all-2026-10-05.json, REQ-P1/frontend criteria 22–24. Selected SVGs 08/16 match reviewed hashes. Current handoff/interaction hashes differ; matching archived versions show only approval-status changes, with Reading behavior intact. See design-hashes.json and archived-design-hashes.json. Designer artifacts unchanged.

App/i18n/session/workspace and extensive native/QA changes already existed. Exact source/test and state baselines are saved here. frontend.patch compares this pass to those baselines; ordinary git diff also contains earlier work. New Reading component/test and integration decision proposal are additional files.

## Implemented

- Criterion 22: reusable Reading contents with existing fonts/ranges/session scope, labeled numeric fields beside sliders, localized bounded validation, Enter/blur commit and Escape revert. Incomplete/invalid values never reach preferences. Merely focusing a restored custom value does not clamp/round it.
- Criterion 23: live font/size/spacing preview bounded by chosen width and panel space; actual reader uses selected width. Existing reading-anchor capture/checkpoint and Reading-only reset reused. Source bytes/editor contracts unchanged.
- Criterion 24: language persistence failure is visible and retryable; Appearance Retry reuses existing storage/native synchronization. Checkpoint Retry uses the existing serialized queue, disables repeated activation while pending and clears only successful matching checkpoint feedback. Load/close failures do not receive a misleading checkpoint retry; guarded-close propagation preserved.
- Responsive adaptation: the taller panel initially caused outer overflow at 640×480. Bounded scrolling and narrow overlay placement now keep controls inside the viewport. Removed the renderer's hardcoded minimum width to permit reflow; native window minimum/config unchanged.

The current Reading popover remains an interim interface. Separate native Settings, tree-filter persistence, rich editor, HTML/details and native subtree/Go contracts remain unfinished. No native/config/dependency/security/checkpoint-schema changes.

## Checks actually run

Working directory: C:\Users\jsman\projects\personal\Intentgrove.

- Baseline `npm.cmd test -- tests/ui/session.test.tsx tests/ui/appearance.test.tsx --maxWorkers=2 --reporter=dot`: PASS, 2 files/36 tests; tool output, no saved baseline log.
- `npm.cmd test -- tests/ui/reading-settings.test.tsx tests/ui/session.test.tsx tests/ui/appearance.test.tsx --maxWorkers=2 --reporter=dot`: PASS, 3 files/40 tests; focused.txt.
- `npm.cmd test -- --maxWorkers=2 --reporter=dot`: PASS, 41 files/291 tests; full.txt. New cases cover numeric commit/invalid/custom/reset and language retry; existing QA-0004 regression now exercises explicit checkpoint Retry. Subsequent edits were CSS only, covered by final build/rendered checks.
- `npm.cmd run build`: PASS initial/final source; build.txt/build-final.txt. Existing >500 kB advisory remains. PowerShell records stderr as NativeCommandError; actual process exits 0.
- `npm.cmd run test:bundle-worker`: PASS initial/final bundles; worker.txt/worker-final.txt.
- `git diff --check`: PASS, exit 0; existing CRLF normalization warnings only.
- Installed Git Bash `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`: PASS for F007W and supported F002R temporary override, no global state mutation.

## Rendered evidence

Inspected approved Settings SVG, then real App/CSS in Chrome using the existing test-only qa0004 fixture with synthetic native commands. Numeric 22 px commit, invalid 99 refusal, Escape revert, Spanish/light choices, serif font, Reset and close focus return were exercised. DOM/computed styles confirm preview 22 px/35.2 px line height and Georgia for serif. English authored First document remains readable after locale/theme changes.

Actual captures: english-dark-reading.png, spanish-640.png and spanish-320.png. Corrected 640×480 clientWidth/scrollWidth both 640, panel left/right 0/640 and bottom 480. 320×480 has no horizontal document overflow and panel width 320; numeric fields/Reset remain reachable through panel scrolling. Closing focuses the invoker. Temporary viewport was reset.

Browser zoom shortcuts produced no observable scale change; zoom-shortcut-no-effect.png is attempt evidence, NOT 200% PASS. Actual browser zoom, Windows DPI, native keyboard/Settings focus, screen-reader speech and macOS are NOT TESTED. Small viewport checks do not substitute for those.

## Remaining work and boundaries

Fresh supported @oai/sky list_windows and post-reset/reimport retry both failed with native-pipe OS error 2. No native product execution/input/launch/capture. QA-0004/T039 acceptance remains pending. No new native candidate containing this Reading slice was built; earlier QA candidate evidence remains historical.

[Integration decisions](../../integration-decisions-20261006.md) make remaining work concrete: native Settings ownership/acknowledgments/command restrictions/filter migration; native Go and validated subtree search; isolated source-span editor and HTML/routing/security prototypes before production architecture selection.

The frontend skill requires: “Raise a specific change request for work outside the authorized frontend scope.” AGENTS.md requires affected architecture approval. These technical proposals await approval; approved visual design needs no repeated approval. Native transport recovery and a Mac host remain verification dependencies.

Prior sibling-continuity acceptance, native repairs and editing/installer gates preserved. No installation, signing, commit/push or publication.
