# F003S document Find — visual proposal

**Status:** Draft for user review, 2026-09-29. [Find states sketch](design/find-states.svg)
is a vector proposal, not a screenshot. It reuses the approved F001 shell and
F002A palettes. Folder-wide search is outside this feature.

## Placement and behavior

Command+F opens a compact Find band immediately below the active tab strip and
focuses its input. The band occupies layout space so it never overlays a match.
It contains a search field, a text count (`2 of 7` / `2 de 7`), Previous, Next
and Close controls. There is no settings drawer or extra search-options menu.
The document stays readable while Find is open. In source/section editing mode,
the band searches the visible draft without replacing the editor or taking its
undo/selection state.

Enter and Shift+Enter move through matches; Escape closes Find and returns focus
to the active match's reading location or the prior document focus target.
Tab switches close the band and clear its old highlights. A refreshed document or
edited draft updates the count and active position rather than showing stale
results. Closing Find leaves the located passage in view.

## States

| State | Treatment |
|---|---|
| Empty/whitespace query | Input prompt, neutral `Type to find` / `Escribe para buscar`; no highlights or false zero. |
| Matches | All visible occurrences have a restrained fill plus underline. The active one has a 2-point outline and is named in the count. Offscreen matches count but are not materialized as hidden DOM decorations. |
| Zero results | Explicit `No matches` / `Sin resultados`, no highlights; input stays focused and editable. |
| Unavailable document | The band explains missing, unsupported or over-limit content and offers the existing Retry/Reselect path; no partial count. Other tabs remain usable. |
| Text changes | Brief status update without motion or focus theft; active result moves to the nearest valid match or count resets. |

Use existing semantic text/surface/focus colors. Highlight has a border/underline
and active outline, so position is not conveyed by color alone. A polite live
region announces count changes and `current of total`; it does not announce every
keystroke as a separate result. Buttons have localized accessible names and
visible focus. In the 640-point window the band wraps to two rows with controls
remaining reachable; long Spanish labels use accessible names and short visible
icons/text without clipping. Reduce Motion removes nonessential transitions.

## Review decision

Approve or revise the in-flow Find band, match treatment, EN/ES count and empty/
zero/unavailable states in the [sketch](design/find-states.svg). This visual
proposal does not imply approval of the underlying search architecture or native
access. Actual focus, contrast, layout and timing require packaged verification.
