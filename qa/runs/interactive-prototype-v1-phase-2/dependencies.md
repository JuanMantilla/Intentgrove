# Phase 2 dependency review

All direct pins and transitive versions are in /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.lock.
All own Rust crates forbid unsafe code. No runtime dependency starts a process,
invokes a browser, loads a font, executes input code or performs network IO.
Compile-time procedural macros/build scripts run through Cargo as normal trusted
tooling; these are not archive-selected or runtime code.

| New direct dependency | Purpose / enabled features | License / MSRV | Bounds and unsafe exposure |
|---|---|---|---|
| zip 6.0.0 | ZIP decoder/writer; defaults off, deflate-flate2 only | MIT / 1.83 | Strict envelope scanned before ZIP construction; no extraction; actual CRC/size verification. ZIP internals and transitive code may use unsafe; lexical inventory retained. |
| flate2 1.1.10 | Verify exact DEFLATE stream consumption; defaults off, rust_backend | MIT OR Apache-2.0 / 1.67 | 64 KiB streaming buffers, expanded cap+size and full compressed consumption. No C zlib or zopfli. |
| roxmltree 0.21.1 | XML document parser | MIT OR Apache-2.0 / 1.60 | 2 MiB input, 30,001 parser nodes, DTD off; then 10,000 elements/depth 40 and typed reconstruction. No resolver/network capability. |
| svgtypes 0.16.1 | Paths, lengths, transforms, colors, aspect ratios | MIT OR Apache-2.0 / 1.85 | Attribute and operation/command/numeric limits; caller tightens permissive numeric/color defaults. |
| cssparser 0.36.0 | Tokenize simple authoring declaration lists and escapes | MPL-2.0 / 1.68 | 16 KiB style value, presentation properties only, numeric function bodies cannot recurse. No stylesheets/HTML stack. |
| png 0.18.1 | Static PNG complete metadata/pixel decode | MIT OR Apache-2.0 / 1.73 | 8 MiB input, CRC framing of every chunk, APNG/unknown critical rejected, 4096 sides/8,388,608 pixels, decoder allocation cap; rows decoded with cancellation checks. Bytes preserved, no transcode. |
| sha2 0.10.9 | Content/address and package digests | MIT OR Apache-2.0 | No input-selected code; CPU detection/intrinsics in transitive crypto code may use unsafe. |
| crc32fast 1.5.2 | PNG chunk CRC coverage including ancillary data | MIT OR Apache-2.0 | Bounded chunk slices; optional platform intrinsics/CPU detection have unsafe exposure. |
| base64 0.22.1 | Embedded PNG input in compiler only | MIT OR Apache-2.0 / 1.48 | SVG and encoded/decoded byte caps; output is exclusively packaged PNG. |
| rustix 1.1.2 | Compiler Unix no-follow descriptor traversal and atomic publication; fs feature | Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT / 1.63 | Unsafe syscall abstraction internally; regular files/approved roots only. Outside model/package closure. |

Reused serde 1.0.228 and serde_json 1.0.151 supply derived result serialization and
canonical object-key order. Phase 1 remains the strict source/graph/manifest decoder
and sole schema owner. No dependency bump to the existing model direct pins.

Primary review references: [ZIP feature documentation](https://docs.rs/zip/6.0.0/zip/),
[SVG typed parser](https://docs.rs/svgtypes/0.16.1/svgtypes/),
[PNG decoder](https://docs.rs/png/0.18.1/png/),
[XML parsing options](https://docs.rs/roxmltree/0.21.1/roxmltree/struct.ParsingOptions.html),
[CSS tokenizer](https://docs.rs/cssparser/0.36.0/cssparser/),
[descriptor-relative open](https://docs.rs/rustix/1.1.2/rustix/fs/fn.openat.html).
Pinned local crate manifests/source were inspected when docs retrieval failed.
The current ZIP line has newer releases; 6.0.0 was pinned to the small inspected
MSRV-compatible API rather than adding newer extraction/platform machinery.

[RUSTSEC-2025-0168](https://rustsec.org/advisories/RUSTSEC-2025-0168.html) affects
ZIP extraction in versions below 2.3.0 and does not affect the 6.0.0 pin. This
implementation never extracts archives. The local runner has no cargo-audit binary;
web/source inspection is a scoped review, not a complete advisory database audit,
fuzz certification or independent security acceptance. Later Phase 5 retains those
review gates. No critical/high issue was observed in the exercised boundary.

Release implications: include MIT/Apache notices and the MPL-2.0 dependency's
source/notice obligations in eventual distributed package-library release review.
Compiler/base64/rustix/CLI do not enter the app dependency closure. No release,
license registration, installation or native platform certification occurred here.
Machine-readable license/MSRV/source token inventory: dependency-review.json.
