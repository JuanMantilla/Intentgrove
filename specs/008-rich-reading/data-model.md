# F002R data model

| Entity | Fields/invariants |
|---|---|
| Render generation | Tab/version, parser generation and cancellation ID; stale diagram/highlight/outline work cannot update a newer document. |
| Block result | Source span, kind (diagram/metadata/code/text), bounded status and error; one failed block cannot blank siblings. |
| Heading entry | Level 1–6, stable duplicate-aware slug, source offset, display label and active state; outline and rendered anchor share identity. |
| Reading preference | Font enum, bounded size/line-height/width and version; stored in private app data, never repository files. |
| Diagram result | Whitelisted kind, bounded input/output dimensions, inert raster and accessible source/label; no active SVG or URL. |

Invalid/corrupt preference data falls back to documented defaults. Loading, failure and cancellation are explicit states.
