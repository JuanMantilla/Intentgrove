# Phase 1 — Formal contracts and shared prototype model

Status: **PASS** for the user-authorized Phase 1 contract slice. QA_PASSED /
AWAITING_ACCEPTANCE; no DONE_ACCEPTED, cleanup, release or Phase 2 authorization.
Final QA: 2026-10-11, macOS/Darwin arm64, Rust/Cargo 1.88.0.

## Model and ownership

Canonical private library: /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/
Isolated workspace: /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml
Modules: ids.rs, schema.rs, json.rs, validation.rs, diagnostic.rs, limits.rs,
transition.rs, with small public exports in lib.rs. Crate semver 0.1.0, Rust 2021,
MSRV 1.88, publish=false. No app path dependency was added.

Checked SceneId, TargetId, InteractionId, SourceId and canonical lowercase
PrototypeId; TargetKey always pairs scene and target. State is scene-local
boolean visibility keyed by TargetId, exactly as accepted; no StateId/general
variable system was invented. Source/compiled scenes share declarations and one
semantic view. All five actions, CLICK, fixed INSTANT/DISSOLVE, base/overlay roles,
fixed viewport, local state and manifest metadata/capabilities are represented.
Navigation and overlay contracts/caps are explicit, with no execution implementation.

## Exact source format

Strict UTF-8 prototype.source.json, integer sourceVersion=1, required prototypeId,
viewport, entry, visualSources, scenes, interactions; optional title. Visual source
entries have id/path/sha256/exportProfile=vectorcraft-svg-v1. Source scenes carry
visualBinding={source,rootTarget,bounds} instead of compiled visual paths; their
roles/localState/interactions are the same common behavior definitions.
Graph schemaVersion=1; manifest format=intentgrove-prototype, integer version=1,
schemaVersion=1, profile=macos-svg-v1. Source/graph/container/library versions are
separate. Supported V1, missing/malformed, unsupported future/older integer
versions, missing discriminators and experimental POC manifests are tested.

Source serialization: two spaces, LF, stable struct field order, preserved arrays,
semantic round trip. Explicit nulls/control strings and nonfinite bounds rejected.
Incomplete draft editing, file IO, revisions/atomic writes are deferred.

## Validation and diagnostics

One reusable in-memory API checks strict structure/closed enums, duplicate JSON
keys at all depths, integer tokens, byte/depth and early scene/interaction/state
array limits; ID grammar; entry/base role; duplicate scenes/interactions/bindings/
state; references; action source/destination roles; self-NAVIGATE; fixed 100 ms
DISSOLVE only on NAVIGATE; boolean-only state; counts per scene and in aggregate;
viewport sides/area; source references, relative path syntax/digest and finite
bounds matching viewport; compiled visual path; metadata lengths and capability
set equality.

Typed inventories add surviving ordinary target/group/root checks, duplicate and
missing targets, consistent ancestry, nonnested/revealable state groups and an
initially structurally reachable overlay close control. Same target names across
scenes are legal. User navigation cycles are legal. Unreachable base scenes and
missing accessibility labels warn. Actual geometry/clipping/occlusion, source
identity/digest bytes, SVG/resources, ZIP member sets/MIME/hash/CRC and native
reachability remain their accepted later-phase responsibilities.

ValidatedPrototype is immutable and certifies shared graph/inventory semantics;
it is explicitly not ValidatedPackage or a security certificate for visual bytes.
Diagnostics use stable snake_case codes, severity, stage, document-relative member
path, explanatory message, optional scene/target/interaction/related identifier,
and syntax line/column. Decode errors are boxed; semantic validation collects all
bounded diagnostics in deterministic order. Invalid action payload combinations,
including BACK with a destination, cannot deserialize.

## Tests and static checks

**84 contract tests PASS, 0 failures, 0 ignored.** Tests include minimal/full
source, each V1 action, invalid payloads/fields/versions, duplicate keys and IDs,
references/roles, states/inventories/overlay close paths, fixed transitions,
exact/+1 and independent aggregate caps, UTF-8 byte lengths, round trips,
source/compiled diagnostic parity and schema drift.

Final commands (all exit 0, after immutable baseline):

