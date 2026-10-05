# Dark Theme — visual and interaction proposal

**Status:** Draft, 2026-09-28. [Visual sketch](design/theme-states.svg) is a vector proposal, not a screenshot of the running app.

## Direction

Reuse the existing F001 shell, spacing, type sizes, native window controls, tabs, and reading width. Dark uses deep neutral green-gray surfaces, soft light text, and the same restrained blue-green accent family. The document remains the primary surface. Theme changes recolor existing components without changing geometry.

## Appearance control

Add a compact native-style select beside Language in the toolbar, labeled **Appearance** / **Apariencia**, with **System / Light / Dark** and **Sistema / Claro / Oscuro**. The selected choice remains visible. System is the default and follows macOS; Light/Dark are explicit overrides. Keyboard Tab reaches the select, arrows change its choice, and focus stays on it after a change. The new control is not a full settings panel.

At 640 points, the appearance and language controls wrap together into the toolbar's second row. Their labels remain available to assistive technology; long workspace names truncate with a full-name tooltip. No dropdown covers a document action permanently.

## Semantic color proposal

| Role | Light | Dark |
|---|---|---|
| Workspace canvas | #F4F5F3 | #151B1B |
| Toolbar/tab chrome | #F8F9F7 | #1D2524 |
| Sidebar | #EEF0EE | #18201F |
| Document/modal/editor surface | #FFFFFF | #202928 |
| Primary text | #202826 | #E6EEEA |
| Secondary text | #52615C | #A8B9B1 |
| Accent/link/focus | #315F70 (focus #2E6E87) | #91C5D6 |
| Primary action fill/text | #315F70 / #FFFFFF | #91C5D6 / #10272E |
| Decorative border | #D8DEDA | #3C4D47 |
| Necessary control boundary | #7C8E85 | #6B8078 |
| Selected/hover row | #DEE9E8 | #2D4547 |
| Code/table-heading surface | #F3F6F5 | #17201F |
| Warning surface/text | #F8EEE8 / #6F3D2E | #35271F / #EFC6A7 |
| Error text | #8C442F | #FFA997 |
| Editor selection | #D9E9EE | #365B66 |
| Modal scrim | #20282655 | #00000088 |

Decorative separators need not act as a control's sole boundary. Use the stronger control-boundary token for selects/inputs/buttons when their shape is necessary. Keep a 2-point focus outline and 2-point offset. Links remain underlined. Dirty/conflict/recovery status retains explicit text and icons.

## Component states

| State | Treatment |
|---|---|
| Markdown reading | Dark document, light headings/body, tinted code and table headings; links use the accent. Images retain their original pixels and transparency. |
| Section editing | Source and preview use the same resolved appearance. Caret, selection, gutters, active line, editor focus, toolbar, and border have explicit palette roles. Theme does not recreate the editor or reset undo history. |
| Context menu/modal | Surface and text use palette roles, including hover, default action, focus, and scrim; current modal focus stays intact. |
| Loading/empty/error | Existing text and actions remain; color and motion are supplemental. |
| Conflict/recovery warning | Warm dark surface with readable warning text; original safe choices remain available. |
| Persistence failure | Nonmodal localized notice: “Appearance changed, but could not be saved.” / “La apariencia cambió, pero no se pudo guardar.” The current session retains the choice. |
| Native theme failure | App-owned colors remain usable; show one nonrepeating status that native appearance could not update. Platform dialogs may retain OS appearance. |
| Startup | Apply resolved page colors before showing content. No startup color transition. |

## Accessibility and motion

- Target 4.5:1 normal-text contrast and 3:1 large-text and necessary indicator contrast per F002A-R06. Inspect all state pairings, especially hover/selection, editor selection, and warnings.
- Use the existing system font, 13-point compact UI, 16-point reader body, and existing control sizing. No remote fonts or new icons are proposed.
- Appearance may use a 120 ms background/text color transition after explicit user changes. It never changes layout, animates image pixels, delays input, or runs at startup; remove it under Reduce Motion.
- Announce storage/native synchronization errors in a polite live region. A normal select change relies on its accessible selected value rather than a second repeated announcement.

## Review and evidence

- [ ] Verify packaged EN/ES at 640 and 1440 points.
- [ ] Check selector names and focus after theme changes.
- [ ] Inspect code/editor/selection/context-menu/dialog contrast in the actual WebView.
- [ ] Capture saved-Dark cold launches, System changes, and reduced-motion behavior.
- [ ] Verify draft/history/scroll/focus preservation and unchanged fixture hashes.

These are future acceptance checks, all **NOT TESTED**. The SVG is the visual review artifact. Approval applies to this feature's palette and selector, not the pending constitution amendment or other feature scope.
