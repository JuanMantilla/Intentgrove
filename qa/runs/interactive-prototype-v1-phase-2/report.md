# Phase 2 — Compiler, package validation, and VectorCraft export adapter

Status: **PASS** in the user-authorized Phase 2 scope. **332 passed, 0 failed**.
QA_PASSED / AWAITING_ACCEPTANCE. Phase 1 acceptance was durably recorded before
Phase 2 changes, using the explicit acceptance in the current user instruction.
No Phase 3 work, commit, push, deployment or cleanup worker was started.

## Compiler and package modules

Private isolated workspace: /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml.
New /Users/juanmantilla/projects/personal/md-reader/crates/igproto-package/ owns
archive.rs, writer.rs, svg.rs, svg_policy.rs, css.rs, images.rs, resources.rs,
limits.rs, budget.rs, diagnostics.rs and immutable ValidatedPackage admission.
New /Users/juanmantilla/projects/personal/md-reader/crates/igproto-compiler/ owns
pipeline.rs, export.rs, vectorcraft.rs, files.rs and jobs.rs. Public replaceable
ExportProvider/AssetProvider traits supply frozen visual inputs; the pipeline
consumes canonical source, derives graph/manifest, validates again and rereads ZIP.
New /Users/juanmantilla/projects/personal/md-reader/crates/igproto-cli/ supplies
igproto validate-source, inventory, compile, validate-package and inspect; explicit
absolute roots/paths, JSON results, deny-warnings and atomic selected output.
No package/model dependency on compiler, UI, WebKit, MCP or VectorCraft.

## Exact production container

ZIP members: manifest.json, prototype.json, scenes/<scene-id>.svg and optional
assets/<sha256>.png. Exact declared inventory, MIME, uncompressed lengths and
SHA-256 are verified. Authoring source, snapshots/warnings, native VectorCraft
files, scratch files and executable members are excluded. Manifest version 1,
schemaVersion 1, macos-svg-v1 and intentgrove-prototype are canonical model types.
Compiled semantics contain only the accepted graph fields; no runtime execution.

## VectorCraft boundary and provenance

Boundary B: already-exported scene SVGs under an explicit export root, plus canonical
prototype.source.json under an authoring read root and local PNGs. SavedExports
requires export.source.json (canonical export-time source snapshot) and preserved
empty export.warnings.txt. Visual bindings, viewport, UUID, source hashes/profile
must agree; behavior-only edits do not require re-exporting. Unknown exporter
warnings block compilation. Native authoring files are streamed for identity/SHA
verification, never parsed for NodeIds or linked as VectorCraft Rust crates.
The pinned existing VectorCraft CLI freshly authored/exported the minimal fixture.
Full options/results and source revision evidence are preserved in vectorcraft-export.json.
Four original accepted POC SVG exports are copied unchanged solely for sanitizer
compatibility, with no POC code/schema used as production authority.
Scene/source-relative visual path, source/export digests, export profile and compiler
version are returned outside the archive. No derived absolute host paths are packaged.

## SVG and target policy

A bounded real XML parser (DTD off, 2 MiB, 30,001 parser nodes), explicit element/
property applicability table, SVG value parsers and CSS tokenizer reconstruct output.
Supported shapes/paths/groups/transforms, text/tspan with Arial, gradients, clipping,
static packaged images and the specified shadow filter primitives are preserved.
Root dimensions/viewBox match the fixed viewport; explicit artboard origins normalize
by a wrapper transform without quantization. Attributes/resource IDs normalize
while element order and text whitespace remain intact. Original SVG geometry strings
and CSS numeric token spellings are preserved; a regression exposed and corrected
cssparser token serialization rounding before the final checks.
Scripts, handlers (case/namespace variants), links, foreignObject, stylesheets,
animations, use/symbol/pattern/mask, unsafe/external/file/unsupported-scheme URLs,
external fonts/resources, CSS escapes importing resources, var/calc/custom properties,
unknown/inapplicable attributes, unsafe XML/entity/PI/encoding constructs and invalid
fragment/filter dependency graphs reject. Runtime SVG has no style attributes or
data resources. Comments and classified inert data-vc-blend=normal/multiply annotations
are removable; annotations warn, filter primitives remain intact.
Conservative geometry includes text spacing/position lists, relative paths, composed
transforms and resolved filter regions/blur/offset. Native device-scale/zoom/font-face/
actual clipping/occlusion/fidelity admission remains in later phases.

Every data-prototype-id is checked by the canonical TargetId. It survives unchanged
on a permitted ordinary rendered node, appears once per scene, and carries typed
ancestry/visibility facts. Missing/duplicate/malformed or definition/unrendered markers
reject. Referenced interaction/state/root targets use the shared model validator;
repeated names across scenes are valid. Unreferenced markers are preserved/inventoried
with compiler warnings. State initialVisible/authored display conflicts warn.

## Assets and security bounds

Static PNG only: signature, every chunk CRC, complete metadata/pixel decoder validation,
APNG/unknown critical/truncated/trailing/corrupt data rejection. Maximum 128 assets,
8 MiB each, 96 MiB encoded total, sides 4096, 8,388,608 pixels/image and 128 MiB RGBA
aggregate. Original bytes/color-management data are preserved; no transcoding.
Local or embedded authoring PNGs normalize to digest paths and byte-identical assets
deduplicate. Repeated local references share one captured snapshot; the bytes are
rechecked before serialization. Native authoring filenames may be Unicode; package
paths remain ASCII and URI-encoded traversal is rejected. Secure Unix adapters use
no-follow descriptor-relative traversal, same-handle checks and reopened identities.
Symlinks/special files, escaping components and aliased hard-link outputs reject.
Filesystem adapters on other platforms fail closed; in-memory model/package APIs
remain platform-neutral.

