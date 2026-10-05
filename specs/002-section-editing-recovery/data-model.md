# F004 Data Model

All byte positions are half-open `[start, end)` in the confirmed original UTF-8 file. Native data is authoritative; frontend positions are presentation only.

## Entities

| Entity | Fields | Invariants |
|---|---|---|
| Document key | Opaque grant/file token; canonical file identity; last confirmed `diskVersion` | A client path is never authority. File replacement refreshes identity after Save. |
| Section descriptor | Document key/version, ordinal, kind (`preheading`, `heading`, `whole`), heading level/label, byte start/end, source hash | Sections partition the editable source after an optional BOM. A heading starts a new section regardless of level. Empty/preheading/whole sections are representable. |
| Edit session | Opaque session ID, document key, original section descriptor, complete base-byte snapshot, base `diskVersion`, draft source, lifecycle, editor JSON, editor/reader scroll, checkpoint sequence | Exactly one pending unsaved session per document. Original span stays fixed until successful Save or exit; no guessed relocation. |
| Recovery checkpoint | Schema version, document key, session, full base snapshot and original section, CodeMirror state/history JSON, layout reference, sequence, checksum, timestamp, byte length | Stored only in per-user app data. Decode validates schema, checksum, scope and size. Previous valid checkpoint survives failed replacement. |
| Save transaction | Session ID, baseline version, staged output path/identity, retained pre-save original, final-check result, commit result | Stage and backup precede replacement; an observed mismatch blocks commit; success updates grant/token and clears dirty draft only after verification. |
| Disk conflict | Base snapshot/version, current confirmed disk snapshot/version, draft, reason (`external_change`, `missing`, `boundary_changed`, `postcommit_mismatch`) | Both sides are inspectable. Original Save is blocked while unresolved; Save As uses base plus draft. |

## Section construction

Parse the confirmed byte snapshot with native offset iteration. Only document-level headings begin sections; heading syntax inside code fences, blockquotes, or nested list content is not a document section. The pre-heading span starts after an optional UTF-8 BOM. If there are no headings, one whole-document section starts there. Adjacent headings create a potentially empty body but each heading's source line remains in its own section. A section ends immediately before the next document-level heading, including its preceding source bytes according to the parser's span policy; tests pin blank-line ownership so every byte belongs to exactly one section. Preserve original BOM and unedited bytes verbatim.

The React mapping strips BOM before remark parsing, compares heading count/start offsets after UTF-16-to-UTF-8 conversion, and attaches section IDs to rendered regions. An ambiguous or mismatched mapping disables the edit action; it does not choose a nearby heading.

## Lifecycle

```text
reading → clean_edit → dirty_edit → checkpoint_pending → dirty_edit
                      │                  └→ checkpoint_error (draft remains)
                      ├→ saved → clean_edit/reading
                      ├→ paused_draft → dirty_edit
                      ├→ conflict → inspect / keep editing / Save As / explicit discard
                      └→ discard → reading
```

- A clean editor can be restored after normal close from the session record. A dirty editor at close requires Save, Keep draft, Discard, or Cancel. Keep draft waits for durable checkpoint acknowledgment.
- A dirty tab can coexist with other dirty tabs, but cannot have two section drafts in the same document. A request to edit another section offers Resume, Save, Discard, or Cancel.
- The dirty flag compares current section text with the most recently saved section source, not merely the presence of an editor.
- During Save, input is held or versioned so an older save acknowledgment cannot clear newer edits. Checkpoint writes are serialized per document and sequence-checked.
- After an external disk update or restart, compare current `diskVersion`; changed original becomes conflict. If the section cannot be proven identical, allow inspection and Save As only.
- A successful Save or explicit Discard deletes that draft checkpoint. Clear-session deletes session drafts after explicit user action. Recovery never writes an original document.

## Bounded storage policy

The editable file ceiling is 10 MiB. The recovery record stores its base snapshot and edited state with a separately enforced maximum and integrity checksum. History may be pruned only with a documented, visible effect on Undo/Redo; it must not claim exact restoration if state changed. The implementation must size the bound against the 10 MiB file and 100-edit acceptance fixture, and surface a quota/storage error while retaining the in-memory draft and prior checkpoint. No checkpoint acknowledgment is issued for a partial, over-limit, or failed record.
