# F006 image security review — 2026-09-29

Scope: `src-tauri/src/image.rs`, `scope.rs`, `assets.rs`, `image_xpc_client.m`, `src-tauri/xpc/`, `src/reader/ImageView.tsx`, `MarkdownView.tsx`, CSP, and the signed disposable XPC probe. This is a read-only code review plus disposable probes, not a claim that malformed image decoders are exploit-free.

## Observed controls

- PASS: The XPC protocol carries bounded bytes, a claimed family and numeric preview/tile parameters. It carries no path or URL. The service is private to its containing app and macOS documents its default restricted execution environment ([Apple XPC service guide](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingXPCServices.html)). The helper and containing app passed deep code-signature validation.
- PASS: Root-relative opens use no-follow scoped descriptors; explicit grants authorize one file. Native code checks extension, stable bytes, identity and version before returning pixels or tiles. The same source is checked again after decode.
- PASS: The renderer receives PNG bytes in `blob:` URLs. CSP limits image loading to self and blob; Markdown remote references are rejected before the native call. SVG XML preflight rejects active/external constructs, and both `usvg` image resolvers return no resource. A malicious script SVG was rejected with `unsafe_or_corrupt`; a JPEG claimed as PNG returned `mismatch`.
- PASS: Source bytes are capped at 8 MiB, intrinsic raster work at 40 MP, preview responses at 8 MiB, and tile dimensions at 1024 × 1024. The helper watchdog and main-process timeout bound decode calls. Requests carry a protocol version, UUID and selection generation, which the client checks on reply. A 40 MP disposable PNG completed 20 of 20 final XPC preview trials (maximum 396.7 ms in the probe). A requested right-hand SVG tile rendered only the expected blue region.

## Plausible risk and correction

- **Medium — renderer transfer amplification (F006-R07), corrected in code:** a 32 MiB PNG response serialized as a JavaScript number array could consume several times that size. Preview and tile transport are now capped at 8 MiB in the helper, Objective-C client and Rust response validator. An oversized preview retries at half dimension; 1024-pixel tiles retain full-resolution detail. The Rust 1.88 helper test, native suite and final eight-format signed-helper matrix pass after this correction. A pathological high-entropy 8 MiB source was not measured, so memory pressure is reduced rather than eliminated.

## Limits

Malformed decoder crash containment, actual App Sandbox rights, tile behavior under repeated rapid scrolling, packaged visible UI, and remote-request observation were not independently exercised in this review. No document commands or user repository files were used. The cap correction was re-tested with the Rust 1.88 helper/native suites and final signed-helper format matrix; a clean review is not a security guarantee.
