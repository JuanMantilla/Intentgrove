# F002R separately sandboxed renderer amendment

PROPOSED — requires specific approval. Production remains unchanged. This is a concrete follow-up to the approved iframe experiment, not a claim that a process prototype works.

## Observed failure

The approved blob frame initially stayed at about:blank. In a disposable native copy only, the navigation guard logged and allowed blob:tauri://localhost/ URLs. The child then executed (source-matched messages, event.origin null), lacked Tauri wrappers and was denied parent DOM access. Network and resource probes generated child CSP denial events. Direct WK message-handler access existed and accepted a harmless invalid message; native refusal was NOT established. Source and evidence: ../../qa/runs/macos-completion-20261008/probe/, probe-native/, evidence/probe-busy-state.txt and .png, probe-native-only.patch and probe-source-hashes.json.

Executing five-second busy code began 2026-10-08T02:22:09.357Z and completed at02:22:14.356Z. The parent's1000ms deadline ran at02:22:14.357Z, reporting5000ms. It removed the frame after execution finished. Thus removal does not terminate executing code, and the parent cannot enforce its deadline. No production navigation/CSP weakening occurred. Main-thread timer rearrangement, cancellation messages or a watchdog worker posting back to this blocked parent do not repair that demonstrated boundary. Off-main-thread parsing alone cannot bound a hostile DOM/SVG rendering phase. A separate rendering process is the proposed correction.

## Exact proposed mechanism and scope

Add a bundled private DiagramRenderer macOS helper, built with existing Rust/Clang/Apple WebKit/AppKit tooling and private ad-hoc signing. Keep deployment targets unchanged. Do not install toolchains, add services/startup items, change OS security or use release credentials. Reuse native helper packaging and bounded image-validation conventions; no Tauri runtime or native-command bridge inside the helper.

Prototype a plain Cocoa/WKWebView helper with an independently enforced App Sandbox: no network-client/server, user-selected-files, file bookmarks, app groups, automation, JIT exceptions or inherited parent privileges. Bundle resources are read-only; ephemeral WebKit storage and a disposable container are the only state. Treat the exact required entitlements and actual sandbox behavior as proof gates, not assumed isolation. Use an inherited private bounded IPC channel with a random per-launch token; no general command socket or filesystem paths from documents.

One helper job at a time, request protocol version/source generation/job ID/token; maximum32KiB UTF-8 Mermaid source, supported flowchart/sequence only, maximum256 nodes/512 edges, maximum2048x2048 raster/4,194,304 pixels and16MiB RGBA/4MiB encoded output. Reject init/config/frontmatter/click/links/HTML/style/classDef/external resources and mathematical labels. Lock security configuration in helper-owned code. Audit exact Mermaid11.17.2 and its dependencies; no silent substitution.

The helper renders locally and returns only a typed bounded raster with width/height/stride/byte count, never HTML/SVG/JS, paths, arbitrary URLs or native operations. Validate framing/token/job/generation/length before allocations; validate pixels using the existing isolated image boundary. Parent-native monotonic watchdog owns a two-second hard deadline independent of frontend and helper event loops. Cancellation, source replacement, tab close and deadline close the channel and terminate the helper. Determine WebKit descendant ownership/cleanup during prototype; process groups alone must not be assumed sufficient for launchd-created descendants. Do not enable production if busy rendering or descendants survive cancellation, or if parent/unrelated tabs stall.

## Required prototype and acceptance gates

Record actual execution before probes. Prove absence of WK/Tauri/native authority; attempt parent/IPC access, filesystem/network/resource access, hostile config/HTML/SVG/links, malformed framing, oversized source/node/pixel/bytes, forged token/source/generation and late replies. Exercise executing busy parse and render phases, cancel/stale/timeout, parent responsiveness and descendant teardown with externally measured timestamps. Include valid supported diagrams, malformed per-block localized fallback and unaffected siblings. Preserve all attempt-level evidence.

After successful prototype proof and dependency audit, scoped production integration may proceed only under the explicit approval below: native worker ownership/cancellation, frontend inert raster/source/error blocks, exact package helper inclusion/signature checks, full rebuilt acceptance. Production CSP must retain frame-src 'none'. If the proposed helper cannot establish sandbox/runtime/termination, return the concrete failure and revised design rather than weaken its boundary.

## Dependency finding and exact remedy needing approval

The isolated registry resolution for Mermaid11.17.2 verified113 tarballs/integrities and reviewed licenses (MIT/BSD/ISC/Apache/Unlicense; dual MPL/Apache choose Apache). khroma's manifest omits license but its tarball includes MIT. No install lifecycle scripts. Current upstream Mermaid advisories are patched before11.17.2. However npm audit identifies transitive KaTeX0.16.x affected by GHSA-238p-pmpm-9mq7 (>=0.11.0,<0.18.2; patched0.18.2), a prototype-pollution read-side gadget. Math is outside supported scope, but clean dependency acceptance is not claimed.

Proposed remedy: retain exact Mermaid11.17.2 and explicitly authorize an audited project override of its KaTeX dependency to exact0.18.2, with integrity/license/security and actual WebKit compatibility tests before use. This crosses the original Mermaid transitive range; do not install it without this specific authorization. If compatibility fails, keep diagrams disabled and return findings. Sources: https://github.com/advisories/GHSA-238p-pmpm-9mq7 and dependency-audit/npm-audit.json, tarball-audit.json, upstream-advisories.json in current run.

## Approval requested

Authorize (1) this separately sandboxed helper prototype and scoped production integration only after all isolation/termination gates pass; (2) exact audited KaTeX0.18.2 override while retaining Mermaid11.17.2; (3) related repository/native helper packaging/lockfile/tests. No release credentials/notarization/publication/security changes/account creation/valuable data changes/target installation/commit/push. Authorization is not acceptance.
