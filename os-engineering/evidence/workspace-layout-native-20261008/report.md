# Workspace layout native integration handoff — 2026-10-08

IMPLEMENTATION: COMPLETE_IN_SCOPE. FUNCTIONAL_CHECKS: PASS in the named library/frontend/native smoke scopes; broader native integration targets FAIL to compile. VISUAL_REVIEW: PARTIAL. INTEGRATION: PASS for real macOS Settings/checkpoint/restart/failure/retry/dirty-recovery scope; overall matrix PARTIAL. USER_ACCEPTANCE: three options ACCEPTED; runtime acceptance PENDING.

Authority: [current authorization](authorization.md), [plan](plan.md). Read project AGENTS, current role states, frontend native-request/report/authorization and F003C/IR-04 specification. CodeGraph consulted before application code; stale source slices required targeted disk reads. Spec Kit check-prerequisites reports013; global selection unchanged. Extensive unrelated edits preserved; `pre-existing.diff` and `scoped-native.diff` distinguish this slice. Designer artifacts and historical failures unchanged.

## Implemented contract and behavior

`settings.rs` owns a strict `WorkspaceLayout` enum serialized as margin/folio/atlas. Missing preference defaults to Margin; snapshots always include workspaceLayout. Patch is workspace scope and uses the existing main owner, request IDs/revisions, single in-flight policy, timeout, failure/retry and correlated acknowledgment. Settings gains no filesystem/session/document authority or event permissions.

`session.rs` adds the same enum to schema1 PanelState. Existing checkpoint/final-exit writers and restore paths carry it. Stored Margin is omitted as a default, exactly like existing default fields, so legacy canonical checksum bytes remain valid; omission restores Margin, including an explicit Margin choice. Folio/Atlas serialize explicitly. Restore IPC always emits workspaceLayout, including default Margin, using a narrow panel serializer. Unknown enum values are rejected through existing session-corruption/fallback handling; no normalization deletes drafts/tabs. No schema bump, migration, new command or alternate store.

The completed frontend production inputs are byte-identical to the prior handoff (`source-manifest.json`). Their existing capability gate now enables all three Settings choices and omits the unsupported-version explanation. Old-host compatibility remains. Layout intents synchronously update the existing presentation/ref and checkpoint through the single workspace writer; acknowledgment follows completion. No Save/discard/reload/document-open operation was added. Shared rendered editing, opaque-source safeguards, explicit Save/Save As, dirty/conflict/recovery and Undo/Redo remain. Clear session retains its existing explicit deletion semantics; no independent preference store bypasses it. CRLF Save remains DEFERRED.

## Verification ledger

All shell commands ran in the repository; no downloads/install/dependency changes. `source-manifest.json` identifies sources; `candidate.json` identifies the local app (main f9f65d728da113c194b09133da48cc12cefdf1545cc9655b2a07c0f680c887f5). macOS27.0.1 arm64, Rust1.88.0, Node20.19.6. This is a separately identified default-feature bundle, not an installed production-ID app.

