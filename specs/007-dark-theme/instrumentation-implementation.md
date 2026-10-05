# F002A A1 implementation — 2026-09-28

Status: supporting tooling implemented and checked; native acceptance remains open.
Authority: user “Approve A1 and implement the QA harness and startup recorder”; five
approved hashes verified and recorded in docs/approvals.md. Those architecture
artifacts are unchanged. No additional architecture change requiring review was
introduced. Request diagnostics/production observation are outside this batch.

## Delivered

- Separate QA frontend entry/config and opt-in Cargo feature, QA bundle/app-data
  identifier and persistent WebKit data-store UUID. Default build guards reject QA
  identifiers/assets/features; no new production capability or inspector.
- Owner-only Unix socket created by the runner; inherited-pipe secret; peer PID/UID,
  schema, field, sequence, size, lifetime and gate checks. No evaluate/shell/path
  control command. Snapshots contain digests and numeric observations, not text.
- Asynchronous pre-command gates for read, confirmed refresh and section save.
  Original operations run once after release. Held-operation disconnect/timeout
  never releases a save. Already released operations complete normally. Fixture
  read failure follows validated reading; save failure follows scope/version/content
  validation and precedes staging writes. Other faults use one-shot QA adapters.
- External Swift ScreenCaptureKit recorder, display-link flash stimulus and Python
  cold-launch runner. Recorder ready follows first-frame persistence. It retains
  video, raw frame status, WindowServer time, continuous-clock conversion anchors,
  display metadata and app-only window metadata; audio/microphone disabled.
- Extended evidence intake validates calibration artifacts, timeline clock/status
  records and report boundaries. Blank/instrumented/incomplete reports remain
  rejected; successful intake is not a behavioral PASS.

[Run/build/capture procedures](../../tests/acceptance/README.md) include exact
commands, isolation preconditions, fault/gate use, calibration and ten-trial review.
Native command gates establish pending-operation overlap, not physical write-syscall
coverage. Renderer digests remain untrusted observations; they cannot issue controls.

## Verification

Platform: macOS 26.2 (25C56), arm64; Swift 6.1.2 and macOS SDK 15.5.
Existing temporary Rust toolchain/environment is documented in the procedure.
[Receipt, artifact and source hashes](verification-assets/instrumentation-a1/receipt.json)
link retained outputs, package identity and unchanged production boundaries.

| Check / command | Result | Limit |
|---|---|---|
| `npm test -- --run`, then `npm test -- --run tests/ui/qa-adapters.test.ts` | PASS: 148 existing + 3 new tests | Component regression/adapters, not native acceptance |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline` | PASS: 126, seven existing ignored | Run outside sandbox for FSEvents; production configuration |
| QA-config `cargo test … --features acceptance-harness --lib acceptance_harness` | PASS: 10 | Protocol, expiry, held cancellation, release, original validation, faults, path/trace bounds |
| `python3 -B -m unittest discover -s tests/acceptance -p 'test_*.py'` | PASS: 14 | Intake/launcher rejection and sequencing tests |
| `npx tsc --noEmit`; production/QA Vite; worker regression | PASS | Production frontend unchanged; QA entry presence checked during build |
| `check_build_guards.py` | PASS: four expected build rejections | Feature/identifier/frontend mismatches |
| Production Tauri build; `build_qa.sh`; `codesign --verify --deep --strict` both bundles | PASS | Private ad-hoc signatures; no notarization/publishing claim |
| `check_build_boundary.py` for both profiles | PASS | Current embedded asset filenames, QA markers and native feature markers; combined with build guards |
| `qa_smoke.py` on final signed QA package | PASS | Real native channel/renderer snapshot, arm/finish, no documents opened, normal Quit |
| Swift recorder/flash compilation; recorder `--self-test` | PASS | Clock-only runtime check. Flash uses available deprecated CVDisplayLink APIs |
| 19 protected-file baseline hashes | PASS | Production frontend, CSP/capabilities, lockfiles, spec/design unchanged |
| Live recorder/flash calibration and ten Dark launches | NOT TESTED | Requires isolated display; no screen pixels were acquired in this phase |
| Fresh production runtime smoke | NOT TESTED | Existing user production session left untouched |
| T021 production request-attempt observation | BLOCKED | No production observer implemented or substituted |

The rebuilt production executable differs from the earlier acceptance package;
use this receipt's exact hash for new evidence. Do not attach earlier observations
to it by changing their executable identity. QA package output is under
`target/qa-native/release/bundle/macos/Markdown workspace QA.app`; external tools
are under `target/acceptance-tools/`. Production is under the existing
`src-tauri/target/release/bundle/macos/Markdown workspace.app` location.

Implementation checks found and corrected overly permissive flattened JSON parsing,
a late Vite HTML-entry transform and stale bundle signatures. Final checks above
use the strict parser, pre-entry transform/current embedded assets and newly verified
signatures. No workaround widened CSP, enabled production inspection or changed OS
security settings. Native file/version/save rechecks remain in their original paths.

## Remaining work and handoff

T024 supporting implementation is complete. T015/T018–T021 stay unchecked.
A fresh QA/security review must assess the new control/observation boundary and
production exclusion evidence before accepting native results. Then use disposable
fixtures for the full T018/T019 matrix, and an isolated display for calibrated T020
production recordings. First verify the rebuilt production app in a fresh session
when the user's existing session is no longer active. No acceptance criterion was
removed or reduced. T021 still needs a separately established/reviewed production
observer; neither this harness nor socket silence closes it.
