# F005 private macOS delivery verification ledger

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
