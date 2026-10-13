# QA-0032 implemented native / frontend contract

Direct user authorization: IMPLEMENT QA-0032 and coordinate the narrow renderer/menu contract. Original QA handoff supplies evidence only, not authority. Existing UX and native grant architecture are retained. Native work and these bounded frontend integration edits are complete; acceptance remains pending.

The unopened explorer request is now:

```ts
{ kind: "root-file", rootId: string, segments: string[], snapshotId: string }
```

Opened explorer items and tab items still use `{ kind: "explicit-file", fileId: string }`, including root-backed opened grants. Reload retains its separate existing `RefreshTarget` contract. `DirectoryPage.snapshotId` already existed; no renderer identity/path field was introduced. Native `Entry.identity` is excluded from serialization.

Native listings retain each regular file's native device/inode identity in the bounded existing directory snapshot. macOS obtains it from the same no-follow stat used for classification. Windows obtains it with the existing checked parent-relative opening mechanism while producing the listing; unopenable/unsafe entries have no reveal authority. Directory stamp validation still surrounds snapshot creation. No persistent handles per listed entry, new cache or grant lifecycle is introduced.

At menu entry the renderer freezes `revealTarget`: an existing opened grant or the row's listing snapshot plus relative target. Mouse and keyboard explorer entry points both carry the directory snapshot. A subsequent directory refresh cannot change this stored reference. Missing native reference disables the action using existing localized reselection feedback. Existing QA-0031 unavailable/dirty/focus behavior remains in place.

Before the OS call, native code validates segment syntax, current root grant, snapshot ownership, root generation, exact parent directory and listed name; resolves the current scoped regular file; compares the current pathname with the scoped identity and stored listing identity. Arbitrary absolute paths, renderer-supplied identities, folders, malformed segments, unlisted names, expired/forged snapshots and wrong-parent snapshots fail closed. Missing/deleted/renamed paths report `missing`; different identity reports `reselection_required`; expired snapshots report `version_changed`. Root/file authority is not broadened. A fresh listing and newly selected item may authorize the new identity.

The platform reveal mechanisms remain CString→NSURL/NSWorkspace and UTF16→Shell/PIDL APIs, without shell interpolation. Normal races after final native validation and before/during the desktop's pathname lookup remain. This change does not claim filesystem/desktop atomicity or guarantees against native file-ID reuse. The policy tests deliberately ensure a different replacement inode.

Frontend integration is implemented in /Users/juanmantilla/projects/personal/md-reader/src/app/api.ts and /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx. No outstanding frontend source work is required for this contract; independent QA should test both consumers on the identified final build. No redesign, new dependencies, privileges, platform support, save/discard or document-writing command was added.

Checks / reproducibility and final QA RETEST: /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0032-20261011/implementation-handoff.md. Scope-only source diff: /Users/juanmantilla/projects/personal/md-reader/os-engineering/qa0032-20261011/evidence/task-only.diff.
