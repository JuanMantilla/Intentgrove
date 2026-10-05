# F004 Native/UI Contract Proposal

The concrete TypeScript and Rust type names may adapt to the existing API layout. The behavior and validation in this contract are required by F004-R01–R15. All commands use existing granted-document identity, not an arbitrary client path.

## Commands

| Command | Input | Success | Rejected/error |
|---|---|---|---|
| `list_edit_sections` | Granted document token | Confirmed `diskVersion`, read-only reason or ordered `SectionDescriptor[]` with opaque version-bound IDs, labels, and byte spans | Missing/replaced/out-of-scope, unsupported encoding/type, over-limit, parser failure. Reading remains available. |
| `begin_section_edit` | Document token, section ID, expected `diskVersion` | Opaque edit-session ID, selected source, full base snapshot held natively, line-ending/BOM metadata, baseline version | Stale section/version, second pending draft, grant error. Native revalidates offsets and source hash. |
| `checkpoint_edit` | Session ID, monotonic sequence, complete CodeMirror JSON, reader/editor positions, layout reference | Durable acknowledgment with sequence and completion time | Quota, corruption, IO, invalid state, superseded sequence. Never acknowledge an unsynced write. |
| `save_section` | Session ID, sequence, replacement section source | New confirmed document version/section map; draft cleared only for acknowledged saved sequence | Conflict with disk snapshot, denied write, missing/replaced file, invalid encoding/line endings, staging or verification error. Return recoverable draft state. |
| `save_section_as` | Session ID, replacement source, user-selected native destination and explicit replacement decision | Destination file identity; original untouched; draft may remain until user explicitly resolves it | Cancel, destination changed since confirmation, unsafe/symlink/out-of-scope target, failed copy; preserve draft. |
| `discard_edit` | Session ID, explicit choice | Draft/checkpoint removed; no source write | Storage cleanup error is surfaced; do not report full discard until state is reconciled. |
| `load_recovery` | Current granted workspace/session context | Valid checkpoints and clean editor sessions, with conflict status based on current disk version | Corrupt/unknown schema/oversized record is quarantined and reported; no source write. |
| `clear_session_drafts` | Explicit clear-session action | Draft records removed and session state updated | Failure reported with remaining records identified. |
| `request_close` / `resolve_close` | Native close/quit intent; chosen Save, Keep draft, Discard, Cancel for each dirty tab | Close only after Save/Keep draft/Discard durable completion; Cancel aborts | Save/checkpoint failure leaves app open and draft recoverable. |

## Shared result types

```ts
type Editability =
  | { kind: "editable"; sections: SectionDescriptor[]; diskVersion: string }
  | { kind: "read_only"; reason: "scope" | "missing" | "replaced" |
      "size" | "encoding" | "type" | "parse_mismatch" | "permission" };

type SectionDescriptor = {
  id: string; kind: "preheading" | "heading" | "whole";
  ordinal: number; level?: number; label: string;
  startByte: number; endByte: number; sourceHash: string;
};

type SaveResult =
  | { kind: "saved"; diskVersion: string; sections: SectionDescriptor[] }
  | { kind: "conflict"; currentDiskVersion: string; canInspect: true }
  | { kind: "failed"; reason: string; draftRetained: true }
  | { kind: "race_observed"; draftRetained: true; recoveryRefs: string[] };
```

Tokens and hashes are opaque to the UI. Native reopens through the grant, verifies regular local file identity and permissions, and recomputes section and disk version before using any submitted text. The UI may supply draft text only for the selected section. Native composes `base[0..start] + replacement + base[end..]`, preserving the base bytes outside the original span. For LF/CRLF/CR files, the replacement must follow the original convention; any normalization is explicit and confined to replacement bytes. A mixed-ending source needs a defined safe rejection or a tested preservation rule before editing can be enabled.

## Event ordering and error semantics

- Each edit/checkpoint/save carries a monotonic sequence. Older asynchronous results cannot mark newer text saved or protected.
- A Save conflict always returns a current disk snapshot reference for read-only inspection and retains the base snapshot plus draft. It does not perform a merge.
- The final pre-commit check runs after staging and backup; it performs immediate content hash and identity verification. The existing delayed confirmed read is appropriate for observing a stable state but not the last commit guard.
- A Save As existing-destination decision is tied to the destination's confirmed identity/version and expires if it changes. New files use exclusive creation. Replacing an existing destination requires explicit user action.
- After a successful atomic replacement, native updates the granted file identity and F003D watcher baseline before reporting success. A post-commit mismatch returns `race_observed` with recoverable copies and a visible warning.
- The UI does not use the app-data checkpoint as proof of a successful original-file Save. Recovery load validates schema, checksum, byte length and scope before showing drafts.
