# Product brief — Intentgrove

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](current-version-acceptance-20261010.md).

Status: requirements captured from the user’s numbered answers. Platform priority
updated by the user on 2026-09-25: macOS first; development also on macOS.
Refinements below remain proposals until accepted in a feature specification.
Product name: **Intentgrove**, selected by the user on 2026-10-05.
See [brand decision](brand.md).
Working repository name: `md-reader`. Personal use; private source repository.

## Purpose
Intentgrove helps people communicate better with AI by reading, organizing, and
refining documents exchanged with it. The brand should feel calm and distinctive,
like a reading space, and accommodate formats beyond Markdown.

A developer opens an existing repository or folder, browses its directory tree,
and reads Markdown as a well-designed document rather than a wall of source text.
The main use cases are repository documentation and AI-generated Markdown files.
Reading is the primary activity. Editing is available without turning the app
into a full IDE.

## Confirmed requirements

On 2026-09-28 the user removed offline-operation and VoiceOver-specific
requirements and acceptance checks. Local-file behavior, bundled assets,
untrusted-content network restrictions, keyboard access, and standard accessibility
remain in scope. See [scope decision](requirement-retirement-2026-09-28.md).

- An installed desktop application built with web technologies is acceptable.
  It must run without a separately opened browser.
- macOS is the first release platform and the development environment. Windows
  and Ubuntu are later projects, not v1 deliverables or supported platforms
  unless separately specified and verified. Record the actual Mac OS and CPU
  architecture before choosing build targets; do not infer them from browser data.
- Directory browsing, multiple tabs, recent documents and restoring the previous
  session should feel familiar to someone using VS Code/other IDEs.
- Include Markdown editing in the planned v1 scope; the editing interaction still
  needs a bounded specification because the user did not request a full editor IDE.
- Render headings, lists, links, images, tables, task lists, highlighted code,
  Mermaid diagrams and YAML metadata.
- Automatic refresh after external file changes, table of contents, search inside
  a document and across a folder, adjustable typography/font, and saved scroll
  position. Roboto is the desired initial font.
- Simple, beautiful, distraction-free reading UI with panels and tabs.
- View common local image files, explicitly including JPG, SVG and PNG. The extended format list and image-tab behavior are proposed in F006.
- Include a dark theme. System/Light/Dark selection and persistence are proposed in F002A.
- English and Spanish interface; content remains in its original language.
- Local files only. No accounts, cloud sync, analytics, built-in AI model/chat
  integration, hosted backend or remote document service. The AI focus describes
  the document workflow; it does not add a model integration requirement.
- Downloadable installers for personal use. Source is not intended to be public.
- Use GitHub Spec Kit with a new GitHub repository and reusable role skills.
- User approves the specification, visual direction and architecture before
  implementation. Approved local tasks may be implemented/tested without routine
  re-confirmation, subject to actual runtime permissions. Destructive operations,
  publishing, scope changes and spending remain separate decisions.

## Proposed v1 refinements — require specification approval

### Workspace and navigation
One active root folder per window initially. Individual files can also be opened
through an explicit file picker. Tabs may reference explicitly selected files
outside that root; this does not grant access to their whole parent directory.
Support `.md` and `.markdown`, case-insensitively. Show directories and file names,
with a Markdown-only filter; do not add general source-code editing.

Show documentation-relevant dot-directories such as `.agents` and `.specify`.
Hide/exclude `.git`, `node_modules`, build output and large dependency caches by
default. Search respects `.gitignore` with an explicit include-ignored toggle.
Make exclusions visible, not silent. Never follow symlinks or filesystem aliases outside the
explicitly granted roots automatically. V1 excludes remote/network-mounted workspaces and cloud-placeholder downloads;
opening a document must not trigger an application-initiated fetch. Document the
limits of identifying OS-managed mounts instead of promising control over all OS traffic.

Opening a file does not modify it. Local relative links and heading anchors work
within the allowed file scope. An out-of-scope local link shows a blocked state
and offers explicit file selection, not automatic scope expansion. A repository
README must not gain access to the user's entire home folder.

### Reading and rendering
Rendered view is the default. Provide source and split editor/preview modes.
Task-list checkboxes are display-only in rendered mode; edit their Markdown source
to change them. YAML frontmatter is displayed in a collapsible metadata region,
not treated as application configuration. Invalid metadata/diagrams show a local
error and retain access to source; the rest of the document continues to work.

Bundle the renderer, syntax grammars, Mermaid, icons and selected font assets in
the application. No fonts, styles, plugins or images are fetched at runtime.
Remote images display an explanatory placeholder. Remote URLs can be copied;
v1 does not open embedded web pages or execute protocol handlers. Raw embedded
HTML is escaped/displayed as text, not executed. No MDX, scripts or executable
code fences. Local SVG/image handling must satisfy the security review; unsupported
assets get a visible placeholder rather than unsafe rendering.

