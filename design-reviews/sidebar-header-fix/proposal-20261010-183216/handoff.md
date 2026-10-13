# Projects sidebar correction

PROPOSED — READY FOR DESIGN REVIEW. One proposal; application source remains unchanged.

## Evidence and source owners

OBSERVED in current source:
- `/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:3126`: outer shell and branding header; `:3196`: file-tabs bar; `:3301`: Folio activity rail; `:3307`: sidebar; `:3315`: Projects header and menu chevron; `:3324`: current conditional close button; `:3391`: storage/footer access.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx:2866`: `dismissProjects` closes the compact sidebar and returns focus. `:2875`: `toggleExplorer` selects/reopens Projects and handles docked/compact visibility. `:3462`: the Projects chevron opens an action menu for file/folder/search/reload/copy path. It is NOT a sidebar collapse control. Keep its handler, menu semantics and busy state.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/DocumentLocation.tsx:24`: filename/path and document toolbar owner, rendered inside `.main-panel`.
- `/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css:171`: sidebar width/min/max, scrolling container and horizontal resizing; `:859`: workspace grid and tabs; `:876`: sidebar heading; `:890`: document row; `:916`: 64px activity rail; `:920`: compact sidebar top; `:995`: uppercase heading; `:1012`: focus styling; `:1071`: final header alignment and close size.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/WorkspaceIcon.tsx`: existing Lucide-style icon geometry and 1.6px round stroke. Shared controls are CSS-styled native buttons; no shared IconButton React component was found in the scoped shell.
- Dark tokens: canvas #101416, surface #151A1D, text #EEF3F4, muted #A8B2B7, accent #35B8C7, focus #5ED3DF, control edge #465257, pressed/selection #1B3A3F. Current hover is accent 10% mixed with surface (rounded #193033). Roboto is the application font.

REFERENCE LIMIT: No attachment image was exposed in this turn. Inspected local `/Users/juanmantilla/projects/personal/screenshots/Pasted 2026-10-10 at 10.20.14 AM.tiff` and the equivalent prior review `/Users/juanmantilla/projects/personal/design-review/intentgroove/preview-navigation-20261010/assets/observed.png`. They show the OUTER app with Projects closed, an image viewer containing an older application screenshot, and a Finder window over the document. They do not establish the reported standalone × position. That defect is USER-REPORTED. The proposal follows the explicit requested correction and current source ownership. The embedded PNG in the proposal is the actual existing document asset `/Users/juanmantilla/projects/personal/md-reader/design-reviews/03-10-27-01/Screenshot 2026-10-03 at 10.26.05 AM.png`, unchanged.

## Proposed layout

The illustrative application viewport is 1360 × 680; these are review dimensions, not inferred full-window dimensions. Use the real sidebar width at runtime (source default 264px), never replace a persisted/resized width with this mockup's fixed value.

Below the unchanged branding/header and full-width file-tabs bar, compose three sibling columns: existing activity rail, Projects at its current width, and a minmax(0,1fr) document column. The rail remains in its existing 64px Folio column. The sidebar CONTAINER top and document column top equal the tabs' bottom. The filename/toolbar stays inside `.main-panel` to the right of Projects. Do not move the heading independently, use a negative-margin illusion, or overlap the tabs/branding. The status bar remains below all three columns; sidebar bottom equals its top.

For the shown rail layout, reserve Projects width while it is open so the filename row and viewer occupy only the document column. When closed, release that width to the document column. Preserve the existing compact/narrow presentation and its responsive visibility rules; anchor its container below tabs too. This proposal does not redesign Margin/Atlas layouts. Preserve their established presentation when applying the shared header correction.

The header is one nonwrapping flex row: title + existing menu chevron as the existing trigger at left; close button at right, with 16px right inset and 24px title inset. Use align-items:center, gap:8px, flexible title area and a nonshrinking close target. At the 160px minimum width, title/chevron and close must still fit without a second row. Remove the old standalone close row and its spacing. In the illustration, the title's visual center and button center are y=292; the container begins y=264. Header chrome is followed directly by the existing open file/folder actions and search launcher.

Keep the tree/search host flexing with min-height:0 and its own scrolling. Keep footer access outside that scroll region. Preserve saved width and existing min/max constraints, drag/resize affordance and persistence wherever resizing is currently enabled; Folio compact mode currently has resize:none and must retain that behavior. Resizing the docked layout must move the document column boundary with the sidebar. No new controls are proposed.

## Close and reopen behavior

Use a native type=button icon control with a **20 × 20px visible outlined surface**, 4px radius, 1px existing control edge #465257, and an invisible **36 × 36px hit target**. Center both on the Projects title's visual centerline. The **8 × 8px cross** has the same visual scale as the roughly 9px cap height of 12px Roboto Projects text; its icon frame is 12px square with 1.6px rounded strokes. The compact outline is retained in every state. Avoid the earlier 36px visible box and the later borderless treatment. No change to header height, sidebar/container position or neighboring controls.

Accessible name and tooltip must both be exactly **Close Projects sidebar**; icon is decorative. Keep tab-close controls and their behavior unchanged.

- Default: 20px surface #151A1D, 1px edge #465257, icon #A8B2B7 matching the title.
- Hover: same 20px outline, existing hover fill #193033, icon #EEF3F4.
- Keyboard focus: same outlined surface with hover fill, cyan icon, plus a 24px square 2px #5ED3DF focus ring. Focus must remain unclipped. Do not substitute text underline for this icon's focus feedback.
- Pressed: same outline, selection fill #1B3A3F and icon #EEF3F4. No size/position shift. This is a momentary action; do not set aria-pressed.

The target remains 36px square while visible chrome is 20px. These are deliberately separate dimensions: proportional visual size and usable input area. Neighboring hit targets must not overlap. At the source minimum sidebar width of 160px, reduce both header side insets to 12px and use an 8px title-to-chevron gap: approximately 58px title + 8px gap + 12px chevron + 8px action gap + 36px target + 24px side insets = 146px. This leaves 14px of slack for the English label before wrapping would be necessary. Longer localized labels need implementation verification. Do not shrink the click area to 20px.

Enter or Space activates close. Close only the Projects surface (use the correct compact/docked visibility state; existing dismissProjects handles compact only), dismiss any Projects-owned menu, retain root/tree/search state, persisted width, active document, tabs, drafts and reader position. Do not call closeTab or finish_workspace_session. After close, focus returns to the existing visible Projects invoker; in the illustrated layout that is the activity-rail panel-left button. Track its ref explicitly; avoid returning focus to a hidden trigger.

Reopen using the existing rail Projects control or existing Projects trigger where visible. Preserve existing toggleExplorer semantics: it selects Explorer from Search, and toggles when Explorer is already visible. Restore the prior width/tree position and keep the active document/tab. No new reopen button. Tab order is existing menu trigger, close, then open-file/folder/search controls; document navigation remains separate. Tooltip appears on hover and keyboard focus; Escape dismisses tooltip/menu according to existing ownership, not the document.

## Acceptance criteria for implementation

1. Sidebar bounds start exactly at the rendered tabs' bottom and end at status-bar top. No overlap with tabs or branding; activity rail keeps its own column.
2. With Projects open, the filename/toolbar row's left edge equals the document column's left edge, to the right of Projects. Closing releases sidebar space; document and selected tab remain open and unchanged.
3. Close retains its 20px outline in default/hover/focus/pressed states, with an 8px cross and 36px hit area. Heading and close share one row at default and supported minimum sidebar widths; close is centered vertically and right aligned. No redundant close row/blank height remains.
4. Chevron still opens the existing Projects actions menu; clicking it does not close Projects. Close affects only Projects, including when Search is selected.
5. Close is keyboard operable, named and tooled exactly as specified. Its hover/focus/pressed states are visible; focus ring is unclipped and focus returns to a visible invoker. Reopen remains available.
6. Resize width/min/max/persistence remain unchanged in modes that support resizing; previously nonresizable modes remain so. Tree and search scroll independently; file/folder actions and footer remain reachable with long content, small height, 200% text and long/localized titles.
7. Tabs, navigation, tree semantics, document content, branding and existing dark tokens remain unchanged outside this correction.

## Validation and limits

VALIDATED ARTIFACTS: VectorCraft MCP responded; a new document was created; SVG was placed as editable artwork, not a flattened shell screenshot. The document has 119 paths, 5 compound paths, 13 groups and 62 editable text objects, plus two embedded raster assets for the unchanged brand mark and document image. Roboto resolves exactly with no missing glyphs. PNG export produced no warnings. Visual inspection found the tab/sidebar boundary, document-only toolbar, centered close icon, footer/status boundary and state samples aligned without clipping. Native document was reopened and its preview re-exported for comparison.

Measured design color pairs: text vs default surface 15.67:1; focus ring vs canvas 10.46:1; icon vs pressed fill 10.89:1 (see validation.json for exact computed values). Target is 36px square. These checks do not establish overall accessibility compliance.

NOT TESTED: Application interactions, assistive technology, resize persistence, scrolling, responsive runtime behavior and keyboard focus return. This is a static proposal, not an implementation or release acceptance. Await explicit design approval before application changes. No cleanup/deletion is authorized or enqueued.

HTML review validation: local asset links and script syntax checked. Browser rendering was BLOCKED by the Computer Use browser URL policy, which rejects file: URLs. No workaround attempted; wide/narrow visual checks and Enlarge/Escape/focus-return interactions remain NOT TESTED. PNG visual inspection was completed separately through the permitted image viewer.

Current revision: user requested restoring the outline after the size correction. Visible outline reduced from the original 36px to 20px; 8px cross remains aligned with Projects. All four states share the same outline and center. Only design artifacts changed. PROPOSED — READY FOR DESIGN REVIEW.
