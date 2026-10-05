# F003C research and decisions — 2026-09-29

The current app is a single-window, unsandboxed macOS Tauri 2 host. Its native
grant IDs are process-local UUIDs; the renderer's open tabs, heading anchors and
scroll positions currently live only in memory. F004 draft recovery is already
stored separately in private app data. These observations come from
`src-tauri/src/state.rs`, `selection.rs`, `recovery.rs`, `lib.rs` and `src/app/App.tsx`.

## Persistent access

**Decision:** Persist only records created after a native picker selection: path,
selection kind and native device/inode identity. On restart, native code reopens
the same item through existing no-follow/regular-file checks and compares the
selected identity before creating fresh opaque grant IDs. Root-relative tab paths
remain relative to that verified root; outside files remain file-only grants.
Unavailable, replaced or denied selections require user reselection. A path
string alone is never accepted from renderer IPC as new authority.

**Rationale:** Current `AppState` IDs cannot be replayed after process exit.
`register_root` clears the prior registry. Current bundles have no App Sandbox
entitlements; this proposal targets that observed build. Adding App Sandbox or
security-scoped bookmarks later changes this access architecture and needs review.
Apple documents bookmarks and start/stop security scope for sandboxed persistent
access: [App Sandbox file access](https://developer.apple.com/documentation/security/accessing-files-from-the-macos-app-sandbox),
[bookmark data](https://developer.apple.com/documentation/foundation/nsurl/bookmarkdata%28options%3Aincludingresourcevaluesforkeys%3Arelativeto%3A%29).

**Alternatives considered:** Replaying old IDs cannot work; treating any saved
path as a grant could silently authorize a replacement; bookmark plumbing is
premature for the current unsandboxed app and signing arrangement.

## Storage and recovery

**Decision:** Store a versioned, checksum-validated, size-bounded session record
under Tauri per-user app data, in a separate `session/` directory from F004
`drafts/`. Use private permissions, write-new/sync/rename/parent-sync and a prior
valid record fallback. Checkpoint changed state within two seconds; force and
await the final snapshot before normal Quit or last-window Close. Mark a completed
normal exit separately from an in-progress session, so an unexpected termination
offers the last completed checkpoint. Never put document content or draft text in
the ordinary session record. [Tauri PathResolver](https://docs.rs/tauri/2.11.6/tauri/path/struct.PathResolver.html)
provides `app_data_dir`.

**Alternatives considered:** WebView localStorage lacks the native grant and
durability boundary; repository files violate the no-write requirement; a new
database/dependency is unnecessary for one bounded workspace record.

## Window and restore sequence

**Decision:** Capture window bounds/scale natively; clamp restored bounds to the
current monitor work area before showing. Reuse the existing F001/F002A shell.
Return the active tab descriptor first, then load its document; defer inactive
tabs and unvisited tree branches. A generation token cancels obsolete restore
work when the user chooses another folder. [Tauri window API](https://v2.tauri.app/reference/javascript/api/namespacewindow/)
exposes position, size, scale and monitor information; Rust window builder also
supports initial geometry: [WebviewWindowBuilder](https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html).

**Decision:** Integrate with the existing F004 close choices before committing
the final session. Current `lib.rs` exits immediately when no edit session is
active; F003C must hold every normal exit until the final checkpoint completes.
Tauri exposes `ExitRequested` prevention and macOS `Reopen` event, though F005
owns the Dock entry-point polish: [RunEvent](https://docs.rs/tauri/latest/x86_64-apple-darwin/tauri/enum.RunEvent.html),
[ExitRequestApi](https://docs.rs/tauri/latest/tauri/struct.ExitRequestApi.html).

**Alternatives considered:** Loading every tab/tree branch before paint violates
R09/SC-005; directly persisting the renderer's transient grant IDs violates R08;
restoring off-screen geometry violates R03 and usable-window requirements.
