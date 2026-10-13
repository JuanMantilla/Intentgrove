# F005 private macOS delivery verification ledger

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

Approval: User approved the F005 spec/design/sketch/plan hashes on 2026-09-29; all four matched `docs/remaining-roadmap-review-2026-09-29.md` before implementation. Active Spec Kit feature was confirmed for task generation.

Host: macOS 26.2, arm64; Node 20.19.6; cached Rust 1.98.1. Configured minimum macOS is 14.0; that minimum has not been tested. This is a private, ad-hoc signed local build with no Developer ID or notarization claim.

| IDs | Status | Evidence / limit |
|---|---|---|
| AS-001/002, SC-001 | NOT TESTED | Local `.app` build, arm64 binary, signature and plist inspection pass; ten DMG install/launch trials and actual compatibility remain unrun. Earlier mounted DMG in `docs/local-build-2026-09-29.md` predates current code. |
| AS-003 | PASS (bounded) | In isolated QA `.app`, the native View → Find in Document menu opened the Find field; entering `Finder` showed `1 of 1`. File → Close Tab closed the clean tab. Menu labels and disabled states were exposed through macOS Accessibility. Shortcuts and remaining menu actions NOT TESTED. |
| AS-004/005, SC-002 | PASS (cold and warm Finder file) | `open -a <QA app> /private/tmp/md-reader-qa-fixture-f005/entry.md` delivered a Finder item; the app showed `Open item: entry.md` / Dismiss before access, then opened only `entry.md` on explicit click. A first cold trial **FAIL** crashed in Tauri setup because pre-Ready Open Documents created `main` and setup created it again. After the `APP_READY` guard and setup reuse fix, rebuilt QA `.app` stayed running (PID 47530), displayed the pending item and opened the file on explicit click. `sibling.md` was not opened. Before/after SHA-256 of both fixture files matched. File drop, scope probing and request observation NOT TESTED. Image intake waits for F006. |
| AS-006/007, SC-003 | PASS (bounded Close/Quit/restore) | File → Close Window removed the sole window while QA PID 45451 stayed running. LaunchServices `open -a <QA app>` recreated a window and restored the clean `entry.md` tab. In rebuilt QA app, a CodeMirror draft triggered Save/Discard/Keep draft/Cancel on File → Close Window; Cancel retained exact editor text, Keep draft closed the window and reopen restored the dirty tab/draft. App-menu Quit with dirty draft showed the same choices; Cancel kept the window, Keep draft exited, and cold relaunch restored the exact draft. Discard then removed QA draft records while source/sibling hashes stayed unchanged. Titlebar, Cmd+W/Cmd+Q, Dock menu, failed Save and ten-trial matrix NOT TESTED. |
| AS-008 | NOT TESTED | Installed update/relaunch and app-data/source hashes unrun. |
| AS-009, SC-004 | NOT TESTED | Full accepted-v1 packaged matrix below is provisional until all slices and visible trials complete. |

## Provisional v1 matrix

| Slice | Current packaged status | Evidence / remaining work |
|---|---|---|
| F001 workspace reader | NOT TESTED in this run | See `specs/001-workspace-reader/` evidence for earlier slice; recheck in final packaged app. |
| F002A dark theme | NOT TESTED in this run | `specs/007-dark-theme/evidence.md` records earlier automated/local bundle checks; packaged accessibility/restart open. |
| F002R rich reading | NOT TESTED | Production implementation and packaged block/security/typography checks open. |
| F003C session | NOT TESTED | Automated session checks pass; visible packaged restart/Quit/Dock checks open in `specs/004-restore-workspace-session/verification.md`. |
| F003S document Find | PASS (one packaged query) | Native View menu opened Find; `Finder` returned `1 of 1` in the QA fixture. Full AS/timing/request/keyboard matrix remains NOT TESTED. |
| F003F folder search | NOT TESTED | Implementation and packaged tests open. |
| F003R recents | PASS (one packaged item) | After clean File → Close Tab, start view listed `entry.md` under Recent documents with Open/Remove/Clear controls. Restart/reselect/keyboard trials remain NOT TESTED. |
| F003L large source | NOT TESTED | Implementation and packaged memory/size trials open. |
| F004 safe editing amendment | NOT TESTED | Earlier F004 baseline evidence exists; moved-path/safety-copy amendment and packaged trials open. |
| F005 macOS delivery | PASS (bounded packaged journeys) | Cold/warm Finder file intake after startup repair, native Find/Close Tab, and clean Close Window/LaunchServices Reopen observed in isolated QA app. Installation, Drop, dirty/Quit, signing distribution and full matrix remain NOT TESTED. |

## Cold Finder startup regression — 2026-09-29

