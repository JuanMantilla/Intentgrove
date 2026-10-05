# Four designs for the Back/Forward arrows

**APPROVED DESIGN — D SELECTED** · 2026-10-04 · Design only

**REPORTED:** “lets remove these options. I prefer the arrows option better. Add different designs for it.” The previous four navigation alternatives are removed. The user subsequently stated “I like better option D, I approve everything”. D is selected and the revised design package, including shared history behavior, is approved. See [approval record](../approval-option-D.md) and [selected handoff](../selected-design-handoff.md). Implementation architecture remains a technical handoff decision.

**ASSUMED:** compare treatments in the existing macOS workspace palette, with the same image destination and shared file-history behavior. Audience: people reading and editing local documents who need to return to files and passages. Primary task: move Back/Forward while retaining reading position and drafts. No new source inspection or user testing was performed.

[Gallery](index.html) · [Shared history proposal](../file-navigation-handoff.md) · [Static contrast measurements](contrast-measurements.md)

## Design comparison

| Design | Anatomy and placement | Design judgment / tradeoff |
|---|---|---|
| **A — Joined control, unselected** | One 72×32 capsule before filename/path; two independent 36×32 targets, a divider, 7-unit radius. | Clear grouping with compact width. Focus must identify the specific half. |
| **B — Minimal icons** | Two 32×32 targets with 8-unit gap before filename/path. Icons remain visible; backgrounds appear on hover, independent rings on focus. | Least visual chrome. Target boundaries are less discoverable at rest; visible glyphs and full targets are essential. |
| **C — Labeled buttons** | 88×32 Back and 112×32 Forward buttons with 8-unit gap, 6-unit radii; arrow plus text. | Commands are explicit. Group uses 208 units and wraps as a row in small windows or enlarged/localized text. Widths are reference English sizes, not caps. |
| **D — Beside the tabs, selected** | Two framed 32×32 targets with 8-unit gap, fixed before the horizontal tab lane; a divider separates history from tabs. | Keeps file identity spacious. Takes tab width and could be confused with tab scrolling; destination tooltips and Go menu labels clarify scope. |

A was the earlier designer recommendation. The user selected D; A/B/C are comparison references. D supersedes the earlier fixed header anatomy. D changes placement only; its arrows always traverse visit history and never scroll the tab strip.

## Shared behavior and command scope

All four illustrate the same approved window-wide history across Markdown reading/editing, HTML, images and File details. Tree, tabs, document links, Open and search follow the shared visit rules in the [history handoff](../file-navigation-handoff.md). Keep the selected placement stable across types, loading, missing-file and empty states. Settings is separate. A Back click traverses one committed visit; Forward traverses the next. The reference example is README → guide → diagram → report, with diagram current after Back.

Preserve the departing file's view position, image fit/zoom/pan and unsaved editing state. Traversal does not save/discard, append visits or duplicate tabs. Commit cursor changes only after successful navigation. A failed/cancelled target retains the source, cursor, draft and Forward branch; restore arrow availability from that retained state. A new successful ordinary visit after Back replaces the Forward branch. Closed/unavailable files, the 100-entry session proposal and empty-window reopening retain their existing proposed rules; those design choices are included in the recorded approval.

Use the same commands/enabled state for toolbar and Go → Back / Forward / Visited files…. No new global key binding is assigned. Tab/Return/Space activation, existing editor/OS shortcuts, native grant checks and loss guards require implementation verification. Directional history menus use existing secondary-click/Control-click behavior; they do not become a new navigation model.

## Visual and accessibility handoff

- A/B/D use centered 12×12 chevrons with a 1.75-unit rounded stroke. C uses a 14-unit shaft arrow with a 10-unit arrowhead and 14-unit label. These are SVG reference units; native point mapping and target sizing need verification. Never shrink targets to fit metadata.
- Expose independent button names **Back** and **Forward** (Spanish **Atrás** / **Adelante**), enabled/disabled semantics, and destination filename/path details on hover and focus. Tooltips describe the visit destination, never adjacent directory order. Provide distinguishing paths for identical filenames. Go menus expose labels without requiring hover.
- Disabled reasons: “No previous file” / “No next file”; loading: “Opening {filename}…”. Make reasons available through status/help and labeled menus; a disabled button's tooltip alone is insufficient. Empty-first window has both disabled; last-tab closure follows the existing retained-cursor proposal.
- Rest: visible glyphs and framed boundaries for A/C/D. Hover: pale theme fill and stronger boundary on the hovered target, with B revealing its target. Pressed: keep hover treatment, emphasize glyph/label weight, retain geometry and release feedback. Focus: a 3-unit-offset ring specific to one button, visible independently of hover. Disabled: subdued glyph/label, semantic state and reason; color is not the only signal.
- Busy: both directions temporarily unavailable while one traversal resolves; prevent repeat/stale commits. Keep the current file identity and content until success. Failure: show the requested filename and a text error; offer Retry/Choose file when applicable, keep current content, restore availability. Do not leave both disabled solely because a destination failed. The matrix illustrates both restored enabled after a failed Back attempt.
- Pointer activation retains focus on the initiating control for repeat traversal; menu dismissal returns there. Announce successful Back/Forward and filename once. Link/search activation can focus the destination passage under the shared spec. Error dialogs restore focus to an existing invoking target; focus never moves into inactive content.
- A/B use 72-unit groups in small windows; metadata wraps. C wraps below identity, preserves both labels, and grows for localization/enlarged text. D controls remain fixed between Sidebar and the scrollable tab lane; tabs alone scroll. Optional document tools move to Document… before any arrows are compressed or removed.
- Dark/light state examples use existing palette roles. No essential animation; retain focus and direct state changes with Reduce Motion. Modal menus follow existing dismissal/focus rules. The Spanish static example only demonstrates labels; actual EN/ES, IME, 200% text and keyboard behavior are not verified.

## Artifacts and validation

Four wide SVGs compare identical workspace destinations; [state matrix](mockups/E-control-states.svg) compares dark/light, keyboard focus, disabled and hover, plus busy/error/Spanish; [small-window board](mockups/F-narrow-comparison.svg) uses four exact 640×480 frames. Image content is illustrative and simplified in small examples, with its 16:9 bounds preserved.

**VALIDATED, static only:** six SVGs parse; all six compositions visually inspected using disposable AppKit primitive previews with approximate system fonts. Calculated selected opaque color pairs, checked local links/anchors, current hashes, and preservation of prior mockups, approval records and application/spec/test bytes. See [manifest](artifact-manifest.json) for exact results. No application changes.

**NOT TESTED:** live runtime behavior, native command routing/access, draft/location restore, actual button hit areas, keyboard/VoiceOver/IME, 200% text and EN/ES reflow. No accessibility compliance or user-test outcome claimed.

D is selected and design approval is recorded. Before implementation, reconcile affected canonical specifications and implementation architecture. Validate in disposable native journeys: keyboard Back/Forward across four file types; a dirty edit round trip; missing/ungranted/closed/empty targets; rapid input and failed traversal without cursor movement; 640×480 plus 200% EN/ES labels in both themes. D additionally needs a check that users distinguish visit history from tab scrolling. Application implementation is outside this handoff.
