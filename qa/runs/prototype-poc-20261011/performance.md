# Basic POC observations

**EXPERIMENTAL RESULT:** one recorded macOS arm64 run, not a benchmark. Evidence [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/performance.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/performance.json), [/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json](/Users/juanmantilla/projects/personal/.agents/investigations/vectorcraft-intentgrove-prototype/poc/evidence/control-trace.json).

- Package: 8098 bytes (7.91 KiB), four simple scene SVGs, one shared 64×64 original image.
- Open end-to-end: 748.2 ms, including controller validation/serialization and settled load wait. Native mount/player load measurement: 495.7 ms; includes fixed settle wait, not isolated parsing time.
- Player action timing: [103, 0, 0, 0, 1, 0] ms in flow order. First NAVIGATE includes 100 ms DISSOLVE. Instant action/render dispatch is approximately 0–1 ms; these measurements are JavaScript action completion, not presentation/frame latency.
- Native click control replies are roughly 0.2–0.3 seconds because the harness explicitly focuses the window and waits for events/settling; not a scene-switch performance claim.
- Host RSS: 400→96288 KiB (delta 93.6 MiB). Baseline is immediately after spawn, so this mostly includes Cocoa/WebKit initialization. **UNKNOWN:** incremental package-only memory and shared WebKit child-process memory.

**INFERENCE:** no obvious load or scene-action blocker for the tiny tested package. Large scenes/filter graphs were not measured and these values are not performance guarantees. No optimization performed.
