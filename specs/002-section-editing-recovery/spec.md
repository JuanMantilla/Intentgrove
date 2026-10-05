# Feature Specification: Section Editing and Recovery

**Feature directory**: `specs/002-section-editing-recovery`  
**Created**: 2026-09-25  
**Status**: Draft for user approval  
**Input**: User request for right-click, section-only Markdown editing with clear edit focus and restoration after closing; F004 proposals in `docs/product-brief.md`

## Clarifications

### Session 2026-09-25

- Q: When you right-click a section that contains smaller headings, how much of the document should become editable? → A: The heading and content up to the next heading at any level; smaller headed sections are edited separately.
- Q: When you quit the app with an unsaved section edit, should it keep that draft automatically for the next launch or ask you what to do? → A: Ask whether to Save, Keep draft, Discard, or Cancel; exact restoration follows Keep draft.
- Q: When you choose Save As while editing one section, should the new file contain the whole document with that section changed, or only the edited section? → A: Create a copy of the whole document with the edited section included.
- Q: Should a document be able to hold unsaved edits to several sections at the same time? → A: Keep one pending section edit per document; save or discard it before editing another section, and allow Keep draft to pause and resume it.
- Q: If the app crashes or is force-quit during an edit, how much of the unsaved typing must return on reopening? → A: Restore the latest completed recovery checkpoint, completed within one second of each accepted edit while the app is running.

### Session 2026-09-26

- Q: When another app writes during the final milliseconds of Save, macOS cannot atomically compare file contents and replace a path against an app that ignores locks. Should the plan use an immediate pre-commit version check, preserve a recoverable copy, and disclose the residual race, or keep an absolute guarantee and leave Save architecture unresolved? → A: Practical protection with disclosed race.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Enter a clearly bounded section editor (Priority: P1)

A developer reading a Markdown file right-clicks the section to change, chooses **Edit section**, and edits that section's Markdown source. The rest of the document stays visible and cannot be changed in that edit session.

**Why this priority**: Deliberate entry and a clear boundary are the core of the requested interaction.

**Independent Test**: Open a disposable document with several headings, edit its middle section, and check that the other sections cannot be edited and retain their original bytes.

**Acceptance Scenarios**:

1. **AS-001** (F004-R01–R03): Given a rendered document with three sections, when the user right-clicks text in the middle section, the context menu offers **Edit section** for that section; choosing it opens only that section's Markdown source for editing.
2. **AS-002** (F004-R02, R03): Given an active section edit, when the user tries to type or paste in another section, that section remains unchanged; the active section has a clear label and boundary, and the rest remains readable but visually distinct.
3. **AS-003** (F004-R01, R11): Given keyboard focus on a section, when the user opens its context menu or equivalent edit action using only the keyboard, the same section editor opens with visible focus and an accessible announcement.
4. **AS-004** (F004-R04, R05): Given content before the first heading or a document with no headings, when the user invokes **Edit section** there, the corresponding pre-heading region or whole heading-free document is selected, with its boundary shown before typing begins.
5. **AS-013** (F004-R04, R05): Given nested headings, when the user opens the parent heading's section, the boundary ends before the child heading; opening the child heading selects the child's own region, and both boundaries are shown before typing.

---

### User Story 2 — Save a section safely (Priority: P1)

The developer previews, undoes, redoes, saves, or discards changes to the selected section. Saving does not alter unrelated content or silently overwrite a newer disk version.

**Why this priority**: An editor is useful only if it preserves existing document data and makes failures recoverable.

**Independent Test**: Edit one section in a disposable file, save it, and compare all content outside the original section plus encoding and line-ending conventions before and after.

**Acceptance Scenarios**:

1. **AS-005** (F004-R03, R06, R07): Given a changed section, when the user uses Undo, Redo, and Save, the section preview follows the draft, the tab shows dirty state until Save succeeds, and only the selected source region changes in the original file.
2. **AS-006** (F004-R09): Given another process changes the file after editing begins, when the user saves, the app stops the save and offers inspection of the disk version, continued editing, Save As, or explicit reload/discard; it does not silently replace the external change.
3. **AS-007** (F004-R07, R10): Given a denied write, removed file, or other save failure, when the user saves, the original remains intact, the draft remains available and dirty, and the app explains the failure.
4. **AS-008** (F004-R06, R08): Given a dirty section, when the user closes its tab or returns to reading, the app offers Save, Keep draft, Discard, and Cancel; each choice has the stated effect, and Discard never changes the original file.
5. **AS-014** (F004-R07): Given a UTF-8 document with a BOM or consistent non-default line endings, when the user saves one section, the original's BOM and line-ending convention remain and all bytes outside the edited region match; when the user chooses Save As, an explicit destination receives a whole-document copy with the edited section, while the original and any existing different destination remain unchanged unless replacement is explicitly confirmed.
6. **AS-015** (F004-R10, R11): Given an unsupported, over-limit, or out-of-scope document, when the user requests its context menu in English or Spanish, editing is unavailable with a clear reason and reading remains usable.
7. **AS-017** (F004-R15): Given a paused unsaved draft for one section, when the user requests **Edit section** on another section in the same document, the app offers Resume, Save, Discard, or Cancel for the pending draft; it does not create a second draft, and Save or Discard can be followed by editing the newly selected section.

