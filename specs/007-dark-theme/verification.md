> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F002A packaged verification — 2026-09-28

The two packaged defects found during implementation are repaired. T017, T022 and T023 pass. Full feature acceptance remains open for T015/T018–T021. This evidence comes from the implementation session, not an independent review.

Platform: macOS 26.2 (25C56), arm64, packaged Tauri/System WebKit host, no development server. Final signed executable SHA-256: `4f50089cffac345c56fe394c1a386a1baaa569216e3899cdd965c20be42ff067`. The local `.app` is ad hoc signed, not notarized or published.

## Authority and procedure

Installed `check-prerequisites.sh --json --require-tasks --include-tasks` confirms `specs/007-dark-theme`. The requirements checklist remains 8/8 checked. The four spec/design/sketch/plan hashes still match `docs/approvals.md`; those artifacts were not edited. `.specify/extensions.yml` is absent at the post-implementation check, so no hooks are registered.

The user answered **“Approve these temporary test changes”** to the request to switch macOS appearance for the trials, enable Reduce Motion briefly and disconnect the active network, with restoration afterward. No security permission or system-wide tool was installed or enabled. Accessibility and app-window capture worked outside the agent sandbox; the previous blanket assistive-access blocker is superseded by the successful native trials below.

The fixture was `/private/tmp/f002a-acceptance-0higj4ow/workspace`: two synthetic Markdown files, two 64×64 PNGs and an empty directory. Tests used native System Events and Accessibility controls, real IPC/recovery files for this exact fixture, app-window screenshots and a temporary ScreenCaptureKit helper. Helpers remain outside the repository and production app. Native picker/menu-bar data and HTTP traces are excluded from the retained evidence.

Evidence is retained in [verification-assets/manifest.json](verification-assets/manifest.json), including file hashes, reports, representative screenshots and current build/test logs. Full temporary observations remain under the fixture's `observations/` directory. No source document was saved by the app. A separate writer temporarily changed this fixture to provoke a conflict, then restored the original bytes.

## Repairs and validation

| Task | Result | Observed defect and repair |
|---|---|---|
| T022; R02/R05/R08 | PASS | The original package rendered source text in a proportional font and let it extend beyond the intended editor viewport. CodeMirror's generated base stylesheet needs inline style authority that the current CSP does not provide. `src/styles/app.css` now bundles the structural rules used by the installed view 6.43.13 content/history/wrapping extensions. The final native editor is monospaced, clips/scrolls within 430 points and preserves its state through both native trial sets below. CSP, dependencies and native capabilities are unchanged. |
| T023; R08/SC-002 | PASS | At 640 points, hiding the visible Language label removed its native accessible name. `src/app/App.tsx` now gives that select the existing localized Language/Idioma `aria-label`. Both selector names and four toolbar controls were observed inside the actual 640- and 1440-point windows in EN/ES and Light/Dark: eight cases. |
| Existing UI regression | PASS | `npm test`: 17 files, 143 tests, zero failures on the final source. This includes the appearance, palette and real CodeMirror history checks. |
| Production build | PASS | `PATH=/private/tmp/md-reader-cargo/bin:$PATH CARGO_HOME=/private/tmp/md-reader-cargo RUSTUP_HOME=/private/tmp/md-reader-rustup npm run tauri build -- --bundles app`: TypeScript/Vite and native release build completed. Existing chunk-size/dead-code notices are nonfatal. |
| Bundled worker | PASS | `npm run test:bundle-worker`: production GFM worker parses without document/window globals. |
| Local signature | PASS | `codesign --force --deep --sign -` and `codesign --verify --deep --strict` on the local bundle. |

The earlier 126-pass/7-ignored Rust run remains historical evidence in `evidence.md`; it was not rerun for these CSS/accessible-name repairs. No Rust production code changed.

## Native acceptance results

