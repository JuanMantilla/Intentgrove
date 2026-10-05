# Platform boundary contracts — F007W

Proposed internal adapter responsibilities; existing Tauri commands remain the consumer boundary.

- **Open selection/descendant**: native paths only from authorized picker/drop/restore flows; validate relative segments at the native boundary; return owned verified handles. Root-relative authority is anchored to the selected handle and rechecked identity. Never accept a renderer-supplied absolute path as a grant.
- **Metadata/identity/enumeration**: operate on verified handles, return real OS identity and bounded entries, check cancellation between bounded work units. Enumerating an unsafe item must not read its content. Unknown locality/recall/reparse states fail closed.
- **Positional reads**: preserve explicit offset, bounded length, short-read/EOF/error handling and concurrent-reader independence. Consumers must not depend on a shared seek cursor.
- **Private storage/locking**: framework-resolved per-user directory; reject unsafe ownership/reparse access; serialize writers; release every handle/lock on error and cancellation. No user-repository metadata.
- **Stage/commit**: own same-directory stage and cleanup responsibility; flush data, revalidate expected destination version, distinguish missing/new from existing targets, verify published content. Return an error/outcome reflecting whether publication occurred. Preserve recovery/safety material when uncertain.
- **Decoder**: native bytes from verified scoped reads only; bounded isolated worker required for full image support. Windows initial image command returns a visible unsupported result, never an empty successful response.
- **Lifecycle**: cancellation and worker shutdown on confirmed close; no writes after reporting completion; normal close remains guarded. Windows final close exits rather than retaining macOS Dock lifecycle assumptions.

Keep stable error meanings for missing/denied/invalid_path/unsupported_type/unsupported_mount/cloud_placeholder/cancelled/reselection_required. Preserve underlying Windows error context without private document contents. Any newly required public command, schema or security capability is a review item before mutation.
