> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F002A implementation evidence — 2026-09-28

**Current follow-up:** [verification.md](verification.md), [test-matrix.md](test-matrix.md) and [verification-assets/manifest.json](verification-assets/manifest.json) record the subsequent native execution, two packaged repairs, final artifact and remaining acceptance gaps. The earlier blanket Accessibility blocker and NOT TESTED native rows below are historical; the follow-up supersedes them where an actual result is recorded. SC-001 and T017/T022/T023 now pass; complete packaged acceptance is still open.

Platform: macOS 26.2 (25C56), arm64. This is engineering verification, not an independent QA review or complete packaged acceptance.

## Authority and task preparation

PASS: active feature confirmed through `.specify/feature.json`; installed `setup-tasks.sh --json` provided the canonical template and generated 16 tasks (US1 3, US2 3, US3 2, shared/polish 8). `check-prerequisites.sh --json --require-tasks --include-tasks` passed. Requirements checklist: 8 total, 8 checked, 0 unchecked, PASS. No `.specify/extensions.yml` exists, so no hooks registered.

The user answered “Approve all four dark-theme artifacts and implement”. All four SHA-256 values matched `docs/approvals.md`. Approved spec/design/sketch/plan are unchanged; their historical draft status labels do not supersede the recorded approval.

Installed primary API declarations confirm `Window.setTheme(light/dark/null)`, `theme()` and `onThemeChanged`. Generated ACL confirms only `core:window:allow-set-theme` is added to the main-window capability. Dependencies, lockfiles and CSP remain unchanged for this feature. No file/network permission is added.

## Requirement-to-evidence matrix

| Requirements / tasks | Scenarios | Result | Evidence |
|---|---|---|---|
| R01/R02/R08; T005–007 | AS-001–003/009 | PASS for component and palette checks | Localized System/Light/Dark select in the toolbar; focus remains on that control. All stylesheet colors use semantic light/dark roles, including menus, modal scrim, warning/conflict states, code, tables, editor, hover, selection and boundaries. `appearance.test.tsx` covers EN/ES names. `appearance-contrast.test.ts` evaluates actual CSS token pairs against 4.5:1 text and 3:1 indicator requirements. Selected text explicitly uses primary foreground; the unused muted-on-selection pairing is not represented as a rendered pairing. Actual WebView layout/contrast remains NOT TESTED. |
| R03/R04; T003–004/T008–010 | AS-004–007 | PASS for automated controller/component checks | Synchronous bootstrap precedes React; CSS supplies system-dark empty-canvas fallback. Schema 1 accepts only system/light/dark and at most 256 serialized characters. Missing, corrupt, future-schema, wrong enum and oversize records fall back safely. Failed storage access does not crash the app; locale storage is also guarded so reading remains available. Storage/native failures produce localized nonmodal warnings. Native calls are ordered; System resolves after releasing an override and ignores obsolete completions/events. Disposal removes subscriptions. Tests also simulate preference recreation after restart. Packaged restart/native timing/frame acceptance remains NOT TESTED. |
| R05; T011–012 | AS-008/SC-003 | PASS for live CodeMirror test | `appearance-editor.test.tsx` edits real CodeMirror twice, toggles ten times, compares the same editor instance and serialized document/history/selection, focus and scroll, verifies no appearance checkpoint and successful Undo/Redo. Dark facet reconfiguration is effect-only through a Compartment. Actual native UI/scroll geometry remains NOT TESTED. |
| R07/R09 | AS-002/SC-005 | PASS for source boundary; packaged check NOT TESTED | No inversion/filter, asset transformation, runtime download, repository write or filesystem capability is introduced. Preference storage contains only schema and enum. Full disconnected runtime observation and image-pixel comparison remain NOT TESTED. |
| R08 | AS-009 | PASS for source/component checks; native accessibility NOT TESTED | Native select accessible names and EN/ES values verified. Appearance controls wrap with language at narrow widths; labels stay accessible. No theme color transition is introduced; existing section entry feedback is 120 ms only under `prefers-reduced-motion: no-preference`. VoiceOver, 640/1440-point geometry and native Reduce Motion remain unobserved. |

## Packaged acceptance remaining

- SC-001: ten native macOS System changes/restart choices — NOT TESTED.
- SC-002: full rendered surface contrast, EN/ES 640/1440 and VoiceOver — NOT TESTED.
- SC-003: ten native editing journeys — NOT TESTED; live editor component preservation PASS.
- SC-004: ten cold Dark launches with frame observation — NOT TESTED.
- SC-005: disconnected runtime/network observation and source inventory — NOT TESTED.

Existing System Events automation is BLOCKED by macOS assistive-access denial (-25211). No OS security or appearance setting was changed. Tests and a signed build do not satisfy those manual acceptance checks.

## Final regression and local artifact

