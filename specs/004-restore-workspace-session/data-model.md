# F003C session data model — proposal

The session record contains navigation and layout state only. It does not store
Markdown source, F004 draft text/history, full repository inventories or renderer
IPC grants. Native storage is a checksum-protected schema-1 envelope under
per-user app data, capped at 2 MiB. Proposed caps: 100 tabs, 1,024 expanded
directory paths and 4,096 UTF-8 bytes per individual saved path; over-limit
changes keep the prior valid checkpoint and show a local persistence warning.

## Entities

| Entity | Fields | Validation/meaning |
|---|---|---|
| Session envelope | schema, checksum, sequence, completedAt, exitDisposition (`running`/`normal`), workspace | Checksum covers canonical payload bytes; sequence strictly increases. Unknown schema or invalid checksum uses prior valid record or a recoverable start state. |
| Selected root | native-recorded absolute path, device/inode identity, display name | Created only from an explicit native folder selection; path reopens with no-follow checks and the same identity before fresh root grant issuance. |
| Explicit file selection | native-recorded absolute path, device/inode identity, display name | File-only scope; never grants its parent. A replaced or unavailable item requires reselection. |
| Tab descriptor | selection kind, root-relative components or explicit-selection reference, order, active flag, saved disk version, reading anchor, error state | Native revalidates each component and returns a new opaque ID; no source bytes or arbitrary renderer path authority. At most one active flag. |
| Reading anchor | heading ID, offset below heading, fallback scrollTop, viewport width/height, content version | Same content/display restores exact passage; changed content/display tries heading then nearest position with a visible fallback notice. Numeric fields finite and bounded. |
| Tree state | expanded root-relative component arrays, selected item, scrollTop | Components validated against the same root; restore only visited branches, with loading deferred. |
| Window and panel state | physical outer bounds, display scale/identifier hint, sidebar visibility/width, selected reading settings | Clamp bounds to current monitor work area; finite sizes and permitted ranges. F002A appearance preference stays in its own record. |

## State transitions

`none → running` after an explicit selection or accepted restore.
User navigation/layout changes advance the sequence and schedule a durable
checkpoint within two seconds. Normal Quit/last-window Close first resolves F004
dirty-edit choices, then writes the final `normal` record and allows exit/close.
Unexpected termination leaves the last completed `running` record; next launch
offers it with a timestamp. Clear session after explicit confirmation removes the
session record and, when applicable, F004 draft records, then returns to `none`.
An invalid or missing grant changes only that selection to a recoverable state;
other valid tabs continue. Choosing a new folder invalidates the restore
generation and cancels deferred loads before committing replacement state.

## Invariants

- Record paths are native-derived from prior explicit selections. Renderer state
  can update order, visibility and numeric positions but cannot create access.
- The active document loads before inactive tabs; a failed tab cannot block the
  rest of the session.
- Source document hashes and fixture inventories remain unchanged by restore,
  checkpoint and Clear session.
- A completed normal-exit acknowledgment follows file and directory sync, not
  merely a scheduled write. An error holds the close and explains the failure.
- F004 recovery remains authoritative for draft text/selection/history. Clearing
  the session does not silently clear retained Save safety copies; SEC-02 owns
  their policy.