| Criterion / tasks | Result | Evidence and limit |
|---|---|---|
| SC-001; T017 | PASS | Real Light/Dark/System choices survive Quit/relaunch. Explicit Light stays light under macOS Dark; saved Dark renders dark under macOS Light. Ten final-package System changes update observed native pixels in **0.460–0.642 s**. Timing includes setter overhead and uses `CLOCK_UPTIME_RAW` against ScreenCaptureKit's system uptime, rather than mixing Python 3.9's process-relative monotonic clock with the native clock. See `restoration-results.json`, `final-editor-system-results.json`, and four captured cold journeys. |
| SC-002; T018 | NOT TESTED | Native toolbar layout/name matrix passes all eight cases. Sixteen sampled raster contrast pairs pass: text minimum **6.17:1**, control/focus minimum **3.28:1**, selected text **12.01:1 Light / 7.22:1 Dark**. Display P3 screenshots were converted using their embedded profile; dark WebKit selection uses its measured composited background. Reader, source/preview, table/code/link, conflict/version warning and dirty-close dialog surfaces were observed. Native Reduce Motion was enabled through the normal Motion settings control, theme changes worked, and off was restored. This is not every required surface/state/layout combination. VoiceOver activated, but its output query stalled; the read was stopped and VoiceOver restored to off. Spoken EN/ES announcements remain BLOCKED. |
| SC-003; T019 | NOT TESTED | Core native preservation passes. Two real edits followed by ten System changes retain full document/history/selection, focused editor, nonzero editor scroll (**3321 points**) and checkpoint sequence (**32**); native Undo/Redo works afterward. Ten explicit selections also preserve document/history/selection, editor scroll (**3339**) and reader scroll (**3636**), with focus on Appearance and unchanged sequence (**40**). A real Save As panel remains one open panel across both system themes, with draft/history intact; it is cancelled without saving. Dirty-close and separate-writer conflict/version panels were observed in both palettes. Theme changes precisely during transient loading, refresh and disk-save operations remain NOT TESTED; therefore the complete T019 task stays open. |
| SC-004; T020 | BLOCKED | **Four of ten** cold saved-Dark document journeys completed, with 2267 complete frames in their observed document periods and zero light background probes. Capture was ready before the first document request, but started about **1.89–1.90 s after launch**. Earlier app-owned startup frames were not observed. Three background probes per frame cover sidebar/canvas/chrome; document paper is visible in the retained snapshots, but its pixels were not recorded throughout every frame. Later attempts hit intermittent native picker/Accessibility readiness failures; failed probes are not counted as completed trials. Neither these partial captures nor a single startup screenshot satisfies the ten complete startup journeys. |
| SC-005; T021 | BLOCKED | Real reading and theme selection worked with Wi-Fi power Off; a separate `curl` control failed DNS resolution (exit 6). Wi-Fi was restored On. This records the Wi-Fi-off/no-DNS condition, not every possible alternate route. Sixteen original/rendered image samples pass, including opaque colors and transparent pixels composited over each paper background, with at most two-channel-unit color tolerance. Final workspace inventory/hashes exactly match the baseline. Request-attempt observation remains unavailable: `nettop` only reports connections; `fs_usage` requires unavailable root credentials. Instruments disclosed that HTTP recording includes other apps despite attachment, so it was stopped and its disposable trace removed unread. No broader capture or security-setting change was used. |

Reports retain the exact individual timings, bounds, color samples and state comparisons. Screenshots/contrast from the first structural repair package are identified by the manifest's prior artifact hash; palette CSS is unchanged in the final accessible-name repair. Final editor, selection, layouts, images, offline reading and restart reports use the final artifact.

## Restoration and next step

PASS: macOS **Dark**, Reduce Motion **off**, VoiceOver **off**, Wi-Fi **On**; app preference **System**, locale **Español**, clean test app quit. The fixture-specific draft is absent. Four source-file hashes and the empty-directory inventory match the original baseline. No user draft reset, commit, push or publication occurred.

Next: complete the remaining rows of `test-matrix.md` in a fresh native QA session: spoken VoiceOver and unobserved surface/state combinations; loading/refresh/save operation continuity; ten cold launches with observation covering the earlier startup gap; and an app-scoped request-attempt observer. T015/T018–T021 remain unchecked until that evidence exists.

## Native QA follow-up after scope removal — 2026-09-28

See [qa-followup.md](qa-followup.md) for the current result and precise limits.
PASS: 56 measured native layout cases, 20 sampled text contrast pairs, durable
editor-state preservation subset, post-restart recovery surface, 70 focused tests,
artifact/signature and fixture restoration. Full acceptance remains incomplete:
T018/T019 have untested coverage; T020 startup capture and T021 scoped request
observation remain blocked. T015/T018–T021 remain unchecked. Offline and VoiceOver
are retired gates. No production patches or independent-review claim.

## Review snapshot — 2026-09-29

Fresh read-only QA review of the active F002A spec, plan, task list, A1 receipt and
current sources. The installed prerequisite script returned `specs/007-dark-theme`.
The approved A1 tooling is implemented, but this review did not run its native
capture or acceptance matrix. The A1 receipt's PASS results remain the prior
implementation session's evidence, not independent verification.

| Check | Result | Actual observation and limit |
|---|---|---|
| Current full UI suite, first `npm test -- --run` | FAIL | 150/151 passed; `tests/ui/edit-flow.test.tsx` could not find `Change draft` immediately after observing `beginSectionEdit` called. No native document was involved. |
| Same edit-flow file alone | PASS | 5/5 passed. |
| Current full UI suite, repeat `npm test -- --run` | PASS | 151/151 passed; log: `/private/tmp/md-reader-audit-2026-09-29-vitest.log`. The first-run failure is intermittent and the test remains timing-sensitive; it is not evidence of an app failure. |
| T018/T019 native surface and held-operation matrix | NOT TESTED | QA harness exists, but a fresh security/QA boundary review and full disposable native execution are still needed. |
| T020 ten complete saved-Dark cold launches | NOT TESTED | New recorder has compile/clock evidence only; live isolated-display calibration and complete frame review are still needed. Prior partial captures do not apply to the rebuilt executable. |
| T021 production request-attempt observation | BLOCKED | No production-scoped observer or approved contract exists. Prior image/inventory subsets remain valid only for their identified package. |

Review finding: in `edit-flow.test.tsx`, the test awaits a mock call, then queries
`Change draft` synchronously. `App.startEdit` awaits that call before committing
editor state; waiting for the rendered button would remove this test race. This
is a scoped F004 test reliability follow-up, not a F002A behavior change.

No production code, approved artifact, fixture, or system setting changed in this
review. Complete F002A acceptance remains NOT TESTED/BLOCKED as above; T015 and
T018–T021 remain open. The precise next step is fresh QA/security review of A1,
then the disposable T018/T019 matrix, isolated-display T020 trials, and a
separately reviewed production observer for T021.
