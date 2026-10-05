# F003C workspace restoration — visual proposal

**Status:** Draft for user review, 2026-09-29. [State sketch](design/session-states.svg)
is a vector proposal, not a screenshot or native acceptance result. Reuse the
approved F001 shell and F002A System/Light/Dark palettes; no new theme or titlebar.

## Reading flow

On launch, show the saved tab strip and tree promptly. Load the active tab first;
keep inactive tabs as quiet filename placeholders until selected. An inline status
under the toolbar says “Restoring workspace…” / “Restaurando espacio…” while work
continues. Existing Open Folder action remains available and cancels pending
restoration after F004 close choices. Do not cover the document with a spinner.

Return each clean tab to its saved heading and relative passage position. If the
passage changed, show a short status message by the tab, then place it at the
nearest valid heading. Source edit drafts use F004's existing recovery and conflict
surfaces; session state does not display draft text or claim that it was saved.

## States and controls

| State | Treatment and action |
|---|---|
| No saved session | Existing welcome screen with Open Folder/Open File. No false restore notice. |
| Restored | Existing tree, ordered tabs and active document; brief nonblocking completion status. The Clear session action sits in the sidebar footer with a text label. |
| Missing or denied root | Keep remembered root name and tab placeholders visible. A main-panel explanation offers **Select this folder** and **Open another folder**; neither silently grants access. |
| Missing/changed/unsupported tab | Keep its tab in place with a status icon plus text. Show a specific Retry/Reselect action in that tab. Other tabs remain usable. |
| Changed passage or display | Restore the nearest valid place and explain that the exact position changed. Clamp the window to the visible display; keep controls reachable. |
| Unexpected termination | Offer the latest completed workspace checkpoint with its timestamp and a notice that newer actions may be absent. Source drafts keep F004's separate recovery status. |
| Clear session | A focused confirmation names the remembered folder and number of tabs. If recovery drafts exist, state plainly that they will be removed too; Cancel is the first/default action. Source files are never listed as deletion targets. |
| Folder switch with edits | Reuse F004 Save/Keep draft/Discard/Cancel choices for each dirty document before replacing tabs. Cancel or failed Save retains the current workspace. |

The sketch shows a restored reading state, missing-root recovery and Clear session
confirmation. The saved window position/size and sidebar width are reflected by the
ordinary shell; no draggable session widget is added. File paths are shown only
where they help disambiguate a missing selection.

## Layout and visual language

Use F001's 264-point initial sidebar, compact tab strip and centered reading
column. Use F002A semantic surface/text/focus tokens in both appearances.
Recovery banners and dialogs share existing notice/modal spacing; text and icon
shape communicate status without color alone. At 900 points the sidebar may
collapse; at the 640-point minimum, tab strip scrolls, recovery actions wrap and
the Clear session action remains keyboard reachable through the sidebar toggle.
Long EN/ES names wrap in messages and truncate only in tab labels with full
accessible names. No restoration animation delays input. Reduce Motion removes
any nonessential transition.

## Keyboard and focus

- Startup focus goes to the active tab or its recovery action after the first
  usable frame. Deferred inactive tabs must not steal it.
- A missing-root action returns focus to its panel after a cancelled picker.
  Selecting another folder follows the existing dirty-edit choices.
- Clear session confirmation traps focus while open; Cancel returns focus to
  Clear session. Destructive confirmation is explicit and not the default.
- Announce restoration, fallback and failure through existing localized status
  regions. All buttons have visible focus and EN/ES accessible names.
- Keep F001 Cmd+O/Cmd+Shift+O/Cmd+W and F004 close/quit behavior. F005 owns the
  native Dock reopen entry point; F003C owns the state displayed once reopened.

## Review decision

Approve or revise the inline restore status, retained tab placeholders and
missing-root recovery, sidebar Clear session with draft-aware confirmation,
and the focus/layout treatment in the [state sketch](design/session-states.svg).
Actual native focus, geometry and localization remain acceptance checks.
