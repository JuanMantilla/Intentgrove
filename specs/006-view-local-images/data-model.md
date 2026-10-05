# F006 data model

| Entity | Fields and invariants |
|---|---|
| Image selection | Native grant ID, root-relative or explicit-file kind, device/inode and version. A renderer path alone is never authority. |
| Stable image bytes | <=8 MiB, actual version/identity confirmed before and after read, claimed extension/format. Unstable bytes cannot be decoded as current. |
| Decode request | Opaque request/generation ID, bytes, claimed format, bounded output intent. No path, URL, entitlement or command field. |
| Decode response | Actual format, intrinsic width/height, first-frame flag, bounded inert raster/tile payload or typed error. <=40 MP checked before allocation. |
| Image tab | Stable tab ID, selection, status (`loading`, `current`, `stale`, `uncertain`, `error`), Fit/Actual/zoom and viewport. Stale pixels cannot be labeled current. |
| Inline image | Source document scope, relative reference, alt text, status and bounded decoded preview. Remote/out-of-scope references are blocked before decode. |

Only the native process can turn a valid selection into bytes. Decoder service crashes/timeouts invalidate one generation and cannot update a newer tab.
