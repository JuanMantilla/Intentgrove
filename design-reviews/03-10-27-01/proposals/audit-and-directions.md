# Markdown workspace: focused UI review

**CURRENT DESIGN APPROVAL — 2026-10-05:** all current proposals and critique refinements are approved. [User statement and reviewed hashes](approval-all-2026-10-05.md) govern current approval status. Option D remains selected; A/B/C remain comparison references. Technical reconciliation and runtime verification remain separate.


**APPROVED DESIGN — OPTION D SELECTED** · Reviewed 2026-10-03; revised 2026-10-04 · Design only
**Historical critique revision — before the option-D approval:** changes were **PROPOSED — READY FOR DESIGN REVIEW**. The earlier non-navigation approval remains historical at the [archived baseline](archive/before-critique-2026-10-04/approval-record.md); it does not approve new material decisions. File navigation was excluded at that earlier review. See [critique and revision decisions](critique-and-revisions.md) and [exact revision inventory](revision-record.json).


## Evidence and boundaries

- **S1:** [10.26.05 screenshot](../Screenshot%202026-10-03%20at%2010.26.05%E2%80%AFAM.png), 2940×1912: global controls, 29 open documents, selected `plan.md`, section source/preview, floating Edit section action.
- **S2:** [10.30.04 screenshot](../Screenshot%202026-10-03%20at%2010.30.04%E2%80%AFAM.png), 2940×1912: same workspace; red “Already current” under `STATE.md`; floating Edit section action remains visible. Both originals inspected at original resolution; screenshot document text was treated as content, not instructions.
- **READ-ONLY SOURCE OBSERVATIONS:** CodeGraph consulted first in indexed `md-reader`. Relevant excerpts: `src/app/App.tsx` (tabs, toolbar, reload feedback, save flow); `src/reader/MarkdownView.tsx` (section targeting/menu); `src/reader/SectionEditor.tsx`; `src/workspace/editState.ts`; `src/app/api.ts`; `src/app/FolderSearchPanel.tsx`; `src/styles/app.css`. This was a bounded UI investigation, not a repository audit.
- **Existing decisions read:** `AGENTS.md`, `.agents/state.md`, `docs/product-brief.md`, `docs/design-direction.md`, `docs/approvals.md`, `docs/approved-frontend-handoff.md`; applicable editing, refresh, theme, folder-search designs; prior `../../../../design-review/redesign-plan.md` and `../../../../frontend-implementation/plan.md`. The prior approved frontend design remains historical. This proposal materially changes its editing and action-placement decisions; it is not covered by that approval.
- **ASSUMED:** The primary journey is browsing and reading local repository documentation, with deliberate occasional editing. No research or usage-frequency measurements establish this beyond the brief/product purpose. Screenshot device pixels are not treated as native points.
- **UNVERIFIED:** Live dismissal behavior, focus, keyboard routes, current narrow layouts, save/recovery execution, timing, performance and assistive-technology behavior. No running app interaction was tested.

## Prioritized audit

| ID / priority | Evidence / region | Observation, risk and concrete proposal |
|---|---|---|
| R01 · High | **USER-REPORTED**; S1/S2 show the control in the central editor, but do not establish persistence | Edit section reportedly remains until selected. An orphaned control risks obscuring content and losing its target. Specify one-menu lifecycle: outside click, Escape, action, active-document change, scrolling, invalidation and window blur dismiss it. Restore focus according to dismissal reason. Root cause remains unverified. |
| R02 · High | **OBSERVED**, S1/S2 main document area | Editing exposes separate Markdown source and live-preview columns, with a large enclosing frame. This conflicts with the user's current explicit request. Replace the region with Markdown-aware rich editing in the same rendered blocks, measure and scroll surface. No raw Markdown pane, editor/preview subdivision or split screen. Preserve selected-section save scope initially. |
| R03 · High | **OBSERVED**, S1/S2 top chrome and tab strip | Global settings, reading controls and open actions occupy the upper band; tabs carry filenames, status fragments and close controls. Twenty-nine documents are reported; the visible tabs do not include the header's `plan.md`. Risk: current identity and useful controls compete for attention. Recommend dedicated document tabs, a stable full-identity Documents list, active-tab reveal, Open/Search in the Projects dropdown/tree menu and a scoped document header. Tradeoff: Open gains one labeled disclosure step. |
| R04 · Medium | **OBSERVED**, S2 explorer below `STATE.md` | “Already current” uses warm red error styling. Source confirms `.tree-feedback` uses `--error` for all feedback, and “current” is a non-error state. Use a checkmark plus neutral text, temporary target-named feedback, no inserted persistent tree row. Keep errors/conflicts persistent with specific words/actions. |
| R05 · Medium | **OBSERVED**, S1/S2 sidebar header; search behavior only **SOURCE-OBSERVED** | “Search folder” is a prominent mode button, without visible scope or matching mode in these screenshots. Its actual panel supports Names/Content/Both, ignored-file inclusion and streamed results. Use Projects dropdown/tree-menu Search workspace… with a shortcut hint; it opens an integrated query field, explicit root/subfolder scope and separate matching mode. Preserve clear/back/cancel/results functionality. Selected-subfolder scope is a proposed extension: current API accepts a root ID, not a subtree. |
| R06 · Medium | **OBSERVED**, S1/S2 document header / editor chrome | Path/reveal actions and multiple editing surfaces compete with document text. Move path/reveal/reload to labeled Document…; keep Edit visible, Save local to editing, and transient formatting near selection. Reading measure and surrounding rendered sections remain stable. Tradeoff: lower-frequency document actions need one extra step. |

