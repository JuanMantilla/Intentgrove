# Tasks: Interactive prototype V1 — Phase 1

**Input**: /Users/juanmantilla/projects/personal/md-reader/specs/014-interactive-prototype-v1/spec.md
**Scope**: Phase 1 only. Final results are recorded in verification.md.

## Setup

- [x] T001 Allocate/select feature with installed Spec Kit; record current user authority and contract hashes.
- [x] T002 Add isolated private Rust workspace at /Users/juanmantilla/projects/personal/md-reader/crates/Cargo.toml.

## User Story 1 — Shared contracts

- [x] T003 Implement canonical types/IDs and strict JSON at /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/src/.
- [x] T004 Implement shared source/graph validation and typed inventory boundary in /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/src/validation.rs.
- [x] T005 Derive schemas and add drift coverage under /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/schema/.
- [x] T006 Add unit/contract tests at /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/tests/conformance.rs.
- [x] T007 Complete immutable snapshot, final focused checks, requirement ledger and handoff evidence.

## User Story 2 — Deferred

Compiler/package/player/MCP and production integration tasks belong to later
phases in /Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/implementation-phases.md.
No task above authorizes starting them.

## Phase 2 — current user-authorized slice

- [x] T008 Record explicit Phase 1 acceptance and verify its snapshot before Phase 2 edits.
- [x] T009 Implement independent package admission: ZIP envelope/streaming, SVG/CSS profile, PNG decoding and budgets.
- [x] T010 Implement replaceable offline export/asset adapters and compiler using canonical model/source/manifest derivation.
- [x] T011 Add production igproto CLI, explicit roots, atomic selected-output publication and cancellation boundary.
- [x] T012 Preserve minimal native export, representative contract source/package and purpose-specific attacks.
- [x] T013 Verify determinism, security, dependency boundaries, model/schema regression and static checks; preserve QA evidence.
- [x] T014 Actual user acceptance of Phase 2 after review (passing QA alone is not acceptance).

No task above authorizes document integration, runtime execution, WebView, MCP, commit, push or deployment.

## Phase 3 — user-authorized document lifecycle slice

- [x] T015 Grant-backed prototype classification and independent package admission.
- [x] T016 Read-only native document sessions, controlled resources, atomic explicit reload and cleanup.
- [x] T017 Existing tabs, recents, lazy session restore and filename search integration.
- [ ] T018 Focused lifecycle/security and shared-document regression verification with immutable evidence.
- [ ] T019 Actual user acceptance of Phase 3 after review.

Phase 4 player/rendering/runtime, MCP, VectorCraft modifications, commit/push/deploy remain excluded.