| Check | Result | Actual scope/evidence |
|---|---|---|
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib` | PASS120;5ignored | `native-regression.log`. Strict enum/capability/legacy defaults, all choices, wrong owner/stale ack/failure/retry/lifecycle; real platform session read/write/failure/retry and byte-preserved tab/grant/recovery ownership; existing native edit/save/recovery/search/security regressions. Ignored opt-in cases were not run. |
| `npm test -- --maxWorkers=1 tests/ui/workspace-layout.test.tsx tests/ui/session.test.tsx tests/ui/settings-owner-lifecycle.test.tsx tests/ui/settings-window.test.tsx` | PASS47 | Frontend `focused-initial.log`; mocked native. Stable editor/reader/search identity, draft/range/history/scroll/tabs/Find/query/session/default and Settings behavior. |
| `npm test -- --maxWorkers=1 tests/ui/settings-owner-lifecycle.test.tsx tests/ui/settings-window.test.tsx` | PASS16 | Frontend `owner-supported.log`; additional held checkpoint proves immediate layout, no early ack, failure/Retry; supported controls enabled/message absent. Mocked native. |
| `npm test -- --maxWorkers=1` | PASS488/61files | Frontend `frontend-regression.log`; mocked APIs, includes Save/SaveAs/cancel/conflict/recovery/search/editor and legacy support. Not native end-to-end proof. |
| `npm run tauri build -- --config os-engineering/evidence/workspace-layout-native-20261008/local-candidate.json --bundles app -- --locked --offline` | PASS | `local-build.log`: TypeScript/Vite build and default-feature native app, private ad-hoc signing. Existing Vite chunk/Rust warnings retained. Direct build does not assemble image XPC/diagram helper bundles; those packaged journeys not exercised. |
| `npm run test:bundle-worker` | PASS | Frontend `worker.log`. |
| `codesign --verify --deep --strict <candidate>` / `git diff --check` | PASS | Local artifact signature verification / whitespace only. No Gatekeeper/release claim. |
| `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --tests` | FAIL compilation | `native-integration-regression.log`: automatic_refresh/manual_reload/refresh_conflict/refresh_recovery harness crates omit html/image imports required by refresh.rs (E0433). No overall native-target regression PASS; unrelated harness source left untouched. |

## Real native and rendered observations

`native-runtime.json`, saved checkpoint JSONs and frontend AX/PNGs contain evidence. CUA launched the uninstalled candidate with a previously absent unique profile `com.juanmantilla.intentgrove.workspacelayout20261008`. Only disposable `/private/tmp/intentgrove-workspace-layout-20261008` documents were opened. No production profile read/write.

- PASS: fresh native Settings selected Margin, all three enabled, explanation absent. Legacy default/checksum compatibility additionally verified through real native storage test fixtures (not a separately launched legacy-profile UI run).
- PASS: select Atlas, normal quit/relaunch, Settings Atlas selected; separately Folio and explicit Margin repeated normal process restarts. Both tabs and active reading.md restored without reselection. Named restart AX and normal-exit/checkpoint records retained.
- PASS: document Find alpha/1of46 retained switching Folio→Atlas; folder-query alpha and dirty rendered section retained Atlas→Folio→Margin. Folder search was not submitted, so executing job/result continuity is not claimed.
- PASS: actual previous-record publication obstruction in disposable profile produced failed Settings state with applied Atlas retained and Retry. Prior current checkpoint remained byte-identical. Restored obstruction backup and clicked Settings Retry; real journal sequence19 saved Atlas and failure UI cleared. No fake ack or permissive fallback.
- PASS: recovery files byte-identical across the dirty Atlas→Folio switch; native Undo then Redo after Margin restored unsaved-layout. Dirty quit Cancel kept the draft; explicit Keep draft normal quit/restart recovered active rendered edit with Undo available. Source hashes/inventory and stored grant/tab identities unchanged (`fixture-before/after`, `drafts-before-switch/after-folio`, native-runtime).
- VISUALLY INSPECTED: actual enabled Settings; Atlas shelf/left outline/Find; Folio centered direct edit and search drawer; Margin direct edit/search; Spanish light Settings and24px reader/editor. Settings, Save, SaveAs and Undo/Redo remained visible in inspected wide states. System dark was observed; independent explicit-dark selection and OS system-theme-change notification were not exercised. No raw Markdown pane/split preview introduced.

## Retained failures and unavailable checks

Initial `native-layout-initial.log` FAILED because fixture attempted mkdir over the existing previous record. Corrected disposable setup removes that fixture file before creating the obstruction; production code was not changed to mask it. Historical frontend/native reports remain historical. Broader native target compile failures above remain unresolved in this bounded slice.

CUA retained ScreenCaptureKit-3812 after an action, intermittent target-changed warnings (fresh state used before proceeding), and noWindowsAvailable on the native Settings resize drag. No alternate UI mechanism, browser bypass or security change was used. Consequently full native light/dark/system×EN/ES×wide/narrow matrix and whole-app200% enlargement are NOT TESTED; native24px reading text is a real narrower observation. Prior24Chrome mocked-bridge captures remain prior frontend evidence, not native acceptance.

NOT TESTED: nonzero reading-anchor geometry within8px; exact native selection endpoints after Settings focus; executing folder-search jobs; full physical IME/clipboard/VoiceOver/keyboard matrix; this candidate's explicit Save/SaveAs/conflict/opaque native journeys (separate regressions passed); native HTML child reflow; Windows compilation/runtime, macOS14/Intel. Next steps are exact-candidate native journeys on a working resize/input surface, repair separate refresh harness imports through their owner, and runtime user acceptance. These are verification limitations, not remaining native-layout contract stubs.

Task-owned candidate process stopped normally with disposable draft retained. Profile, fixtures and evidence retained. No install, dependency/lock/config security changes, privileges, destructive migration, commit/push/publish/deploy. Stop at implementation handoff; no overall product/release acceptance claim.
