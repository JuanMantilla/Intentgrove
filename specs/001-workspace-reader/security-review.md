> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F001 security review — 2026-09-25

This is a code and disposable-fixture review by the implementing session, not an independent audit. Native packaged behavior is limited by the unavailable display; no network capture was performed.

## Boundaries checked

The native picker registers opaque root/file IDs; frontend commands cannot supply an arbitrary absolute read path. Relative access walks open directory descriptors with `openat` and `O_NOFOLLOW`, rejects unsafe path components, checks regular files/local mounts, and limits document reads to 10 MiB and raster reads to 8 MiB. Explicitly picked files do not grant their parent folders. No write, shell, URL-open, remote fetch, or generic filesystem command is registered. Rust fixture tests exercise traversal, symlinks, encoded separators, remote links, unsupported SVG, invalid encoding, binary and oversize files.

The renderer uses React Markdown with GFM and no raw-HTML plugin or MDX execution. Links render as buttons and pass through native scope resolution; image bytes come through the scoped native reader and a revocable blob URL. The production CSP limits scripts, connections, images, frames and fonts; the native window rejects external top-level navigation, new windows and downloads. The bundle contains no test driver. Tauri's [navigation handler API](https://docs.rs/tauri/2.11.6/tauri/webview/struct.WebviewWindowBuilder.html#method.on_navigation) is used for the guard.

## Findings and residual risk

| Finding | Severity/status | Evidence and next action |
|---|---|---|
| Generated bundle failed whole-bundle signature verification before final signing | Fixed locally | `codesign --verify` failed; local `codesign --force --deep --sign -` made verification pass. Every rebuilt bundle needs this local signing step until packaging is automated. Public signing/notarization belongs to F005. |
| 10 MiB Markdown parsing and React mounting occur on the UI thread | Medium, open | Native read is bounded, but a pathological table/line could stall WebKit. The approved plan calls for a worker/time budget where practical. Add a parser budget or worker path and measure adversarial fixtures before F001 acceptance. |
| Cloud placeholder avoidance is not proven | Medium, open | Native code rejects identified network mounts, but APFS/cloud placeholders are not detected before opening. Test on a disposable cloud placeholder; add a non-downloading detection path if the host exposes one. |
| Packaged network silence and CSP enforcement are unobserved | Medium, unverified | Component tests prove remote DOM nodes are absent for tested Markdown. Run the signed app offline and monitor its own traffic with remote image/link fixtures. |
| Case-variant collisions and native permission presentation remain unverified | Low/medium, open | Rust fixtures now cover denied, nonregular, atomic replacement, Unicode names and upper-case extension. Exercise name collisions on a case-sensitive volume and verify the error state in the packaged window. |

No controlled fixture demonstrated an out-of-scope read or script execution. That result does not establish that all adversarial inputs are safe.