The original isolated QA bundle crashed on a cold `open -a <QA app> <fixture.md>` at 16:12:50 local time. The captured panic in `/private/tmp/md-reader-cold-finder-panic.log` was `Failed to setup app: ... a webview with label main already exists`; macOS crash report `md_reader-2026-09-29-161254.ips` identified the QA bundle ID. The Open Documents event can precede Tauri Ready. `src-tauri/src/lib.rs` now queues those paths until setup creates the first window and skips duplicate setup creation if one already exists. Rebuilt isolated QA `.app` cold-opened the same fixture without a crash and showed the explicit Open/Dismiss panel. `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib`: PASS 56/56, 2 ignored; QA `npm run tauri build -- --bundles app --config /private/tmp/md-reader-qa-f005-config.json`: PASS. The original production app/DMG hashes in `docs/local-build-2026-09-29.md` predate this repair and must be rebuilt.
| F006 image viewing | NOT TESTED | Isolated decoder/helper, image tabs and packaged format/security trials open. |

## Current-source readiness — 2026-10-07

[Current readiness and exact missing-environment procedures](current-readiness-20261007.md) supersede no historical result. Host macOS 27.0.1 (26A434), thin arm64. Current Intentgrove app/helper strict signatures and DMG integrity PASS. Read-only Gatekeeper retry rejects the private ad-hoc app. macOS 14, Intel/universal, installation/update and full-v1 acceptance remain unverified. Current QA uses a separately identified disposable candidate; see `../../qa/runs/macos-20261007/`. All incomplete F005 task gates remain open.


## Fresh final delivery continuation — 2026-10-08

[OS final report, exact artifacts, checksums/source and procedures](../../os-engineering/macos-finish-20261008-report.md). Production rebuilt after Settings document Escape repair using existing offline private-ad-hoc workflow. arm64 app/helper, product metadata/min14 inspection, strictdeep signatures, DMGintegrity, read-only mounted identical exe/helper/Info.plist PASS; Gatekeeper REJECTED ad-hoc, no notarized-readiness claim. PhysicalResourcesicon, frontendassets embedded; fullfilemanifest retained. Historical packages preserved.

[Final-source native ledger](../../qa/runs/macos-finish-20261008/coverage.json):30PASS/2FAIL/10BLOCKED; separate isolatedID/config, production exact runtimeNF42BLOCKED. No earlier-buildpassinheritance.322frontendPASS; native97PASS3ignored. macOS14runtime/Intelcompile+runtime/universalcompile+runtime explicitlyUNVERIFIED, onlyarm64Rusttargetinstalled. AppsApplicationsinstall/update forbidden until explicit authorization; exact isolated procedure provided, current read-only mount was permitted/executed. T002/T005/T006/T009/T010/T013/T014 remain open: their broader contract includes unmet runtime/drop/Dock/install/update/fullmatrix requirements. Compilation/metadata/architecture inspection/runtime acceptance are separate evidence classes.


## User authorization update — 2026-10-08

User approved the scoped outstanding actions: [canonical approval and boundaries](../../docs/macos-continuation-approval-20261008.md), [reviewed hashes](../../docs/macos-continuation-approval-20261008.json). Disposable blob-frame probe and audited Mermaid11.17.2 installation/lockfile changes are now authorized; isolated Applications install/update tests are authorized on a disposable account/host. Earlier approval-pending/no-install labels are historical and superseded only for these actions. Production proof gates, acceptance results and unchecked tasks stay unchanged. Separate killable-process architecture requires a concrete amendment if needed; release/security/commit restrictions remain. Environments/prior update package are still prerequisites. Next: execute the approved probe/audit, then implementation/rebuild/retest; run installation checks when the isolated environment is available.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.


## CF54 existing-installation recovery — 2026-10-08

User explicitly reopened the existing tested Applications installation removal/restoration journey in VERIFY mode; this supersedes the prior CF54 exclusion only for that journey. **PASS**, native arm64/macOS27.0.1: current-user ownership and all13 original b7 package files confirmed; normal Cmd-Q/no process; native recoverable Trash removal; installed-path/process absence and byte-identical app data/preferences/documents/private backup; exact bundle restored with original inode; normal launch recovers both fixture tabs and Spanish/Roboto18px settings. Final app installed/running PID67336 from Applications, main b7b0f872… and strict signature unchanged. Private backup53 files unchanged; old profile never restored. Evidence: [CF54 report](../../qa/runs/macos-remaining-20261008/cf54-recovery-20261008/report.md), result.json, phase manifests and native AX captures.

Finder cgWindowNotFound / ScreenCaptureKit3811 limited gestures/screenshots; actual native Trash API and verified filesystem recovery completed. Post-verification clean-tab close was reopened via visited history; final tabs present, order differs. Only session journal and OS GoToSheet geometry changed normally; product settings/documents/drafts preserved. SC-001 is WITHDRAWN by subsequent explicit user instruction; ten install/launch trials are not required. CF54 is complete for the requested existing b7 installation journey. Newer34405daf remains a different uninstalled artifact; this creates no new CF54 gate. Older-package upgrade excluded. Latest-candidate exclusion ledger remains historical/different scope; remaining-coverage CF54 records this scoped PASS. No notarization/Gatekeeper certification, overall acceptance promotion, source changes, admin/security changes, permanent deletion or Trash emptying.

SC-001 withdrawn by explicit user instruction; historical NOT TESTED statements for this criterion are superseded, not promoted to PASS. See [decision](../../docs/macos-sc001-withdrawal-20261008.md). No new CF54 requirement for the newer artifact.