### Editing, external changes and recovery
Use a source editor with live preview, not WYSIWYG. Include undo/redo, dirty-tab
indicators, Save and Save As. Autosave to original files is off in v1. Ask before
closing dirty tabs. Preserve the document's UTF-8/BOM and line-ending conventions;
unsupported encodings open read-only with a clear explanation.

Auto-refresh clean files after an external writer finishes a change; debounce
watcher events and handle atomic file replacement. If the local buffer is dirty,
never replace it. Show a conflict with safe choices: inspect disk version, keep
editing, save a copy, or explicitly reload/discard local changes. Do not present
blind overwrite as the default. Recheck disk state before every save; never
silently replace a detected newer disk version. Specify residual race handling.
Save failures leave the original intact and the dirty buffer available.

Session state stays in local per-user application data, not in the user's repo.
Restore workspace, tabs/order, active tab, panel layout and scroll anchors. Load
inactive restored tabs lazily. Keep dirty recovery drafts separately from originals;
recovery is offered after restart, never silently written over disk. Include a
clear-recents/session action and disclose that local drafts are stored.

### Typography, localization and appearance
Bundle Roboto locally during implementation; this starter contains no font files.
Initially offer Roboto plus system serif/sans-serif/monospace choices rather than
promising enumeration of every installed font. Use a readable monospace code font.
Adjust font size, line height and reading width. Proposed themes: light/dark/system.
Keep UI translations in one EN/ES catalog. Preserve selection across sessions.

### macOS experience and delivery
Propose a native .app bundle inside a downloadable .dmg. Start with the developer’s
verified CPU architecture and macOS version; minimum OS and extra architectures
require an explicit tested compatibility decision. Do not claim Intel/universal
support just because the code is portable. Keep platform-specific code isolated.

Confirmed 2026-10-08: current delivery targets Apple Silicon on the current macOS
release only. Older macOS, Intel/universal and older-package upgrade acceptance
are outside scope. Fresh installation and app-data/source preservation remain
required. See [support decision](macos-supported-scope-20261008.md).

Use Command-based shortcuts, a native application menu, system window controls,
Finder Open With/file-drop integration, Retina-aware layout and trackpad scrolling.
Define window-close versus app-quit behavior, unsaved-work prompts and Dock reopen.
All these UX details remain subject to visual/spec approval. No custom window
chrome or global shortcuts are needed merely to make the app look polished.

Distinguish a personal local build (including ad-hoc signing where appropriate)
from a Developer ID-signed/notarized download. No paid account, certificate setup,
notarization upload or publication is authorized by the platform change. Report
actual Gatekeeper results and do not disable OS security to make a test pass.

### Provisional capacity and performance budgets
These are requirements to benchmark, not performance claims:
- Normal rich-document mode: up to 10 MiB of Markdown source (10,485,760 bytes).
- Above 10 MiB through 50 MiB: explicit opt-in, read-only large-file source mode
  with bounded loading; no expensive diagram/highlighting work by default.
- Above 50 MiB: explain the v1 limit before reading the full file; no silent
  truncation, partial editable buffers, crash, or automatic external-program launch.
- Representative folder: 25,000 visible entries, including 5,000 Markdown files.
  Incremental listing/search, cancellation and visible progress are required.
- Initial benchmark goals on a recorded Mac SSD/16 GB+ reference machine (proposed):
  interactive shell within 2 seconds; a typical 1 MiB mixed Markdown document
  usable within 1 second after file read; a 10 MiB non-adversarial document usable
  within 3 seconds; search cancellation acknowledged within 250 ms.
- Record cold and warm runs, hardware, dependency versions, fixture shape and
  percentiles. Test deep nesting, long lines, giant tables and many diagrams.
  File size alone does not ensure cheap rendering. Bound individual render jobs
  and safely fall back rather than freezing the app. Revisions need evidence and
  approval, not a quiet reduction of the requirement.

## Not in v1
Windows/Ubuntu installers, cloud or account features, AI assistants, collaboration,
Git operations, terminals, plugin execution, MDX, WYSIWYG editing, PDF/HTML export,
printing, Obsidian vault features, automatic updates, app stores, general file
rename/delete operations, and multi-root workspaces. None were confirmed as needed.

## Meaning of done
Every confirmed v1 requirement is covered by a feature, acceptance scenario,
implementation task and verification result. The macOS .app/.dmg installation is tested
on macOS; end-to-end tests cover both rendering and actual
native filesystem/desktop behavior. Unexecuted tests remain NOT TESTED.
