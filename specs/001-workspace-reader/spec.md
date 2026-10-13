# Feature Specification: Workspace Reader

**Feature directory**: `specs/001-workspace-reader`
**Created**: 2026-09-25
**Status**: Draft for user approval
**Input**: `docs/feature-briefs/001-workspace-reader.md` and confirmed product requirements

## User Scenarios & Testing *(mandatory)*

### P1 — Open and read a local repository

A developer selects one local folder, sees its directories and Markdown files appear
incrementally, and opens a document in a rendered tab.

**Acceptance scenarios**

1. Given a folder with nested directories and two `README.md` files, selecting it
   shows both paths; opening each creates a distinguishable tab, and reopening one
   activates its existing tab.
2. Given headings, lists, a table, a task list, fenced code, a local PNG, and a
   relative Markdown link, the reader displays them without changing source bytes.
3. Given a folder with 25,000 entries, the interface shows initial entries and
   progress before the entire folder has been enumerated; the user can cancel.
4. Given no folder, an empty folder, or a folder with no Markdown files, the app
   shows a useful empty state and an action to select another folder.

### P1 — Follow safe local links

A developer can follow links within the selected folder without accidentally
granting access to unrelated local files.

**Acceptance scenarios**

1. A relative Markdown link within the selected folder opens the target in a tab;
   a heading anchor scrolls to that heading.
2. A relative local PNG within scope displays. A remote image, unsupported asset,
   or path escaping through `..`, symlink, alias, or encoded path shows a blocked
   or unsupported state without implicit access.
3. An explicitly selected external Markdown file opens on its own; links and assets
   beside that file do not acquire access to its parent directory automatically.

### P2 — Keep reading across tabs and recover from file errors

A developer switches among documents without losing the active tab or scroll
position in the running session, and can recover from inaccessible content.

**Acceptance scenarios**

1. Two different documents retain independent scroll positions while tabs switch.
   Duplicate filenames display enough parent path to identify them.
2. A file deleted after listing, permission denial, invalid UTF-8, binary content,
   or an over-limit file produces a specific recoverable state; other tabs continue.
3. Leaving or cancelling a deep directory load leaves the workspace responsive.

### P1 — Read without side effects

A developer uses the installed desktop app without a
development server or separate browser.

**Acceptance scenarios**

1. A packaged macOS build opens bundled fixture documents with
   the development server stopped.
2. Opening and navigating fixture documents leaves their content hashes unchanged
   and creates no app-owned file in the fixture repository.
3. A document with remote images, executable links, raw HTML, MDX, or code fences
   cannot initiate network requests or execute scripts/native commands.

### Edge cases and explicit boundaries

Paths may contain spaces, accents, non-ASCII characters, and case variants. Symlink
cycles and roots that disappear mid-listing must not hang the app. A listed file can
change or vanish before opening. Unsupported MIME types, files larger than the
normal rendering budget, unreadable folders, and malformed Markdown must keep the
shell usable. File names are untrusted text. Network mounts and cloud placeholders
are excluded from v1; the app must not deliberately trigger a cloud download.

## Requirements *(mandatory)*

- **F001-R01**: The user can select one local root folder and browse its directory
  structure incrementally. The tree shows directories and names, offers a visible
  Markdown-only filter, includes documentation dot-directories, and excludes
  `.git`, `node_modules`, build output, and dependency caches by default with an
  explanation of hidden content.
- **F001-R02**: The user can open `.md` and `.markdown` files, case-insensitively,
  through the tree or an explicit file picker. The default tab renders GFM basics:
  headings, lists, links, local raster images, tables, display-only task lists,
  and fenced code. Reopening the same file identity activates its existing tab.
- **F001-R03**: Multiple distinct files retain independent active and scroll state
  during one running session. Duplicate tab names show a distinguishing parent path.
- **F001-R04**: Relative Markdown links and heading anchors navigate within the
  selected root. Local images load only from that scope. Out-of-scope, remote,
  executable-scheme, unsafe-encoded, and unsupported targets show a clear blocked
  or unsupported state. An explicit external file selection grants that file only.
- **F001-R05**: Reading and navigation do not write or create files in the selected
  repository or change the contents of opened documents.
- **F001-R06**: Remote content, embedded HTML/scripts, MDX, executable URLs, SVG,
  and fenced code cannot execute or initiate app network requests. Raw HTML is
  shown as inert text. Remote images have explanatory placeholders.
- **F001-R07**: Missing, denied, non-regular, binary, invalid-encoding, and oversize
  files show recoverable states. No partial content appears as a complete document.
  Files above 10 MiB are outside rich rendering; 10–50 MiB may open only after an
  explicit large-file source-mode choice in F003, and files above 50 MiB are refused.
- **F001-R08**: Tree, tabs, document, and recovery actions are keyboard accessible
  and have visible focus. Long listings are incremental and cancellable. The
  document remains usable at narrow window widths and display scaling.
