# Critique and revisions — 2026-10-04

**CURRENT DESIGN APPROVAL — 2026-10-05:** all current proposals and critique refinements are approved. [User statement and reviewed hashes](approval-all-2026-10-05.md) govern current approval status. Option D remains selected; A/B/C remain comparison references. Technical reconciliation and runtime verification remain separate.


**APPROVED DESIGN — OPTION D SELECTED** · Design only

Keep **Direction A: scoped horizontal workspace**, the restrained semantic palette, native window chrome, one section edited in place, explicit original Save, and separate Settings. These fit the brief’s developer reading task and preserve established decisions. The consequential weaknesses are inconsistent search/state communication, insufficient small-window/error-state illustrations, and unsettled navigation semantics. A new visual identity would not resolve those problems.

## Evidence and approval boundary

**OBSERVED:** all 13 supplied SVGs, the five proposal/interaction/handoff documents, color measurements, gallery, state, manifest and both original screenshots were inspected. Disposable AppKit primitive previews of the current SVG text/rect/path geometry supported visual inspection; they approximate font rendering and are not browser/native-app screenshots. No live application or new application source was inspected. Earlier source observations remain attributed to the earlier review, not reverified behavior.

**REPORTED:** the existing record contains the user statement “I approve everything except the file navigation.” All 19 listed approval-time artifact hashes matched before editing. The [exact baseline](archive/before-critique-2026-10-04/approval-record.md) and its original files are archived byte-for-byte. [Approval record](approval-record.md) remains the historical scope record; [revision inventory](revision-record.json) distinguishes changed/new artifacts. At that historical stage, new material decisions were proposed and navigation was excluded. Those exclusions and pending labels are superseded by the subsequent option-D approval and the 2026-10-05 approval of all current proposals. Direction B remains background comparison, not a selected second design.

**ASSUMED:** deliberate occasional editing remains secondary to reading; users benefit from continuity among tree, tabs and document content. There is no new user research, performance benchmark, usability-test result or implementation estimate.

**VERIFIED IN DESIGN:** static composition inspection, numerical selected color pairs and artifact integrity only. **VALIDATED:** no runtime or usability outcomes. Application behavior, byte preservation, native grants, script isolation and accessibility remain **NOT TESTED**.

## Consequential findings

Confidence concerns the evidence, independently of priority. Risks are heuristic interpretations unless labeled otherwise.

