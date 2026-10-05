# Dark-theme acceptance follow-up — 2026-09-28

Status: acceptance remains incomplete. This follow-up executed native checks in
the existing conversation; it is not an independent fresh-session review. No
production code, security setting, dependency or feature requirement was changed.

Platform: macOS 26.2 (25C56), arm64. Existing signed release executable SHA-256:
`4f50089cffac345c56fe394c1a386a1baaa569216e3899cdd965c20be42ff067`.
`codesign --verify --deep --strict` passed. Retained parent-manifest evidence and
recorded production-source hashes matched before testing.

Evidence: [follow-up manifest](verification-assets/qa-followup/manifest.json),
[summary](verification-assets/qa-followup/summary.json), native accessibility
snapshots, app-only screenshots, matrix results and exact temporary test scripts.
Scripts use existing app-scoped helpers under /private/tmp; they are evidence of
this run, not a portable installed test runner. No developer server or mock IPC
was used for native observations.

## Results

| Requirement / task | Result | Executed evidence and limits |
|---|---|---|
| R01/R02/R08; T018 | PASS for measured cases | 56 native cases: seven states × EN/ES × Light/Dark × 640/1440 logical-point width (820 high). Empty shell, reader, invalid-UTF-8 error, editor, external-writer conflict, dirty-close dialog, and post-restart recovery offer. All measured controls fit horizontal window bounds; all four close-dialog buttons also fit vertically. Editor actions below the viewport require scrolling; horizontal bounds do not prove complete keyboard reachability. |
| R02/R06; T018 | PASS for sampled pairs | Twenty solid primary/secondary text-background pairs from native screenshots, embedded profile converted to sRGB; minimum 5.957:1 against 4.5:1. Samples cover empty/reader/error/editor/conflict regions. This does not certify every control, focus, hover, modal, notice or transient state. |
| R05; T019 | PASS for steady-state subset | Actual disposable edit; serialized editor JSON (document/history/selection) and draft equal before/after eight theme/locale/layout cases. Checkpoint sequence remains 4. This does not prove theme changes during native loading/refresh/save operations. |
| R02/R05/R08; T018/T019 | PASS for recovery surface subset | Keep draft → native Quit → relaunch → native folder picker → reopen fixture displayed the recovery offer in eight cases. Recover unsaved edit restored the editor. No exact full-workspace restoration claim. |
| T013 regression | PASS | `npm test -- --run tests/ui/appearance.test.tsx tests/ui/appearance-editor.test.tsx tests/ui/appearance-contrast.test.ts`: 3 files / 70 tests, 1.30 seconds. Broader/native suites not rerun; no production code changed. |
| R09; SC-005; T021 | BLOCKED for request observation | `/usr/bin/fs_usage -w -f network -t 2 5774` exited 1: requires root. No sudo, permission change, broad network capture or claim that blocked remote images prove no request attempts. |
| R05/R09 fixture integrity | PASS | Separate writer changed only the disposable README for conflict testing. Original bytes restored; SHA-256 `6adc783e0d8372b45f24f58abe1904ecffa35bb314b0c1cf6e326850eb86e67c`. Invalid fixture bytes unchanged; final workspace inventory is README.md, invalid.md, empty/. Fixture-specific recovery record absent after explicit in-app Discard. |

Representative screenshots were visually inspected for narrow Spanish empty,
reader, error, editor, conflict, close dialog and recovery states, plus wide English
light empty state. All 56 captures are retained; no claim of exhaustive visual
inspection or measured contrast across every captured pixel is made.

Two helper assumptions failed and were corrected: WebKit exposes the close
alertdialog as a named AXGroup, not AXDialog; reopening a tab within the same live
session resumes its editor instead of displaying a restart recovery offer.
The corrected dialog matrix and actual Quit/relaunch recovery matrix passed.
These timeouts are not established production defects.

## Remaining acceptance and exact next steps

- T018 / SC-002 — NOT TESTED for the full surface matrix. Remaining coverage includes
  transient loading/progress, appearance-storage/native-sync failure notices,
  other confirmation/version-inspection states and all required control/focus
  contrast and keyboard transitions. Prepare deterministic fixture/instrumented
  test procedures for states not reliably inducible in this production package;
  record them separately from final-package evidence.
- T019 / SC-003 — NOT TESTED for theme changes precisely during loading, refresh
  and disk save. A test procedure must establish operation overlap and unchanged
  operation counts/state, rather than only comparing completed steady states.
- T020 / SC-004 — BLOCKED with the existing capture helper. It requires a discovered
  window before capture starts, leaving earliest startup frames unobserved.
  Do not repeat the same post-window captures as ten complete launches. Provide
  a capture method covering the first app-owned frame through document display,
  then execute ten saved-Dark cold launches. No new startup pass claimed here.
- T021 / SC-005 — BLOCKED for request-attempt observation. Provide an approved
  app/WebKit-scoped observer covering attempts without collecting other apps'
  traffic; connection snapshots alone are insufficient.

T015 and T018–T021 stay unchecked. No confirmed app defect requiring a production
patch was established by these observations. Previous System/Reduce Motion/image
results remain historical; no retired offline or VoiceOver tests were repeated.

Restoration: app System / Español, 1280×820 at (95,59), test app quit; disposable
fixture restored and its draft removed through the app. OS appearance, network,
Reduce Motion and VoiceOver were not changed in this follow-up. User documents
and unrelated recovery records were not modified.
