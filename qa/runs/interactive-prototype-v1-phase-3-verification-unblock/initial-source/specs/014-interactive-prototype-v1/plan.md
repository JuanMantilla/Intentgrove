# Implementation Plan: Interactive prototype V1 — Phase 1

**Feature**: 014-interactive-prototype-v1 | **Date**: 2026-10-11
**Specification**: /Users/juanmantilla/projects/personal/md-reader/specs/014-interactive-prototype-v1/spec.md

## Summary

Implement canonical strict V1 Rust contracts and shared semantic validation against
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/implementation-phases.md. Current user scope excludes execution/runtime.

## Technical Context

Rust 2021/MSRV 1.88, private standalone Cargo workspace, one igproto-model member.
Pinned serde 1.0.228, serde_json 1.0.151, serde_path_to_error 0.1.20 and schemars
1.2.2; workspace Cargo.lock pins the transitive closure. Schemars is MIT and MSRV
1.74; its derive follows Serde's closed shapes. Primary dependency references:
https://docs.rs/schemars/1.2.2/schemars/trait.JsonSchema.html
https://docs.rs/schemars/1.2.2/schemars/derive.JsonSchema.html
No storage/host IO/GUI/SVG/archive dependencies in the library. Synthetic fixtures.

## Constitution / authority check

Current user explicitly authorizes this scoped implementation from the accepted
plan. Approved baseline hashes are captured before code. No UI gate applies to
this data-library slice. Existing dirty work, POC and VectorCraft are protected.
Spec Kit feature is selected by both SPECIFY_FEATURE and SPECIFY_FEATURE_DIRECTORY
per command; no persisted feature override, branch creation, commit or push.

## Project Structure

/Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml
/Users/juanmantilla/projects/personal/md-reader/crates/Cargo.lock
/Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/
/Users/juanmantilla/projects/personal/md-reader/tests/fixtures/prototype/contracts/

Model modules: ids, schema, json, validation, diagnostic, limits, transition.
Source/compiled wire scenes share a macro declaration and SceneDefinition semantic
view. Closed common actions/interactions/state are reused verbatim. Generated
manifest/graph/source schemas live with the canonical crate and have drift tests.

## Scope adjustments against future file assignments

Source-only DTOs and in-memory parsing live in igproto-model because the user
requires Phase 1 source round trips and prohibits compiler scaffolding. Compiler
file access, export, draft editors and revision/atomic writes remain deferred.
Source schema consequently resides in this crate. State/reducer/presentation-token
modules in the broader plan are deferred by the user's explicit navigation/player
restriction. Their declarative action contracts and fixed caps are documented.

## Verification

Run crate-only tests, fmt, Clippy with warnings denied, schema drift, lock/metadata
and dependency boundary checks. Capture exact tested files before final checks and
retain immutable snapshot/results. No unrelated app build. Passing scoped QA is
AWAITING_ACCEPTANCE, not DONE_ACCEPTED or a cleanup/release instruction.

## Phase 2 implementation amendment — 2026-10-11

Use the already-approved isolated workspace with igproto-package, igproto-compiler
and igproto-cli. Reuse canonical model semantics and schemas. Offline saved-export
providers implement the accepted bundle path; no live process adapter is required
for this user-authorized slice. Package admission owns ZIP/SVG/CSS/PNG budgets and
security. A documented tagged-ancestry defect is corrected narrowly in the model;
see /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/model-defect.md.
All checks remain focused on these crates. Phase 2 acceptance remains a separate
user decision after QA; no later phase starts automatically.

## Phase 3 implementation amendment — 2026-10-11

Explicit Phase 2 acceptance recorded by the QA completion helper before application
changes; current user authorizes only document/package lifecycle. Existing granted
local-view descriptors/dispatch are extracted into a neutral facade with HTML
compatibility re-exports. Prototype sessions are owned per AppState, use the
production package validator and native identity, and have no player/runtime state.
Schema 1 references/recents are reused. Native close keeps bounded handle-free
reopen references for existing visit-history behavior. Atomic explicit reload keeps
prior valid content on validation failure, revokes it on lost/substituted authority.
One narrow package-library addition exposes immutable admitted resource accounting
for the mandated cross-session reservations; no parsing/security/schema changes.
No rendering, WebView/resource scheme, runtime, MCP, association or VectorCraft
change belongs to this slice. Evidence is task-local in
/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3/.

The affected refresh/reload integration tests now link the actual production library
via an explicit `document-contract-tests` Cargo feature. Default application builds
exclude this Rust-only facade and disposable fixture helpers; there is no new IPC,
listener, agent control or player adapter. Original assertions remain intact. The
previous source-file-only test setup omitted the document dependencies introduced
in this phase (and existing HTML/image dependencies). Windows scoped assertions are
retained through the same test-only facade; Windows host execution is not claimed.