---

### User Story 3 — Resume an interrupted edit (Priority: P1)

The developer closes the app while a section is being edited, then reopens it and returns to the same document, section, draft text, and editing position without an automatic write to the source file.

**Why this priority**: The user explicitly requires the app to reopen as it was before closing.

**Independent Test**: Edit a section in a disposable file, choose Keep draft on normal quit, reopen the app, and compare the draft, active section, undo/redo state, cursor/selection, scroll position, tab, and original file.

**Acceptance Scenarios**:

1. **AS-009** (F004-R08, R12–R14): Given an unsaved section edit, when the user chooses Keep draft while closing the app and reopens it, the same workspace, panel layout, document tab, active section, edit mode, draft text, undo/redo state, cursor/selection, and scroll position return; the disk file remains unchanged.
2. **AS-010** (F004-R13): Given an accepted edit while the app is running, when one second passes, its recovery checkpoint is complete and indicated; if the app then terminates unexpectedly, reopening offers that draft as unsaved before any original-file write.
3. **AS-011** (F004-R09, R13): Given the disk file changed while the app was closed, when the draft is restored, the app keeps both versions available and presents a conflict; it does not automatically merge or overwrite either version.
4. **AS-012** (F004-R14): Given a restored draft, when the user chooses Discard or clears local session data through the existing clear-session action, the app removes that recoverable draft without writing to the document.
5. **AS-016** (F004-R12, R14): Given a clean section editor active at normal quit, when the app reopens, the same editor, section, undo/redo state, cursor/selection, and view position return; the app discloses where any unsaved recovery drafts are stored and how to remove them.
6. **AS-018** (F004-R16): Given a recovery draft and a picker-approved move of its document, when the user reselects the moved document, the complete acknowledged draft and history remain available at its new identity. Save or Discard removes only records owned by that draft, including its prior path; a newer unrelated recovery record remains intact. A failed migration leaves the old checkpoint and visible draft recoverable.
7. **AS-019** (F004-R17): Given retained Save safety copies, when the user views saved-data controls, resolved copies show count and size and can be explicitly cleared. Unresolved or unverified copies remain by default. If a new Save would exceed the 1 GiB safety-copy budget, it stops before changing the original, retains the draft, and offers a localized cleanup path.

### Edge Cases

- A heading can be nested, repeated, renamed, deleted, or inserted while editing. The editable source boundary remains the section selected when editing began; the app recalculates sections after a successful save or explicit exit from editing.
- The pre-heading region is a section. A heading-free document has one section. Empty sections can be opened and edited. A file with no editable source or unsupported encoding stays read-only with an explanation.
- Switching tabs does not save, discard, or transfer an edit. Each dirty tab retains its own draft and active section.
- A paused draft remains associated with its original section. Another section of the same document cannot be edited until that draft is saved or discarded.
- If the original section cannot be located after an external change or restart, the draft remains available for inspection and Save As; it is not inserted into a guessed section.
- On read-only, oversized, out-of-scope, missing, or inaccessible files, **Edit section** is unavailable or disabled with a reason. A source view and rendered task-list checkbox do not become direct whole-document editors.
- A recovery draft can outlive a clean restart but is not a substitute for Save. An unexpected termination before the next checkpoint completes may leave a newer visible change unrecovered; the app must identify the restored text as the latest completed checkpoint, not as a guaranteed exact copy.
- Markdown content, local links, images, metadata, and diagrams remain untrusted data while previewing; editing and recovery make no app-initiated network request.

## Requirements *(mandatory)*

### Functional Requirements

