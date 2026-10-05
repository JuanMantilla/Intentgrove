# Tasks: Windows desktop port (F007W)

Generated 2026-10-05 through installed Spec Kit setup-tasks.sh and tasks-template; active feature confirmed via check-prerequisites.sh. Seven approved hashes match. Checkboxes describe source work, never target verification.

## Phase 1: Foundation (FR-011)
- [x] T001 Confirm feature/approval and record initial worktree status in evidence/implementation.md.
- [x] T002 Extract scoped macOS mechanisms into src-tauri/src/platform/macos.rs; move stamps/offset reads behind platform module; run existing Mac Rust regressions.

## Phase 2: US1 — read local workspaces (FR-001–004,010)
- [x] T003 Implement anchored Windows selection/descendant opens, NTFS identity and bounded enumeration in src-tauri/src/platform/windows.rs; add disposable native fixture tests.
- [x] T004 Integrate bounded reads/stamps into document.rs, listing.rs and large_source.rs; preserve cancellation/search/grant checks.
- [x] T005 Gate image XPC behind macOS and return explicit Windows unavailable errors in image.rs.
- [ ] T006 Run Windows native blocked-path/rename/reparse/recall/search/read tests; record environment and unchanged hashes (NOT TESTED without runner).

## Phase 3: US2 — private continuity and editing (FR-005–007)
- [x] T007 Extract private storage and locking operations; implement current-user Windows DACL/owner checks, local app data, serialized flushed publication; preserve recovery/session/recents schemas.
- [ ] T008 Exercise Windows multi-instance locks/corrupt records/restart recovery with disposable data (NOT TESTED without runner).
- [x] T009 Extract macOS stage/commit mechanisms; keep Windows original Save/Save As explicitly unavailable pending native experiments.
- [ ] T010 Select/implement Windows safe-save after native sharing/race/metadata experiments; verify BOM/CRLF/conflict/failure/recovery before enabling editing (blocked on native evidence).

## Phase 4: US3 — desktop and packaging (FR-002,008–011)
- [x] T011 Wire Ctrl shortcuts/labels, capability-aware disabled editing, dialogs/drop and guarded final exit using existing bridge/UI.
- [ ] T012 Run native Windows whole-crate build, WebView2 navigation/CSP, dialogs/drop/close and 100/150/200% scaling checks (NOT TESTED without runner).
- [x] T013 Prepare unsigned current-user NSIS override without associations/runtime downloads; construction follows native checks, installation excluded.
- [x] T014 Run existing frontend/build and Mac native checks; update evidence/implementation.md and .agents/state.md with exact remaining commands.

## Execution status — 2026-10-05

Checked tasks mean implemented source or completed local check execution, **not** Windows support. T003/T007 are native prototypes, not Windows compiler/runtime-verified providers. T002/T014 have passing affected library/integration checks but two unresolved Mac automatic-refresh watcher timeouts. T013 is configuration only; installer construction remains gated. Windows T006/T008/T010/T012 are NOT TESTED; safe-save implementation/enablement waits for native experiments. [Actual results and exact next commands](evidence/implementation.md).

## Dependencies and gates
T002 precedes T003/T007/T009. T003–005 precede T006/T012. T007 precedes T008. T008 and T010 native verification precede editing enablement. T012 precedes NSIS construction. No tool installs, CI/security/schema changes, signing, commits, publication or image worker design are part of these tasks.
