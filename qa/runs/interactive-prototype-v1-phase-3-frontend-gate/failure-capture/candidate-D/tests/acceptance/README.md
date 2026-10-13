# F002A acceptance tooling

A1 was approved on 2026-09-28. The QA harness is opt-in and the startup recorder
runs outside the app. Production contains no QA channel, bridge, fault adapter or
inspector. These tools acquire/support evidence; they never close T018–T021.
Request observation is outside this implementation batch; T021 remains BLOCKED.

Run from repository root:

```sh
npm test -- --run tests/ui/appearance-operations.test.tsx
python3 -B -m unittest discover -s tests/acceptance -p 'test_*.py'
```

The five component tests use the actual App and CodeMirror editor with explicitly
held mock IPC promises: load success/error, refresh, save success/error. Ten theme
changes happen before each held operation settles. Check call counts, active tab,
reader/editor state and success/error outcomes. These are deterministic regression
tests, not evidence of native writes, WebKit layout or real capture timing.

For a future native recording, copy the appropriate template into a **new**
disposable run directory alongside its raw files. Fill fields from observed data,
never expected values. Use seconds from one documented clock domain; do not mix
Python process-relative time with native system uptime. Record conversion and
synchronization if the acquisition tool has a different clock. Video must include
actual first app-owned content, not just post-launch background pixel probes.

```sh
python3 tests/acceptance/f002a_evidence.py /absolute/run/startup.json EXECUTABLE_SHA256
python3 tests/acceptance/f002a_evidence.py /absolute/run/requests.json EXECUTABLE_SHA256
```

Replace `EXECUTABLE_SHA256` with the independently recorded 64-character hash of
the package under test. Exit 0 / PASS means **intake metadata and artifact hashes
passed**, not that app acceptance passed. Exit 1 / BLOCKED means evidence is
incomplete or inconsistent; usage errors return 2. The checker validates recorder JSONL configuration, frame clock/status records and
ready/end boundaries; it does not decode video or establish visual frame coverage. A named reviewer must verify their attribution,
frame/event continuity, app-content classification and counts. A hand-written
claim or forged record cannot be made trustworthy by a checksum.

The checker deliberately rejects instrumented-build evidence submitted as
production evidence. Keep supplemental component/instrumented results in separate
reports; final native acceptance remains explicit human QA. The templates are
unfilled and must return BLOCKED. `test_f002a_evidence.py` uses synthetic data only.

Security: all raw artifact paths are relative, must remain inside the run directory,
may not traverse symlinks, and must have matching SHA-256. Reports are local trusted
operator input, not a document IPC surface. Run without elevated privileges; the
checker does not request root or capture traffic. Video files are hashed in bounded
chunks; use bounded short recordings rather than unbounded traces.

## Build and run the QA harness (T018/T019)

Use the installed Rust toolchain on PATH. No installation is performed. On this
host the existing temporary toolchain needs CARGO_HOME=/private/tmp/md-reader-cargo,
RUSTUP_HOME=/private/tmp/md-reader-rustup and /private/tmp/md-reader-cargo/bin on PATH.

```sh
bash tests/acceptance/build_qa.sh
python3 -B tests/acceptance/qa_runner.py \
  "target/qa-native/release/bundle/macos/Intentgrove QA.app"
```

The runner creates a private /private/tmp/f002a-qa-* directory and owner-only
socket. It authenticates the child PID/UID; the app authenticates its parent and
receives a run token only through an inherited pipe. Tokens are not logged.
Only run with disposable documents. The runner does not open documents for you.
QA uses its own app-data identifier and WebKit store `F002A-QA-store01` (16 bytes).
Do not copy production grants/preferences/recovery into this store.

Enter one JSON command per line in the runner's stdin, waiting for its reply:

```json
{"command":"snapshot"}
{"command":"arm","operation":"save-section","ordinal":1}
```

Trigger Save in the QA app. Take another snapshot until the gate has a non-null
operationId (a null renderer means the UI bridge did not respond; no state claim).
While held, change the actual selector ten times and obtain snapshots before/after.
Compare per-field app digests, editor identity/history/selection, focus/scroll,
counts and native reached/released timestamps. The snapshot clock bounds enclose
renderer observation; use them as an uncertainty interval, not exact simultaneity.
Use the returned operation ID (1 below is only an example):

```json
{"command":"release","operationId":1}
{"command":"snapshot"}
{"command":"finish"}
```

Use `read-document` or `confirmed-refresh` for the other gates. Arming has a
60-second deadline; run lifetime is 30 minutes. A timeout/disconnect cancels a held
operation without executing it. An already released save completes normally.
`finish` rejects while operations are active. Quit normally through the QA app;
runner exit never force-kills it or clears drafts. A successful finish disables
further gated operations; restart via the runner for another session.

Responses include at most 128 trace events. When moreEvents is true, request
snapshots until false **before finish**, retaining every protocol.jsonl line.
Clock is mach-continuous-seconds. Renderer hashes contain no document text/paths;
they are observations, not authority. Native counts cover command invocations,
not internal syscalls. The gate does not claim physical disk-write overlap.

Use one fault per fresh launch with `--fault preference-read`, `preference-write`,
`native-theme`, `fixture-read` or `fixture-save`. Each is one-shot. Preference read
and native-theme faults can be consumed during initialization; write faults wait
for selection, fixture faults wait for the corresponding native command. Injected
fixture-save fails after original validation and before staging writes; fixture-read
fails only after the original validated read succeeds. Original errors take precedence.
Original operation errors/rechecks use their normal paths. Test those separately. All injected evidence is instrumented.

