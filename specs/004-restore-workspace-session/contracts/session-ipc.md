# F003C native/session contract — proposal

All commands return typed `AppResult` errors and run only in the main window's
existing Tauri capability. The session record is stored by native code; its
paths and identities are never accepted as renderer-supplied authority. Document
content cannot invoke a path-based restore command.

| Command / event | Input | Output and rule |
|---|---|---|
| `load_workspace_session` | none | Native validates checksum/limits, reopens prior selected root/file scopes, and returns ordered bounded descriptors with **fresh** opaque IDs, an active-first hint, geometry and per-item recovery errors. It does not read every inactive document. A `running` checkpoint is offered for confirmation; a `normal` record may auto-restore. |
| `checkpoint_workspace_session` | expected sequence, tab/order/active IDs, anchors/tree/panel numeric state, restore generation | Native resolves each ID against current grants; it captures native window bounds and derives stored paths/identities. Reject unknown IDs, duplicate tabs, bad finite bounds, over-limit payload, stale sequence/generation. Durable completion returns sequence and timestamp. |
| `finish_workspace_session` | expected sequence, close intent | After all F004 choices have completed, native writes/syncs the final normal record. A failure leaves the window/app open with a specific warning. Only successful acknowledgment releases native close/quit. |
| `clear_workspace_session` | confirmed UI intent, include F004 drafts when present | Native removes the session and validated draft records from app data; source files and unresolved Save safety copies are excluded. Cancellation occurs in UI before IPC. Report partial cleanup errors; do not claim success if either required store remains. |
| `workspace_session_status` event | native-issued generation, sequence, status code | Renderer updates inline EN/ES status without exposing full stored paths or source text. Ignore stale generations. |

Native restoration is phased: validate envelope → rebuild root and explicit-file
grants from stored picker evidence → return descriptors → UI loads active file →
defer other tabs/tree branches. A new folder choice cancels outstanding work via
generation invalidation. Each background completion rechecks generation before
changing visible state. Existing F004 recovery command attaches draft state only
after the matching fresh file grant is confirmed; a changed file follows F004
conflict handling.

Stored path reauthorization is limited to this feature's current unsandboxed
macOS build. Native compares device/inode identity of previously selected root
and explicit files and refuses symlinks, aliases, nonregular files and scope
expansion. If App Sandbox or bookmark authority is introduced, this contract
must be revised and approved before shipping. A root-relative tab whose file
changed can show current disk content; a replaced explicit file needs reselection.
