# Subtle motion review — 2026-09-29

**Status: UX proposal, NOT TESTED in the packaged macOS app.** This is a review of the current shell, not a change to approved `spec.md` or `design.md`. The approved F001 direction keeps the document dominant, and F002A allows optional color changes within 150 ms without moving content. All proposed motion is supplementary; controls, focus and content must work identically with Reduce Motion.

| Priority | Interaction and current code | Proposed treatment | Boundary |
|---|---|---|---|
| 1 | Reading settings (`src/app/App.tsx`, `readingSettingsOpen`; `src/styles/app.css`, `.reading-settings-panel`) | At wide widths, fade opacity 0→1 and move down 4 px over 120 ms when opened; reverse over 90 ms when closed. Focus and controls become available immediately. | The panel is conditionally mounted, so an exit animation needs a short closing state before unmount. At narrow widths it becomes an in-flow sheet; show/hide it immediately to avoid shifting the page during reading. |
| 1 | Custom Reload and section context menus (`App.tsx` `reloadMenu`; `MarkdownView.tsx` `editMenu`; `.context-menu`) | Same 90–120 ms fade and 3–4 px entry. Keep the menu at its pointer/keyboard anchor and preserve immediate keyboard focus. | Native macOS application menus are OS-owned and should keep system behavior. Close on Escape/action without delaying the action or restoring focus late. |
| 1 | Selected tab (`App.tsx` `activeId`; `.tab.active`) | Animate only the selected background and bottom accent over 100–120 ms. Switch the document and restore its reading anchor immediately. | Do not crossfade or slide Markdown pages: rendering, Find overlays, selection and saved scroll positions would otherwise appear stale. Dirty/conflict/missing labels must update instantly. |
| 2 | Sidebar toggle (`App.tsx` `sidebarOpen`; `.workspace-layout`, `.sidebar`) | A 150–180 ms width reveal/collapse could make the hamburger action easier to follow. | Current conditional mounting prevents a closing transition. Keep the panel mounted while closing, block focus/hit testing as soon as hidden, and never animate during manual resize. Recheck the document column and stored scroll anchor at 640/900/1440 points. This is the highest-risk candidate. |
| 2 | Optional outline (`App.tsx` `outlineOpen`; `.outline-panel`) | At wide widths, reveal from the right with a small opacity/translation change over 120–150 ms. | At ≤900 points it sits below the reader; use an immediate toggle there to avoid vertical layout movement. Heading navigation and active position must never wait for motion. |
| 3 | Inline Find band and notices (`findOpen`, `.find-band`, `.notice`) | A 90–120 ms opacity entry could soften abrupt appearance. | Cmd+F must focus the input immediately; errors, save conflicts and cancellation feedback should never wait to become readable. Avoid height animation above the document. |

## Shared rules and verification

- Use one restrained ease-out curve for entry and a shorter ease-in exit. Limit travel to 4 px; use opacity/transform for overlays. Avoid scale, spring, bounce, blur and animated document text or image pixels.
- Under `prefers-reduced-motion: reduce`, remove durations and transforms. The open/closed and selected states remain equally clear through text, border and background; no information depends on motion.
- Keep focus visible throughout. Closing an overlay returns focus to its trigger immediately. Hidden panels leave the tab order and accessibility tree, including during any visual exit state.
- Check rapid open/close/open, keyboard and pointer paths, dirty-tab Close/Keep/Save dialogs, tab switch during loading, 200% zoom, EN/ES labels, light/dark themes and 640/900/1440-point widths. Mark packaged visual/Reduce Motion checks **NOT TESTED** until a visible app window is available.

**Recommendation:** Implement the two menu treatments and tab indicator first. Review sidebar/outline layout motion as a separate design amendment before production code; it changes how the reading column moves and must preserve the approved scroll-anchor behavior.
