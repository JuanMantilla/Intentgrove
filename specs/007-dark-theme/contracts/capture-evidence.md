# F002A capture and request evidence contract — amendment A1

Status: PROPOSED. Tools described here are not implemented or validated.
Production behavior, signing controls, CSP and acceptance thresholds stay unchanged.

## T020: selected recorder

Build an external Swift command-line helper using installed Swift 6.1.2, macOS SDK
15.5, ScreenCaptureKit and AVFoundation; no app dependency. Observed target is
macOS 26.2 (25C56), arm64 only. Capture a dedicated isolated display/session with
`SCContentFilter(display:excludingApplications:exceptingWindows:)` and `SCStream`.
Do not use a window-discovery-dependent filter: it cannot observe pre-window time.
[Apple capture API](https://developer.apple.com/documentation/screencapturekit/capturing-screen-content-in-macos),
[window filter prerequisite](https://developer.apple.com/documentation/screencapturekit/sccontentfilter/init(desktopindependentwindow:)).

Before capture, the operator verifies that the dedicated display contains only
synthetic test content; no personal windows, notifications or unrelated menus.
Use existing screen-recording authorization; never silently alter permissions or
system settings. Excluding currently known applications is not proof of future
privacy: isolation is required. If it cannot be established, do not start.
Approval of A1 includes this isolated display acquisition scope, not the ordinary
workspace or broad recording followed by cropping. Disable audio capture.

1. Hash/signature-check the production executable and inventory fixtures. Set
   saved Dark through its normal UI, quit normally, verify process exit. Keep all
   other app data intact; process cold launch does not mean deleting caches.
2. Set full display pixel dimensions and capture interval appropriate to the
   recorded display refresh rate. Start stream and writer; acknowledge ready only
   after the first complete frame is persisted. Then launch production normally.
   Do not inject startup code, delay rendering, or conceal the app to aid capture.
3. Record sample presentation times, ScreenCaptureKit frame status, app PID/window
   bounds, display scale/color profile, encoder failures and stream interruptions.
   Preserve full-display acquisition; review every visible app-content pixel.
4. Use mach continuous time for runner events. Record explicit sample-clock and
   renderer-clock conversion anchors and uncertainty; sample PTS is not assumed
   to equal mach continuous time. Sleep, clock discontinuity or uncertain ordering
   invalidates the trial. Retain original timestamps alongside converted values.
5. Before/after the series use a separate synthetic helper on the same display
   to show a known one-refresh light flash. Verify the recorder/review catches it.
   Requested frame rate alone is not proof of coverage. Retain calibration frames.
6. Record ten distinct cold launches through first visible app frame, first
   document and stable document. Preserve raw video and per-frame timeline,
   ready/launch/end times, full bounds and reviewer classifications. No light
   document frame is permitted. Identify native pre-content chrome separately.

Unexplained frame gaps, dropped/occluded frames, changed display topology,
insufficient temporal resolution, failed flash calibration, writer backpressure,
or ambiguous light-frame classification invalidate a trial. Documented idle
samples may represent unchanged content; they are not automatically drops, but
must be distinguished using raw stream status. Never fill missing frames and call
that observation. Repeat invalid trials only after addressing their cause.

## T021: selected diagnostic observer and production limitation

Select **QA-only WebKit Network inspection plus CSP violation events**. Reject
root fs_usage, lsof/nettop, proxy-only interception and URL breakpoints as complete
request-attempt observers. No elevated tracing, debugger injection/private WebKit
hooks, production inspectability or CSP reporting endpoint is approved by A1.

WebKit inspection requires per-view opt-in (default false). The Network table
covers requests since inspection opened, so late attachment cannot prove startup.
[WebKit inspectability](https://webkit.org/blog/13936/enabling-the-inspection-of-web-content-in-apps/),
[Network table/export](https://webkit.org/web-inspector/network-tab/).
The CSP event stream is a separate source; a blocked attempt need not create a
socket or a successful resource timing entry. [CSP violation events (working
draft)](https://w3c.github.io/webappsec-csp/#violation-events).

QA collection procedure:

- Enable inspector only in the QA host. Use a QA initialization script to register
  `securitypolicyviolation` before app scripts; forward bounded directive,
  disposition, scheme/origin category, monotonic timestamp and context ID through
  a QA-only observation bridge. Never report document text or full URLs/paths.
  No fetch/XHR monkey patch, preventDefault, altered CSP or network request.
- Attach Network inspection to that QA WebView before starting the measured
  journey, preserve logs, leave cache settings unchanged, and export HAR plus
  CSP events. Inspector attachment/reload is not a production cold-launch test.
- Track each page/worker context and target lifetime. A main-document listener
  does not cover worker CSP violations. Include worker-specific observation in
  the QA worker entry before worker work, or mark that context uncovered. New
  context, target loss, restart or buffer overflow ends the covered interval;
  reattach/recalibrate before any new measured action. Do not claim continuity
  across restart until raw evidence establishes it.
- Before and after each interval, run fixed controls in a separate disposable
  calibration host using identical CSP and observer wiring: bundled image/CSS,
  blocked image and blocked fetch to an .invalid origin. Confirm resource records
  and CSP events with correct context. Calibrate worker requests/violations if
  workers participate. Keep controls separate from journey counts. No CSP bypass
  and no external server. These controls exercise collection, not exhaustive
  coverage of every request source.
- Cover reading, appearance selection, preference persistence and restart as
  explicitly delimited intervals; record blocked fixtures, image pixels, and
  before/after workspace inventory. Native-host requests are outside the WebKit
  observer: record that limitation instead of asserting app-wide coverage.

**Production disposition: BLOCKED for complete request-attempt evidence.** No
supported passive collector providing all production app/WebKit request attempts
and CSP violations has been established for this package. The selected diagnostic
observer is concrete but supplemental. A1 does not approve relabelling QA HAR/CSP
as production, combining socket silence with QA traces to claim complete coverage,
or closing T021 using a build-equivalence argument. This is a known remaining
technical blocker, not an implementation promise. To unblock it, a later narrow
observer proposal must demonstrate production attribution, native/WebKit/context
coverage, pre-action/restart continuity and calibration without changing behavior
or security; any different boundary returns for architecture review. Spec criteria
remain fixed. Do not request root merely to retry the rejected socket approach.

## Artifact interface and verdicts

Retain the existing schema-1 production reports in tests/acceptance/templates.
`buildKind=production` requires the actual executable hash. QA diagnostics use a
separate `qa-diagnostic.json` (schema 1; buildKind instrumented; executable/asset/
CSP hashes; observer versions; intervals; contexts; gaps; controls; artifact
path/SHA-256 pairs; limitations). Never feed it to the production PASS checker.

Startup reports reference video/timeline containing calibration, clock conversion,
status and full-frame review. Extend intake checks to require these records during
implementation; existing metadata checks alone do not validate them. Request
reports may assert requestAttemptsCovered/cspViolationsCovered only with supporting
production raw evidence; keep the template incomplete while that evidence is absent.

Use relative artifact paths, reject symlink/traversal and hash every artifact.
Capture only disposable fixtures; store raw data in the private run directory
until scoped review, then retain authorized evidence under verification-assets.
No upload. Intake PASS means metadata accepted, not behavioral acceptance. QA
records PASS / FAIL / BLOCKED / NOT TESTED per requirement and build class.
