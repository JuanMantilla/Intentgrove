# Data Model: External Change Refresh

**Status:** Proposed design. See [spec.md](spec.md) for behavior and [refresh-ipc.md](contracts/refresh-ipc.md) for the webview/native boundary.

## Entities and ownership

| Entity | Owner | Fields | Relationships |
|---|---|---|---|
| Selected scope | Native `AppState` | Opaque grant ID, kind (`root` or `file`), retained directory/file descriptor, selected native path, original device/inode, workspace generation | Root owns root-relative document and tree grants. A file-only grant owns one selected file only. Native path never becomes renderer authority. |
| Watch registration | Native refresh service | Scope ID, watched native directory, recursive flag, watcher handle, health (`active`, `failed`, `stopped`), generation | One root watch or one parent-directory watch per explicit file, deduplicated where safe. Events are hints for selected scope only. |
| Disk version | Native document service | Opaque version token, device/inode, byte length, high-resolution modified/change metadata, content digest, checked time, supported format | A document can have several observed versions; at most one is last confirmed for its current grant. Token changes when identity or bytes change. |
| Open document state | UI document store, with native version validation | Stable tab ID, file grant ID, root-relative segments when applicable, last confirmed disk token, rendered content, reading anchor/scroll, clean/dirty/unavailable state | May reference one F004 draft. Disk identity may change after a validated root-relative atomic save without changing tab ID. |
| Directory snapshot | Native listing service; projected into UI tree | Root grant ID, relative segments, generation, sorted entry names/kinds/identities, page cursor, checked time | Replaces only the matching directory generation. UI retains expansion, selection, and scroll for surviving identities. |
| Refresh job | Native refresh service | Opaque job ID, target kind and scope, workspace generation, status, examined count, confirmed count, current relative location, cancellation flag | A manual file or folder Reload owns one job. A root switch cancels jobs from the previous generation. |
| Freshness state | UI per item | `current`, `checking`, `uncertain`, `unavailable`, or `conflict`; reason code and last checked time | Updated only from matching-generation native responses. `uncertain` keeps Reload available. |
| Conflict | UI/F004 document store, backed by native disk token | File grant ID, F004 draft ID and base version, latest confirmed disk token, status (`unresolved`, `keeping_draft`, `discard_pending`) | One per dirty document. The draft is not copied into the refresh store or replaced by a watcher event. |

## Validation and identity rules

1. A renderer request names only an existing opaque grant plus root-relative segments. Native code validates segment count/content and reopens from the selected root descriptor with `O_NOFOLLOW`-equivalent checks. A watch event's path is never sufficient authority.
2. Before and after a root-relative read or listing, native code checks that the selected root path still identifies the original selected directory. If it is missing or replaced, the old grant becomes unavailable; a new directory at the same path requires explicit reselection. Tabs and drafts remain recoverable.
3. A root-relative replacement at the same name is a new disk version only after a fresh scoped open, type/encoding/size/local-mount checks, and stable read. The UI preserves the logical tab ID while recording the new device/inode.
4. A file-only grant retains the originally selected identity. A different inode at its selected path moves the tab to `unavailable` with `reselection_required`; the parent watch grants no read of the replacement or siblings.
5. The version token is opaque and not constructed from a path string or timestamp alone. It binds to the content digest and native identity. A response with an older workspace or directory generation is ignored.
6. A confirmed read must satisfy the existing 10 MiB rich-reading limit, UTF-8/binary checks, and no-partial-read policy. Unsupported or unstable candidates never replace last confirmed content as current.
7. F004 owns the draft, dirty indicator, undo/redo state, recovery checkpoint, Save, and Save As. Refresh owns only the observed disk version and conflict signal. The original file is never written by refresh.
8. A directory snapshot is sorted and fixed for its generation. Mutations invalidate that generation rather than mixing live `readdir` pages. Cancellation keeps confirmed prior pages and marks the remainder unchecked.

## State transitions

| Current | Event/action | Next | Required effect |
|---|---|---|---|
| `current, clean` | Watch hint or Reload | `checking` | Retain last confirmed view; start scoped version check. |
| `checking, clean` | Same disk version | `current` | Keep content/position; report current for manual Reload. |
| `checking, clean` | New stable disk version | `current` | Publish complete content, preserve nearby reading position, update version token. |
| `checking, dirty` | New stable disk version | `conflict` | Keep draft and editor untouched; expose read-only disk version. |
| `checking` | Read unstable or watch fails | `uncertain` | Keep last confirmed view labelled as such; retry or offer Reload. |
| Any available | Missing, denied, unsupported, or file-only replacement | `unavailable` | Keep tab and any draft; show reason and retry/reselection. |
| Any root-relative state | Selected root missing or replaced | `unavailable` | Invalidate root grant and jobs; retain tabs and drafts; require explicit folder reselection before descendant reads. |
| `conflict` | Keep my edit | `conflict` with retained-draft choice | Continue editing; disk version remains inspectable; original Save stays blocked. |
| `conflict` | Save a copy | `conflict` or clean copy per F004 | Delegate whole-document Save As; never overwrite the changed original. |
| `conflict` | Use disk version | `discard_pending`, then `current` | Confirm discard, revalidate expected disk token, then let F004 discard draft and render disk content. Token mismatch returns to `conflict` without discard. |
| Any state | New root/last window close | stopped/invalidated | Drop watcher and reject late generation results; F004 handles dirty close choices. |

## Capacity bounds

- One root watcher plus deduplicated explicit-file parent watches; no per-entry recursive watcher registrations in the UI.
- File reads stay within the existing 10 MiB rich-reading limit. Native content caches are bounded to open tabs and in-flight comparisons; no repository-side cache is created.
- Folder reload processes bounded batches and reports examined counts. The 25,000-entry fixture determines measured memory and latency; the proposed bounds require verification, not an assumed PASS.
