# F003F verification — 2026-09-29

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Host:** macOS 26.2 arm64, rustc 1.98.1. The F003F spec/design/plan hashes match `docs/remaining-roadmap-review-2026-09-29.md`; `docs/approvals.md` records user approval. Installed Spec Kit `setup-tasks.sh` selected this feature; no extension hooks exist. All test files are disposable.

| Check | Status | Evidence and limit |
|---|---|---|
| Scoped search implementation | PASS for native subset | `src-tauri/src/search.rs` uses native root handles, fd-relative no-follow traversal and `.gitignore` reads; 64 KiB ignore, 10 MiB document, 256-byte query, 10,000-result and 100,000-entry caps. Results are metadata; open re-reads through current grant. Unit tests cover nested whitelist, ignored toggle, symlink escape, changed result, root switch and cancellation. |
| UI implementation | PASS for component subset | `FolderSearchPanel.tsx` has EN/ES search mode, include-ignored rerun, bounded results, counts, Stop, empty/partial states. Three UI tests cover verified batches, Stop/open, stale query batch and ignored toggle. Packaged focus/width behavior remains unobserved. |
| Dependency audit | BLOCKED for declared MSRV | Exact `ignore 0.4.22`, `globset 0.4.14` and `regex 1.12.2` are locked/fetched and compile offline on rustc 1.98.1. New `globset 0.4.20` required 1.88, so it was downgraded. The repository declares rust-version 1.77.2, but `cargo metadata --locked --offline` reports 59 existing locked packages declaring greater than 1.77 (including Tauri transitive dependencies). No 1.77.2 build is claimed. [ignore manifest](https://docs.rs/crate/ignore/0.4.22/source/Cargo.toml.orig), [regex manifest](https://docs.rs/crate/regex/1.12.2/source/Cargo.toml.orig). |
| 25,000-entry native fixture | PASS for native subset | Explicit ignored Rust test generated 25,000 disposable files, including 5,000 Markdown and five content hits. Complete scan: 265.032875 ms, 25,000 scanned, 20,000 unsupported skipped, five matches. Ten worker-stop completion times: 136.333, 166.458, 97.834, 96.708, 96.084, 99.917, 92.333, 97.833, 125.375, 99.209 microseconds. This is native worker timing, not packaged UI acknowledgment. |
| Full regression | PASS | `npm test -- --run`: 184/184; `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib`: 73 passed, 3 ignored. The explicit 25,000-entry test passed separately. Latest `npm run tauri build -- --bundles app` includes the production web build and passed. |
| Current app/DMG artifact | PASS for build/integrity | Current signed arm64 app executable SHA-256 `ceaeac4038451d96569e0ea88c179480d7fd77077d601e8904928d2c3f015f3b`; DMG SHA-256 `63cd6b52ff0b9a4cc90983dd5eefaf1503c30fbef1949a04620d60dedc952874`. App signature and `hdiutil verify` passed. Read-only mounted DMG contained matching signed app and `/Applications` link, then was ejected. Ad hoc signed; not notarized. |
| Packaged visual journeys | BLOCKED | Earlier isolated QA processes exposed no accessible window or display capture; no F003F packaged interaction is claimed. |

| Acceptance | Status | Reason |
|---|---|---|
| AS-001 | NOT TESTED | Native 25,000-entry scan and UI component pass separately; packaged incremental open/navigation not observed. |
| AS-002 | NOT TESTED | Nested ignore and include option pass native/UI subsets; packaged fixture manifest comparison remains. |
| AS-003 | NOT TESTED | UI guidance/partial and native skipped counts exist; unreadable/over-limit/zero packaged states remain. |
| AS-004 | NOT TESTED | Native root switch and UI stale-query tests pass; packaged panel/root transitions remain. |
| AS-005 | NOT TESTED | Native and UI Stop subsets pass; packaged verified-result behavior remains. |
| AS-006 | NOT TESTED | Native changed-file reopen passes; packaged passage navigation remains. |
| AS-007 | BLOCKED | Packaged EN/ES keyboard, no-write hash and request observation need a usable QA window. |
| AS-008 | NOT TESTED | Ten native worker stops pass; the specified packaged 250 ms acknowledgment trials remain. |
| SC-001 | NOT TESTED | Twenty manifest queries and packaged no-write checks remain. |
| SC-002 | NOT TESTED | Ten packaged 25,000-entry Stop trials remain. |
| SC-003 | BLOCKED | EN/ES keyboard journeys at 640/900/1440 points need a QA window. |

**Open implementation/verification:** Prove the declared Rust MSRV or approve a corrected toolchain target; test 20 manifest queries and skip/error cases end to end; run packaged passage navigation, accessibility, timing, hash and network checks. F006 and F002R remain separate approved slices.

**Disposable content manifest:** `# Needle\nOther needle\n` SHA-256 `ca06c6e5ff246b2ee4d6225605215ed3d3571e0078928d56c14e3c5d3205ab25`; `# Needle\n` SHA-256 `1eb919105c79e561dcb6d22d3bedef61dc9c0f0f7a9e5dce1d3aeb682b2f8b08`. The scoped unit test verifies the visible source bytes after scanning. The 25,000-entry generator writes five `# Needle\n` Markdown files, 4,995 `# Other\n` Markdown files and 20,000 unsupported `.txt` files, then removes its temporary root.

## IR05-04 frontend integration — 2026-10-07

Selected folder action and native-confirmed scope display/invalidation/error handling implemented with unchanged native contracts. Nine focused mocked scope/race tests PASS, actual packaged macOS notes-only query excludes the root match and opaque-hit open PASS. Report: ../../frontend-implementation/evidence/macos-20261007/report.md; actual QA snapshots: ../../qa/runs/macos-20261007/evidence/04-scoped-search.*. Full Windows and packaged replacement/error/localization/performance matrix remain open; IR05-05 stays unchecked.


## Final-source native continuation — 2026-10-08

[Current ledger](../../qa/runs/macos-finish-20261008/coverage.json) NF24scopedneedle/openline3 PASS; NF25docs→more scope clears old results and opens new scope PASS. NF26executingcancel BLOCKED:1500/20000file searches complete/cap before observableStop; post-completionEscape is not cancellation. NF27heldstale batch/open replies BLOCKED in native run; deterministic supplementary UI/native tests do not replace this gate. Current test suite322PASS, application source frozen. Full native query/cancellation/stale contract remains incomplete.


Final follow-up: NF26 executing cancellation PASS (uncapped query, observed Stop, Stopped7,527entries stable on later capture54–55). Earlier cancellation-blocked prose remains historical and is superseded for NF26 only. Native stale batch/open replies NF27 remain BLOCKED; ledger now30PASS/2FAIL/10BLOCKED.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.


## HTML native checkpoint — 2026-10-08

F003F-H01: current implementation/evidence/limitations live in [native report](../../os-engineering/html-report-20261008.md) and [provider handoff](../../os-engineering/html-frontend-handoff.md). Prior PASS results do not certify this changed candidate. Windows and full frontend/package journeys remain separately qualified.


### HTML native scoped verification — 2026-10-08

Implemented native owner contribution; [actual handoff](../../os-engineering/html-frontend-handoff.md), [report](../../os-engineering/html-report-20261008.md), [exact evidence](../../os-engineering/evidence/html-native-20261008/). Real native Rust/filesystem, macOS engine and disposable packaged-harness scopes are distinguished from mocked frontend checks. Windows compilation/runtime, native picker/Tauri transport and complete frontend package journeys remain unverified; existing acceptance tasks are not promoted by this handoff. October6 authorization supersedes staged reapproval, and feature selection013 remains unchanged.