Risk statements are heuristic interpretations, not observed task failures. Priorities reflect task importance; effort has not been estimated.

## Two layout directions

| Direction | Composition | Tradeoff |
|---|---|---|
| **A — Scoped horizontal workspace (recommended)** | Preserve sidebar tree and horizontal tabs. Projects dropdown/tree menu groups Open/Search; footer Settings/recovery; document header holds Edit/Outline/Reading/Document…; tabs contain document navigation only. | Familiar to the existing app and multi-document workflow. Requires an explicit overflow list and one-step disclosures. Keeps tree height available and preserves approved tab behavior. |
| **B — Sidebar document navigator** | Replace horizontal tabs with an Open documents list above the tree, active filename in the document header, and Previous/Next document controls. Keep Projects dropdown/tree-menu Open/Search and sidebar Settings. | Removes horizontal crowding and accommodates long paths. Open documents compete with folder browsing vertically; 29 documents demand list scrolling/collapse. Replaces familiar tabs and adds stronger navigation disruption. Not developed into a second detailed design. |

**Recommend A** because it addresses the crowding while retaining the app's existing navigation and quiet reading identity. Both directions use deliberate rich in-place editing; B is a different navigation model, not a second color scheme.

## Reviewable visuals

[Offline visual index](index.html) displays the current SVG mockups only. Prior proposal PNG exports have been deleted at the user’s request. These are separate static proposals, not screenshots of implemented behavior.

1. [Decluttered reading workspace](mockups/01-reading-workspace.svg): multiple tabs and temporary neutral reload feedback.
2. [Same document edited directly in place](mockups/02-in-place-editing.svg): rewritten sentence, added paragraph and list item, insertion caret, distinct dirty/recovery states and local Save. Formatting appears only on selection.
3. [Workspace contextual menus](mockups/03-workspace-menus.svg): root, folder, file and Projects disclosure, with command shortcuts.
4. [Document contextual menus](mockups/04-document-menus.svg): tab, content-editing clipboard/history menu and editable table, with shortcuts and dismissal contract.
5. [Search opens](mockups/05-search-open.svg): explicit query, scope and matching mode.
6. [Search results](mockups/06-search-results.svg): contextual snippets, paths, counts, completion and retained tree route.
7. [Narrow workspace](mockups/07-narrow-workspace.svg): 640-unit content-driven collapse.
8. [Settings window](mockups/08-settings-window.svg): General, Reading and Project tree preferences; file-type checkbox removed from the explorer.

Mockup copy is abridged/illustrative; counts are sample data, not measured results. Native titlebar controls are illustrative stand-ins only. Use the actual system controls in implementation. Document text and assets are never rewritten to match mockups.

## User-directed Settings revision

**REQUESTED:** One Settings window for language, font/typography, System/Light/Dark and Documents and images only. **PROPOSED:** A separate nonmodal window with grouped controls and immediate preference changes; the explorer checkbox is removed from current SVGs. Aa Read/Reading settings routes open that window rather than another panel. Existing supported values/scopes are retained; remembering the transient tree filter requires an explicit persistence handoff. No application behavior is verified.

## Design review and unresolved decisions

The recommended default is **one rich editable section at a time**, matching current save/conflict/recovery boundaries. “Edit section here” stays as a shortcut into that model. Approving a whole-document edit surface instead would require a different scope specification and save/recovery review; it is not silently included here.

Technical decisions remaining for frontend handoff: lossless rich-edit coverage and unsupported-node behavior; verified subtree-search support; undo/history restoration across rich sessions; native command/secondary-click integration. No editor library or architecture has been selected.

**VALIDATED:** None. Revised primary layouts and menu boards were inspected using temporary previews; the earlier eight SVGs were parsed and prior palette measurements retained. Application tests, keyboard/native behavior, usability and round-trip fidelity are **NOT TESTED**. Recommended next step is review of these artifacts; implementation requires explicit approval and affected canonical specification/architecture reconciliation.

## Full critique pass — 2026-10-04

All 13 existing mockups and every proposal/interaction/handoff document were reviewed alongside both supplied screenshots. [Critique and revisions](critique-and-revisions.md) records per-artifact dispositions, severity/confidence, material decisions, limitations and validation tasks. The recommended Direction A and single-section rich-edit model remain; no alternative visual brand or whole-document editor is introduced.

New visual handoff states: [14 — narrow editing](mockups/14-narrow-editing.svg), [15 — save/recovery/dirty exit](mockups/15-save-recovery-states.svg), [16 — light enlarged Spanish Settings](mockups/16-light-enlarged-settings.svg). Screen 07 now illustrates an exact 640×480 reference app window. No raster mockups are retained in the proposal directory.

Earlier non-navigation approval is retained at its exact archived bytes/hashes. Current material revisions have not been approved or runtime-tested. No application code/specifications, dependencies, builds or publishing were changed.