| ID / priority / category | Observed evidence and likely consequence | Revision / tradeoff | Validation |
|---|---|---|---|
| C01 · High · Handoff integrity · high confidence | Approval metadata described the original files as unchanged while several proposal documents still said the whole design was unapproved. Updating them without a baseline would obscure exactly what was accepted. | Archive verified originals; distinguish historical approval from current revisions in each handoff/gallery/state; retain exact reviewed hashes. More inventory, but no invented approval. | Compare all 19 baseline hashes and current revision hashes; review affected-scope decisions below. |
| C02 · High · Preservation/capability gap · high confidence | Rich in-place editing is specified, but fidelity/remapping remains unresolved; the original round-trip paragraph also allowed wider normalization after disclosure. Untouched-byte guarantees and that escape could diverge. | Block original Save when localized lossless serialization is unavailable; preserve draft and explain the construct. Keep opaque-node/read-only boundaries. No new normalized-copy flow. Some sections may remain uneditable until verified. | Disposable BOM/CRLF/reference-link/table/unknown-node corpus; unchanged session zero diff; local edits preserve all untouched bytes. This is a technical gate, not solved by mockups. |
| C03 · Medium · State clarity · high confidence | Screen 05 selected Contents while the opening contract defaulted to Both; selected mode used background color alone. Empty Search was muted but had no explicit disabled reason. | Show Both on initial opening; a checkmark reinforces selection; add query-required reason. Screen 06 remains a deliberate Contents selection. Preserve actual default. | Initial/reopened/changed-mode states agree; keyboard and accessible selected/disabled state checks. |
| C04 · High · Coverage/trust · high confidence | Search mockup said Search local Markdown despite offering filenames; results said Complete with skips. Footer said Stop replaces Clear, contradicting cancellation/clear rules; “Return restores the tree” could mean Return key. | Explain names vs Markdown-only contents; Scan finished plus actual skips; Search becomes Stop, Clear remains; Return submits, Return to Explorer restores tree. Slightly more helper text. | Mixed HTML/image/Markdown/other-name fixture; no implicit HTML indexing; stopped/skipped/capped counts and stale jobs remain honest. |
| C05 · High · Adaptive design gap · high confidence | Original screen 07 was 640 units wide but about 656 units tall. It did not evidence the specified 640×480 layout or editing actions. | Exact 640×480 reading/editing reference windows with a separate action row; add enlarged light Spanish Settings. Chrome uses more vertical space, preserving readable controls and a scrollable document/body. | Real macOS 640×480, 200% text, long ES labels and panel overlays. Static composition is not actual reflow verification. |
| C06 · High · Recovery clarity · high confidence | Dirty/recovery status existed in prose and the happy-path edit image, with no visual failure/exit states. Save’s return-to-reading result was easy to miss. | Add clean, recovery-failure, disk-conflict and dirty-exit board. Name the file/section, expose Save’s result, distinguish original/recovery writes; Cancel initially focused. Preserve existing guards. | Correct-revision acknowledgment, Save failure, recovery retry, Cancel and confirmed discard using disposable files. |
| C07 · Medium · Scope/content inconsistency · high confidence | Settings helper excluded HTML, although HTML handoff said the checked filter includes it. | Include HTML in Settings now; keep folders/tabs/grants and search scope independent. | Toggle around open dirty/HTML tabs; no scope or file-byte changes. |
| C08 · High · Navigation/keyboard risk · high confidence in document, untested consequence | Navigation reserved ⌘[ / ⌘] inside rich editing without a command-conflict decision; synthetic empty-workspace visits and unbounded/potentially persistent history increased ambiguity. | Leave new chords unassigned; keep Go/buttons keyboard reachable. Specify 100 entries in memory, clear-history retaining current seed, no empty-file visit. Closing all tabs suspends history; Back reopens retained latest file under current checks. These material design decisions were subsequently approved in the option-D review. | Forecast Back after link/tree/tab/close; verify branching, oldest-entry trimming, failed access, no automatic grant restoration and no editor chord interception. |
| C09 · High · Access/recovery gap · high confidence | Screen 11 showed only a relative destination and focus on Choose file. Picker mismatch/cancel and modal focus were underspecified. | Inspectable resolved path plus original href in details; Cancel initial focus; picker cancellation returns to dialog, dialog cancellation to link; mismatch retains source/history. More destination detail before acting. | Long/encoded/outside-grant paths; mismatched selection; keyboard Escape/focus/inert background; commit only after successful destination opening. |
| C10 · Medium · Reversible-edit friction · high confidence in spec, heuristic consequence | Each row/column deletion required a modal even though draft operations were undoable. This risks interrupting routine table editing. | Ordinary draft deletions act directly with target-named status and one Undo transaction; whole-table/non-undoable operations confirm or remain disabled. Save/discard guards remain. Material change to an approved interaction. | Repeated row/column operations, Undo/Redo and cancel whole-table removal; original unchanged before Save. |
| C11 · Medium · Capability clarity · high confidence | Read-only HTML language could imply controls never change; standalone HTML asset grants were left as an unresolved question. File details hid the external handler’s identity. | Clarify temporary form/control state vs original writes; resource-details flow names denied assets and deliberate file/folder selection (disabled if unsupported); external action names actual known handler. Preview is illustrative in screen 13. | Reload drops transient form values; no submits/writes/network; explicit asset grants; real handler/no-handler/launch-failure. Capability/security reconciliation still required. |

No critical task failure was established from static material. High-priority gaps remain implementation/validation requirements; they are not concealed by visual polish.

## Every existing mockup: disposition

| Proposal | Decision and concrete critique |
|---|---|
| 01 Reading workspace | Keep hierarchy, tab/tree separation and neutral status. Normalize Projects capitalization. Documents overflow/full-path access is essential with 29 tabs; no smaller tab text. Option D supersedes embedded arrow placement; navigation design is approved. |
| 02 In-place editing | Keep same surface and explicit section scope. Expand recovery label to “on this Mac” and expose Save returning to reading. Add failure states in 15; do not infer round-trip feasibility from the image. |
| 03 Workspace menus | Keep target groups and visible Projects route. Make unsupported subfolder search visibly unavailable; retain reason and root search. Replace space-padded Projects chevron with a vector. |
| 04 Document menus | Keep one-menu/dismissal/focus model. Remove ellipses from direct, undoable draft row/column deletion; distinguish menu scrolling from document scrolling in spec. Original-file discard remains confirmed. |
| 05 Search opened | Correct initial default, non-color selected cue, disabled-query explanation, static whole-workspace scope and actual coverage. No dropdown implies unsupported subtree options. |
| 06 Search results | Keep grouped contextual snippets and retained tree route. Disclose skips/content coverage; collapsed two-hit group shows one preview with a disclosure, rather than implying two expanded hits are visible. |
| 07 Narrow reading | Replace tall illustration with exact 640×480 reference window, readable identity and separate action row. Optional tools remain in Document… . |
| 08 Settings | Keep groups, immediate preferences and supported numeric values. Correct HTML helper; enlarged/short-height adaptation is demonstrated in 16. No change to original file bytes or preference scope. |
| 09 HTML viewing | Keep authored light page inside dark shell. Revise title/caption to distinguish approved viewing direction from unapproved routing/history. No forced theme conversion or claim of script isolation from artwork. |
| 10 File links | Keep type-aware route and explicit other-file fallback. Remove Return from shortcut column: it activates whichever menu item is focused, not a new global chord. Capability/grant failures stay explicit. |
| 11 Linked-file access | Keep source page/context. Add resolved full destination and conservative initial focus; specify native-picker cancellation/mismatch and modal keyboard behavior. |
| 12 Image history | Retain byte-for-byte: stable Back/Forward placement, image-fit context and cross-format sequence are coherent visual examples. Navigation remains unapproved; actual zoom/history restoration is NOT TESTED. |
| 13 File details/history | Keep explicit launch and honest Preview unavailable. Remove unresolved bracket shortcuts; illustrative known handler becomes Open in Preview, runtime label must name the actual app. No PDF renderer implied. |