- cargo test --manifest-path crates/Cargo.toml --locked -p igproto-model
- cargo fmt --manifest-path crates/Cargo.toml --all -- --check
- cargo clippy --manifest-path crates/Cargo.toml --locked -p igproto-model --all-targets -- -D warnings
- cargo metadata --manifest-path crates/Cargo.toml --locked --format-version 1
- Python scoped boundary/hash checks, detailed in boundary-results.json.

Commands run from /Users/juanmantilla/projects/personal/md-reader; the command ledger records full absolute manifest paths.
Snapshot: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-1/tested-snapshot.json
Exact input list: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-1/tested-paths.json
Results/logs: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-1/check-results.json, unit.log, format.log, clippy.log,
boundary-results.json, cargo-metadata.json and scope-status.txt.
30 tested files remain byte-identical to final QA baseline.
360 protected app/earlier-feature/POC files unchanged across final QA.
All 16 accepted plan hashes match their preimplementation approval record.
Boundary hashes are scoped final-QA evidence, not retrospective initial hashes.
No VectorCraft source or production UI/runtime edits were made by this task.
The global Spec Kit feature remains 013-windows-desktop; task selection uses both
SPECIFY_FEATURE and SPECIFY_FEATURE_DIRECTORY. The first setup command supplied
only the name, resolved global013 and skipped its existing plan; the corrected
command selected014. No file in013 was written by that command.

Initial development checks found new incomplete-module/concat macro errors,
two test borrow errors and Clippy large-error/boolean/single-element-loop warnings.
All were fixed before the final snapshot/checks. No unresolved new failure.
No unrelated app build was run, so earlier application build/test issues are neither
reclassified nor claimed fixed. GUI/package/compiler/player/security/fidelity/
runtime-performance QA: NOT TESTED and outside this scope.

## Generated contracts and dependencies

Manifest, graph and source JSON Schema under /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/schema/
are generated from Rust through the generate_schemas example and marked GENERATED.
Drift tests compare exact generated contents. Schemas are editor structural aids;
Rust owns references/byte limits/context/area/inventory rules. No TypeScript/MCP
semantic schema or validator clone was added.

Pinned direct dependencies: serde=1.0.228, serde_json=1.0.151,
serde_path_to_error=0.1.20, schemars=1.2.2. Cargo.lock pins 19 dependency
packages. Schemars 1.2.2 MIT/MSRV1.74 verified from local crate manifest; primary
API/Serde compatibility checked at https://docs.rs/schemars/1.2.2/schemars/trait.JsonSchema.html
and https://docs.rs/schemars/1.2.2/schemars/derive.JsonSchema.html.
Dependency closure has no VectorCraft, Tauri, Wry or archive library.
This is a scoped dependency boundary review, not an advisory/fuzz certification.

## Repository impact

Added workspace/lock/ignore; one model crate, developer README, schema generator,
three schemas and conformance suite; seven synthetic contract input files; dedicated
Spec Kit014 spec/design applicability/plan/tasks/verification; QA evidence.
Modified only existing /Users/juanmantilla/projects/personal/md-reader/.agents/state.md to prepend this task's state,
retaining historical/current unrelated records. All task output paths/hashes are in
/Users/juanmantilla/projects/personal/.agents/implementations/interactive-prototype-v1/phase-1/files.json. Accepted baseline documents are referenced and preserved;
local status is recorded in014 rather than altering approved plan hashes.

Fixtures are a complete plain-file graph/manifest/member set with consistent
lengths/hashes. They are not ZIPs, actual exports, author documents, fidelity goldens
or a package-validation claim. Source visual digest is synthetic. Invalid cases
are generated in-memory in tests from the representative contract fixtures.

## Deviations and unresolved issues

Source-only visual DTOs/in-memory parsing and their derived schema are in the model
crate, instead of the future compiler file assignments: explicitly required now by
the user, while compiler/scaffolding is prohibited. Future compiler reuses them and
owns file authority/export orchestration. No architectural dependency reversal.
State/reducer/transition acknowledgment modules from the broader Phase 1 plan are
deferred under the current explicit prohibition on navigation/player execution.
Action documentation, role/reference rules, capacities and transition semantics
establish their contracts now. No builder/edit store or draft editor is implemented.
These are scope refinements from the current instruction, not unresolved failures.

Actual blockers for Phase 2: **none identified** in the model contracts.
Recommendation: **PROCEED TO PHASE 2** when separately requested. No Phase 2 work begun.