- **F004-R01**: In rendered reading mode, a context menu on a document section MUST offer **Edit section** for an editable Markdown file. The same action MUST be reachable by keyboard when that section is focused. Ordinary clicks and typing outside edit mode MUST NOT change the document.
- **F004-R02**: During editing, the selected section MUST be identified by a visible boundary and label. Other sections MUST remain readable and visibly distinct, with equivalent non-color-only and accessible feedback about the active edit target.
- **F004-R03**: The editor MUST expose the selected section's Markdown source and a live preview. Only source inside the selected section's original boundary MAY be changed through that edit session; other document content MUST remain read-only.
- **F004-R04**: A section MUST be a heading and all content until the next heading of any level. A smaller heading begins its own separately editable section; right-clicking within it MUST target that section. Content before the first heading MUST form a separate section; a document without headings MUST form one section. The edit boundary MUST remain fixed for that session even if heading syntax changes in the draft.
- **F004-R05**: Before the first edit is accepted, the user MUST be able to identify which source region will be editable. An empty, pre-heading, or sole section MUST have an unambiguous visible boundary.
- **F004-R06**: An active section edit MUST support Undo, Redo, Save, Save As, and Discard. A dirty indicator MUST appear while draft content differs from the last saved source. Saving MUST be explicit; there is no automatic write to the original file.
- **F004-R07**: A successful Save MUST change only the selected section's source in the original file and preserve all bytes outside that source region, supported UTF-8/BOM form, and existing line-ending convention. A failed Save MUST leave the original intact and the draft editable. Save As MUST require an explicit destination and create a whole-document copy with the edited section while leaving the original unchanged. If the original changed during editing, the copy MUST use the document version on which the current draft is based plus that draft, without silently merging external changes. Save As MUST NOT silently replace an existing different file.
- **F004-R08**: Returning from a dirty editor to reading, closing its tab, closing the window, and quitting the app MUST ask the user to choose Save, Keep draft, Discard, or Cancel before the action completes. Keep draft MUST preserve the edit for restoration; Discard MUST remove the draft without changing the original; Cancel MUST keep the editor open. Exact restoration of an unsaved edit after normal quit applies when Keep draft was chosen. Requests to edit a different section follow F004-R15.
- **F004-R09**: Before every Save to the original, the app MUST check whether the disk file changed since the edit began or last successful Save and recheck immediately before committing a staged write. A change detected before commit MUST stop the save and offer inspect disk version, keep editing, Save As, or explicit reload/discard without replacing either version. It MUST NOT default to overwriting or silently merge changes. The save path MUST retain a recoverable copy of the pre-save original and disclose the residual race if an uncooperative writer changes the file between the final check and replacement. Any post-commit mismatch the app detects MUST be reported; the app MUST keep the draft, staged output, and any captured disk versions, and say when an intervening version could not be captured. It MUST NOT claim an absolute cross-process guarantee.
- **F004-R10**: Unsupported encoding, denied writes, removed files, and other save failures MUST produce a specific recoverable state. Unsupported encodings, over-limit files, and files outside granted scope MUST remain read-only.
- **F004-R11**: Context-menu action, section focus, editor controls, and conflict/recovery choices MUST work with keyboard and assistive technology in English and Spanish. A visually dimmed inactive region MUST remain legible and navigable.
- **F004-R12**: After a normal app close while a clean section editor is active, or after choosing Keep draft for a dirty editor, reopening MUST restore workspace, tab order, active tab, panel layout, active section, edit mode, text, undo/redo state, cursor/selection, and document/editor scroll positions as they were at close. Unsaved text MUST leave the original file unchanged until an explicit Save.
- **F004-R13**: Recovery drafts MUST be held in local per-user app data separately from the opened repository. While the app is running, a recovery checkpoint for each accepted edit MUST complete within one second, and the app MUST indicate when it completes. After unexpected termination, the app MUST offer the latest completed checkpoint and identify it as unsaved. If disk content or section boundary changed, the app MUST show a conflict and retain the draft without automatic overwrite or guessed placement.
- **F004-R14**: The app MUST disclose that drafts are stored locally, allow the user to discard individual drafts and clear session drafts, and remove a draft after a successful Save or explicit Discard. Recovery MUST never write to the source file merely because the app reopened.
- **F004-R15**: A document MUST have at most one pending unsaved section draft. Keep draft MAY pause it for reading or navigation; selecting another section for editing while it exists MUST offer Resume, Save, Discard, or Cancel for that draft before opening a new editor. A second draft for that document MUST NOT be created until the first is saved or discarded.
- **F004-R16**: A picker-approved moved-path reselection MUST retain the acknowledged draft, editor history, selection, scroll, and sequence through a durable recovery-record migration before the new location is reported protected. Save or Discard MUST remove only records owned by that draft, including older path keys, without deleting another session's newer record. Migration failure MUST preserve the prior recoverable checkpoint and visible draft; it MUST NOT falsely acknowledge protection or complete Keep draft/close.
- **F004-R17**: Retained Save safety copies MUST remain in private per-user app data until their race/conflict is resolved and the user explicitly clears resolved copies. The app MUST show count/size and a confirmation that distinguishes drafts from safety copies; unresolved or unverified copies MUST be preserved by default. Safety-copy storage MUST be limited to 1 GiB: a Save that would exceed the limit MUST stop before changing the original, preserve the draft, and offer a localized cleanup action. Clearing copies MUST NOT delete repository documents.

