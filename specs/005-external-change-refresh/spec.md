# Feature Specification: Refresh External Changes

**Feature directory**: `specs/005-external-change-refresh`  
**Created**: 2026-09-25  
**Status**: Draft for user approval  
**Input**: User request for opened folders and files to update after changes in other apps, right-click Reload for a folder or file, and a choice between versions when an edit conflicts

## Clarifications

### Session 2026-09-25

- Q: If another app changes a file while you have an unsaved edit, should Keep my edit let you replace the disk file with your version? → A: No. Keep the local draft and offer Save a copy to preserve it separately; do not replace the changed disk file.

### Session 2026-09-26

- Q: If the selected root folder is deleted or replaced at the same path while the app is open, should you have to select it again before the app reads files there? → A: Yes. Keep open tabs and unsaved drafts, but require explicit reselection before reading the replacement root.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — See external changes while reading (Priority: P1)

A developer reads Markdown while another app changes a file or adds, removes, or renames items in the selected folder. The reader updates the affected clean document and folder tree without making the developer reopen them.

**Why this priority**: Automatic refresh is the user's primary request, and stale content can lead to decisions based on an old version.

**Independent Test**: Open a disposable folder and clean Markdown tabs, change their files and directory entries from a separate process, and compare the displayed content and tree with the settled disk state.

**Acceptance Scenarios**:

1. **AS-001** (F003D-R01, R04): Given a clean open Markdown tab, when another app completes a change to its file, the tab displays the new disk content automatically, including when it was inactive; the app does not write to the file.
2. **AS-002** (F003D-R02): Given a selected folder with expanded subfolders, when another app adds, removes, or renames a Markdown file or subfolder, the visible tree reflects the new disk state without losing unaffected expansion, selection, or scroll state.
3. **AS-003** (F003D-R05, R09): Given an external app that atomically replaces a file inside the selected root or writes it in stages, when the change settles, the reader validates it within the granted root and shows a complete new version or a recoverable error; it never presents an incomplete intermediate version as current.
4. **AS-004** (F003D-R04, R09): Given an open clean document with a saved reading position, when it changes externally, the app returns to the same heading or nearby passage if possible; if not, it chooses a valid position and explains the shift.

---

### User Story 2 — Reload a selected item on demand (Priority: P1)

The developer right-clicks a file or folder and chooses **Reload** to check the latest disk state immediately, without reopening the workspace. A folder reload covers that folder's descendants and affected open tabs.

**Why this priority**: A direct action is needed when the developer wants to verify freshness or suspects an external change was missed.

**Independent Test**: Modify disposable files and folders outside the app, invoke **Reload** on a file and on a folder, and verify the affected scope, feedback, and unchanged source-file hashes.

**Acceptance Scenarios**:

1. **AS-005** (F003D-R03, R04): Given a file in the folder tree, or an individually selected file outside the root in a tab, when the user right-clicks it and chooses **Reload**, the app checks that file and updates its open clean tab if present; a closed file stays closed, and the action reports completion or a specific error.
2. **AS-006** (F003D-R03, R07, R13): Given a folder with changed descendants and open tabs, when the user right-clicks it and chooses **Reload**, the tree and clean tabs within that folder update; unrelated tabs remain unchanged and the user can continue reading while the check runs.
3. **AS-007** (F003D-R03, R12): Given keyboard focus on a folder or file, when the user opens its context menu using the keyboard, the same **Reload** action is available and its progress and outcome are perceivable without a mouse.
4. **AS-016** (F003D-R13): Given a long folder reload, when the user cancels it, the active document remains usable, already confirmed updates remain visible, and the app identifies which part of the folder has not yet been checked.

---

### User Story 3 — Choose safely when an edit conflicts (Priority: P1)

While a section edit is unsaved, another app changes the same file. The developer sees that both versions exist, can inspect them, and chooses whether to continue with the local draft or use the disk version. Reload never silently erases an edit.

**Why this priority**: External refresh must preserve user work and avoid overwriting someone else's changes.

**Independent Test**: Edit a section of a disposable Markdown file, change that file externally, trigger both automatic and manual refresh, and exercise every conflict choice while comparing the draft and disk bytes.

**Acceptance Scenarios**:

1. **AS-008** (F003D-R06, R08): Given an unsaved section edit, when the disk file changes, automatic refresh leaves the draft and editor intact and presents a persistent conflict message with access to both versions and explicit choices; the disk file is not overwritten.
2. **AS-009** (F003D-R06): Given that conflict, when the user chooses **Keep my edit**, the draft remains editable and the disk version remains available for inspection; the conflict flow does not offer to replace the changed disk file, Save to the original remains blocked by F004's conflict check, and **Save a copy** can preserve the draft separately.
3. **AS-010** (F003D-R06): Given that conflict, when the user chooses **Use disk version**, the app confirms that the local draft will be discarded; only after confirmation does it replace the editor's content with the current disk version. Cancel retains the draft.
4. **AS-011** (F003D-R06, R07): Given dirty tabs inside a folder, when that folder is manually reloaded, clean tabs and the tree update while each changed dirty document receives its own conflict state; one conflict does not block unrelated updates.
5. **AS-012** (F003D-R08): Given a conflict awaiting a decision, when the disk file changes again, the app updates the inspectable disk version and rechecks it before any explicit Save or Use disk version action; it does not apply a choice to an older version silently.