- **F001-R09**: The installed macOS app opens local fixture documents
  without a browser or running development server. No runtime tool installation is
  required.
- **F001-R10**: Initial shell and error messages are available in English and
  Spanish, with the same actions and meaning. Content is never translated.

### Key Entities

- **Selected root**: Explicitly chosen directory and the scope it grants.
- **Document identity**: A file selected through the tree or picker, its display
  path, allowed scope, and currently loaded state.
- **Tab**: Document identity, active state, scroll anchor, and recoverable error.
- **Link target**: Parsed target and the outcome: in-scope navigation, blocked,
  unsupported, or missing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a recorded macOS Apple Silicon test machine, a 1 MiB ordinary
  mixed Markdown fixture becomes usable within 1 second after the file read in
  at least 9 of 10 warm runs. This is a target, not a measured result.
- **SC-002**: With a 25,000-entry fixture, initial directory content appears before
  the full listing completes, cancellation is acknowledged within 250 ms in at
  least 9 of 10 runs, and the window remains responsive.
- **SC-003**: Every in-scope basic GFM fixture renders or presents a specific
  recoverable error; blocked content causes zero observed app network requests
  and zero script/native execution in the test harness.
- **SC-004**: All opened fixture content hashes match before and after reading,
  and no app-owned file appears inside fixture roots.
- **SC-005**: A packaged build completes the folder → tab → local-link journey
  with development tools/server stopped on the tested Mac.
- **SC-006**: The primary journey and all recovery actions are operable using only
  the keyboard in both English and Spanish, with no clipped essential control at
  the tested minimum window size and display scaling.

## Assumptions and proposed defaults for approval

- One root per window; explicit external files are file-only grants.
- Supported extensions are `.md` and `.markdown`; raw embedded HTML and SVG
  remain inert/unsupported in F001. Remote URLs may be copied, not opened.
- Directory exclusions and 10 MiB rich-rendering limit use the values in the
  product brief. F001 refuses files above 10 MiB with a clear F003 large-file
  mode notice; it does not implement that mode yet.
- F001 includes foundational EN/ES shell text and keyboard access. Full typography,
  Mermaid, YAML metadata, highlighted code completion, search, recents, session
  restoration, external refresh, editing, Finder integration, and release
  distribution belong to F002–F005.
- Performance targets are provisional until benchmarked on the actual Mac. Failure
  to meet them requires evidence and an approved revision, not silent relaxation.

## Authorized standalone HTML extension — 2026-10-08

October 6 remaining-scope authorization and the current native IMPLEMENT instruction supersede the historical staged gates for IR-02/03. Original approval snapshots remain immutable. Existing raw-HTML-as-inert-text rules apply to embedded Markdown HTML; standalone HTML has the separate boundary below. Approved option D and `design-reviews/03-10-27-01/proposals/html-view-handoff.md` remain the experience owner.

- **F001-H01**: HTML/HTM names open through native picker, root listing, native entries, recents, filename search and restored file selections using type-aware descriptors. HTML content is excluded from folder content search and Markdown editing/recovery.
- **F001-H02**: Render authored local HTML/CSS in a separate unprivileged native surface. Document JavaScript, native IPC, remote resources, active embedded documents, forms/submission, downloads, popups, redirects and automatic navigation are unavailable. Main renderer CSP and Settings privileges remain intact.
- **F001-H03**: Every resource read uses actual grants, no-follow handles and current source/resource identities. An explicit file never grants its siblings or parent. Deliberate per-view resource file/folder selections are independent from the workspace root.
- **F001-H04**: Bound document/resources/CSS imports/fonts/decoded images/diagnostics/load and inspection work. SVG embedded resources are unsupported; inline SVG remains under JavaScript-off/CSP containment. Limit or missing resources leave readable HTML and diagnostic reasons where possible.
- **F001-H05**: Opening/ready/empty/failed, source/resource changes, missing anchors, cancellation and stale ownership are typed. Visible text Find, visible headings, location, fragments, native viewport, viewer-local zoom and refresh are available without document scripts.
- **F001-H06**: Native-captured deliberate local links route by target type to HTML/Markdown/images/File details. A file link never launches an external application. Missing/outside-grant/blocked outcomes retain the source and shared history until destination success.
- **F001-H07**: Dispose/cancel revoke resource authority and reject late work by owner/token/generation/request. Close/root replacement/Settings transitions cannot leave a document covering shell controls. Restore retains HTML location/zoom but no form or edit state.
- **F001-H08**: Acceptance distinguishes direct native engine/broker, Tauri IPC, mocked UI, packaged and platform execution. Actual native authored CSS/resource/security/network/lifecycle evidence is required; configuration/compilation alone is insufficient.

Detailed policy, contracts, acceptance and limitations: [native amendment](html-native-amendment-20261008.md). Full frontend integration and supported-platform acceptance remain explicit tasks; these requirements do not assert completion.
