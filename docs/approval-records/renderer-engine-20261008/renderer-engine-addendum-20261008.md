# F002R renderer helper engine correction

PROPOSED — exact approval required before changing the approved WKWebView helper engine. Original approved renderer-process amendment and approval snapshots remain unchanged.

## Concrete failed prototype

The ad-hoc signed App Sandbox helper denied a disposable sentinel read and loopback connect with EPERM. Its WKWebView never established page execution. Two-second attempts and a separately labeled ten-second startup diagnostic failed; no termination proof is inferred. WebKit GPU logged `Application does not have permission to communicate with network resources. rc=1 : errno=34`, then exited1. WebContent likewise failed its launch. Restoring complete bundle metadata did not repair startup. Evidence: ../../qa/runs/macos-completion-20261008/evidence/renderer-prototype-results-attempt-01.json, renderer-startup-results-attempt-03.json, renderer-prototype-probe-04.log, renderer-webkit-exit-reason.log and renderer-launchd-failure.log. Production source/CSP unchanged; no network entitlement added.

The upstream WebKit initializer performs a network permission check (https://bugs.webkit.org/show_bug.cgi?id=219632; WebKit XPCServiceEntryPoint.mm). The host log is the evidence for this host, not a claim that every WebKit version has identical behavior.

## Exact bounded alternative

Keep the separate signed App Sandbox helper, no native/document file grants or network entitlements, private bounded protocol, immutable config, supported flowchart/sequence, pixel-only output, parent-native watchdog/cancellation and all prior source/node/output limits. In the disposable helper prototype, replace WKWebView with Apple's existing AppKit `WebView` (WebKitLegacy), whose JS/DOM executes within the killable helper process. Use existing SDK/frameworks only; no toolchain/deployment-target/security changes and no additional dependency beyond the already approved exact Mermaid/KaTeX combination.

This API is deprecated: that is a compatibility/maintenance risk, not an isolation claim. No production integration before proving the actual sandbox and deadline, Mermaid JavaScript/DOM compatibility, bounded snapshots and all original hostile cases. Expose no general Objective-C/WebScripting object. The only output path is a native bounded dictionary validated against the per-launch job/token/generation, then native raster capture and the existing isolated pixel validator. Native resource-load delegation whitelists the bundled script/bootstrap only, denies redirects and every document-derived resource; child CSP also denies network/fonts/frames/objects/forms. Disallow navigation/new windows/downloads, clear cache/cookies and do not persist WebView storage.

Prove native file/network denial, actual script execution, no Tauri/WK/general native bridge, hostile configuration/HTML/SVG/links/resource denial, bounded source/nodes/pixels/bytes, forged/stale replies, executing busy-code cancellation/deadline, parent/unrelated-tab responsiveness, cleanup, valid/malformed supported diagrams and unaffected siblings. Record ancestor/descendant process ownership. If any boundary fails, do not broaden privileges or silently substitute another engine.

## Exact approval requested

Authorize this WebKitLegacy-based disposable helper prototype and scoped production integration only after all isolation/termination/compatibility gates pass. All previous source/output bounds, exact dependencies, release/security/data/account restrictions and independent acceptance requirements remain. No network entitlement or OS security weakening is requested. Approval is not acceptance.