Independent package admission inspects the ZIP envelope before decoder allocation,
never extracts, accepts STORE/bounded DEFLATE, checks header agreement/CRC/ranges and
exact expanded streams. It rejects traversal, absolute/drive/UNC/encoded/non-ASCII/
case aliases, duplicates, special files, ZIP64/encryption, descriptors/extra fields/
comments/stubs/trailing payload and unexpected metadata. Caps: 32 MiB compressed,
128 MiB expanded, 162 entries, 100:1 per-entry ratio and per-member budgets.
DEFLATE consumption is checked so compressed trailing data cannot hide behind EOF.
Cancellation/deadline checks guard reads, PNG rows and compilation/admission phases;
compiler jobs are limited to two per process. Normal OS races after a final publication
identity check and abrupt-process temporary-file retention are documented in the
workspace README; cooperative cancellation preserves prior output and cleans its temp.

## Determinism and contract fixture

STORE; lexicographic entries; fixed 1980-01-01 00:00:00 timestamp; regular 0644 ZIP
metadata; no extras/comments/descriptors. Canonical JSON keys and semantic arrays
are sorted; SVG order/precision/whitespace preserved, attributes/resources normalized.
Fresh builds under different input/output roots and time zones, including reordered
source arrays, match the preserved fixture byte for byte. Meaningful input changes
alter the expected member/digest. Independent validation of each build passes.

Contract artifact: /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative-v1.igproto
Bytes: 6022
SHA-256: babda9a68bbb28a7473a72830c7db832773de3f6aa2ad0073639ddac25ab0032
Authoring inputs: /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/representative/
Minimal native-export artifact: /Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/phase-2/minimal-v1.igproto
SHA-256: 552d07a2ee35670912f21a7d33138fc319043c40728b600f90d064cc13b24ad9
These are contract fixtures, not production-ready authored content.

## Tests and dependency review

332 tests PASS: CLI 12, compiler 45, model 86, aggregate limits 8, package security 70,
SVG security 111. 153 dedicated hostile/malformed SVG/package rejection tests PASS;
all 23 POC attack cases map to current production tests. Fourteen small malicious
archives are preserved, plus SVG/invalid-target inputs and in-memory hostile builders.
Exact/+1 bounds cover model quotas and package aggregates plus key XML/path/ref/filter/
text/transform budgets. Full maximum-size PNG/asset corpus performance and exhaustive
fuzzing are not certified by these focused tests; later Phase 5 retains those gates.

Final immutable inputs: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/tested-snapshot-v7.json.
Final unit, formatting, Clippy -D warnings, schema drift (model test), dependency
closure, reproducibility and tested/approved hashes PASS. Command/time/log ledger:
/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/check-results.json.
New direct pins: zip 6.0.0, flate2 1.1.10, roxmltree 0.21.1, svgtypes 0.16.1,
cssparser 0.36.0, png 0.18.1, sha2 0.10.9, crc32fast 1.5.2, base64 0.22.1 and
rustix 1.1.2. Purposes/features/bounds/licenses/MSRV/unsafe exposure/release implications:
/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/dependencies.md.
No runtime input-selected external execution. No browser/HTML stack introduced.
Local source/advisory review is scoped; cargo-audit is unavailable and independent
security/fuzz/native isolation certification is not claimed.

## Impact, deviations and regression

Task edits: isolated workspace/lock/new package/compiler/CLI modules and tests,
crates README/boundary checker; phase-2 fixtures; task-local014 amendments; state/QA
records and explicit Phase 1 acceptance record. Detailed input/file hashes are in
tested-snapshot-v7.json and fixture-inventory.json. The accepted 16 production plan
hashes match. Global Spec Kit013 remains unchanged;014 selection is task-local.

Small model correction: local-state reveal checks now inspect tagged ancestor hiding;
SVG facts keep untagged flags separate so initial state can override tagged display.
Two model regressions prove the defect/fix; the original 84 still pass. The existing
canonical authoring-path predicate is exposed for reuse without changing its grammar.
No model wire/schema/action/transition/version expansion. Evidence:
/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/model-defect.md.
Offline exports implement the accepted replaceable bundle path; live export process
orchestration, draft/source stores and MCP are intentionally deferred. Source schemas
remain in igproto-model, carrying forward the accepted Phase 1 ownership.

No Phase 2 command edited application/UI/runtime code. The shared workspace did
change three already-dirty files during this run: /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx,
/Users/juanmantilla/projects/personal/md-reader/src/reader/MarkdownView.tsx and
/Users/juanmantilla/projects/personal/md-reader/src/styles/app.css. Their author/process
was not independently attributed. They are preserved, excluded from Phase 2 checks,
and recorded with before/after hashes; no claim of whole-workspace byte immutability.
All 97 tested inputs remain identical to final snapshot. VectorCraft HEAD/status are
unchanged at 67943857311d820c2bf08eded9ff80683393d254. No app packaging/UI/native build
was run; unrelated pre-existing application outcomes were not reclassified.
Development compile/lint errors and the documented model/path/CSS reproductions were
fixed before the final snapshot. Earlier snapshots/check attempts are developmental,
including a rejected immutable-snapshot overwrite; final checks use v7 only.

Phase 1 regression: **PASS — original 84 plus two new tests**.
Unresolved Phase 2 issues: none. Actual technical blockers for Phase 3: none identified.
Recommendation: **PROCEED TO PHASE 3** after Phase 2 review/acceptance and a separate
implementation request. No Phase 3 work started. Passing scoped QA is not user acceptance,
release approval or permission to modify the application or start cleanup.
