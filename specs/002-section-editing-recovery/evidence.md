> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F004 implementation evidence — 2026-09-26

Environment: macOS 26.2 arm64, Node 20.19.6, temporary Rust 1.98.1 under /private/tmp. Tests used disposable fixtures. No user document, commit, push or release publication was used.

## Gates and build checks

| Check | Status | Evidence |
|---|---|---|
| Spec, visual and architecture approval | PASS | Exact user approvals and four hashes in docs/approvals.md. Approved artifacts were not changed. |
| T001 CodeMirror 6 exact pins | PASS | package.json/lock pin state 6.7.6, view 6.43.13, commands 6.11.1, markdown 6.5.2. No remote runtime asset was added. |
| T002 parser/toolchain | PASS | pulldown-cmark 0.13.4 pinned; cargo check --offline PASS with temporary local toolchain. |
| npm test -- --run | PASS | 11 files, 44 tests. Includes section mapping, context menu, edit reducer, second-section choice, external-version protection, recovery offer and close-intent routing. |
| npm run build | PASS | TypeScript and Vite build. Vite reports a nonfatal bundle size warning. |
| cargo test --manifest-path src-tauri/Cargo.toml --quiet | PASS | 34 library + 45 integration tests passed; 4 ignored, 0 failed. Run with macOS filesystem event access because two existing watcher tests timed out in the restricted sandbox. |
| npm run tauri build -- --bundles app | PASS | Built src-tauri/target/release/bundle/macos/Markdown workspace.app. Compilation/build is not packaged UX acceptance. |
| F004 scoped security review | PASS | security-review.md: SEC-01 private storage fixed and disposable permissions/symlink test passed. SEC-02 backup retention and SEC-03 packaged Quit remain open. |

## Checked task implementation evidence

These PASS results refer to the bounded code task, not the complete packaged requirement.

| Tasks | Status | Evidence |
|---|---|---|
| T001–T003 | PASS | Exact dependency pins, offline Rust check and this R/AS/SC evidence table. |
| T004–T006 | PASS | Grant-bound IPC in editing.rs, document.rs, state.rs, lib.rs and api.ts; native scope tests and build pass. |
| T007–T009 | PASS | Native section fixture and version-bound session tests in editing.rs; all 14 editing unit tests pass. |
| T010–T014 | PASS | sectionMap.ts, MarkdownView.tsx, SectionEditor.tsx, EN/ES styles and section-editing/section-map UI tests pass. |
| T015–T020 | PASS | editState.ts reducer, App.tsx actions/conflict UI and native Save/Save As paths; edit-state/edit-flow UI tests and disposable native tests pass. |
| T022 | PASS | edit-flow.test.tsx covers dirty marker, one draft, Cancel/Discard/Save, conflict inspection and explicit disk choice. |
| T024 | PASS | recovery.rs durable, checksum, bounded and prior-checkpoint behavior; six recovery unit tests pass. |
| T026 | PASS | Recovery load checks schema/checksum/grant/source section, reports changed disk and offers inspect, discard and clear without source write; native and UI offer tests pass. |
| T028 | PASS | App/SectionEditor restore draft, CodeMirror JSON, selection/history and scroll fields; recovery UI wiring test and build pass. Packaged fidelity remains unverified. |
| T031 | PASS | Four final commands and results in the build table above. |
| T033 | PASS | Scoped findings, correction and unverified risks in security-review.md. |

## Requirement trace

Status applies to the whole requirement; a passing source or unit check alone does not imply packaged user acceptance.

| Requirement | Status | Evidence / remaining check |
|---|---|---|
| F004-R01 | NOT TESTED | Native version-bound section API and context routes built; packaged right-click/keyboard journey pending. |
| F004-R02 | NOT TESTED | Selected boundary and inactive reading styles built; packaged visual/readability check pending. |
| F004-R03 | PASS | Local CodeMirror source editor and safe preview built; exact dependency pins and UI build pass. |
| F004-R04 | PASS | Native heading spans, renderer parity and fail-closed mismatch tested, including CR-only, BOM, nested/list and setext cases. |
| F004-R05 | PASS | One selected source span is editable; native byte-preservation tests and read-only rendered regions pass. |
| F004-R06 | NOT TESTED | Dirty state, Undo/Redo, explicit actions and stale-ack rejection built; packaged keyboard/history check pending. |
| F004-R07 | NOT TESTED | Native 20-file staged byte, permission failure, Save As changed/late target and post-commit mismatch fixtures pass; complete Save IPC and packaged Save pending. |
| F004-R08 | NOT TESTED | Native applicationShouldTerminate bridge, Tauri close routes and all four dirty close choices are implemented and tested below. Actual packaged Dock/system/menu/shortcut journeys remain unobserved. |
| F004-R09 | NOT TESTED | Double pre-commit check and conflict UI built; induced post-commit race trials pending. Residual race disclosed. |
| F004-R10 | PASS | Native grant, regular/local-file, size, identity and version checks; renderer cannot provide path/span authority. |
| F004-R11 | NOT TESTED | EN/ES labels and focus handling built; VoiceOver, keyboard and layouts in packaged app pending. |
| F004-R12 | BLOCKED | Exact folder/tab/panel restoration depends on separately unapproved F003C. Draft recovery exists for manually reopened files. |
| F004-R13 | NOT TESTED | Durable versioned checkpoint, saved time, UI acknowledgment and Retry built; 100 small native writes each completed under one second. Full UI acknowledgment and abrupt restart trial pending. |
| F004-R14 | NOT TESTED | Checksum, prior fallback, clear drafts and private 0700/0600 storage tested; packaged clear/recovery and safety-copy retention policy pending. |
| F004-R15 | NOT TESTED | One native session per file and Resume/Save/Discard/Cancel modal tested; packaged flow pending. |