New: **14** narrow editing; **15** save/recovery/dirty exit; **16** light enlarged Spanish Settings. These are SVG design artifacts, not interactive prototypes.

All five substantive documents were reconciled at their source: audit (evidence/references), frontend handoff (placement/states/adaptation), interaction spec (source fidelity/menu/edit/search/dialog rules), HTML handoff (resource/control boundaries), navigation handoff (history/access/command behavior). Color evidence adds measured revision pairs. Gallery, state and manifests now point to current artifacts and historical approvals separately. Unrelated product/spec/architecture decisions are preserved.

## Material design decisions — now approved

1. Direct Undo-backed draft row/column deletion instead of a modal for every edit.
2. Original Save blocked when lossless localized serialization is unavailable; no implicit normalization flow.
3. Narrow header wrapping/action row and Cancel-first access/dirty-exit focus.
4. Unassigned new history shortcuts; 100-entry session-only history, explicit clear and closed-all-tabs handling.
5. Proposed resource-grant flow and handler-named launch, subject to capability/security reconciliation.

These changes are covered by the recorded user approval of all current proposals. Existing rich editing, explicit Save returning to reading, native grants and authored CSS constraints are retained.

## Accessibility and critical second pass

- **Verified in design:** visible textual/non-color selected and unsaved cues, separately identified recovery status, app-owned large/stacked Settings controls, static measured color combinations, planned selectable/wrapping paths. Repeated shell targets stay at 32 reference units; tab close/× glyphs need explicit hit areas, not their text bounds.
- **Requires implementation testing:** correct semantic roles/names, full keyboard/IME operation, focus return/inert modal background, scrollable menu access, controls at 200%, EN/ES, reflow without obscured focus, actual macOS/native target mapping. A 32-unit SVG button is not proof of its runtime CSS-pixel/native-point size.
- **Not assessable from supplied material:** actual accessibility tree, assistive-technology behavior, arbitrary authored HTML accessibility, fidelity/performance and native isolation. No conformance claim.
- **Not applicable:** acquisition messaging/pricing/conversion tests; this is a private desktop document workspace.

Web-content target sizing and text resizing are design checks informed by [W3C SC 2.5.8, criterion/exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [W3C SC 1.4.4, 200% resizing](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html), accessed 2026-10-04. They do not equate web pixels with native points or certify the app. Apple HIG pages were not available as readable evidence in this pass; no new platform rule is claimed from them.

Critical second pass considered first-time discovery (Projects/Edit), returning-user restoration, enlarged/keyboard access, long/duplicate names, unsupported section nodes, disk conflicts, missing resources and unavailable history destinations. These are analytical lenses, not simulated participants or research findings.

## Validation plan and limits

A future prototype/native review should involve people who read developer repository documentation, including keyboard-dependent and enlarged-text use. Give neutral tasks: open the intended duplicate-named file among 29 tabs; search a phrase across mixed file types and explain skipped coverage; make a paragraph/table edit and keep it after a recovery failure; follow a link and return after a tab switch; cancel choosing an outside-scope file. Observe correct target, predicted Back destination, distinction between original/recovery Save, safe cancellation, and task completion without coaching. Repeated wrong destinations or mistaken “all content searched/saved” interpretations require revising that model/copy before implementation. No sample-size/outcome claim is made.

The SVGs cannot run these tasks or prove a renderer/editor architecture. Native engineering/QA must separately verify grants, JavaScript/network isolation, byte fidelity and save/recovery with disposable fixtures. Scope checks confirm application/spec/test bytes were preserved; no build or runtime test was performed for this critique.
