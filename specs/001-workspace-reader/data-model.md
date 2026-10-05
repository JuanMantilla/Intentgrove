# F001 data model

**RootGrant**: opaque ID, display path/name, opened directory identity, exclusion
policy, lifecycle. Created only by a completed native folder dialog. Closing the
workspace invalidates the ID and outstanding list requests.

**FileGrant**: opaque ID, display path/name, opened file identity, source
(`root-relative` or `explicit-file`), and parent root ID only when applicable.
An explicit file grants no sibling or parent access.

**DirectoryPage**: root ID, relative segment path, ordered entries, continuation
token, exclusion summary, and cancellation state. Entries distinguish directory,
supported Markdown, and unsupported type without following links.

**DocumentRead**: file grant ID, byte count, UTF-8 content, detected file identity,
and read status. It is never an editable buffer in F001. Values above the 10 MiB
rich-view limit return a size state without a partial document.

**Tab**: file grant ID, unique tab ID, display label, active flag, relative scroll
position or heading anchor, and loading/error state. Reopening the same opened
file identity activates the existing tab. Closing a tab releases its transient
image URLs and associated state.

**LinkResolution**: source file grant, raw link target, and result:
`in_scope_document`, `in_scope_anchor`, `in_scope_raster`, `blocked`,
`unsupported`, or `missing`. No result grants a wider scope.

All IDs are process-local, unguessable tokens. None become a persistent permission
or a path prefix accepted from untrusted content.
