# Projects close-control options

PROPOSED — READY FOR DESIGN REVIEW. The current request explicitly asks for three options, superseding the earlier one-proposal limit. No option is approved. Original proposal preserved at /Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/proposal-20261010-183216.

## Choices

| Option | Visible outline | Icon | Rationale / tradeoff |
|---|---|---|---|
| A — Fine cross (recommended) | 18px square, radius 3px | 9px cross, 1.2px round stroke | Familiar close action; lighter geometry matches the source icon convention rendered at 18px. |
| B — Circular close | 18px circle | 8px cross, 1.3px round stroke | Softer shape; introduces a less common silhouette for this shell. |
| C — Hide Projects | 20px square, radius 4px | 14px panel/arrow, 1.2px stroke | Explicit alternative to the existing close cross only. Communicates sidebar scope but is denser and less familiar. Does not replace the existing menu chevron. |

Recommendation A is designer judgment, not a tested user preference. All retain the outlined button requested by the user. All use a 36px hit target independent of visual chrome. All centers remain aligned to the Projects title. Comparison header details are enlarged 1.5× and state controls 2×; these scales are review aids. Full contextual exports use the unchanged illustrative shell dimensions, not inferred physical window size.

## Shared behavior and state

Default surface #151A1D, border #465257, icon #A8B2B7. Hover uses #193033 and icon #EEF3F4. Pressed uses #1B3A3F and icon #EEF3F4. Focus uses hover fill, cyan icon and a 2px #5ED3DF outer ring. Outline and icon geometry do not move/change size between states. Ring dimensions: A 22px square, B 24px circle, C 24px square.

Native type=button; accessible name and tooltip exactly “Close Projects sidebar”; decorative icon hidden from assistive technology. Enter/Space closes only Projects; it preserves root/tree/search state, width, tabs, active document, drafts and reader position. Focus returns to the visible existing Projects invoker in the activity rail. Existing reopen and menu behavior remains. Option C changes the close icon only; the menu chevron continues to open Projects actions.

The corrected layout remains: sidebar container begins at file-tabs bottom; filename/toolbar belongs to the document column right of Projects; activity rail keeps its column; sidebar ends above status. Preserve current width/resizing mode, tree/search scrolling, file/folder controls and footer access.

## Existing source/evidence

Source read earlier in the same task; this visual revision introduces no application code changes. Relevant owners:
- /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx — shell, tab strip, activity rail, sidebar/header, close/reopen state and Projects menu.
- /Users/juanmantilla/projects/personal/md-reader/src/app/DocumentLocation.tsx — document filename/toolbar row.
- /Users/juanmantilla/projects/personal/md-reader/src/app/WorkspaceIcon.tsx — 24px vector icon convention, round 1.6px strokes (18px rendering yields 1.2px).
- /Users/juanmantilla/projects/personal/md-reader/src/styles/app.css — existing dark tokens, button styling, grid/sidebar sizing and mode-specific resizing.

Detailed existing evidence and behavioral acceptance criteria: /Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/proposal-20261010-183216/handoff.md. That earlier proposal is historical, not an approved design.

Evidence limitation persists: attachment was not exposed; available local reference showed Projects closed and a screenshot embedded in the document. The outer shell and embedded document image remain correctly distinguished.

## Acceptance and review

Select one option before implementation. Confirm the outline remains, icon matches title scale, centerline and right alignment are correct, and each state is visible without clipping. Require existing chevron behavior, correct close/reopen focus, no document/tab closure, no target overlap, and fit at minimum supported sidebar width and longer/localized titles. Runtime resize/scroll/keyboard/accessibility tests remain pending.

VALIDATED ARTIFACTS: VectorCraft operational; four new native documents created, editable vector objects and text retained. Three complete shell PNGs and comparison exported without tool warnings and visually inspected. Comparison has 89 paths, 15 compound paths, 21 groups, 56 text objects, and no images. Roboto resolves exactly with zero missing glyphs. Native comparison reopened and re-export compared byte-for-byte. SVG parsing, local HTML assets and script syntax checked.

NOT TESTED/BLOCKED: HTML browser rendering, wide/narrow browser checks, selectors/Enlarge/Escape/focus-return interactions are untested because the previous CUA file-URL security rejection still applies. No workaround attempted. Product runtime/accessibility checks remain untested. No application fixes, release, deletion or cleanup worker actions.

## Exact deliverable paths

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/index.html

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/comparison.vectorcraft

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/comparison.png

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-a.vectorcraft

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-a.png

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-b.vectorcraft

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-b.png

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-c.vectorcraft

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/option-c.png

/Users/juanmantilla/projects/personal/md-reader/design-reviews/sidebar-header-fix/close-options-20261010-190840/handoff.md