## Acceptance scenarios

| Scenario | Status | Evidence / gap |
|---|---|---|
| AS-001 | NOT TESTED | Context UI test passes; packaged right-click pending. |
| AS-002 | NOT TESTED | Selected source/read-only shell built; packaged visual check pending. |
| AS-003 | NOT TESTED | Shift+F10 test passes; packaged keyboard/focus pending. |
| AS-004 | NOT TESTED | Native first/middle/last, BOM and line-ending fixtures pass; packaged passage check pending. |
| AS-005 | NOT TESTED | 20 disposable staged replacements preserve outside bytes; complete Save IPC trial pending. |
| AS-006 | NOT TESTED | Pre-commit rejection and UI protected-version tests pass; ten external-write trials pending. |
| AS-007 | NOT TESTED | Save As late/existing changed-target native tests pass; packaged dialog trials pending. |
| AS-008 | NOT TESTED | Tab/read close choices built; packaged normal close pending. |
| AS-009 | BLOCKED | F003C exact workspace restoration unapproved; Dock Quit unproven. |
| AS-010 | NOT TESTED | Recovery checksum/prior fallback, old-record compatibility and UI offer tests pass; abrupt packaged restart pending. |
| AS-011 | NOT TESTED | Changed-disk recovery sets conflict; packaged two-version inspection pending. |
| AS-012 | NOT TESTED | Clear drafts native/UI path built; packaged storage check pending. |
| AS-013 | NOT TESTED | Nested/preheading and parser mismatch UI tests pass; packaged fixtures pending. |
| AS-014 | NOT TESTED | Native BOM/CRLF/CR byte tests pass; full file-save comparison pending. |
| AS-015 | NOT TESTED | EN/ES text and reduced-motion CSS built; VoiceOver/layout pending. |
| AS-016 | BLOCKED | Exact reopened folder/tab/layout requires F003C approval and implementation. |
| AS-017 | NOT TESTED | UI test proves Cancel/Discard/Save second-section path; packaged flow pending. |

## Success criteria

| Criterion | Status | Gap |
|---|---|---|
| SC-001 | NOT TESTED | Ten packaged target-selection trials pending. |
| SC-002 | NOT TESTED | 20 native staged fixture trials pass; complete Save IPC/reopen comparison pending. |
| SC-003 | BLOCKED | Ten exact workspace reopen trials require F003C and Dock Quit proof. |
| SC-004 | NOT TESTED | Ten conflict and ten failure trials plus post-commit race observation pending. |
| SC-005 | NOT TESTED | Ten abrupt termination/recovery trials pending. |
| SC-006 | NOT TESTED | Packaged EN/ES keyboard and VoiceOver acceptance pending. |
| SC-007 | NOT TESTED | 100 small native durable checkpoints each passed a one-second bound; full editor-to-ack timing pending. |

## Exact next work

1. Exercise the implemented native delegate bridge through packaged titlebar Close, Cmd+W, Cmd+Q, app-menu Quit and Dock/system Quit using disposable drafts. Keep R08/AS-009 unpassed until observed; current UI automation is BLOCKED by assistive-access denial (-25211).
2. Finish full input-to-durable-ack timing and packaged AS/SC trials. Resolve SEC-02 safety-copy retention/clear policy and T036 moved-path recovery ownership/cleanup; current records identify a document path, not a session owner.
3. Prepare F003C design/sketch/architecture for review, obtain its separate approvals, then implement and integrate exact workspace restoration. F003D conflict integration is now implemented and covered by native/UI tests.

## Missing-work audit — 2026-09-28

Engineering verification on macOS 26.2 (25C56), arm64; no independent QA claim. All four F004 approved hashes still match docs/approvals.md.

