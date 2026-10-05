# Design direction — proposal for user review

## Experience
A quiet document reader with familiar workspace navigation, not a clone of a
full IDE. The document is visually dominant. Tools appear when relevant.

## Proposed shell
A collapsible/resizable directory panel on the left, compact tabs above the
reading area, and an optional outline panel on the right. A small toolbar carries
open-file/folder, read/source/split mode, search and settings. A focus mode hides
navigation chrome without changing the document. Avoid crowded status bars.

Initial layout candidates: 260 px directory panel, 220 px outline, and a central
reading width near 76 characters. These are starting points to review, not fixed
constraints on smaller windows. Panels must collapse gracefully at narrow widths.
Verify Retina and scaled display configurations, content zoom and narrow windows.
Keyboard access and readable controls must survive these changes without clipping.

Use locally bundled Roboto for UI/body initially and a monospace stack for code.
Allow font family, size, line height and width adjustments. Proposed themes are
light/dark/system with restrained neutral surfaces and one accessible accent.
The product has no name or branding yet; do not borrow Theonira identity.

## macOS interaction requirements — proposals for review
Keep native traffic-light window controls and a native application menu. Do not
reimplement titlebar controls just for visual styling. Use a shared command map:
Cmd+O open file; Cmd+Shift+O open folder; Cmd+W close active tab (then define what
happens with no tabs); Cmd+S save; Cmd+F document search; Cmd+Shift+F folder search;
Cmd+, settings; Cmd+Q quit. Bind only features active in the current slice.

Define last-window close vs application quit and Dock reopen, including unsaved
edits/recovery. Preserve standard text editing, selection, trackpad scrolling and
keyboard focus. Include Finder Open With and file-drop states in the appropriate
feature. Keep menu, toolbar and shortcut behavior consistent; do not install global
hotkeys. Record accessibility review evidence separately from visual review.

## Required states to design
First launch; no folder selected; empty folder; loading; permission denied; missing
file; unsupported/oversize file; no search matches; cancelled search; blocked image;
invalid Mermaid/YAML; dirty tab; disk conflict; save failure; restored session;
recovery draft; narrow window; keyboard focus; EN and longer ES labels.

Use a filename plus distinguishable parent path for duplicate tab names. Show a
dirty marker and full path in an accessible tooltip. Make tabs closable with the
keyboard. Do not hide destructive choices inside ambiguous icons.

Scroll/outline behavior must remain stable through font changes, image loading,
diagram expansion and external refresh. Propose heading anchors plus relative
position rather than only restoring an absolute pixel offset.

## Designer deliverable
Write `design.md` in the active feature directory. Include interaction details,
component/state inventory, design tokens and an accessibility checklist. Provide
one coherent visual proposal with reviewable local prototype/screenshots when the
coding environment supports them. A prose design alone is not visual approval.
No production UI code before the design/architecture gates. A disposable static
prototype under `design/` is allowed for review and must not become a second UI kit.
