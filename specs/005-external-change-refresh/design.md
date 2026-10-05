# External Change Refresh — visual and interaction proposal

**Status:** Draft for user review, 2026-09-26. [Refresh and conflict sketch](design/refresh-states.svg) is a vector proposal, not a screenshot of the running app. It reuses the approved F001 light shell and its neutral colors; the F003D states below still require approval.

## Direction

Keep the document dominant. **Reload** lives in the folder/file context menu, so ordinary reading gets no new permanent toolbar control. A clean external update receives a small text status near the tab; a dirty conflict uses a persistent, compact notice above the editor. Neither state hides the document, moves the reading position, or takes focus automatically. Use the existing F001 canvas `#F4F5F3`, page `#FFFFFF`, sidebar `#EEF0EE`, text `#202826`, secondary text `#52615C`, accent `#315F70`, border `#D8DEDA`, and 2-point focus outline `#2E6E87` with a 2-point gap. No new icon set or UI kit is proposed.

## Main interactions

| Element | Proposed behavior |
|---|---|
| Tree file/folder menu | Right-click or keyboard context menu opens a small menu anchored to the row. **Reload** names the target, for example “Reload README.md” or “Reload docs folder” in the accessible name. Only in-scope items show the action. |
| Explicit-file tab menu | A file opened outside the root has **Reload** in its tab context menu. The menu never implies access to its parent folder. |
| Clean tab refresh | Keep tab, selection, and reading passage. After a confirmed update, show “Updated from disk” as a brief nonblocking status; if the original passage moved, announce the nearby-position fallback. An inactive tab updates without pulling focus. |
| Manual file Reload | Show “Checking…” beside the target, then “Updated”, “Already current”, or a specific error. The result remains available to screen readers and does not auto-open a closed file. |
| Manual folder Reload | Show a small progress row inside the selected folder branch with examined count and **Cancel**. Keep the active reader usable. After cancellation, label the remaining branch “Not fully checked” and keep confirmed results. |
| Dirty conflict | Keep the active section and draft visible. A compact notice says “This file changed in another app. Your edit is safe.” It offers **Inspect versions**, **Keep my edit**, **Use disk version**, and **Save a copy**. The tab retains a text-accessible conflict marker until resolved. |
| Inspect versions | Open a read-only comparison of **Your unsaved edit** and **Current disk version**. At wide widths show two columns; below 900 points use labeled stacked panels. Never make the disk side editable or treat inspection as a merge. |
| Use disk version | Open a confirmation dialog explaining that the local draft will be discarded. **Cancel** is the default focused action; confirm proceeds only after the disk version is rechecked. A newer disk version returns to comparison without discarding the draft. |
| Keep my edit / Save a copy | Keep my edit returns to the editor with the conflict marker still visible; Save to original remains blocked. Save a copy follows F004’s destination flow and never replaces the changed original. |

## States and feedback

| State | Visual and accessible treatment |
|---|---|
| No change on Reload | One-line “Already current” status tied to the target; focus returns to the invoking row or tab. |
| Checking or uncertain freshness | A restrained spinner or progress mark plus text. “Unable to confirm latest version” persists with **Reload**; old content is labelled as last confirmed, never current. |
| Missing, denied, unsupported, or file-only replacement | Keep the tab. Show a plain reason and **Retry** or **Select file again**. Keep any draft recoverable. Other tabs stay usable. |
| Selected root missing or replaced | Keep the open tabs and drafts. Mark the folder tree unavailable with “Selected folder changed. Choose it again to continue.” and **Select folder again**. Do not show replacement contents before reselection. |
| Multiple dirty tabs in a folder reload | Each affected tab has its own conflict marker. The folder progress continues; opening one conflict does not hide another. |
| New external change during comparison | Show “Disk version changed again”; update the disk preview and require a fresh choice. Keep the draft untouched. |
| No folder or no tabs | Existing F001 welcome and empty states remain; no Reload control without a target. |
| Narrow window / long names | Context menu stays inside reachable viewport. Conflict choices wrap into two rows or a vertical stack; no horizontal clipping at the F001 640-point minimum. Filenames truncate visually but full names remain in accessible labels/tooltips. |

## Copy and localization

All UI strings use the existing EN/ES catalog. The comparison labels remain explicit rather than relying on color.

| Purpose | English | Español |
|---|---|---|
| Context action | Reload | Recargar |
| Confirmed update | Updated from disk | Actualizado desde el disco |
| No change | Already current | Ya está actualizado |
| Uncertain | Unable to confirm latest version | No se pudo confirmar la versión más reciente |
| Conflict notice | This file changed in another app. Your edit is safe. | Este archivo cambió en otra app. Tu edición está a salvo. |
| Compare | Inspect versions | Revisar versiones |
| Local choice | Keep my edit | Conservar mi edición |
| Disk choice | Use disk version | Usar versión del disco |
| Copy choice | Save a copy | Guardar una copia |
| Incomplete branch | Not fully checked | Revisión incompleta |
| Changed selected root | Selected folder changed. Choose it again to continue. | La carpeta seleccionada cambió. Vuelve a elegirla para continuar. |
| Reselect root | Select folder again | Volver a elegir carpeta |

## Focus, accessibility, and motion

- A focused tree row or tab opens its context menu with the platform context-menu key or Shift+F10. The menu uses proper menu roles, arrow keys, Escape, and visible focus. Closing it returns focus to the invoking item.
- Status uses text and an icon shape; color is supplemental. Announce completed reloads in a polite live region, errors and new conflicts in an assertive but nonrepeating announcement. A watcher burst must not flood announcements.
- The conflict notice is persistent, keyboard reachable, and nonmodal until the user chooses Use disk version. The confirmation dialog traps focus only while open and returns it to the triggering choice on Cancel.
- Keep the F001 4-point spacing rhythm, 13-point compact labels, and 16-point document body. Context-menu touch targets are at least 32 points high; the conflict actions remain legible at display scaling and with longer Spanish text.
- Optional status opacity transition is 120–180 ms and moves no content. Disable that transition under Reduce Motion. A spinner is never the sole freshness signal and never delays input.

## Review checklist

- [ ] Render this proposal at 1440, 900, and 640-point widths with both EN and ES copy; check clipping and focus visibility.
- [ ] Test keyboard-only menu, Reload, cancellation, comparison, confirmation, and focus return.
- [ ] Check actual contrast, 200% zoom, Retina scaling, and Reduce Motion in a running app.
- [ ] Verify no change to reading position or source files from refresh-only actions.

These are future verification tasks, not completed checks. The sketch is the visual proposal; actual rendered macOS accessibility and layout are **NOT TESTED**.

## Approval boundary

Review the contextual menu, compact status treatment, persistent conflict notice, comparison layout, confirmation wording, and EN/ES labels. This design extends the approved F001 shell; it does not approve F004 editing visuals or the draft constitution amendment. Any requested visual revision will update this artifact before implementation.