## Newer-build testing disposition — 2026-10-08

User: “I will test that, remove that as well.” Newer34405daf build installation acceptance is assigned to the user and removed from remaining agent work/completion gates. No further agent installation or retest is required for CF54. This is a scope/ownership disposition, not an unperformed test PASS. CF54 complete/PASS; SC-001 withdrawn; historical build identities preserved. Other findings unchanged. See docs/macos-newer-build-user-testing-20261008.md.


## CRLF Save scope deferral — 2026-10-08

User explicitly removed CRLF Save support from current requirements for now. QA-0017 is DEFERRED, a known defect preserved with original failed evidence, not fixed/PASS and no longer an acceptance gate. CRLF-SAVE is NOT_APPLICABLE in current scoped coverage. LF Save, failure data preservation and other requirements unchanged. Current native-final counts:315PASS/2FAIL/8NOT_APPLICABLE. Remaining confirmed active defects: QA-0018 intermittent diagram fallback and QA-0019 PNG Reload recovery. CF42 no longer fails because of QA-0017; its broader unverified scope is not automatically promoted to PASS. CF54 complete, SC-001 withdrawn, newer-build installation testing user-owned. Decision: docs/macos-crlf-save-deferral-20261008.md.


## HTML native checkpoint — 2026-10-08

F005-H01: current implementation/evidence/limitations live in [native report](../../os-engineering/html-report-20261008.md) and [provider handoff](../../os-engineering/html-frontend-handoff.md). Prior PASS results do not certify this changed candidate. Windows and full frontend/package journeys remain separately qualified.


### HTML native scoped verification — 2026-10-08

Implemented native owner contribution; [actual handoff](../../os-engineering/html-frontend-handoff.md), [report](../../os-engineering/html-report-20261008.md), [exact evidence](../../os-engineering/evidence/html-native-20261008/). Real native Rust/filesystem, macOS engine and disposable packaged-harness scopes are distinguished from mocked frontend checks. Windows compilation/runtime, native picker/Tauri transport and complete frontend package journeys remain unverified; existing acceptance tasks are not promoted by this handoff. October6 authorization supersedes staged reapproval, and feature selection013 remains unchanged.

## Markdown default opt-in implementation — 2026-10-10

Approved reviewed hashes preserved. T-D01–T-D05 implemented and locally verified; T-D06–T-D07 real consent/native interaction acceptance remains NOT TESTED. Native library121PASS/5ignored; frontend523PASS/62files; native fake adapter/script/build/worker/final arm64 package/strict ad-hoc signature PASS. Full Rust integration command FAIL on preexisting HTML/image harness imports. Read-only host Launch Services queries are unresolved; no real association setter invoked and no actual Markdown defaults changed by verification. [Ledger](default-markdown-20261010/evidence/verification.json), [report](default-markdown-20261010/implementation-report.md), [remaining native matrix](default-markdown-20261010/manual-verification.md). Historical current-version acceptance/exclusions remain unchanged.

## Every-launch refinement — 2026-10-10

User explicitly superseded permanent response suppression. T-D03-R1 source and local checks PASS: old stored marker no longer gates startup, per-process latch retained, fresh launch rechecks actual Markdown status. Native121PASS/5ignored; fake adapter/external-switch/script checks PASS; final package strict signature and disabled CLI/script PASS. No real association requests made; actual external-default-switch/relaunch matrix remains NOT TESTED. [Authority](default-markdown-20261010/every-launch-amendment.md), [report/evidence](default-markdown-20261010/every-launch-report.md).

## User-reported default request failure —2026-10-10

Actual prompt appeared, then user reported unverified/cancelled result without separate OS confirmation. T-D06 remains USER-REPORTED FAIL pending exact handler evidence. Same-identity duplicate copies and a local Intentgrove Markdown preference are observed; cause unconfirmed. Added accurate diagnostics, three bounded250ms read-only queries (no setter retries), strict no-workspace --inspect-default-markdown. Native121PASS/5ignored; fake duplicate/delay/unknown diagnostics, final build/signature/read-only CLI/disabled consent PASS. [Report](default-markdown-20261010/request-failure-report.md). No real default writes or preference resets by agent.

## Automatic native file opening — 2026-10-10

F005-R05/R06, AS-004/005: user selected focused tabs preserving workspace/drafts for all supported files including drops. T-N01/T-N02 implementation and local checks PASS: frontend534/62files (mocked Tauri, real App/editor), native123/5ignored (real disposable filesystem extension/race validation), TypeScript/Vite/worker/script/final arm64 package/deep strict ad-hoc signature. T-N03 actual Finder/drop packaged GUI remains NOT TESTED. No production profile launched or actual defaults changed. [Authority](automatic-native-open-20261010/authority.json), [report](automatic-native-open-20261010/report.md), [ledger](automatic-native-open-20261010/evidence/verification.json). User Terminal diagnostics established both Markdown handlers at /Applications/Intentgrove.app for a request from the generated copy; subsequent Finder launch was user-reported, with the old manual intake UI. Prior real-consent/native acceptance records remain historical.