| Tasks / requirements | Result | Current evidence |
|---|---|---|
| T021; R07/R09/R10; AS-005–007/014 | PASS for actual native transaction | 21 editing tests pass. New cases call the same private Save/Save As transaction as production with disposable app-data and controlled filesystem operations. Twenty full Save transactions compare bytes outside the selected span across BOM, Unicode, LF/CRLF/CR. Separate Python writer processes change disk before Save, before its last check, after replacement and during existing-target Save As confirmation. Denied commit/backup, disappearance and preexisting destination tests retain sessions and protect observed external bytes. No original write is performed by Save As. Injected commit denial is not a packaged permission-dialog test. |
| T035; R07/R10 | PASS, red → fixed | The original code wrote a NUL-containing draft before rejecting it and leaked a repository stage when the source disappeared. Both failures were reproduced in /private/tmp/md-reader-save-red.log. Composition now rejects NUL before writing; scoped stage cleanup covers source stages, Save As stages and app-data safety-copy stages on errors. Passing focused result: /private/tmp/md-reader-save-tests.log. |
| T027/T035; R08/R11/R15 | PASS for component tests | tests/ui/close-edit.test.tsx: 20 pass. Save/Keep draft/Discard/Cancel across reading, tab, window and Quit; Keep blocks pending/failed checkpoints, failed Save blocks Quit, Cancel restores focus, and reopening a kept tab retains its same draft/session. Red tests exposed focus being captured after React autoFocus and two simultaneous Quit/disk-discard dialogs. Shared modal focus management now captures the prior control; Quit replaces pending choices and invalidates a late disk-confirmation response before discard. Logs: /private/tmp/md-reader-close-red.log and /private/tmp/md-reader-close-tests.log. |
| T023; R08/AS-009 | PASS for native ABI/startup; packaged routes NOT TESTED | src-tauri/src/macos_quit.m installs applicationShouldTerminate: on the existing delegate, preserves its original decision and returns NSTerminateCancel for pending edits. build.rs compiles locally with Cocoa/clang; no dependency added. Native harness built with xcrun clang -fobjc-arc -fblocks -Wall -Wextra -Werror -framework Cocoa and tests/native/macos-quit.m passes. Signed app contains both bridge symbols and launches successfully; startup fails if installation fails. Dock/menu/shortcut/native close journeys remain open. |
| T030; R13/R14 | PASS for durability/failure subset | recovery::tests: 8 pass, 1 ignored child harness. A failed checkpoint replacement retains the last valid acknowledgment. A child test process writes sequence 42, flushes its acknowledgment and exits via _exit(72); the parent reads the intact draft afterward. Existing checksum/schema/prior fallback, quota, private permissions and 100 durable writes remain covered. /private/tmp/md-reader-recovery-durability.log. This proves process-exit durability, not power-loss durability or complete WebView-to-IPC timing. |
| R05/R06/R12; T025/T028 | PASS for live editor preservation subset | The dark-theme editor test uses real CodeMirror, two edits and ten compartment reconfigurations; identical instance/history/selection, focus/scroll, checkpoint count and Undo/Redo verified. Packaged restart fidelity and full input-to-ack timing remain NOT TESTED. |
| T036; R13/R14 | NOT TESTED | Reselection at the same native path is covered. A moved-path grant changes the recovery hash key; old records can remain after Save/Discard. Safe migration/cleanup must identify ownership and retain a recoverable checkpoint before removing an old record. This is recorded as remaining work, not silently treated as completed by reselection tests. |

Final aggregate regression/build/signature evidence is in specs/007-dark-theme/evidence.md and docs/missing-work-audit.md. T023/T025/T029/T030/T032/T036 remain open for the specific missing acceptance/integration work above. Source files used in tests were disposable. SEC-02 remains open; no user recovery record or retained safety copy was deleted.

## Test reliability repair — 2026-09-29

PASS: `tests/ui/edit-flow.test.tsx` now waits for the mocked editor button to
render after `beginSectionEdit` resolves, before clicking it. This removes the
observed assertion race without changing production behavior or F004 scope.
Focused run: 5/5 PASS. Full `npm test -- --run`: 151/151 PASS, 19 files; log
`/private/tmp/md-reader-f004-test-race-2026-09-29.log`. Before the repair, one
full run failed 1/151 at that immediate query while isolated and repeat runs
passed. Packaged F004 acceptance remains NOT TESTED, and T023/T025/T029/T030/
T032/T036 remain open. The proposed T036 ownership/migration and SEC-02
safety-copy policy require the canonical review described in
`recovery-storage-decision.md`; this test edit grants no approval for them.

## Bounded packaged QA lifecycle — 2026-09-29

