# Workspace Reader — visual and interaction proposal

**Status:** Draft for user review, 2026-09-25. [Main window mockup](design/window.svg)
is a vector sketch, not a screenshot of a running app. It uses a system-font
stand-in; locally bundled Roboto belongs to F002.

## Visual direction

A quiet light surface frames a dominant reading page. The left tree is useful but
visually subdued; tabs make context visible without turning the app into an IDE.
The shell keeps native macOS window controls and menus. The proposed accent is
blue-gray. The design is intentionally unbranded.

At a 1440 × 900 point window, the directory panel starts at 264 points, the tab
strip at 44, and the document column at a maximum 760 points. A resizable divider
allows a 208–360 point directory panel. The reading column stays centered in the
remaining space. At 900 points wide, the tree collapses into a toggle; at 640
points wide, tabs scroll horizontally and toolbar labels become accessible icon
buttons. Below 640 points, a minimum window width prevents clipped core actions.

## Component inventory and behavior

| Element | Behavior and accessible name |
|---|---|
| Native titlebar/menu | System traffic lights, File/Open File, File/Open Folder, Close Tab, View/Toggle Sidebar; no custom titlebar controls. |
| Toolbar | Open Folder, Open File, Toggle Sidebar, language menu; only F001 actions are active. Later search/mode/settings are absent until shipped. |
| Directory tree | Root name and path, disclosure controls, Markdown filter, excluded-content note, progress/cancel row. Keyboard arrows navigate; Enter opens a file. |
| Tab strip | Filename plus parent path for collisions, selected state, close button, independent scroll state. Cmd+W closes active tab; empty tab strip returns to welcome state. |
| Reader | Semantic heading hierarchy, ordinary links, inert task checkboxes, tables and fenced code. Links get clear focus and hover states. |
| Notices | Inline blocked-image/link placeholder or an error panel with cause and recovery action; errors never replace other tabs. |

Cmd+O opens a file and Cmd+Shift+O opens a folder. Cmd+W closes the active tab;
when there are no tabs, it leaves the welcome view open. Cmd+Q quits. Standard
selection, copy, scrolling, and text zoom remain available. F001 has no Save,
search, source mode, editor, or Finder file association. The app remains open
after its last tab closes; window-close and Dock-reopen behavior is finalized in
F005. Focus order follows toolbar → tree → tabs → reader; moving between regions
has a predictable keyboard action and never traps focus.

## States

| State | Visible treatment and action |
|---|---|
| First launch / no root | Welcome page: “Open a folder” primary action and “Open a file” secondary action; explain local-only operation. |
| Empty folder / no Markdown | Tree remains visible; show filter status and “Choose another folder.” |
| Loading / deep folder | Initial entries appear as they arrive; progress text and Cancel remain reachable by keyboard. |
| Missing / denied / non-regular | Tab shows a plain explanation and Retry or Choose File; other tabs stay usable. |
| Invalid encoding / binary | State says source cannot be safely shown; no partial document is presented. |
| Over 10 MiB | State explains F001 rich-view limit; no silent truncation or hidden source-mode promise. |
| Blocked image/link | Inline boundary marker with reason and Copy Target or Choose File, as appropriate; scope never expands silently. |
| Unsupported SVG / raw HTML | SVG uses an unsupported asset marker; raw HTML remains visible as inert source text. |
| Narrow window / zoom | Sidebar hides first, tabs scroll, reader wraps; essential actions remain available. |
| English / Spanish | All shell, progress, error, and blocked-state strings have equivalent EN/ES catalog entries. |

## Tokens

| Token | Proposed value |
|---|---|
| Canvas / page / sidebar | `#F4F5F3` / `#FFFFFF` / `#EEF0EE` |
| Primary / secondary text | `#202826` / `#52615C` |
| Accent / focus | `#315F70` / 2-point `#2E6E87` outline with 2-point gap |
| Borders / selected tree row | `#D8DEDA` / `#DEE9E8` |
| UI / body font | System sans in sketch; bundled Roboto in F002 if approved |
| Body / code | 16-point body, 1.6 line height; 13-point local monospace code |
| Spacing | 4-point base; 8/12/16/24/32-point rhythm |
| Corner radius | 8-point small surfaces; no decorative rounded document frame |

Dark and system themes are F002. Color values remain proposed until checked in
rendered states. Important status uses text and icon shape, never color alone.

## Accessibility review checklist

- [ ] Test keyboard-only folder, tree, tab, reader, blocked link, and error recovery flows.
- [ ] Check text and non-text contrast in actual rendered light and later dark themes.
- [ ] Check 200% zoom, Retina and scaled display, 640-point minimum, and longer Spanish labels.
- [ ] Respect reduced motion; no essential information depends on animation.
- [ ] Keep native menu commands and visible toolbar commands consistent.

The checklist records future checks; none are claimed complete by this sketch.

## Decisions requested

Approve or revise the light, neutral shell; 264-point initial tree; centered
760-point reading column; proposed accent; tab/path treatment; and the F001
interaction states. The mockup shows only the main reading state; the state table
specifies other states for implementation and later visual verification.
