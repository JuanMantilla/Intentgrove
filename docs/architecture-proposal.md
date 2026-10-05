# Architecture proposal — not yet approved

## Candidate stack
Use Tauri 2 for the desktop host, React + TypeScript + Vite for the interface,
and a small Rust boundary for filesystem access, watching, search and persistence.
Use a source editor such as CodeMirror 6. Candidate rendering pipeline:
`react-markdown` + GFM support + bounded frontmatter parsing + a bundled highlighter
and Mermaid. Check current primary documentation, compatibility and licenses
before committing dependencies; record exact versions and lockfiles in the plan.

Why this proposal: the app can use one UI codebase while keeping native file
operations behind a narrow interface. Develop on macOS with Rust, Node.js and
Xcode Command Line Tools for this desktop-only target [T1]. Tauri uses the system
WKWebView/WebKit on macOS, not WebView2 [T2]. The release contains local assets;
it is not a website, a browser tab, or a development server. Keep Windows and
Ubuntu adapters as later work rather than implementing three release pipelines.

## Layers
- UI shell: directory tree, tabs, outline, search, settings and EN/ES messages.
- Document layer: source buffer, parser, view/editor modes, dirty state and anchors.
- Workspace layer: selected paths, allowed scopes, recents and session restoration.
- Native services: validated reads/writes, directory listing, bounded search,
  watching, path identity, local settings and recoverable save operations.
- Platform adapter: dialogs, file association and installer details; keep it small.

Do not expose a generic shell command, unrestricted file read/write or arbitrary
URL loader to document content. Prefer backend-held file handles/identities and
scoped command contracts to trusting renderer-supplied absolute paths.

## Required decisions in the technical plan
Define macOS path identity, Unicode normalization, case-sensitive and
case-insensitive volume behavior, symlinks, aliases, non-regular files, and races
between validation and access. Never assume lowercasing is a safe path identity
function. Reject unsafe special files; do not traverse aliases/symlinks out of scope.
Define a practical policy for network mounts and nonresident cloud placeholders. Opening a
file/folder through an explicit dialog is the trust boundary; a document link is
not authority. Limit asset serving to permitted local image paths and MIME types.

Separate untrusted rendered content from privileged UI/native IPC. Review both
Tauri capabilities and custom native commands; capability configuration alone is
not evidence that application-specific command handlers validate their arguments.
Define production CSP, navigation blocking, sanitized/escaped HTML/SVG handling and
scheme policy. Do not casually broaden CSP or resource scope to fix an image bug.

Run Mermaid with a fixed restrictive host policy. Document directives/frontmatter
must not relax security, import fonts/icons, perform network requests or attach
executable callbacks. Bound YAML depth/aliases and rendering workload; preserve
invalid source without crashing the shell. Choose an isolation/cancellation design
that actually prevents expensive document work from blocking the whole UI.

Define external-update/dirty-buffer transitions, atomic replacement strategy,
concurrency revalidation, file permissions, failures and recovery. Test with a
second process that writes/renames/deletes files. Never assume a watcher event
sequence or timestamp comparison makes concurrent writes race-free.

Use local versioned settings/session files unless evidence justifies a database.
Do not create settings in the opened repository. Bound caches and recovery draft
storage. Define cleanup, migrations and failure recovery. No telemetry.

## macOS packaging
Propose a .app bundle and .dmg built on the Mac [T3, T4]. Record `sw_vers`,
`uname -m`, native hardware architecture, shell translation state if relevant,
SDK/toolchain versions and the actual target triple. Propose the developer’s
native architecture first; do not require universal builds or Rosetta. Select a
minimum supported macOS version during planning and verify its WebKit compatibility.
A build target does not establish runtime support for an untested OS or CPU.

Bundle the complete frontend, renderer, grammars, diagrams, local fonts and other
assets. Do not fetch an extra webview runtime during installation. OS WebKit and
security services remain system-managed; the no-network acceptance criterion
covers application-initiated requests and required application functionality [T2].
The developer’s installed Node/Rust/Spec Kit must not be runtime dependencies.

Propose personal local .app/.dmg builds with the signing state clearly labeled.
Tauri supports ad-hoc signing; that does not establish Apple notarization or
warning-free downloaded installation [T5]. Developer ID signing, notarization,
credential setup and uploads are separate decisions. Do not disable Gatekeeper,
SIP or quarantine protections. Notarization/stapling and Gatekeeper assessment must
be validated before claiming a smooth signed-download distribution experience.

Plan native application menus, Cmd shortcuts, Finder Open With for .md/.markdown,
file-open events on cold and warm launch, Dock reopen, and close-versus-quit.
Use least-privilege file selection; an OS permission dialog never replaces native
path validation. Store settings using platform app-data APIs, not in source repos.

## Verification strategy
Separate fast UI tests, native Rust/file integration tests, and tests of the
packaged macOS application. Browser tests alone do not prove Finder integration,
permissions, watchers, safe writes, native dialogs or installation.

Current Tauri docs describe macOS automation through WebdriverIO’s Tauri service
with an embedded driver; direct upstream tauri-driver alone targets Windows/Linux
[T6]. Evaluate that route in the plan rather than assuming all Mac automation is
unsupported. Any embedded test driver/IPC hooks/listeners must be test-only and
absent from the production bundle. Verify native calls without mocks for desktop
acceptance. Add actual manual checks for OS dialogs/menus or other uncovered areas.
Do not install paid automation services without approval.

Test packaged copies/launches, data preservation, EN/ES, permissions, display scaling,
keyboard operation where available, and Finder delivery on the actual Mac.
Record outcomes separately for development, instrumented tests and the final bundle.
Missing native evidence remains NOT TESTED, not PASS.

## References
See docs/references.md, especially T1–T6. These are planning sources, not proof
that this unimplemented application has passed any runtime or security test.