### Key Entities

- **Section**: A non-overlapping source region identified by its heading or pre-heading position and original source boundary.
- **Edit session**: The selected document and section, original file state, source draft, dirty state, cursor/selection, and view position.
- **Recovery draft**: Locally retained unsaved edit session information associated with one section of a document, separate from that document on disk; at most one pending draft exists per document.
- **Recovery owner**: The app-issued identity tying one draft to its current and migrated storage records without granting the renderer authority to delete another draft.
- **Safety copy**: A private retained pre-save or staged version used to inspect and recover from a Save race, with resolved or unresolved status.
- **Disk conflict**: A mismatch between the document version used to start or last save an edit and the current disk version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a task test with at least five sections, at least 9 of 10 participants can enter an edit for the intended section, identify its boundary, and save a change without editing another section on their first attempt.
- **SC-002**: Across 20 disposable-file edits covering first, middle, last, empty, pre-heading, and heading-free sections, 20 of 20 saves leave every byte outside the selected original source region unchanged.
- **SC-003**: In 10 normal close and reopen trials with Keep draft, 10 of 10 restore the exact unsaved text, undo/redo state, active section, edit mode, cursor/selection, scroll positions, tab, panel layout, and workspace while the original file content remains unchanged.
- **SC-004**: In 10 induced external-change and 10 save-failure trials, zero detected pre-commit conflicts replace the external version, zero trials lose the unsaved draft, and any observed post-commit race is reported with the draft, staged output, and captured disk versions retained; if an intervening version could not be captured, the app says so.
- **SC-005**: In 10 abrupt-termination trials performed after the recovery indicator confirms a checkpoint, 10 of 10 offer the checkpointed draft on reopen without changing the original file.
- **SC-006**: In both English and Spanish, a keyboard-only user can enter, edit, save, retain, restore, and discard a section draft without a mouse; all essential controls and active-section feedback remain perceivable with assistive technology.
- **SC-007**: Across 100 accepted edits to disposable documents while the app remains running, 100 of 100 have a completed, visibly indicated recovery checkpoint within one second of the edit.
- **SC-008**: Across 10 disposable moved-path reselection sequences, including repeated moves and competing records, 10 of 10 preserve the acknowledged draft and remove only owner-matching records after Save/Discard; injected migration failure leaves an accessible prior checkpoint.
- **SC-009**: In 10 disposable safety-copy lifecycle and quota trials, unresolved copies are never silently cleared, resolved copies can be cleared with explicit confirmation, an over-budget Save changes no source bytes, and no repository file is deleted by saved-data cleanup.

## Assumptions

- This is the F004 safe-editing slice in `docs/roadmap.md`, with the user's section-only interaction replacing the product brief's proposed general source/split editor. A whole-document source view may exist for reading, but it is not a direct whole-document editor in this feature.
- The F003 workspace-continuity slice supplies workspace, tab, and scroll restoration; F004 extends that state with section edit and draft recovery. If F003 is incomplete when F004 is planned, its relevant prerequisites must be included explicitly in the plan and tasks.
- **Keep draft** is the normal-close choice that satisfies exact restoration. A user who chooses Discard intentionally gives up that restoration. Unexpected termination restores the latest completed recovery checkpoint, so it may omit input from the period before the one-second checkpoint completes.
- The detailed visual treatment of inactive sections, editor placement, and recovery feedback belongs in `design.md` and requires user approval. This spec requires a clear boundary, readable surroundings, and accessible alternatives; blur is optional.
- Only `.md` and `.markdown` files within an explicitly granted file or folder scope and within the normal editable size limit are editable. The existing 10 MiB rich-document limit is the provisional ceiling; large-file source mode remains read-only.
- Editing remains local. The existing exclusions for WYSIWYG, collaboration, AI, Git operations, and general source-code editing continue to apply.
