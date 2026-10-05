# Data model — F007W

No new user document format or migration is proposed.

Selection grants retain opaque native IDs, the selected root/explicit file, generation and verified identity. Only native code owns handles. Existing `Identity { device: u64, inode: u64 }` maps to a proven NTFS volume/file identity pair, not a hash or normalized path. If NTFS evidence cannot justify that mapping, stop and review a schema amendment before persisting another representation.

Document versions keep confirmed content hashes plus target-specific metadata stamps. Shared algorithms compare semantic equality; Unix mtime/ctime are not fabricated on Windows. Watcher events are hints, not versions.

Session/recents/recovery envelopes preserve their existing schema/checksum and capacity validation. Windows app data is independent from Mac records. Restoring a persisted path never grants authority without current native validation. Private storage adapters own current-user ACL verification, lock acquisition and publication; handles release through RAII on all paths.

Save states remain: editing → staged → precommit validated → committed → postcommit verified. Precommit rejection retains original and draft. A commit followed by a failed check yields uncertainty and preserved safety material, not “original unchanged.”

Runtime capabilities describe actual reading/editing/image support. Prefer target composition plus existing truthful unsupported errors; if frontend discovery requires a new bridge shape, review it before implementation. Capability availability does not widen grants.