The next subsection records a later native moved-path implementation slice; the packaged trial below predates it.

PASS for one isolated disposable run on macOS 26.2 arm64 using the F005 QA `.app` (`com.juanmantilla.markdownworkspace.qaf005`). From `/private/tmp/md-reader-qa-fixture-f005/entry.md`, keyboard Shift+F10 on the heading and Edit section opened CodeMirror. Typing ` QA DIRTY DRAFT` made the draft dirty. Native File → Close Window showed Save/Discard/Keep draft/Cancel; Cancel retained exact editor text. Keep draft closed the only window; LaunchServices reopen restored the dirty tab and exact draft. App-menu Quit with a dirty draft showed the same choice; Cancel kept the window and Keep draft exited. A cold launch restored `entry.md Unsaved` and the exact draft. In-app Discard removed both QA `drafts/*.json` and `.previous`; `entry.md` and `sibling.md` retained SHA-256 `b8a1af99956798176dc86a6639f3956782acae7f7513edd664ae701c3b199f84` and `ab0e356e279c9c661b0df59d54b416b998bbf3805c82a7a77d22f0ebf911dc74`. This is bounded evidence for AS-008–010/016 and F003C integration. Ten-trial, titlebar/Cmd+W/Cmd+Q/Dock, failed Save, moved-path migration, safety-copy lifecycle and full timing remain NOT TESTED. Historical "F003C unapproved" entries above predate the recorded 2026-09-29 approval and implementation.

## Moved-path recovery implementation slice — 2026-09-29

PASS for the active explicit-file picker path in disposable native tests: a picker-validated move writes and syncs the complete checkpoint at the new key before the grant changes, retains its prior key until Save/Discard, carries owner ID and prior paths across checkpoints/restoration, adopts a validated schema-1 legacy record, supports repeated moves, and leaves the old grant/checkpoint intact when migration fails or a competing destination record exists. Owner-aware Save/Discard cleanup preserves a newer unrelated record at an old key. `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib`: 61 passed, 2 ignored. New tests reside in `src-tauri/src/recovery.rs`; `src-tauri/src/selection.rs` calls migration before publishing a moved explicit-file grant. Full F004-R16/AS-018/SC-008 remains **NOT TESTED**: root-folder moves, cold session reselection before an edit session exists, real picker/packaged trials and ten sequences are still open. F004-R17/AS-019/SC-009 safety-copy retention/quota/cleanup remains unimplemented. The production app/DMG hashes in `docs/local-build-2026-09-29.md` predate this native edit.

## 2026-09-29 moved-path and safety-copy implementation update

PASS for scoped native behavior on macOS arm64: `CARGO_HOME=/private/tmp/md-reader-cargo RUSTUP_HOME=/private/tmp/md-reader-rustup PATH=/private/tmp/md-reader-rustup/toolchains/stable-aarch64-apple-darwin/bin:$PATH cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib` yielded 67 passed, 2 ignored. Active root-folder reselection now durably migrates owned drafts before replacing a grant; a failed migration keeps the old grant. Cold root and explicit-file session reselection use the saved owner ID. A corrupt current record does not block a valid previous record during cold migration. New disposable native tests cover active root move and failed root migration. `npm test -- --run` yielded 177 passed; `npm run build` passed after these edits. The web build reports a nonfatal chunk-size warning.

F004-R17 implementation now retains unique pre-save and staged copies in private app data, counts legacy/pending copies as unresolved, applies a locked 1 GiB pre-save budget, and exposes separate resolved-copy inventory and confirmed cleanup in EN/ES. Save As replacement uses the same retained-copy store. Native tests verify quota denial and resolved-only cleanup preserving legacy and pending records. The production `.app` and `.dmg` recorded in `docs/local-build-2026-09-29.md` predate these edits. **NOT TESTED:** packaged picker/Save journeys, ten R16/R17 sequences, quota pressure through packaged UI, EN/ES visual and keyboard checks, and complete F004 timing/acceptance. T036–T038 remain open for those checks.

## Current artifact and regression correction — 2026-09-29

The prior 67/177 counts and stale-artifact statement above are historical. The latest full UI suite passed 184/184; native library suite passed 73 with 3 ignored; the production app build and web build passed. Current signed app executable SHA-256 `ceaeac4038451d96569e0ea88c179480d7fd77077d601e8904928d2c3f015f3b`, and current verified DMG SHA-256 `63cd6b52ff0b9a4cc90983dd5eefaf1503c30fbef1949a04620d60dedc952874`, include the F004 owner/safety-copy changes. Strict app signature and read-only mounted DMG checks passed. F004 packaged moved-path and safety-copy journeys remain NOT TESTED; no ten-trial acceptance or full input-to-durable-ack result is claimed.
