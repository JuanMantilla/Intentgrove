> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](current-version-acceptance-20261010.md).

> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](requirement-retirement-2026-09-28.md).

# Missing-work audit — 2026-09-28

Scope: approved F001/F003D/F004 repairs and newly approved F002A dark theme, compared with canonical specs/plans/tasks and actual code. This is engineering verification, not independent QA or complete v1 acceptance. All approved artifact hashes are unchanged.

## Completed implementation and verification

| Area | Work completed | Evidence |
|---|---|---|
| Dark theme | System/Light/Dark, local preference, initial colors, native synchronization, semantic palettes, EN/ES warning/control, CodeMirror compartment preserving history/selection/focus/scroll | specs/007-dark-theme/evidence.md; 15 of 16 tasks complete, native acceptance open |
| Conflict safety | Recheck inspected disk token/generation before discard; invalidate older confirmation/preview on another change; protect late results; keep per-tab drafts and prevent original Save during conflict | specs/005-external-change-refresh/evidence.md; native/UI conflict regressions |
| Folder opening | Remove idle watcher waits from the mutex used by selection/watch registration | Mutex regression PASS; 25,000-file native first page 159 ms, UI opening time NOT TESTED |
| Unavailable sources | Persistent status, retry/native root or file reselection, retained tabs/drafts, explicit-file scope and unrelated-choice rejection | Native replacement/missing/denied/unsupported fixtures and 4 UI cases PASS |
| Save integrity | Actual 20-save byte/BOM/line-ending trials; separate writers around version checks; failed backup/commit and Save As; reject NUL before writes; clean stages after failed transactions | specs/002-section-editing-recovery/evidence.md; 21 editing tests PASS |
| Close and recovery | Native macOS termination delegate bridge; all four choices on read/tab/window/Quit routes; checkpoint failure preserves prior record; process exit after durable acknowledgment preserves draft | Native ABI harness, 20 close UI tests and native durability tests PASS; packaged Quit/restart journeys NOT TESTED |

Final commands: `npm test` (143 pass / 17 files); `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline` (126 pass, 7 ignored, 0 failures, outside sandbox for FSEvents); `npm run build`; `npm run test:bundle-worker`; `npm run tauri build -- --bundles app`; ad hoc signing and strict signature verification — PASS. Optional `cargo fmt --check` — FAIL for formatting differences; no functional build/test gate failed.

Latest local build:
`/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Markdown workspace.app`

Signed executable SHA-256: `93d7342ddcce5d80d0e36d457eb5251a241f344f1ee5a2e8fbe151246bff32df`. arm64, ad hoc signature, not notarized or published. Launch PASS; PID 92879 was still running three minutes later. No existing app process or user document was changed by this launch.

## Work still open

| Work | Status | Exact next step |
|---|---|---|
| Native appearance, Quit/restart, VoiceOver, motion, layout and complete performance trials | BLOCKED for automated UI; NOT TESTED for remaining acceptance | Use each approved feature's quickstart with disposable fixtures in a visible macOS session. Current System Events assistive-access denial is -25211; no permission/settings change was made. Engineering tests/builds do not satisfy these gates. |
| Full accepted-input-to-durable-ack timing | NOT TESTED | Measure 100 real editor inputs through native IPC, including acknowledgment; native writes and editor-state preservation are separately covered. F004 T025/T030 remain open. |
| Recovery ownership after moved-path reselection | NOT TESTED / architecture refinement needed | F004 T036: bind records to a native session owner and migrate durably before cleanup. Current same-path reselection tests cannot prove moved-path cleanup. Concrete proposal: specs/002-section-editing-recovery/recovery-storage-decision.md. |
| Retained safety-copy storage (SEC-02) | OPEN / product-policy review needed | Review bounded storage and explicit resolved-copy cleanup in the same decision proposal, then update and approve affected canonical artifacts before implementing. Existing safety copies were not deleted. |
| Cmd/Ctrl+F text search (F003B) | BLOCKED for production by AGENTS.md approval gate | specs/003-document-text-search has spec/checklist only. Prepare design/sketch/plan/tasks through installed Spec Kit, review current versions and obtain approval. |
| Exact folder/files/positions restoration (F003C) | BLOCKED for production by AGENTS.md approval gate | specs/004-restore-workspace-session has spec/checklist only. Prepare/review design/sketch/plan/tasks, approve and implement, then integrate F004 T029. Current draft recovery requires manually reopening the document. |
| JPG/PNG/SVG and common image-file viewer (F006) | BLOCKED for production by AGENTS.md approval gate | specs/006-view-local-images has spec/checklist only. Prepare/review design/sketch/plan/tasks before implementing common-format image tabs and safe SVG. Existing inline raster support is not this feature. |
| Other v1 roadmap slices | NOT IMPLEMENTED as complete features | Remaining F002 rich reading and F005 Finder/.dmg/release hardening need their own approved feature artifacts. A local .app is available; full v1 readiness is not claimed. |

