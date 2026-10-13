# Private interactive prototype compiler and package boundary

`igproto-model` owns canonical source, graph, manifest and semantic validation.
`igproto-package` owns in-memory ZIP/SVG/PNG admission, immutable validated packages,
aggregate accounting, canonical serialization and deterministic ZIP writing.
`igproto-compiler` consumes explicit export/asset providers; `igproto-cli` supplies
`igproto validate-source`, `inventory`, `compile`, `validate-package`, and `inspect`.
There are no application, VectorCraft crate, WebKit, runtime execution or MCP
consumers in this phase. All crates are private. Rust 2021/MSRV 1.88.

## Offline export bundle contract

The saved-export adapter is deliberately narrow and replaceable. Authors use the
pinned VectorCraft CLI/MCP outside the compiler to export each selected scene with
hiddenLayers=true, outlineText=false, preserveEditing=false, metadata=false,
objectIds=minimal, fixed dimensions and simple presentation/style attributes.
The compiler does not read VectorCraft document internals or NodeIds.

An explicit authoring read root contains `prototype.source.json` and its
`visualSources` files. The export root contains `scenes/<scene-id>.svg`, relative
PNG files, `export.warnings.txt` (the preserved exporter warning channel, which must be empty),
and `export.source.json`: a snapshot of the canonical source at export
time. Snapshot visualSource digests/profile, scene bindings/rootTarget/bounds,
prototype UUID and viewport must match the current source. Interaction edits may
change without re-exporting unchanged artwork. Snapshot semantics do not replace
the current authoring semantics and are never packaged. Export bundles are inputs,
not authenticated origin certificates. File identity/digest checks detect source
revision changes; all exported content is still treated as hostile.

V1 filesystem adapters currently support Unix through descriptor-relative,
no-follow traversal. The model/package libraries and in-memory provider traits are
platform-neutral. Other filesystem platforms fail closed pending a native adapter.
No filesystem root, relative component, input or output may be a symlink. Aliased
hard-link outputs are rejected. Output replacement uses a selected directory,
compiler-owned temporary file, fsync, identity recheck and atomic rename. Ordinary
OS races after the final identity check remain; the destination is explicitly
selected build output. Abrupt process termination can leave a compiler temporary
file; cooperative `Control::cancel` unwinds cleanly. No cleanup worker is launched.

## Example

From any directory, build the representative fixture:

```sh
cargo run --manifest-path /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml -p igproto-cli -- compile --source /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative/prototype.source.json --read-root /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative --exports /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative --write-root /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2 --output /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative-v1.igproto --json --deny-warnings
```

`validate-package` and `inspect` take `--package` plus `--read-root`; neither invokes
the compiler or VectorCraft. `--json` emits one result object. Exit codes are 0
success, 2 invalid input/warnings denied, 3 I/O/source conflict, and 130 cooperative
cancellation. There is no exporter subprocess failure code because this phase
uses offline exports exclusively. The library exposes cancellable/deadline-bounded
compilation and admission; no CLI command starts playback or external processes.
`inventory` validates the full candidate in memory and reports marker inventory.

## Visual profile

The checked-in element/property table is the macos-svg-v1 allowlist. Unknown or
unsafe elements/properties fail. Shapes, paths, groups/transforms, Arial text,
gradients, clipping, static PNGs and the specified shadow primitives are preserved.
Simple authoring CSS declarations are tokenized, validated per element/value,
cascaded and emitted as attributes; runtime styles are rejected. Comments and
classified inert `data-vc-blend=normal/multiply` annotations are removed; annotations
produce warnings. Text whitespace, numeric geometry and paint order are preserved.
Visual IDs are canonicalized by element order; prototype IDs remain unchanged.

Filter allocation uses conservative control-point/text bounds and composed scale
at CSS scale 1. It can reject unusually large/offscreen text or effects rather than
silently degrading them. Device-scale/zoom surface accounting, actual occlusion,
font-face availability and rendered fidelity belong to later native phases.
Those limitations are not a promise of safe allocation at arbitrary device scale.

## Checks

```sh
cargo test --manifest-path /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml --locked --workspace
cargo fmt --manifest-path /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml --all -- --check
cargo clippy --manifest-path /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml --locked --workspace --all-targets -- -D warnings
python3 -B /Users/juanmantilla/projects/personal/md-reader/crates/check_boundaries.py
```

Schemas remain generated solely by igproto-model. Its drift test is mandatory.
Fixtures and QA evidence live under /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/
and /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/.
These are contract fixtures, not production-ready authored content.
