# Implementation Plan: Workspace Reader

**Feature:** `001-workspace-reader` | **Date:** 2026-09-25 | **Status:** Draft for architecture approval
**Spec:** [spec.md](spec.md) | **Design:** [design.md](design.md)

## Summary

Build F001 as a macOS desktop window with a restrained React reader and a small
Rust service that owns all selected-folder authority. The frontend receives
opaque root/document IDs and relative display paths, not permission to read
arbitrary paths. Basic Markdown renders from bounded UTF-8 content, with
relative links and raster images resolved through validated native commands.
This first slice remains read-only.

## Technical Context

| Item | Proposed choice |
|---|---|
| Host | Tauri 2, system WKWebView, native aarch64 macOS target |
| UI | React + TypeScript + Vite; local CSS and EN/ES string catalogs |
| Renderer | `react-markdown` + `remark-gfm`; no `rehype-raw`, MDX, or remote plugins |
| Native | Rust commands for selection, incremental listing, bounded reads, and scoped raster assets |
| Dialog | Tauri dialog plugin opened by Rust; selected paths registered by native service |
| Storage | No repository writes or app database in F001; tab state held in memory |
| Test | Rust unit/integration tests, UI component tests, native packaged Mac journey |
| Build host | Observed macOS 26.2, arm64, Xcode Command Line Tools present |
| Missing build tool | Rust/rustup is absent; install after approval into a reviewed local tool location |
| Dependency control | Commit-ready npm and Cargo lockfiles; resolve and pin exact compatible versions during the approved scaffold batch before code review |
| Capacity | Rich Markdown ≤10 MiB; bounded file reads and cancellable listing; 25,000-entry test fixture |
| Delivery | F001 runnable .app for native acceptance; public-style .dmg/signing is F005 |

The native target is the developer's arm64 Mac. The minimum supported macOS
version is provisionally macOS 14; it remains unclaimed until tested. No Intel or
universal support is claimed. F001 can run on the observed macOS 26.2 only after
it is actually built and tested there.

## Constitution Check

The draft plan preserves non-mutating reads, untrusted
document boundaries, EN/ES shell strings, keyboard behavior, and requirement
traceability. The constitution, F001 spec, visual design, and this plan are
unapproved. This check permits proposal work only; production implementation
remains blocked until the user approves their current versions.

## File and IPC boundary

The root picker and file picker are explicit user authority events. The backend
opens the selected directory or file and gives the UI opaque IDs. Directory
requests take a root ID and relative segment list; document requests take a
root ID and relative path or a file-only ID. The backend rejects absolute
segments, empty/`.`/`..` components, percent-decoding tricks, separators inside
segments, NUL, symlink traversal, aliases that resolve outside scope, nonregular
files, and paths crossing root/device policy. It resolves each component against
the opened parent without following symlinks and checks the opened object's
identity and type. Device/inode identity distinguishes files; display-case
folding is never used as authority. A deleted/replaced entry becomes a
recoverable error, not a stale read. Revalidate at every read and image request.

Directory enumeration is paged and cancellable; it does not prewalk the whole
tree. Excluded names are filtered at the native boundary, and the UI explains
them. A workspace on an identified network mount is refused. Cloud placeholders
are refused where detectable without fetching; OS-managed network activity
cannot be guaranteed absent, and the app makes no explicit network request.

The only F001 custom commands are `select_root`, `select_file`, `list_entries`,
`read_document`, `resolve_link`, `read_image`, and `cancel_listing`. Their request/response
schemas are in [contracts/native-commands.md](contracts/native-commands.md).
No generic shell, filesystem, URL-open, or write command is exposed. Tauri
capabilities name the main window and only needed permissions; handlers also
validate every argument. No remote origin is assigned a capability.

## Rendering and resource policy

Read a maximum of 10 MiB plus one sentinel byte before decoding. Reject binary
NUL and invalid UTF-8 in F001; unsupported content gets a clear state. Parse in
a worker where practical, with a time/work budget and an error fallback so a
pathological table or long line cannot indefinitely block the shell. Render GFM
to React elements. Keep raw HTML inert and verify its literal-text behavior in
fixtures. Override link and image components: links call the scoped resolver;
images call the native bounded reader, accept only PNG/JPEG/GIF/WebP after type
checks, and use revocable local blob URLs. SVG is unsupported in F001. Remote
and executable schemes never become live `href` or `src` values.

Production CSP allows bundled app assets, necessary Tauri IPC, and local blob
images only. It blocks HTTP(S), navigation, frames, remote fonts, and arbitrary
inline script. A native navigation guard rejects unexpected external URLs.
Do not widen CSP or Tauri asset scope to make a fixture pass. The app ships
no network plugin, telemetry, update client, or remote import.

## Project Structure

```text
src/
  app/                  shell, commands, localization
  workspace/            tree, tabs, error states
  reader/               safe Markdown components and link handling
  styles/               design tokens
src-tauri/
  src/                  Tauri setup and scoped native services
  capabilities/         main-window permissions
tests/
  fixtures/             disposable generated repositories
  ui/                   renderer and keyboard tests
specs/001-workspace-reader/
  spec.md design.md plan.md research.md data-model.md
  contracts/native-commands.md quickstart.md
```

One frontend and one native backend keep the boundary visible. No F002–F005
feature code is added in this slice.

## Verification strategy

Map F001-R01–R10 to Rust boundary tests, UI fixture tests, and the packaged
macOS journey. Native tests create disposable folders with symlink escapes,
encoded/Unicode/case variants, deleted entries, denied paths, nonregular files,
binary/invalid UTF-8, and over-limit sources. Compare hashes before/after reads.
UI tests check GFM, blocked remote resources, EN/ES, tab identity, keyboard
focus, and long labels. Test the installed .app with
the dev server stopped; record actual OS/CPU/runtime, commands, failures, and
NOT TESTED items. Evaluate the current WebdriverIO Tauri service for Mac native
automation; its embedded driver must exist only in instrumented test builds,
never the production bundle. Manual Finder/menu checks remain where
automation does not cover them.

## Decisions and risks

- The minimum OS, packaged font, final CSP directives, dependency versions,
  and performance budgets need validation on a real build.
- OS-managed cloud or network-mount behavior may not be fully detectable; F001
  will refuse known unsupported locations and report the limitation honestly.
- A read-only F001 cannot yet satisfy editing, search, session restoration,
  external refresh, advanced rendering, or final installer requirements; those
  remain mapped to F002–F005.