---

### User Story 4 — Recover from unavailable content (Priority: P2)

The developer receives a clear, recoverable state if an external action removes a file, changes its format, or makes it unreadable. Other documents stay usable.

**Why this priority**: File updates happen outside the app's control and must not trap the workspace or hide an unsaved draft.

**Independent Test**: Delete, replace, and deny access to disposable fixture files during an open session; then restore access and invoke Reload.

**Acceptance Scenarios**:

1. **AS-013** (F003D-R09): Given a clean open file that becomes missing, unreadable, unsupported, or outside the granted scope, when refresh detects it, its tab shows the specific unavailable state and a safe retry or reselection action; other tabs remain usable.
2. **AS-014** (F003D-R06, R09): Given a dirty edit whose disk file becomes unavailable, when refresh runs, the app retains the draft, explains the disk state, and offers F004's safe recovery actions without guessing a replacement file.
3. **AS-015** (F003D-R10): Given an external change while the app is in the background or a change it did not observe at the time, when the workspace becomes active again, the app checks the affected open folder and files and presents their current state or a visible refresh failure.
4. **AS-017** (F003D-R11, R12): Given an out-of-scope symlink in the selected folder and an app with Reduce Motion enabled, when refresh runs, it neither reads outside the granted scope nor requests network data; English and Spanish status messages remain understandable without animation.
5. **AS-018** (F003D-R09): Given an individually selected file outside the root that is replaced at the same path, when refresh detects the replacement, its tab requests explicit reselection and does not read the new file using the old file-only grant.
6. **AS-019** (F003D-R09): Given a selected root folder that is deleted or replaced at the same path, when refresh detects the change, the workspace retains its open tabs and unsaved drafts, shows the root as unavailable, and requires explicit reselection before reading any replacement root or its descendants.

### Edge Cases

- An external writer may save in stages, replace a file atomically, change it repeatedly, or change it again while the user is inspecting a conflict. Refresh must use a complete current version and recheck before a choice that changes an edit or writes to disk.
- A path can disappear and be replaced by a different item with the same name. A selected root authorizes a fresh, validated read of an in-scope replacement; an individual file grant does not authorize a replacement at the same path. Path equality alone is never proof of file identity.
- If the selected root itself disappears or is replaced, its old grant cannot authorize the new root; open tabs and drafts remain available while the user reselects a folder.
- A removed folder can contain the active tab or expanded descendants. The app preserves any unsaved draft and shows unavailable states rather than silently closing those tabs.
- A file may cross the supported size or encoding boundary after an external change. The new state follows the existing read-only or unavailable-file behavior; a dirty draft stays recoverable.
- A symlink or alias introduced inside a watched folder does not grant access outside the user's explicit selection.
- A folder may contain 25,000 visible entries. Automatic or manual checks must not freeze the active document; progress and cancellation apply to long manual folder reloads.
- If no disk change is found, Reload reports that the item is current. Repeated change notices for one settled version should not repeatedly interrupt the user.

## Requirements *(mandatory)*

### Functional Requirements

