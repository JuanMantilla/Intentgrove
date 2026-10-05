# Recovery storage decisions for review

Status: proposed; not approved or implemented. This records concrete remaining F004 storage work found on 2026-09-28. The approved spec/design/plan remain unchanged. Material changes to retention and recovery ownership must be incorporated into the canonical artifacts and reviewed under AGENTS.md before production implementation.

## Session ownership and moved-path migration (T036)

Current records use a hash of the native display path. After picker-approved reselection at a moved path, the current path can differ from the key used for an earlier checkpoint. Clearing only the current key leaves an older draft; clearing both without ownership can delete another session's record.

Proposed architecture:

1. Add a native-generated recovery owner ID to new records and retain it through restoration. Preserve compatibility with existing checksum/schema-1 records; adopt a legacy record only after validating its base, section, version and scope. The renderer cannot supply ownership or storage paths.
2. Serialize checkpoint, migration and cleanup with an app-data lock shared by cooperating app processes. Bound storage reads before decoding. Record paths come only from native grants and validated recovery metadata.
3. On approved native reselection, write and sync the entire acknowledged record under the new path, preserving draft, editor history/selection, scroll and sequence. Only acknowledge migration after file and parent sync.
4. Delete an old record only when its owner still matches. Retain an unrelated/newer record. A failed migration keeps the existing checkpoint and visible draft and blocks Keep/close until recovery is durable at the current grant.
5. Save/Discard cleans the owner's current and migrated records. Test root/file moves, multiple moves, replacement, legacy records, another session's newer checkpoint, migration failure and process exit after acknowledgment. Exact folder/tab restoration remains F003C work.

## Safety-copy retention and explicit clearing (SEC-02)

Proposed product and architecture decisions:

- Retain copies associated with an unresolved or unverified Save race until the user explicitly resolves or deletes them. Preserve the already approved residual-race disclosure.
- Limit safety-copy storage to 1 GiB. Before a Save would exceed that limit, keep the draft, leave the original unchanged and show a localized storage notice with an explicit cleanup action. Do not silently delete recoverable work to make a Save succeed.
- Allow clearing resolved safety copies in the existing saved-data flow. Its confirmation must distinguish saved drafts from safety copies, show affected count/size, and default to preserving unresolved copies. Source documents are outside the deletion scope.
- Keep files private (0600) in app-owned private directories (0700). Validate ownership and forbid symlink traversal for inventory and deletion. Test quota, failed cleanup, unresolved-copy preservation and unchanged source inventory using disposable fixtures.

The 1 GiB budget, resolved/unresolved lifecycle, confirmation copy and record migration are review proposals. They are not implied by the dark-theme approval and do not authorize deleting current app data.
