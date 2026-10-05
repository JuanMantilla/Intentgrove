# F001 architecture research — 2026-09-25

**Status:** Planning evidence, not runtime verification.

## Desktop host

**Decision:** Tauri 2 with React/TypeScript/Vite on the observed arm64 Mac.
Tauri's official [macOS prerequisites](https://v2.tauri.app/start/prerequisites/)
say desktop-only development can use Xcode Command Line Tools. Its security
documentation describes the WebView/core trust boundary and system WebView.
The local machine has macOS 26.2, arm64, CLT, Node 20.19.6, and npm 10.8.2;
Rust is missing. Exact Tauri and frontend package versions will be recorded in
lockfiles during the approved scaffold batch. A bundle cannot be claimed tested
until it exists.

**Alternative considered:** Electron would bring its own browser runtime and a
larger privilege boundary; SwiftUI would not match the accepted web-technology
direction as directly. Neither is ruled out by current user approval, because
the architecture remains proposed.

## Filesystem and IPC

**Decision:** A small Rust service keeps authority and opaque IDs; the frontend
cannot submit arbitrary absolute paths. The native dialog originates explicit
selection. [Tauri's IPC guide](https://v2.tauri.app/concept/inter-process-communication/)
and [capability guide](https://tauri.app/security/capabilities/) make clear that
commands and permissions form a boundary, while application handlers still need
their own validation. Avoid enabling Tauri's broad asset protocol; its
[scope](https://v2.tauri.app/security/asset-protocol/) would otherwise expose
local paths to the WebView.

**Alternative considered:** Frontend filesystem plugin with broad globs was
rejected because document-controlled relative links would be too easy to confuse
with user-granted authority.

## Markdown

**Decision:** `react-markdown` with `remark-gfm`, custom link/image elements,
and no raw-HTML parser. The maintained
[react-markdown documentation](https://github.com/remarkjs/react-markdown/blob/main/readme.md)
describes safe default rendering and warns that custom URL transforms/plugins
can reopen XSS risks. Rendering behavior for raw HTML must be fixture-tested.

**Alternative considered:** Rendering arbitrary HTML in a WebView was rejected
because it complicates the local-asset and untrusted-document boundaries.

## macOS testing and delivery

**Decision:** Use Rust integration tests and UI tests first, then exercise an
actual .app on the Mac. The [Tauri WebDriver guide](https://v2.tauri.app/develop/tests/webdriver/)
documents WebdriverIO's embedded macOS service; any driver must be test-only.
The [DMG guide](https://v2.tauri.app/distribute/dmg/) documents building a DMG
on a Mac, reserved for F005. Manual accessibility and OS-dialog checks remain.

**Alternative considered:** Browser-only tests cannot prove native file grants,
app packaging, or Finder behavior.
