# Section Editing and Recovery — visual and interaction proposal

**Status:** Draft for user review, 2026-09-26. The [section editing sketch](design/section-editing-states.svg) is a vector proposal, not a screenshot of the running app. It extends the approved F001 reading shell and the F003D conflict direction; F004 visuals require their own approval.

## Direction

Keep the document dominant and make editing deliberate. In reading mode, ordinary click, selection, search, and typing do not modify Markdown. Right-click within a section opens a small contextual menu with **Edit section**; a focused section offers the same action with the keyboard context-menu key or Shift+F10. Selecting it replaces only that region with a clearly bordered source editor and live preview. A concise label names the target, including “Before first heading” or “Whole document” when appropriate. A line at each boundary shows where editing stops, including an empty section. Other sections remain fully readable and navigable with a subtle neutral tint; do not blur text because blur impairs reading.

Use F001 tokens: canvas `#F4F5F3`, page `#FFFFFF`, sidebar `#EEF0EE`, primary text `#202826`, secondary `#52615C`, accent `#315F70`, border `#D8DEDA`, 2-point focus outline `#2E6E87` with 2-point gap. Keep the existing typography and 4-point spacing rhythm. One restrained 120–180 ms opacity/border transition may help show editor entry; turn it off under Reduce Motion. No animation carries essential information.

## Primary flow

| State | Appearance and action |
|---|---|
| Reading/context menu | The clicked or focused section gets a temporary outline. Menu says **Edit section** and, where relevant, a disabled reason. Opening the editor focuses its source and announces the section label. |
| Clean edit | Boundary lines and “Editing: [heading]” label stay visible. Source and preview sit side by side at wide widths; the rest of the document remains readable. Toolbar has Undo, Redo, Save, Save As, Discard, and a clear return-to-reading action. Save is disabled while clean. |
| Dirty edit | Tab and editor header show a text-accessible “Unsaved” status. A small “Recovery saved” acknowledgment appears only after durable checkpoint; while pending it says “Saving recovery…”. Failure says “Recovery could not be saved” with a retry path and does not imply protection. |
| Second-section request | A compact modal names the pending section and offers Resume, Save, Discard, Cancel. Save or Discard then opens the newly requested section. |
| Return, tab close, window close, quit | For a dirty edit, modal offers Save, Keep draft, Discard, Cancel, with the current document and section named. Keep draft waits for durable checkpoint completion. Cancel returns focus to the editor. Clean editor state is retained for normal-close restoration. |
| Disk conflict | Persistent inline notice above the active editor: “This file changed in another app. Your edit is safe.” Read-only **Inspect versions**, **Keep my edit**, **Save a copy**, and explicit **Use disk version** appear as in F003D. Original Save is blocked until resolved. The notice explains the small race still possible with another app writing at the exact moment of Save. |
| Reopen/recovery | Restore the workspace and editor when the session is valid. Unexpected termination offers “Recover unsaved edit” and identifies the time of the latest completed checkpoint. A changed original shows the conflict notice before further Save. A lost section is inspectable and Save As capable, never placed automatically. |
| Read-only | Context menu keeps reading actions but shows Edit section disabled with a specific reason for unsupported encoding, size, permission, missing/replaced, out-of-scope, or section mapping mismatch. |
| Moved-path recovery | After picker-approved reselection, the editor retains its draft and history. A short “Securing recovered draft…” status remains until the new checkpoint is durable. Failure keeps the draft visible with “Recovery at the new location failed”; Keep draft/close stays unavailable until retry succeeds. |
| Safety-copy storage | Saved-data controls show resolved-copy count and total size alongside drafts. “Clear resolved safety copies” opens an explicit confirmation naming the count/size. Unresolved copies stay selected for preservation. When the 1 GiB budget blocks Save, a persistent notice explains that the original is unchanged and the draft remains, with a route to review resolved copies. |

## Layout

At 1440 points the source and live preview use two calm columns inside the selected region, with a short header above them. At 900 points they share the page width with a user-controlled Source/Preview toggle if side-by-side would compress reading. At the F001 640-point minimum they stack or toggle, with no horizontal clipping, reachable actions, and the label always visible. The selected section boundary stays visible when source content grows; editor and reader scroll positions are saved separately. Long headings truncate only visually, with full text in accessible labels and tooltips.

## Copy and localization

| Purpose | English | Español |
|---|---|---|
| Context action | Edit section | Editar sección |
| Active label | Editing: {section} | Editando: {section} |
| Pre-heading label | Before first heading | Antes del primer encabezado |
| Sole section label | Whole document | Documento completo |
| Dirty state | Unsaved | Sin guardar |
| Checkpoint complete | Recovery saved | Recuperación guardada |
| Checkpoint pending | Saving recovery… | Guardando recuperación… |
| Checkpoint failure | Recovery could not be saved | No se pudo guardar la recuperación |
| Close choice | Keep draft | Conservar borrador |
| Recovery choice | Recover unsaved edit | Recuperar edición sin guardar |
| Draft storage explanation | Drafts are stored on this Mac. Clear them in session settings. | Los borradores se guardan en este Mac. Bórralos en los ajustes de sesión. |
| Moved recovery pending | Securing recovered draft… | Protegiendo el borrador recuperado… |
| Moved recovery failure | Recovery at the new location failed. Retry before closing. | Falló la recuperación en la nueva ubicación. Vuelve a intentarlo antes de cerrar. |
| Copy cleanup | Clear resolved safety copies | Borrar copias de seguridad resueltas |
| Copy quota | Safety-copy storage is full. Your original and draft are unchanged. | El espacio para copias de seguridad está lleno. El original y el borrador no han cambiado. |

The existing Save, Save As, Discard, Cancel, and F003D conflict strings must also be present in the EN/ES catalog. Exact Spanish phrasing should be checked in the running layout.

## Focus, accessibility, and motion

- Make rendered sections keyboard focusable without adding noisy tab stops to every paragraph. A section focus target has a visible 2-point outline and an accessible name containing its heading/pre-heading label. Shift+F10 and the context-menu key open the same menu. Escape closes it and returns focus to the section.
- The editor header and start/end boundaries use text and line shape, not color alone. The inactive area retains normal text contrast and navigation. The source editor has an accessible name such as “Markdown source, Editing: Methods”; preview is labelled and read-only.
- Context menu uses menu roles, arrow-key movement and focus return. Modal choices trap focus only while open and restore focus on Cancel. Undo/Redo and Save/Save As have keyboard labels and shortcuts consistent with platform conventions.
- Checkpoint completion uses a polite live region; failure/conflict uses an assertive nonrepeating announcement. Restored draft and its unsaved status are announced once. Repeated typing does not flood the live region.
- Transition only border/opacity for 120–180 ms; no blur, parallax, or moving layout. Respect macOS Reduce Motion.

## Review and verification

The sketch shows reading, active edit, dirty checkpoint, and close/conflict states. It is not a pixel-accurate rendered app. Check 1440/900/640-point layouts, longer Spanish copy, 200% zoom, keyboard-only flow, contrast, focus visibility, and Reduce Motion in a packaged app. These are **NOT TESTED** at planning time. User approval of this design and sketch is needed before F004 implementation.