| Check | Result | Command / evidence |
|---|---|---|
| UI regression | PASS | `npm test`: 17 files, 143 tests, 0 failures. Includes 14 appearance controller/component tests, 55 palette/style checks, a real CodeMirror preservation journey and 20 dirty close-choice cases. /private/tmp/md-reader-audit-ui.log. |
| Native regression | PASS outside sandbox | `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline`: 126 passed, 0 failed, 7 ignored. Integration harnesses include shared module tests. Ignored entries include the benchmark and child-only crash harness, both separately exercised. PATH/CARGO_HOME/RUSTUP_HOME point to the temporary toolchain in /private/tmp. FSEvents require macOS notifications outside the sandbox. /private/tmp/md-reader-audit-native.log. |
| Frontend/worker | PASS | `npm run build`: TypeScript and Vite production build, with known nonfatal chunk-size notice. `npm run test:bundle-worker`: production GFM worker runs without document/window globals. /private/tmp/md-reader-theme-build.log. |
| Native Quit bridge | PASS for ABI | `xcrun clang -fobjc-arc -fblocks -Wall -Wextra -Werror -framework Cocoa src-tauri/src/macos_quit.m tests/native/macos-quit.m -o /private/tmp/md-reader-quit-guard-check`, then execute harness: pending edit cancellation and original delegate decision pass. Packaged Quit journeys remain NOT TESTED. |
| Local .app | PASS | `npm run tauri build -- --bundles app`, `codesign --force --deep --sign -` and `codesign --verify --deep --strict` on the bundle. arm64, signature=adhoc, no TeamIdentifier; not notarized or published. /private/tmp/md-reader-audit-bundle.log. |
| Current startup | PASS, limited | `open -n` of the signed absolute bundle returned success. Process inspection confirmed PID 92879 started Sep 28 13:54:38 and still running at 13:57:48. No existing process was terminated. This proves startup/guard installation, not native appearance or Quit interactions. |
| Approved artifacts | PASS | All 16 spec/design/sketch/plan hashes for F001/F003D/F004/F002A match docs/approvals.md. Only the approved selector/palette/controller/editor compartment/appearance permission is introduced by F002A. |
| Disposable folder integrity | PASS | /private/tmp/md-reader-folder-check-9UyJql/README.md still SHA-256 a1849513599afbacc624438a43c9aca5e3db8d0859a99e9d6cf2a60a89bd8a4e. |
| Optional formatting | FAIL | `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` reports formatting differences across existing and changed Rust files. No formatter gate is configured; unrelated files were not reformatted. Compilation/test gates above pass. |

Artifact: `/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Markdown workspace.app`.
Signed executable (`Contents/MacOS/md_reader`) SHA-256: `93d7342ddcce5d80d0e36d457eb5251a241f344f1ee5a2e8fbe151246bff32df`.

T001–T014/T016 are complete with the bounded evidence above; T015 remains open. Cold-launch frames, native System changes, layout, VoiceOver and disconnected acceptance are not inferred from tests or startup.

Spec Kit consistency: installed spec/plan/tasks prerequisites pass; no extension hooks exist. All 9 functional requirements and 5 buildable success criteria map to the 16 tasks (100% coverage, no unmapped task, ambiguity, duplicate requirement or constitutional conflict). Low-priority metadata drift: spec/plan retain their pre-approval Draft labels; docs/approvals.md and matching hashes are authoritative. The approved versions were preserved. This read-only analysis is not acceptance evidence.

## Native QA follow-up — 2026-09-28 (after scope removal)

[qa-followup.md](qa-followup.md) records 56 measured native layout cases, 20
sampled contrast pairs, actual checkpoint equality, post-restart recovery, 70
focused regression tests and complete disposable-fixture restoration. These
subsets PASS. T015/T018–T021 remain open because full surface/operation coverage
is NOT TESTED and earliest-startup/request-attempt observation remains BLOCKED.
No production changes; no offline/VoiceOver gates; no independent-review claim.

## Instrumentation preparation — 2026-09-28

PASS: full UI suite 148 tests / 18 files (includes five new pending-operation
cases); seven Python evidence-intake tests; TypeScript/Vite; production worker;
blank templates rejected; test markers absent from frontend output; original
App/CSS and packaged executable hashes unchanged. No production hooks or new
dependencies. Initial test-only Save completion expectation and fixture type
annotation were corrected; no app defect or app patch resulted.

See [instrumentation-decision.md](instrumentation-decision.md) and
[receipt](verification-assets/instrumentation-preparation.json). Native acquisition
was NOT TESTED; architecture/capture review remains required for proposed hooks
and capture scope. Intake PASS is not application acceptance. T018–T021 stay open.


## Approved A1 tooling implementation — 2026-09-28

See [implementation results](instrumentation-implementation.md) and
[hashed receipt](verification-assets/instrumentation-a1/receipt.json). QA harness,
startup recorder, calibration stimulus and cold-launch runner are implemented.
PASS: 148 existing + three QA UI tests; 126 native regressions (seven existing
ignored); ten harness and 14 tooling tests; four build rejection cases; frontend/
worker checks; separate signed packages and final QA native/renderer smoke.
Production frontend/security configuration/lockfiles remain unchanged. The rebuilt
production package has a new recorded executable hash; historical observations
retain their original identities. No display recording or native acceptance matrix
was executed here. T024 is complete; T015/T018–T021 remain open. Request observer
coverage remains BLOCKED, with no weaker evidence substitution.
