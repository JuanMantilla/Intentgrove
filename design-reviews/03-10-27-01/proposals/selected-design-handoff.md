# Selected design handoff — option D

**CURRENT DESIGN APPROVAL — 2026-10-05:** all current proposals and critique refinements are approved. [User statement and reviewed hashes](approval-all-2026-10-05.md) govern current approval status. Option D remains selected; A/B/C remain comparison references. Technical reconciliation and runtime verification remain separate.

**APPROVED DESIGN** · 2026-10-04 · [User statement and exact review hashes](approval-option-D.json)

The revised design package is approved. Use **D — Beside the tabs** for Back/Forward. The [wide D mockup](arrow-designs/mockups/D-tab-strip.svg), D row of the [state board](arrow-designs/mockups/E-control-states.svg), and D frame of the [640×480 comparison](arrow-designs/mockups/F-narrow-comparison.svg) are the controlling arrow references.

## Selected anatomy and placement

Two outlined 32×32 reference targets, 8-unit gap, 6-unit corner radii and centered 12×12 chevrons with 1.75-unit rounded strokes. Fix the pair at the beginning of the tab strip, outside its scrollable lane. A divider separates history from tabs. At narrow widths, place Sidebar, the fixed pair, the active tab lane and Documents in the same strip, as shown in D. Preserve target size as text/metadata grows; optional document tools move into Document….

Use this same placement for Markdown reading/editing, HTML, images, File details, loading, missing-file and empty states. The filename/path and document actions stay in the document header below; remove the duplicate header arrows. Save/Return remain document actions. The arrow pair always traverses visit history; it never scrolls tabs or steps through directory siblings. Tabs alone scroll.

This selection supersedes header arrow placement in the original 16 mixed mockups and earlier handoffs. Their remaining design content is approved. A/B/C arrow designs remain unselected comparisons; the original workspace direction A remains in force.

## Approved behavior and states

Use the approved [shared history and file-link design](file-navigation-handoff.md), [arrow state requirements](arrow-designs/design-spec.md), [interaction specification](interaction-spec.md), [frontend handoff](frontend-handoff.md) and [HTML handoff](html-view-handoff.md). Preserve committed-visit branching, per-window session scope/100-entry bound, clear-history/closed/empty rules, access/loss guards, unsaved drafts and reading/image context. Failed/cancelled navigation keeps source/cursor/Forward branch; successful traversal does not append or save/discard.

Buttons and Go menu share state and labeled Back/Forward destinations. Retain independent names, focus rings, hover/pressed feedback, disabled semantics and reasons, busy/error recovery, Spanish labels and theme palettes. No new global shortcut is assigned. Keep arrows fixed outside the tab lane; their destination tooltips and divider distinguish history from tab scrolling. Keyboard focus returns to the initiating control; successful navigation is announced once.

## Implementation handoff

Design selection and revised design scope are approved. Remaining work is technical reconciliation of the canonical affected features and implementation architecture: editing fidelity, draft/recovery preservation, search scope, history/routing/access contracts, HTML isolation and other-file handler policy. Existing security/native constraints remain in force; design approval does not prove a capability exists.

Runtime/native behavior, target mapping, keyboard/enlarged/localized text and source fidelity remain NOT TESTED. Use disposable fixtures to validate mixed-file traversal, dirty-edit round trips, missing/ungranted/closed/empty destinations, rapid or failed attempts, and small/enlarged-text layouts. Approval recording changes design metadata and handoffs only; application code is unchanged.
