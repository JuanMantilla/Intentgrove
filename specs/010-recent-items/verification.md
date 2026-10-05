# F003R verification ledger

Approval: User approved the F003R review set on 2026-09-29; all four gate hashes in `docs/approvals.md` matched before implementation. `.specify/feature.json` selected F003R for task generation.

| IDs | Status | Evidence / limit |
|---|---|---|
| AS-001/002/005 (native metadata and UI flow) | PASS | `src-tauri/src/recents.rs` disposable tests cover latest-use order, 50-document cap, prior-valid fallback and source-file preservation; `tests/ui/recents.test.tsx` 4/4 covers open, replaced-folder reselection routing, remove, clear confirmation, corrupt-state copy and EN/ES. Native grant identity is rechecked on open. |
| AS-003/004 (metadata removal) | PASS | Native remove/clear commands write only private recents record; disposable source bytes remain unchanged. UI test verifies confirmation and distinct session API. |
| AS-001–006 (packaged host) | NOT TESTED | One bounded QA `.app` observation passed: Finder-opened `entry.md` appeared under Recent documents with Open/Remove/Clear controls after native File → Close Tab. Source and sibling SHA-256 stayed unchanged. Restart/reselection, focus, 640/900-point layout, draft hashes and app-request observation remain open. |
| SC-001–003 | NOT TESTED | Ten trial order/reselection, ten remove/clear and packaged keyboard journeys have not been measured. |

`npm run build` PASS; full `npm test` PASS 174/174 after Recents integration; `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib` PASS 55/55 with two existing ignored tests. Focused Recents Rust 2/2 PASS after root-relative metadata change. Later F005 integration raised suite counts; see F005 ledger. No user repository was selected or changed by these tests.
