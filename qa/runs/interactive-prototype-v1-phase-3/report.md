# Verification follow-up — 2026-10-12T04:16:47.940087+00:00

Whole-app strict Clippy is now **PASS: zero diagnostics**, after independent **54 baseline / 0 new** reproduction and separately authorized maintenance. This does not alter the lifecycle implementation history below. Phase 3 remains **PARTIAL / QA_FAILED / BLOCKED** because the current full frontend suite has one Markdown close-editor setup failure (710/711 PASS; isolated27/27 PASS). Actual acceptance remains pending. Full record: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-verification-unblock/report.md. Separate maintenance: /Users/juanmantilla/projects/personal/md-reader/qa/runs/strict-clippy-baseline-cleanup/report.md. Next: fix/retest the remaining frontend verification gate; no Phase 4.

---

# Phase 3 — Intentgrove document/package lifecycle integration

## Phase 3 status

**PARTIAL: implementation complete and functional/regression verification PASS; strict whole-application native Clippy remains FAIL on the unchanged baseline.** No new Clippy diagnostics (54 before, 54 after). This report does not silently waive the user-requested warnings-denied check. QA_FAILED / BLOCKED for that static-check limitation; Phase 3 acceptance has not been invented.

Phase 2 acceptance was explicitly supplied by the user (“Accept Phase 2 and proceed with Phase 3”) and durably recorded before application edits. Its 97 tested inputs matched the Phase 2 final snapshot. Acceptance evidence: /Users/juanmantilla/projects/personal/md-reader/docs/approval-records/interactive-prototype-v1-phase-2-accepted.json and /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-2/completion-accepted.json. No cleanup worker started.

## Document architecture

Existing architecture inspected with CodeGraph first. /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/selection.rs and /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/native_entry.rs obtain native selections/queued acceptance; /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/scope.rs and /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/platform/macos.rs enforce native local regular-file/no-follow access; /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/state.rs owns grants, native device/inode identity and invalidation. Markdown decoding stays in /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/document.rs; drafts/save/recovery remain in their existing editing/recovery services. /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx owns tabs, active document, document visits, dirty/draft guards and routing. Existing recents, persisted references/restore and watchers remain in /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/recents.rs, /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/session.rs and /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/refresh.rs.