Apply the full matrix in instrumentation-decision.md. For every screenshot record
build class, theme/locale/width, measured contrast, keyboard path and injection.
Noninjected production journeys are separate. No source-document commands execute.

## Build startup acquisition tools (T020)

```sh
mkdir -p target/acceptance-tools
xcrun swiftc -parse-as-library -module-cache-path /private/tmp/f002a-swift-cache \
  tests/acceptance/startup-recorder.swift -o target/acceptance-tools/startup-recorder
xcrun swiftc -module-cache-path /private/tmp/f002a-swift-cache \
  tests/acceptance/startup-flash.swift -o target/acceptance-tools/startup-flash
target/acceptance-tools/startup-recorder --self-test
```

The clock self-test neither starts capture nor requests permission. Existing
Screen Recording access is required; the recorder does not prompt/change it.
It refuses an existing output directory, an unknown display/refresh rate and
unbounded duration. No audio is acquired. CVDisplayLink calibration APIs remain
available in SDK 15.5 but emit deprecation warnings; no newer target is claimed.

Before acquisition, manually isolate a dedicated display/session with only synthetic
content and no personal windows/notifications. The explicit `--isolated-display`
argument is the operator's declaration of that precondition, not automatic proof
or permission to record the ordinary workspace. Obtain its numeric display ID from
the test session's display configuration. If isolation/permission is unavailable,
leave T020 BLOCKED; compiling the helper does not resolve that environment limit.

Before and after a ten-trial series, start the recorder on that display into a new
private output directory; after its ready event, run startup-flash with the same
display ID. Its 300×300 window requests white for one display-link interval and
logs target/actual update ticks. Retain stimulus stdout alongside capture video and
timeline. Verify the actual white flash duration in the recording and stimulus
log, including dispatch delay. Scheduling one interval is not proof of a visible
single-refresh flash. Failed/uncertain calibration invalidates the series.

For each trial: set production preference to Dark through normal UI, quit normally,
verify no md_reader process remains, then run (replace DISPLAY_ID):

```sh
python3 -B tests/acceptance/startup_trial.py \
  --recorder target/acceptance-tools/startup-recorder \
  --app "src-tauri/target/release/bundle/macos/Intentgrove.app" \
  --isolated-display DISPLAY_ID --saved-dark-confirmed --seconds 45
```

The launcher verifies the production identifier/signature, waits for a complete
frame persisted as ready.png, records launch clock bounds, then starts the actual
executable. Open a disposable document through its normal picker. Do not alter
startup timing. Recorder retains ProRes 4444 video, raw per-sample status/PTS,
WindowServer display timestamps and conversion anchors, display metadata and
app-PID-only window bounds. No other window metadata is retained. Full display
pixels are captured, which is why prior isolation is mandatory.

The output acquisition.json is **NOT TESTED**, even when recording succeeds.
`acquisitionValid` means no detected recorder error, not verified frame coverage.
Review every app-content frame, idle intervals, bounds/occlusion, encoder failures,
refresh cadence and clock uncertainty. DisplayTime is mach absolute time; the
recorded anchors map it to continuous launch time. PTS is retained separately.
App bounds queried at callback time can lag the recorded frame; uncertain bounds
must be resolved visually or invalidate the trial. First-frame PNG persistence can
cause encoder pressure; any gap after readiness still invalidates the trial.

Ten separate cold launches and before/after flash calibration are required. Populate
startup.json only from raw observation and named review. New intake fields require
calibration artifacts, clockMappingReviewed, frameStatusReviewed and
displayCoverageReviewed. Preserve original raw artifacts; do not fill gaps with
interpolated frames. Restore app settings through normal UI after the series.

## Tool verification commands

```sh
python3 -B -m unittest discover -s tests/acceptance -p 'test_*.py'
python3 -B tests/acceptance/check_build_guards.py
python3 -B tests/acceptance/qa_smoke.py \
  "target/qa-native/release/bundle/macos/Intentgrove QA.app"
python3 -B tests/acceptance/check_build_boundary.py qa target/qa-dist \
  "target/qa-native/release/bundle/macos/Intentgrove QA.app/Contents/MacOS/md_reader"
python3 -B tests/acceptance/check_build_boundary.py production dist \
  "src-tauri/target/release/bundle/macos/Intentgrove.app/Contents/MacOS/md_reader"
```

The Cargo guard check requires the same toolchain environment as the build. It
expects four rejected builds, not four successful builds. The empty-package smoke
check opens no document, verifies real native/renderer communication, arms then
clears an unused read gate, and quits normally. It is not independent QA or a
T018/T019 acceptance run. Run it only when no other QA session is active.

For native gate unit tests, build the QA frontend first, then supply its config:

```sh
TAURI_CONFIG='{"identifier":"com.juanmantilla.markdownworkspace.qa","build":{"frontendDist":"../target/qa-dist"}}' \
CARGO_TARGET_DIR=target/qa-native cargo test --manifest-path src-tauri/Cargo.toml \
  --locked --offline --features acceptance-harness --lib acceptance_harness
```

Run default-feature native regression separately. QA tests use `--lib`; existing
integration suites compile isolated source modules and are exercised in production
configuration. Preserve the original CSP, ACL and both package signatures/hashes
in evidence. Do not describe marker scans alone as proof of production behavior.
