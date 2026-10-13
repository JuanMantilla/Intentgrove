# Feature Specification: Restore Workspace Session

**Feature directory**: `specs/004-restore-workspace-session`  
**Created**: 2026-09-25  
**Status**: Draft for user approval  
**Input**: User request to reopen the same folder, files, and exact positions after closing and reopening the app; session-continuity goals in `docs/product-brief.md`

## Clarifications

### Session 2026-09-25

- Q: If you open a different folder while a section edit is unsaved, what should happen? → A: Offer Save, Keep draft, Discard, or Cancel. Keep draft retains the edit for later recovery, then opens the new folder.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Resume the workspace where it was left (Priority: P1)

A developer opens a folder such as `personal`, opens several Markdown documents, navigates among them, closes the app, and later returns to the same workspace and reading positions without selecting the folder again.

**Why this priority**: Resuming work without reconstructing the folder, tabs, and positions is the user's requested outcome.

**Independent Test**: With a disposable folder, open multiple documents at different scroll positions, arrange tabs and panels, quit normally, reopen, and compare the restored state with the state recorded at quit.

**Acceptance Scenarios**:

1. **AS-001** (F003C-R01–R03): Given an open folder with three Markdown tabs in a chosen order, when the user quits and reopens the app, that folder and the same three tabs return in the same order with the same active tab; the user is not asked to select the folder again while access remains available.
2. **AS-002** (F003C-R03, R04): Given distinct scroll positions in three tabs and a scrolled, expanded folder tree, when the app reopens with unchanged files and the same display settings, each tab returns to its previous passage and the tree returns to the same expanded nodes, selection, and scroll position.
3. **AS-003** (F003C-R03, R04): Given an adjusted window, panel layout, and reading settings, when the app reopens on the same display configuration, the window size and position, panel visibility and widths, active document, and reading viewport return as they were at normal quit.
4. **AS-004** (F003C-R05): Given a tab intentionally closed before quitting or a different folder opened in its place, when the app reopens, only the tabs and folder present at quit are restored.
5. **AS-013** (F003C-R09): Given a saved 25,000-entry folder and several tabs, when the app reopens, the active document becomes usable before inactive tabs and unvisited folders finish loading; choosing a new folder cancels the remaining restoration work.
6. **AS-015** (F003C-R14): Given the last workspace window is closed while the macOS app remains running, when the user reopens its window, the same folder, tabs, and positions return, subject to the same dirty-edit choice as app quit.
7. **AS-016** (F003C-R02, R05, R06): Given an unsaved section edit in the current folder, when the user opens a different folder, the app offers Save, Keep draft, Discard, or Cancel before replacing the current folder and its tabs. Cancel leaves the current workspace and editor intact. Keep draft opens the new folder while retaining the edit locally for recovery when its original document is reopened; it does not write to the source file.
8. **AS-017** (F003C-R06): Given several unsaved section edits in the current folder, when the user attempts to open a different folder, each edit receives a close choice. If the user cancels one choice or a Save fails, the app stays in the current folder and preserves every unresolved draft.

---

### User Story 2 — Recover when saved paths or content changed (Priority: P1)

The developer can still open the app when a remembered folder or document has moved, become unreadable, or changed while the app was closed. Other available tabs remain usable.

**Why this priority**: Session restoration must not trap the user in a broken startup or silently open a different file.

**Independent Test**: Save a session in a disposable folder, then move or modify selected fixture files before relaunch and verify the recovery choices and unaffected tabs.

**Acceptance Scenarios**:

1. **AS-005** (F003C-R07, R08): Given the remembered folder is missing or access is unavailable at launch, when the app opens, it shows the saved folder identity and a recoverable action to select that folder or choose another; it does not silently grant access to a different path.
2. **AS-006** (F003C-R07, R08): Given one saved tab points to a missing, moved, or unreadable file, when the session restores, that tab shows a specific recoverable state while available tabs remain usable.
3. **AS-007** (F003C-R04, R07): Given a clean document changed while the app was closed, when it reopens, the app shows the current disk content and returns to the same heading or nearby passage if it still exists; otherwise it uses the nearest valid position and explains why an exact position was unavailable. A tab with an F004 draft follows F004's conflict behavior.
4. **AS-008** (F003C-R06): Given a dirty section edit at quit, when the user chooses Cancel, the app remains open; when the user chooses Keep draft, the workspace restoration retains that tab and F004 restores its draft without writing it to the source file.
5. **AS-014** (F003C-R13): Given a completed session checkpoint, when the app terminates unexpectedly and reopens, it offers that checkpointed folder, tabs, and positions, identifies that newer actions may be absent, and leaves source files unchanged.

---

### User Story 3 — Control local session data (Priority: P2)

The developer can start fresh, remove remembered workspace state, and trust that restoring a reading session does not modify repository files or require network access.

**Why this priority**: A private local workspace should make its remembered state visible and controllable.

**Independent Test**: Inspect file hashes in a disposable folder, restore and clear a session and verify that only the app's local session state changes.

**Acceptance Scenarios**:

1. **AS-009** (F003C-R10, R11): Given a saved session, when the user chooses Clear session, the remembered folder, tabs, and positions are removed; the next launch shows the normal no-folder start state without deleting repository files.
2. **AS-010** (F003C-R10, R12): Given a saved local workspace, when the app reopens, it restores available folder and tab state without an app-initiated network request or any change to fixture document hashes.
3. **AS-011** (F003C-R02, R11): Given no prior session, when the app starts, it shows a clear action to open a folder or file and does not fabricate a restored workspace.
4. **AS-012** (F003C-R06, R11): Given a remembered workspace with an unsaved F004 draft, when the user chooses Clear session, the app discloses that the draft will also be removed and requires explicit confirmation; Cancel preserves both the session and draft.

### Edge Cases

- A folder may be renamed, removed, denied, or replaced by a different item at the same path. The app must not treat a path string alone as proof that the original selection is still available or authorized.
- A file can be deleted, renamed, externally edited, changed to an unsupported encoding, or moved outside the granted folder while the app is closed. One failed tab must not prevent other tabs from restoring.
- A saved document may contain a heading anchor that was renamed or removed. Its scroll restoration falls back to the nearest valid reading position and clearly indicates that the original position could not be reproduced.
- A window may reopen on a smaller or different display. Its position and size are adjusted to remain fully reachable, while tab, folder, and document state remain intact.
- Restoring many tabs or a 25,000-entry folder must not wait for every inactive document or tree entry to load before the active reading view becomes usable. Work no longer needed after a new folder selection can be cancelled.
- An explicitly selected file outside the saved root remains a file-only grant. A symlink, alias, or moved path must not expand access to a parent folder or another root.
- A clean normal quit can restore exact state; an unexpected termination may restore the latest completed session checkpoint. Unsaved source edits follow F004 draft recovery rather than being stored as ordinary reading-session data.
- If a folder switch involves multiple dirty tabs, each edit must receive a close choice. The new folder opens only after all choices complete; a cancelled choice or failed Save leaves the prior workspace and remaining drafts available.

## Requirements *(mandatory)*

### Functional Requirements

- **F003C-R01**: After a normal app quit, the next launch MUST automatically reopen the last active user-selected folder when it still exists and access remains valid. The user MUST NOT need to select it again solely because the app was closed.
- **F003C-R02**: With no restorable session, the app MUST show its normal start state with clear actions to select a folder or individual file. A successful new folder selection MUST replace the previous active root and its tabs for that window, subject to F003C-R06 for unsaved edits.
- **F003C-R03**: A normal quit MUST preserve and restore the open document identities, tab order, active tab, window size and position where valid, panel visibility and widths, and the selected reading settings. Tabs intentionally closed before quit MUST remain closed.
- **F003C-R04**: A normal quit MUST preserve and restore each open document's reading position independently, plus folder-tree expanded nodes, selected item, and tree scroll position. With unchanged content and display conditions, the same top visible passage MUST return within 8 px of its prior viewport position. A changed document or display may use the nearest valid position as described in F003C-R07.
- **F003C-R05**: The restored session MUST reflect the most recent completed user actions before normal quit, including a completed change of active folder, closing a tab, reordering tabs, changing the active tab, scrolling, and changing panel layout. The app MUST finish recording this state before completing a normal quit.
- **F003C-R06**: Session restoration MUST respect F004's dirty-edit close choices. On quit or last-window close, Cancel MUST prevent closing; Keep draft MUST retain the tab and hand draft restoration to F004 without writing to the original file. Before switching folders, each dirty edit MUST offer Save, Keep draft, Discard, or Cancel. Cancel or a failed Save MUST prevent the switch without losing the prior workspace or any unresolved draft. Keep draft MUST retain the edit in local recovery data while the old folder and tabs close; reopening the original document MUST make that draft recoverable under F004's conflict rules. Save and Discard MUST have the effects defined by F004 before the final session state is recorded.
- **F003C-R07**: If a remembered folder or file is missing, changed, unsupported, or inaccessible, the app MUST show a specific recoverable state without silently substituting another path, discarding unaffected tabs, or presenting stale content as current. Clean changed documents MUST show current disk content and restore the nearest identifiable reading position with an explanation when exact restoration is impossible. A changed file with an F004 draft MUST follow F004's disk-conflict behavior.
- **F003C-R08**: A restored folder or file MUST retain only the access originally granted by explicit selection. If that access is unavailable at launch, the app MUST request explicit reselection. A path change, symlink, or alias MUST NOT broaden filesystem scope automatically.
- **F003C-R09**: Session restoration MUST load the active document first and defer inactive tabs and unvisited folder branches so a large saved workspace remains responsive. The user MUST be able to cancel restoration by choosing a new folder without waiting for all saved content to load.
- **F003C-R10**: Session state MUST be kept in local per-user app data, not inside the selected folder. Restoring or clearing it MUST NOT change source documents, create files in the repository, or make app-initiated network requests.
- **F003C-R11**: The app MUST disclose that it remembers the last workspace and provide a Clear session action that removes remembered folder, tabs, and positions for the next launch without deleting the user's files. If F004 recovery drafts exist, Clear session MUST disclose that they will also be removed and require explicit confirmation; Cancel MUST preserve both session and drafts. Start, recovery, and clear actions MUST work by keyboard in English and Spanish.
- **F003C-R12**: Restoration MUST work in the packaged macOS app without development tools. A failed restoration of one item MUST leave the app and remaining available tabs usable.
- **F003C-R13**: During normal operation, session changes MUST be checkpointed within two seconds. After unexpected termination, the app MUST offer the latest completed session checkpoint, identify that it may differ from the exact state at termination, and never overwrite source files while restoring it.
- **F003C-R14**: Closing the last workspace window and reopening a window while the macOS app remains running MUST restore the same folder, tabs, and positions, subject to F004's dirty-edit close choices. Native Dock reopen integration is completed with F005 delivery work.