New /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/document_view.rs extracts neutral LocalTarget/LocalView, grant resolution, dispatch, cancellation and disposal from HTML-specific code. HTML compatibility re-exports remain. Kinds are markdown/image/html/details/**prototype**. New /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/prototype/mod.rs, /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/prototype/loader.rs, /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/prototype/session.rs and /Users/juanmantilla/projects/personal/md-reader/src-tauri/src/prototype/commands.rs own the prototype lifecycle. There is no parallel tab/session persistence system.

Frontend descriptors/refinement and lifecycle are in /Users/juanmantilla/projects/personal/md-reader/src/app/documentView.ts, /Users/juanmantilla/projects/personal/md-reader/src/app/documentBoundary.ts, /Users/juanmantilla/projects/personal/md-reader/src/app/prototypeNative.ts and /Users/juanmantilla/projects/personal/md-reader/src/app/prototypeController.ts. /Users/juanmantilla/projects/personal/md-reader/src/reader/PrototypeView.tsx is metadata/status only.

## .igproto recognition

Case-insensitive `.igproto` extension through native picker, native queue/Finder/drop, both macOS listing classifiers, tree, filename-only search, granted local links, recents and lazy restore. `.zip` is never identified by its content. Markdown-response defenses reject prototype filenames. MIME/UTI/OS association registration is deferred; no IANA claim or default-handler change. Admission explicitly rejects unsupported platforms; enabled profile is macOS arm64.

## Native file access

Existing granted native handles/references are reused. Main-window caller checks protect all new commands. Root and file identity are rechecked around bounded reads and admission. The existing macOS adapter uses native selected descriptors and stored native references, not security-scoped bookmarks; no new bypass or authorization path was added. Frontend paths are display data. Neither a WebView nor a file URL consumes packages.

## Validation boundary

Bounded native positional read (production 32 MiB cap), identity/stamp checks, `igproto-package::validate_with_control`, then immutable ValidatedPackage and PrototypeDocument creation. Package parsing, manifest/graph validation, SVG/PNG admission and integrity remain exclusively in /Users/juanmantilla/projects/personal/md-reader/crates/igproto-package/ and /Users/juanmantilla/projects/personal/md-reader/crates/igproto-model/. No extraction, application ZIP/JSON parser, SVG sanitizer or PNG decoder. Even duplicate opens revalidate before focusing the retained snapshot. Every restore/recent reopen is a new trust boundary.

## PrototypeDocument

Native source grant/reference, existing native identity, opaque token, generation, immutable validated snapshot/digest, title, entry scene, viewport, version, scene count and reload diagnostics. Per-AppState registry with independent per-document state. No runtime scene/history/overlay/toggle/transition/DOM/WebView fields. Four live documents, two pending loads. Aggregate expanded and decoded-PNG limits are enforced by conservative full-package reservations before parsing (256 MiB aggregate), using exact immutable accounting exposed by the package validator. Validation/I/O is outside the document registry lock; all open routes and reloads participate in cancellation, including search.

## Read-only behavior

Prototype never enters Markdown decoding, section editing, save, draft or recovery ownership. Native checkpoint validation rejects prototype edit/recovery fields. Shell excludes Edit/Save/Find/outline, offers Close/Reload and safe metadata. Future runtime interaction cannot mark documents dirty.

## Tabs

Two prototypes plus Markdown coexist; identity dedup, independent reload, active switching and close isolation PASS. Same native file focuses its existing owner; copies with equal SHA/UUID remain separate. Root rebinding preserves tab/token identity and releases the replaced explicit-file handle.

## Recents

Existing Document category and native identity/reference only. Recording requires a successfully admitted live prototype. Reopen revalidates; corrupt/missing sources fail through existing error/reselection patterns. No metadata, resources or runtime state persisted. Native and actual-App mocked transport tests PASS.

## Session persistence

Schema 1 reference/identity, order/active key and lifecycle disk version remain. No new persisted fields. Prototype anchors normalize to neutral values; no zoom/navigation/local state/package bytes. Original checksum/default serialization tests PASS.

## Session restore

Existing native grant resolution followed by lazy independent admission. Previously valid hashes do not bypass validation. Valid restore, changed-invalid content, missing source and recovery-state refusal PASS. Future runtime is fresh at the validated entry scene; no playback execution occurs in this phase.

## Reload

Explicit-only. Validate a candidate from the current permitted native identity, atomically replace the snapshot/metadata and advance generation on success, including unchanged-byte explicit reload. Failure retains the old valid snapshot and reports “Reload failed; showing previous version”. Missing/denied/revoked/substituted authority revokes the snapshot and requires retry/reselection. External fingerprint changes show “Prototype changed — Reload to restart” and never auto-replace data. Stale/cancelled callbacks cannot resurrect a closed owner or mutate another document. PASS.

## Resource lifecycle

Close is idempotent, cancels owner reloads and releases snapshot/native handles. Bounded native reopen references retain no handles or package bytes. Window close/quit cancel every prototype admission route and prevent new admissions until normal window reinitialization. Close/reopen, weak-reference release, grant revocation, shutdown cancellation and closing another document during admission PASS.

## Future player boundary

ValidatedResources supplies immutable canonical manifest/graph, scene-by-SceneId and PNG-by-SHA. Snapshot acquisition checks live grant/token/generation. No arbitrary member traversal/file/network access, resource IPC, URL scheme, player surface, rendering or execution. Successful generation replacement is the Phase 4 reset-to-entry boundary.

## Security boundary

All 14 preserved hostile Phase 2 `.igproto` packages reject through production application dispatch with structured diagnostics and no PrototypeDocument. Additional version/integrity/limit/denied/missing/symlink/substitution/cancellation/aggregate-reservation cases PASS. Error codes preserve bounded igproto-package/model diagnostic reports; UI presents concise localized messages. Package-layer exhaustive tests remain separate.

## Markdown regression

**PASS for final frozen frontend candidate and native production-library regressions.** Full 707 frontend tests PASS; native 164 library tests plus 19 refresh/reload tests PASS, five pre-existing ignored tests. Six previously unstable suites also pass against original and current source (94 each). No assertion/timeout suppression. Broad development runs, an invalidated live-source run, and incomplete isolated copies retain their failures; they are not final PASS evidence. The incomplete copy passed 700 assertions but failed three suite imports; copying the unchanged QA support dependencies produced the final clean 707-test result. Concurrent document-selection changes were preserved and reverified in an isolated candidate whose 258 frontend/input hashes match current source.

## Phase 1 regression

**PASS — 86 actual model tests (original 84 plus Phase 2 regressions).** No model source/schema changes.

## Phase 2 regression

**PASS — workspace 332 tests total, including model, compiler, CLI, package/limit/SVG suites.** Contract fixture remains 6,022 bytes, SHA-256 `babda9a68bbb28a7473a72830c7db832773de3f6aa2ad0073639ddac25ab0032`. No fixture regeneration or compiler change. Final workspace tests run against byte-identical isolated crate/fixture inputs, recorded in prototype-crates-candidate-inputs.json, because filesystem tests alter fixture ctime. The earlier completion attempt was rejected for four ctime-only changes; snapshots and rejection evidence are retained. The final v7 source snapshot has no byte or stat drift.

## Tests

Unique final tests: **1,222 PASS, 0 FAIL, 5 existing ignored** (707 frontend +183 native +332 prototype workspace). Twenty-two new native lifecycle/security/search/recents/session cases and 33 new frontend prototype cases are included. Final commands/times/logs are in check-results.json; source baseline is tested-snapshot-v7.json, and isolated frontend bytes are in frontend-candidate-inputs-final.json. TypeScript, Vite, default native check, package/model/compiler formatting and Clippy `-D warnings`, task Rust formatting and dependency/security boundaries PASS. Native whole-app Clippy `-D warnings`: **FAIL — exactly 54 original baseline diagnostics, no new diagnostics**, separately reproduced from original source. Scope does not authorize normalizing unrelated source or inventing a waiver. No player/render/fidelity/native UI/other-platform runtime certification claimed.

## Repository impact

Exact full-path inventory and source deltas: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3/changed-files.json and /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3/changed-files.md. Application consumes only model/package path dependencies; compiler/CLI/MCP/VectorCraft excluded from its default dependency closure. Native serde resolves to the canonical model's existing exact 1.0.228 pin; isolated crate lock unchanged. Documentation: /Users/juanmantilla/projects/personal/md-reader/docs/prototype-document-lifecycle.md. No production association/config/CSP/player/VectorCraft changes. HEAD unchanged; no commit/push/deployment.

## Pre-existing dirty files

Initial Git status and exact hashes/backups retained in pre-existing-git-status.txt, pre-existing-files.json and baseline/. The tree was extensively dirty, not merely three files. Required overlapping edits integrate with existing source and original assertions. Existing CSS, native HTML surface and Markdown native decoder remain byte-identical to the initial record. No reset/checkout/discard or unrelated formatting cleanup. Another session changed App.tsx, MarkdownView.tsx, document-selection.ts and document-select-all.test.tsx during verification; author/process not independently attributed. Those edits are preserved, recorded in concurrent-source-drift*.json and copied evidence, and included in final verification. They are not attributed to Phase 3.

## Deviations

Minimal package API extension exposes admitted resource usage for cross-session budgets; no validation/wire/compiler change. Older source-file-only native integration tests now link the actual library via a default-disabled Rust-only document-contract-tests feature; no IPC/agent-control adapter. Original assertions are preserved. Formatting is scoped to task hunks so unrelated pre-existing formatting remains. Host-only dependency metadata avoids unavailable unrelated Android target crates. Frontend tests run with one worker and exact directory discovery after duplicate evidence-directory discovery and resource-sensitive development failures; no deadline/assertion changes. Strict whole-native Clippy limitation is explicit and unwaived.

## Blockers for Phase 4

No lifecycle implementation blocker identified. Phase 3's strict native Clippy gate remains unresolved on pre-existing code; actual Phase 3 acceptance is separate. Signing/minimum-platform/fidelity/player/runtime/agent/MCP work has not begun and is not misclassified as a Phase 3 defect.

## Recommendation

**FIX PHASE 3 verification gate**: resolve the pre-existing whole-native warnings-denied limitation through an explicitly authorized baseline exception or separately scoped lint maintenance, then accept Phase 3. Do not begin Phase 4 automatically. All requested document-lifecycle code is implemented and reviewable.
