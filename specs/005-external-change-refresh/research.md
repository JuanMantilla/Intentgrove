# Research: External Change Refresh

**Status:** Planning proposal, 2026-09-25. No application behavior has been verified for this feature.

## File-change notification boundary

- **Decision:** Add a backend-only `notify` 8.2.0 watcher to the existing Rust service. Watch the selected root recursively and the containing directory of each individually selected file without a root. Keep watcher handles in native state; expose only opaque grant IDs, refresh commands, and typed status events to the UI. Pin the exact crate version and lockfile during approved implementation.
- **Rationale:** The native service already owns folder/file grants and validates `openat` reads. A backend watcher can use those same checks without granting the webview a general filesystem-watch permission. `notify` uses macOS FSEvents by default and documents editor replacement saves, dropped or coalesced events, and `need_rescan()` signals. Its published minimum Rust version is 1.77, compatible with the repository's declared 1.77.2, though the actual toolchain is absent on this host and build compatibility remains untested. [notify documentation](https://docs.rs/notify/latest/notify/), [crate metadata](https://docs.rs/crate/notify/latest), [event rescan flag](https://docs.rs/notify/latest/notify/struct.Event.html)
- **Alternatives considered:** Tauri's filesystem plugin has watch support but would add webview filesystem permissions and duplicate the native grant boundary; polling every file or tree entry continuously costs more work and still cannot prove freshness under concurrent writes. [Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/)

## Events and reconciliation

- **Decision:** Treat every watcher event as an invalidation hint, never as an authoritative create/delete/write instruction. Register watches before the initial scoped snapshot, coalesce bursts, then reconcile the affected open tabs and loaded tree branches against fresh native reads. On an overflow, rescan flag, watch error, app focus return, or root switch, reconcile all currently open tabs and expanded branches; mark unchecked scope as freshness-uncertain. Recreate a failed watch when safe or leave a visible Reload path.
- **Rationale:** FSEvents may coalesce or omit individual changes, and editors may truncate or rename a temporary file over the target. Apple recommends rescanning directories when events are dropped. `notify` explicitly says event kinds are not reliable editor intent. [Apple FSEvents guide](https://developer.apple.com/library/archive/documentation/Darwin/Conceptual/FSEvents_ProgGuide/UsingtheFSEventsFramework/UsingtheFSEventsFramework.html), [notify documentation](https://docs.rs/notify/latest/notify/), [Tauri frontend events](https://v2.tauri.app/develop/calling-frontend/)
- **Alternatives considered:** Applying rename/create/delete events directly to React tree state could miss coalesced paths and duplicate nodes. Watching the file inode alone misses atomic replacement.

## Grant identity and atomic replacement

- **Decision:** Preserve the current root-directory descriptor and relative-path validation for files inside a selected root. A new file at the same relative path is readable only after a fresh `open_relative`/regular-file/local-mount check under that root; update the tab's disk identity and version without changing the user's tab position. For an individually selected file outside the root, retain its native selected path and original file identity only to detect changes; if the path now resolves to a different item, require a fresh picker selection before reading it. Do not send native paths to the webview as authority.
- **Rationale:** Current `FileGrant` retains an open handle and original device/inode; `read_document_impl` returns `changed` on root-relative inode replacement. That is secure but would leave atomic-save tabs stale. The root grant covers its descendants, while a file-only grant covers only the selected file. The spec now makes this distinction explicit in F003D-R09/AS-018.
- **Alternatives considered:** Reusing the old descriptor misses replaced content. Trusting matching path strings for file-only grants expands authority. Automatically treating every replacement as the same file hides identity changes.

## Stable reads and version comparison

- **Decision:** Keep the last confirmed display while a candidate changes. After a quiet interval, perform a bounded UTF-8 read with pre/post identity, size, and high-resolution modification/change metadata checks; confirm the pathname still points to the opened root-relative item; then repeat or compare a content digest after a second quiet check before publishing. A read that changes during verification stays pending and retries with a bounded backoff. Store a disk-version token that includes identity and content digest, never timestamp alone.
- **Rationale:** The current bounded read checks length and modified time; same-size rewrites and atomic replacement require stronger comparison. No finite observation can prove that an arbitrary external writer will never resume after pausing; acceptance tests therefore use completed/staged writes and report any observed intermediate rendering as FAIL. The plan does not claim a universal transaction boundary supplied by the filesystem.
- **Alternatives considered:** Rendering after the first event can show truncated content. Waiting for a single fixed timer or comparing modification times alone misses some races.

## Folder reload and cancellation

- **Decision:** Run manual folder Reload as a cancellable native reconciliation job over descendants, excluding the same ignored directories as the existing tree. Scan each directory into a stable pageable snapshot before publishing its pages, and invalidate old page tokens when that directory changes. Report examined counts and per-item outcomes; allow cancellation at directory/page boundaries. Keep already confirmed results and mark remaining descendants unchecked. Reconcile open tabs independently so one dirty conflict or read error does not block siblings.
- **Rationale:** The existing listing uses live `readdir` offsets and 200-entry pages; offsets can shift during external mutation. A generation-bound snapshot prevents mixed pages. Traversal must remain bounded and asynchronous for the 25,000-entry case.
- **Alternatives considered:** Forcing a full synchronous tree rebuild would freeze reading and lose expansion/scroll state. Updating only expanded folders would not satisfy manual Reload of an entire selected subtree.

## Conflict ownership and UI communication

- **Decision:** Keep dirty drafts and save-to-original checks in F004. Refresh reports a changed disk version and read-only comparison data; the UI never replaces a dirty draft automatically. `Keep my edit` leaves the draft and conflict badge; `Use disk version` confirms discard and revalidates the disk version before loading it; `Save a copy` calls F004 Save As. There is no conflict overwrite of the changed original. Native progress/invalidations use typed Tauri events; explicit Reload and conflict actions use typed commands with operation IDs/generations.
- **Rationale:** This matches the user's clarification and F004's already specified ownership. Tauri supports backend-to-frontend events; listeners must be unregistered when the window/root changes. [Tauri frontend events](https://v2.tauri.app/develop/calling-frontend/)
- **Alternatives considered:** A generic filesystem event stream would expose unnecessary path data. Putting conflict logic only in the watcher would bypass F004's save-time recheck and recovery draft rules.

## Environment and verification

- **Decision:** Plan against the current Tauri 2, React, TypeScript, and Rust layout. Use disposable macOS folders and a second writer process for in-place, staged, atomic-replace, rename, delete, symlink, permission, and focus-resume cases. Verify native behavior in a packaged `.app` on macOS; unit and UI tests alone do not establish native watcher behavior.
- **Rationale:** The host reports macOS 26.2 on arm64 and Node 20.19.6. `rustc` is not currently available, so compile/native results remain **NOT TESTED**. The feature must not depend on developer tools at runtime.
- **Alternatives considered:** Browser-only mocks cannot establish FSEvents, file identity, or packaged macOS behavior.
