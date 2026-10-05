# Native/UI Contract: External Change Refresh

**Status:** Proposed. Names and payloads are review targets, not implemented APIs. Existing command behavior is documented in `specs/001-workspace-reader/contracts/native-commands.md`.

## Authority boundary

The Rust service owns selected folder/file descriptors, selected paths, watch registrations, native file identity, and version checks. The webview passes only opaque grant IDs and validated relative segments. Markdown content, links, metadata, and watcher event paths cannot construct a new grant. No generic filesystem watch/read/write command or Tauri filesystem-plugin scope is exposed. Before and after root-relative reads or listings, native code compares the selected root path with its original directory identity; a missing or replaced root invalidates the grant and requires picker reselection.

All requests and events include a workspace `generation` or are bound to a grant that belongs to that generation. A root switch invalidates old jobs and versions. The UI ignores late events with an older generation. Every native handler rechecks its grant, target type, path scope, and cancellation state.

## Existing contract extension

`read_document` keeps its existing request shape and response fields (`fileId`, `name`, `displayPath`, `identityKey`, `content`), and adds `diskVersion: string`. The token is opaque and identifies a confirmed disk version, including file identity and bytes; callers must never interpret it as a path. For a root-relative grant, a validated atomic replacement may return a new `identityKey` and `diskVersion` for the same logical tab. For an explicit file-only grant, replacement returns `reselection_required` instead of content.

Directory listing becomes generation-bound: the first page returns `snapshotId` with the existing `entries` and `nextOffset`; subsequent pages name that snapshot. A changed directory invalidates old snapshot IDs with `version_changed`. UI state keeps a stable tree row key for an unchanged entry and never combines pages from different snapshots.

## New commands

| Command | Request | Response | Notes |
|---|---|---|---|
| `reload_item` | `target`: `{kind: "root-file", rootId, segments}` or `{kind: "folder", rootId, segments}` or `{kind: "explicit-file", fileId}`; `requestId` | `{jobId, generation, accepted: true}` | File target checks only that file. Folder target checks descendants and affected open tabs; it never opens a closed tab. Repeated requests may coalesce but each receives a completion status. |
| `cancel_reload` | `{jobId, generation}` | `{cancelled: boolean}` | Stops future work; confirmed updates persist. Wrong generation/unknown ID is a safe no-op or typed error. |
| `reconcile_visible_state` | `{generation, rootId?, expandedDirectories: string[][], openFileIds: string[]}` | `{jobId, generation}` | Called on focus return and watch overflow/failure. Native validates every segment and ID; no path outside grants can be named. Unvisited branches stay unchecked until opened or manually reloaded. |
| `get_confirmed_document` | `{fileId, expectedDiskVersion, generation}` | `{fileId, diskVersion, identityKey, content, name, displayPath}` | Returns a bounded complete read only if the expected token is still current. Used for clean refresh, read-only conflict inspection, and final Use disk version check. `version_changed` leaves the draft intact. |

The F004 document store handles **Keep my edit**, **Use disk version**, and **Save a copy**. After the user confirms Use disk version, it calls `get_confirmed_document` with the version they inspected and discards the draft only on a matching success. Save a copy delegates to F004 Save As. Refresh never exposes a replace-original command.

## Events emitted to the main window

| Event | Payload | UI response |
|---|---|---|
| `refresh:file_changed` | `{generation, fileId, diskVersion, identityKey, checkedAt}` | If clean, request confirmed content; if dirty, retain draft and enter conflict. Coalesce repeated notices for the same token. |
| `refresh:directory_changed` | `{generation, rootId, segments, snapshotId}` | Reload only that loaded/expanded tree branch with matching snapshot pages; preserve surviving expansion/selection/scroll. |
| `refresh:item_status` | `{generation, targetRef, state, reasonCode?, checkedAt}` | Show changed/current/checking/uncertain/unavailable state without treating stale content as current. |
| `refresh:job_progress` | `{generation, jobId, examinedCount, confirmedCount, currentSegments?, state}` | Present nonblocking progress and Cancel for manual folder Reload. `state` is queued/running/completed/cancelled/failed. |

`targetRef` is an opaque file grant or `{rootId, segments}`; no absolute native path or untrusted event path appears in payloads. Event listeners are removed on unmount/root switch; native jobs are cancelled or invalidated at the same boundary.

## Errors and failure semantics

| Code | Meaning / required behavior |
|---|---|
| `invalid_grant`, `invalid_path` | Reject unregistered IDs or unsafe relative segments before filesystem access. |
| `reselection_required` | File-only path now resolves to a different identity; keep tab/draft, require explicit picker selection. |
| `root_reselection_required` | Selected root is missing or replaced; stop descendant reads and jobs, keep tabs/drafts, mark the tree unavailable, and require explicit folder reselection. A same-path replacement does not inherit the old grant. |
| `version_changed` | Expected disk or directory snapshot token is stale; update conflict or restart that branch, without discarding a draft. |
| `unstable` | Candidate changed during confirmation; keep last confirmed view marked checking/uncertain and retry boundedly. |
| `missing`, `denied`, `unsupported_type`, `encoding`, `binary`, `oversize`, `cloud_placeholder`, `unsupported_mount` | Specific recoverable state. Other tabs/jobs continue. |
| `watch_failed` | Automatic freshness is uncertain; report status and offer Reload/focus reconciliation. |
| `cancelled` | Long manual job stops at a safe boundary; confirmed results remain, unvisited scope stays unchecked. |

## Sequencing invariants

1. Register watch, take initial confirmed snapshot, and only then report an item current. Events during setup schedule a second reconciliation.
2. A watcher event never directly changes document content or tree entries. It schedules a scoped check that returns a generation-bound token/snapshot.
3. Before rendering a new clean version, confirm the disk token still matches; preserve scroll by heading/nearby passage and explain fallback.
4. Before any dirty-draft discard, obtain user confirmation and revalidate the inspected disk token. A mismatch returns to conflict without draft loss.
5. Refresh commands never write the source file. F004's separately approved Save/Save As contracts remain the only write path.
6. A root grant is valid only while the selected root path still identifies the original directory. A replaced root cannot emit confirmed descendant content or directory snapshots until a new picker selection creates a new grant and generation.
