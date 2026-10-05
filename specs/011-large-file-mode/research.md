# F003L research decisions

**Date:** 2026-09-29. Current `document.rs` caps rich reads at 10 MiB. A normal CodeMirror document can virtualize paint but still hold the whole string in memory; it alone cannot prove this slice's 128 MiB budget. [CodeMirror guide](https://codemirror.net/docs/guide/).

| Decision | Rationale/alternative |
|---|---|
| Snapshot one verified version. | After explicit opt-in, stream through the existing scoped handle into a private bounded temporary snapshot (<=50 MiB), verify identity/size/version before marking complete. Later windows/search read that snapshot, preventing mixed file versions. Delete stale snapshots on close/refresh/age. |
| Sparse line index and UTF-8 windows. | Build bounded offsets while streaming; return small aligned windows to a virtualized read-only renderer. Long lines are clipped/segmented for painting with clear horizontal navigation. |
| Cancellable chunk search. | Search the verified snapshot rather than a live changing file; report complete/partial honestly and invalidate old generation on refresh/tab switch. |
| Bounded copy. | Selection copy <=1 MiB prevents a 50 MiB clipboard allocation under the proposed memory budget; larger selections need narrowing or a separately specified export. |

Packaged 25/50 MiB, long-line, memory, version-race and keyboard tests remain unmeasured.