### Key Entities

- **Workspace session**: The last explicitly selected root folder, open tab list and order, active tab, window and panel layout, reading settings, and timestamp of the last completed state.
- **Tab state**: A document identity and allowed access scope, its reading position, and any recoverable error; source edit drafts are managed separately by F004.
- **Folder-tree state**: Expanded folder identities, selected item, and tree scroll position within the saved root.
- **Session checkpoint**: A completed locally retained snapshot of navigation and layout state used after an unexpected termination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 10 normal quit and reopen trials using disposable folders with at least three tabs, 10 of 10 restore the same root, tab order, active tab, panel layout, and tree state without asking for the folder again when access remains available.
- **SC-002**: In those 10 trials with unchanged documents and the same display settings, every open tab returns to the same top visible passage within 8 px of its position at quit; the active tab and window bounds match the recorded state where the display permits.
- **SC-003**: In 10 missing or changed path trials, 10 of 10 show a specific recovery state, leave available tabs usable, and do not silently open a replacement item.
- **SC-004**: In 10 packaged-app restoration trials, all fixture document hashes remain unchanged, no app-owned file appears in fixture roots, and zero app-initiated network requests are observed.
- **SC-005**: With a saved 25,000-entry fixture folder and multiple tabs on a recorded reference Mac, the window becomes interactive within 2 seconds in at least 9 of 10 warm launches; inactive tabs do not block the active document from becoming usable.
- **SC-006**: In 10 unexpected-termination trials conducted after session checkpoints complete, 10 of 10 offer the latest completed workspace state without changing source files. Across 100 navigation or layout changes during normal operation, 100 of 100 checkpoint within two seconds.
- **SC-007**: The restore, missing-item recovery, Clear session, and new-folder journeys are keyboard operable in both English and Spanish, with understandable focus and status feedback.

## Assumptions

- This is the session-restoration part of the F003 workspace-continuity outcome in `docs/roadmap.md`. Document and folder search, recents, automatic external refresh, and large-file mode remain separate work.
- The first release restores one active root per window and the tabs present at quit, including individually selected files outside that root only when their file-only access remains valid. Multi-root and multiwindow restoration are outside this slice.
- On macOS, closing the last window may leave the app process running. Reopening that window restores its session; the native Dock entry point for doing so belongs to F005.
- “Exact position” applies to normal quit with unchanged files, window dimensions, typography, and display. If content or displays changed while the app was closed, the app preserves the user's place as closely as it can and explains a fallback.
- F001 supplies folder browsing and per-tab scroll state within a running session. F004 separately specifies restoration of active edit mode, cursor/selection, undo/redo history, and unsaved drafts; this feature provides the shared folder, tab, layout, and reading-position state that F004 extends.
- The two-second unexpected-termination checkpoint is a proposed default. A normal quit records the final state before exit and is expected to restore it exactly. The user's original documents are never used as session storage.
- The visual treatment of restoring, loading, and unavailable states belongs in a separately reviewed design. The draft constitution's UI amendment is not an approval of that design.


## Authorized HTML native reconciliation — 2026-10-08

**F003C-H01**: HTML uses the existing schema1 native selection/identity restore. Optional anchor htmlZoom (0.5–3) and htmlScrollLeft preserve viewer state, restored kind identifies HTML, and HTML edit/recovery state is refused. Reopen through open_local_view, mount, then set_html_location; never restore document forms or replay resource grants.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.


## Authorized Workspace layouts extension — 2026-10-08

F003C-L01: Settings offers accepted Margin/Folio/Atlas, default Margin for new/legacy profiles, explicit choice preserved across restart. F003C-L02: Switching is immediate presentation state through existing owner/checkpoint/ack, preserving tabs/document/position/selection/edit/history/drafts/recovery/search/grants and never saving/discarding/reloading/rewriting a document. F003C-L03: failures retain applied state and expose existing Retry; supported snapshots always advertise workspaceLayout; Settings gains no document/session authority. Current user explicitly authorizes the minimal native contract/storage extension. CRLF Save remains DEFERRED; direct rendered section editing remains authoritative. Scoped evidence: ../../os-engineering/evidence/workspace-layout-native-20261008/report.md. Historical acceptance records unchanged.