## Spec Kit consistency

Active feature is specs/007-dark-theme. Installed check-prerequisites succeeds with spec/plan/tasks. Requirements checklist 8/8 checked. No extension hooks exist. All 9 requirements and 5 success criteria have task coverage; 16 tasks, no unmapped task or functional contradiction. Historical Draft labels in approved spec/plan are preserved at the approved hashes; docs/approvals.md records actual authority. F003B/F003C/F006 analysis cannot pass implementation prerequisites while plan/tasks are absent.

Next handoff: fresh QA of the approved packaged journeys, and review/preparation of the storage amendment and the three requested feature design/plan sets. No commit, push, publication, paid service or system installation occurred.

## 2026-09-29 progress note

The above is historical audit evidence, not a current completion claim. F002A A1 boundary inspection found no observed control defect; 14 acceptance Python tests, 10 Cargo harness tests, four expected build-guard rejections, bundle-boundary checks and strict signature verification passed. An isolated synthetic display and production request-attempt observer remain unavailable, so T018–T021 are not promoted to PASS. F004's asynchronous UI assertion was stabilized; repeat full Vitest run passed 151/151, with evidence in its feature file. No application production code changed.

Reviewable draft spec/design/sketch/plan sets now exist for F003C, F003S and F006 at [their exact hashes](continuity-search-image-review-2026-09-29.md), plus F002R/F003F/F003R/F003L/F005 at [their exact hashes](remaining-roadmap-review-2026-09-29.md). The moved-path/safety-copy F004 canonical amendment is [ready for renewed approval](../specs/002-section-editing-recovery/recovery-amendment-review-2026-09-29.md). None is an implementation or native acceptance result. Production work on them remains pending the approvals required by `AGENTS.md`; F001/F003D/F004/F002A packaged acceptance remains open in a visible Mac session.

## 2026-09-29 current status after user approval

The preceding audit and approval-pending text is historical. The user approved all nine exact review sets and the F004 amendment; `docs/approvals.md` records 36/36 matching hashes. F003C session restoration, F003S document Find, F003R Recents, F005 native delivery, F004 moved-path/safety-copy handling, and F003L bounded source mode have implementation slices and scoped evidence in their feature files. F003F folder search now has native scoped traversal, ignore rules, bounded batches, cancellation/current-hit reopening and EN/ES sidebar; [F003F evidence](../specs/009-folder-search/verification.md) records 25,000-entry native trials and open packaged checks. Current regression is 184 UI PASS, 73 native PASS, 3 ignored; current signed app/verified DMG details are in [local build evidence](local-build-2026-09-29.md).

**Still missing for complete v1:** F006 image tabs and isolated decoder, F002R Mermaid/metadata/code/outline/typography, F003F twenty-query and packaged acceptance, F003L/F004/F005 remaining packaged/timing matrix, and broader macOS visual/accessibility checks. The isolated QA app displayed no accessible window in this managed session, so those visual journeys remain BLOCKED/NOT TESTED. `Cargo.toml` still declares Rust 1.77.2 even though 59 locked packages report higher declared minimum versions; a 1.77.2 build is NOT TESTED. No complete-product release claim is made.

## 2026-09-29 later F002R progress

The previous paragraph is historical. [F002R verification](../specs/008-rich-reading/verification.md) now records bounded inert YAML metadata, shared duplicate-aware heading IDs, responsive outline, bundled OFL Roboto/Mono and native session-backed bounded reading controls. Full regression: 190 UI PASS; 74 native PASS, 3 ignored; production worker bundle PASS. The freshly signed app and verified DMG hashes are in [local build evidence](local-build-2026-09-29.md). F002R Mermaid isolation, code tokens, per-block rendering and packaged timing/visual matrices remain open. [F006 baseline](../specs/006-view-local-images/verification.md) confirms its image tabs and isolated decoder have not been implemented. The isolated QA window/display issue still blocks packaged acceptance; no complete v1 claim is made.

The later F002R subset also has a bounded local code-token worker and exact fenced-source Copy. Latest full UI regression is 194 PASS; native regression remains 74 PASS, 3 ignored. Signed app and read-only-verified DMG hashes are in the local build record. Mermaid, per-block rendering, F006 and packaged acceptance remain open.

The current app/DMG is now v4 after an outline tab-state repair; see the build record. F006 dependency preflight found 25 locked packages above Rust 1.85, up to 1.88. The exact [1.88 architecture amendment](../specs/006-view-local-images/toolchain-amendment-review-2026-09-29.md) is proposed and unapproved. No F006 helper or new image format was enabled under the mismatched toolchain claim.
