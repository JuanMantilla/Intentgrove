# F003R research decisions

**Date:** 2026-09-29. Existing native grant IDs are process-local; a persisted renderer path cannot authorize reopen. F003C proposes a durable native session store.

| Decision | Rationale/alternative |
|---|---|
| Separate bounded recents record in private app data. | Keep history distinct from current F003C session and F004 drafts so Clear Recents cannot erase either. Store only successful selections/opens and native identity. |
| Rebuild fresh scope on use. | Validate path, type, no-follow and recorded device/inode, or require native picker. A replaced item at the same path is a recoverable recent entry, even if current root-relative tab refresh can accept a replacement under an intact root; history should not silently select another file. |
| Durable and bounded writes. | Schema/checksum/size validation and temp-sync-rename preserve latest valid list; proposed 20 folder/50 document cap. No source content stored. |

F003C's access-persistence decision and future App Sandbox/bookmark changes apply here too. Packaged identity/reselection trials remain open.