- **F003D-R01**: While a user-selected folder or file is open, the app MUST detect settled changes made by other apps to in-scope Markdown files and refresh every affected clean open tab automatically, including inactive tabs, without writing to source files.
- **F003D-R02**: The selected folder tree MUST automatically reflect in-scope additions, removals, and renames of files and folders. Unaffected expansion, selection, and tree scroll state MUST remain in place where those items still exist. Removed open tabs MUST show an unavailable state instead of silently closing.
- **F003D-R03**: The folder-tree context menu for each in-scope file and folder MUST offer **Reload**, also reachable by keyboard. The tab context menu for an individually selected file outside the root MUST offer the same file action. Reload on a file checks only that file and updates its open tab if any. Reload on a folder checks its descendant tree and affected open tabs; it MUST NOT open closed files or reload unrelated tabs.
- **F003D-R04**: A clean document refresh MUST show the latest complete readable disk content. It MUST preserve the reading position by heading or nearby passage where possible and explain a fallback when content movement prevents exact restoration. Reload MUST report whether the item changed, is current, or failed.
- **F003D-R05**: Automatic and manual refresh MUST avoid presenting a transient partial write as the current document. When a stable readable version cannot yet be obtained, the app MUST retain a recoverable loading or error state and try again when the item settles or the user reloads it.
- **F003D-R06**: If an open document has an unsaved F004 section draft and its disk version changes, automatic or manual refresh MUST keep the draft unchanged and show a persistent conflict message. The user MUST be able to inspect both versions and choose **Keep my edit**, **Use disk version**, or **Save a copy**. **Keep my edit** retains the draft; the conflict flow MUST NOT offer to replace the changed disk file, and Save to the original MUST remain blocked by F004's conflict check. **Use disk version** MUST explicitly confirm draft discard and allow Cancel; **Save a copy** follows F004 Save As.
- **F003D-R07**: A folder reload MUST handle each changed dirty document separately while continuing to update clean files and the tree. One conflict or unreadable item MUST NOT prevent unrelated items from refreshing.
- **F003D-R08**: Conflict choices MUST apply to the latest confirmed disk version. If the disk changes again before a choice completes, the app MUST update the conflict and require a fresh decision. Neither refresh nor a conflict choice MUST merge or overwrite a changed disk version.
- **F003D-R09**: Missing, unreadable, unsupported, or out-of-scope items MUST show a specific recoverable state without silently substituting another item, discarding a draft, or treating stale content as current. A replacement inside the selected root MAY refresh only after a fresh scoped open and validation. If the selected root itself is deleted or replaced at the same path, the app MUST retain open tabs and unsaved drafts, mark the root unavailable, and require explicit reselection before reading the replacement root or its descendants. A replacement of an individually selected file MUST also require explicit reselection before its content is read. Recovery MUST respect the original granted access.
- **F003D-R10**: Changes made while the app is in the background or temporarily unable to observe an item MUST be checked when the workspace becomes active again. If automatic checking fails, the app MUST disclose that freshness is uncertain and offer Reload rather than silently presenting stale content as current.
- **F003D-R11**: Refresh MUST access only folders and files the user explicitly granted, MUST NOT follow symlinks or aliases into new scope, and MUST make no app-initiated network request. Refresh itself MUST NOT edit, create, or delete source files.
- **F003D-R12**: Reload, status messages, and conflict decisions MUST work with keyboard and assistive technology in English and Spanish. A clean, simple status treatment and any subtle animation MUST preserve focus, avoid blocking reading, and respect Reduce Motion; motion MUST NOT be the only indication of change.
- **F003D-R13**: A large folder reload MUST show progress, allow cancellation, and keep the active document usable. Cancelling MUST leave already confirmed updates intact and retain a visible indication that the remaining scope has not yet been checked.

### Key Entities

- **Selected scope**: The user-granted root folder or individual file, including its identity and access boundary.
- **Disk version**: The latest complete, readable state of a selected file, distinguished from older and transient states.
- **Open document state**: The displayed disk version, reading position, and whether an F004 section draft exists.
- **Refresh state**: The checked item or subtree, progress, last confirmed result, and any unavailable or freshness-uncertain status.
- **Conflict**: A changed disk version paired with an unsaved F004 draft for the same document; the versions remain distinct until an explicit user choice.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 20 external-save trials on clean open documents of up to 1 MiB, including atomic replacement and an inactive tab, at least 19 display the complete new version within two seconds after the writer finishes; all 20 display it or a specific error within five seconds. No trial displays an intermediate partial version as current.
- **SC-002**: In 10 add, remove, and rename trials in a disposable folder of up to 25,000 entries, at least 9 reflect the settled change in the visible tree within five seconds while the active document remains usable; unchanged tree expansion, selection, and scroll state remain intact in all 10.
- **SC-003**: In 10 file Reload and 10 folder Reload trials, every action checks only its specified scope, reports changed/current/error, and changes no fixture source-file hash. Keyboard-only users can complete both actions in English and Spanish.
- **SC-004**: In 20 dirty-edit conflict trials spanning automatic refresh, file Reload, and folder Reload, zero trials lose a draft, overwrite an external version, or permit an unconfirmed discard. Every trial presents access to both versions and the three specified choices.
- **SC-005**: In 10 unavailable or replaced-path trials, including a replacement of the selected root itself, every affected tab shows a specific recoverable state, every unaffected tab remains usable, and no replacement item is opened without authorization.
- **SC-006**: In 10 packaged-macOS trials, automatic and manual refresh make zero app-initiated network requests. All fixture source files remain unchanged unless the user performs a separate explicit F004 save.
- **SC-007**: In a task test with 10 participants, at least 9 can identify which version is on disk and which is their unsaved edit, then choose to retain the edit or use the disk version without assistance.

## Assumptions

- This is the external-refresh part of F003 workspace continuity in `docs/roadmap.md`. F004 owns section drafts, Save, Save As, and save-time conflict checks; F003 session restoration owns state after restart. This feature adds live refresh and on-demand Reload while the app is open.
- The user confirmed that **Keep my edit** preserves the unsaved local draft without replacing the changed disk file. **Use disk version** explicitly discards that draft after confirmation. **Save a copy** preserves the draft in a separately selected whole-document file under F004. Conflict resolution does not offer an overwrite of the changed original.
- The refresh scope is the selected local folder and explicitly selected files. Remote or network-mounted workspaces and cloud-placeholder downloads remain outside the v1 guarantee; the app does not initiate a fetch.
- A file context menu is available from the folder tree. An individually selected file outside the root can use its tab's context menu for Reload without expanding the granted scope.
- The timing goals are proposed acceptance targets, not measured performance claims. Tests use disposable fixtures and record the host Mac, document shape, and external-writer behavior.
- The detailed visual form of change notices, conflict comparison, and progress belongs in a separately reviewed `design.md`. The draft constitution's UI amendment is not approval of that design.
