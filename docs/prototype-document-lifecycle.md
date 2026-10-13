# Read-only prototype documents — Phase 3

Intentgrove recognizes `.igproto` as a distinct `prototype` document kind on its
existing native open routes. ZIP files are never identified by sniffing their
contents. Production association/UTI registration and playback are deferred.
Prototype admission is enabled only on macOS arm64; other platforms return an
explicit unsupported-platform error.

Native picker, drop/Finder queue, tree, local document link, recent and restored
reference routes supply existing native grants. The neutral document facade
resolves those opaque grants, checks native identity, and reads through the same
no-follow regular-file/local-volume adapter used by other documents. This app's
current macOS adapter uses native-selected file descriptors and stored native
references; it does not implement security-scoped bookmarks. Phase 3 adds no
filesystem authorization or sandbox bypass and no frontend path-open API.

The package loader bounds reads to the production 32 MiB archive limit and compares
identity/stamps around reading and validation. `igproto-package` performs all ZIP,
manifest, graph, integrity, SVG/PNG and security-limit admission, using
`igproto-model`. The application neither extracts archives nor duplicates parsing.
Errors retain the package's bounded structured diagnostic report alongside concise
application codes. No invalid package becomes a prototype document.

Each document owns a native source reference, independent opaque token/generation,
immutable validated package snapshot, digest, validated title, entry, viewport and
format version. Identity is the existing native device/inode key; equal package
hashes or UUIDs do not merge separate files. Duplicate opens revalidate admission
and focus the existing document without replacing its snapshot. Four prototype
sessions may coexist with normal Markdown/image/HTML tabs. At most two loads may be pending; admission reserves a full 128 MiB expanded/PNG
budget before parsing against the 256 MiB aggregate limits, then retains exact
accounting supplied by the package validator. This conservative reservation can
require closing another large package before reload. There is no editing,
save-back, dirty/draft/recovery owner, player or execution state.

Recents use the existing Document category and record native identity/reference
only after successful prototype admission. Session schema 1, ordering, active key
and reference fields remain unchanged; prototype reading anchors are neutral.
Restoration is lazy: recreate the native grant, reopen and revalidate before
showing ready metadata. Persisted hashes never authorize admission. A missing,
replaced or invalid source uses existing error/reselection flows. Full restart
and successful explicit reload contractually start a future fresh runtime at the
validated entry scene. Navigation, overlays, booleans, zoom, SVG and asset bytes
are never persisted.

External changes only set a change hint. Explicit Reload rereads and revalidates
the same permitted native identity, then atomically replaces the immutable package
and advances its generation. A rejected replacement retains the previous validated
snapshot with “Reload failed; showing previous version”. Missing/denied/revoked or
substituted identity revokes the old snapshot and requires retry/reselection.
Requests and stale responses cannot replace another document or resurrect a closed
owner. Closing is idempotent and releases snapshots and native file handles. A
bounded native reopen reference contains no handle/package bytes and permits
ordinary visit-history reopening only after native identity checks and validation.
Workspace replacement/window close/quit cancel pending opens and unload sessions.

Phase 4 receives `ValidatedResources`, with immutable canonical manifest/graph,
scene-by-canonical-ID and asset-by-SHA access. Each snapshot acquisition checks the
live grant. It provides no arbitrary ZIP/file/URL traversal and no resource IPC,
WebView URL scheme, rendering or runtime behavior. The present document body shows
only safe metadata and lifecycle status; it is not a prototype player.
