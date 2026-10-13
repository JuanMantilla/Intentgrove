# Feature Specification: Intentgrove interactive prototype V1

**Feature**: 014-interactive-prototype-v1 (installed Spec Kit allocation)
**Created**: 2026-10-11
**Status**: Phase 1 implementation authorized by current user request; later phases deferred.
**Input**: Implement Phase 1 from the accepted baseline at /Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1.

## User Scenarios & Testing

### User Story 1 — One inspectable behavior contract (Priority: P1)

An author or agent reads/serializes source JSON and gets actionable validation
before a later compiler, package reader or MCP can consume it.

**Independent Test**: Rust contract tests, without GUI or VectorCraft.

**Acceptance Scenarios**:

1. Given minimal or full V1 source, decode/serialize/decode preserves semantics.
2. Given malformed structure, future version, wrong reference/role/state/limit,
   the shared APIs reject it with stable diagnostic context.
3. Given visual target inventory, scene-scoped markers/state/overlay close paths
   are checked by the same shared semantics used for compiled graphs.
4. Generated schemas derive from Rust types and drift fails tests.

### User Story 2 — Later production consumption (Priority: P2; deferred)

Compiler/package/native/MCP consumers use these contracts under their accepted
phase scopes. Nothing in this specification authorizes their implementation now.

## Requirements

The authoritative normative requirements are referenced, not restated or forked:
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/igproto-v1.md
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/prototype-model.md
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/authoring-model.md
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/security.md
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/versioning.md
/Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/testing.md

| Requirement | Phase 1 scope |
|---|---|
| IG-P01 | Wire/model contracts; archive conformance deferred |
| IG-P02 | One Rust model/semantic validator; execution deferred |
| IG-P03 | Compiler deferred |
| IG-P04 | Source DTO/decode/serialize; edit stores deferred |
| IG-P05 | MCP deferred |
| IG-P06 | Document/UI integration deferred |
| IG-P07 | Player/navigation execution deferred |
| IG-P08 | Strict JSON/model caps; package/native security deferred |
| IG-P09 | Fidelity deferred |
| IG-P10 | Agent control deferred |
| IG-P11 | Focused contract tests and preserved QA evidence |
| IG-P12 | V1/future/malformed/POC distinction |
| IG-P13 | Model caps only; runtime performance deferred |
| IG-P14 | No VectorCraft or app dependencies; runtime proof deferred |

## Success Criteria

All fourteen user-provided Phase 1 completion criteria pass focused checks.
No ZIP compiler, export integration, package reader, navigation execution, player,
WebView, MCP, production UI or VectorCraft edit is introduced. No commit/push/deploy.

## Approval and boundaries

Authentic authority and accepted contract hashes:
/Users/juanmantilla/projects/personal/.agents/implementations/interactive-prototype-v1/phase-1/approved-contracts.json
The user's current implementation instruction supersedes the plan's earlier
planning-only restriction for Phase 1. No new UX is designed or authorized here;
applicable later UI approval remains for those phases. This feature references
accepted requirements; it does not claim a newly authored replacement spec was
separately approved. Global Spec Kit state remains the unrelated Windows feature.

## Phase 2 authorization amendment — 2026-10-11

The current user accepts Phase 1 and explicitly authorizes Phase 2 from the same
production plan. Scope now includes IG-P01/P03/P04/P08/P11/P12/P14 compiler/package
admission and CLI slices. Later document/player/runtime/control/MCP/UI work remains
deferred. No design or normative format redesign is authorized.
