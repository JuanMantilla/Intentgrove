# F003L verification — 2026-09-29

**Host:** macOS 26.2, arm64. **Authority:** the approved F003L spec/design/plan hashes in `docs/remaining-roadmap-review-2026-09-29.md` match the current files; `docs/approvals.md` records the user's approval. The installed `setup-tasks.sh` selected `specs/011-large-file-mode`; no extension hooks exist. Sources used in tests are disposable files under `/private/tmp`.

| Check | Status | Evidence and limit |
|---|---|---|
| Scoped size inspection; >50 MiB pre-read stop | PASS for native/UI subset | `large_source.rs` uses native grants, no-follow open and metadata size; `tests/ui/large-source.test.tsx` verifies 12 MiB opt-in and 51 MiB limit before source open. |
| 10–50 MiB private snapshot, validation and windows | PASS for native subset | `large_source::tests` covers 10 MiB, 10 MiB+1, 50 MiB, 50 MiB+1, invalid UTF-8, cancellation cleanup, UTF-8 windows, changed source invalidation and exact 50 MiB long-line tail. Snapshot files are 0600; production parent uses the private 0700 app-data helper. Source stamp is checked before/after snapshot and each window/Find/copy. Tests do not simulate power loss or all permission failures. |
| UI choice and source controls | PASS for component subset | Three UI tests cover consent, limit, old rich-content replacement and native selection-copy routing. `LargeSourceView` paints at most about 64 KiB, exposes beginning/end, paging/scroll, Go to Line, Find, Reload and copy. EN/ES strings exist. Native visual/focus checks remain open. |
| Full regression | PASS | Latest `npm test -- --run`: 184/184; `cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib`: 73 passed, 3 ignored. F003L focused UI tests pass 4/4 and native tests pass 4/4. Current production web/app build passed. |
| Local app bundles | PASS for build only | Current production arm64 `.app` includes F003L progress/Find/copy edits and is ad hoc signed; executable SHA-256 `ceaeac4038451d96569e0ea88c179480d7fd77077d601e8904928d2c3f015f3b`, strict signature verification PASS. Current DMG SHA-256 `63cd6b52ff0b9a4cc90983dd5eefaf1503c30fbef1949a04620d60dedc952874`; `hdiutil verify`, read-only mounted app/signature/Applications-link inspection PASS, then ejected. The separate QA app predates the latest edits. Nonfatal `rust-objcopy`/libLLVM strip warning; no notarization. |
| Packaged visual journey | BLOCKED | `open -a` in sandbox reported `kLSNoExecutableErr`; managed unsandboxed `open -a /private/tmp/Markdown workspace Large QA.app` returned success and a QA `md_reader` process ran, but System Events found zero windows for both QA processes and `screencapture` reported no display image. No 12/51 MiB packaged UI result is claimed. QA app ID and fixture are isolated from production app data. |

| Acceptance | Status | Reason |
|---|---|---|
| AS-001 | NOT TESTED | Native 12/50 MiB reads and UI opt-in tested separately; packaged completion/progress not observed. |
| AS-002 | NOT TESTED | 50 MiB+1 native rejection and 51 MiB UI limit tested separately; packaged flow not observed. |
| AS-003 | NOT TESTED | Invalid UTF-8 and changed native source tested; packaged recoverable state not observed. |
| AS-004 | NOT TESTED | Find, Go to Line, copy and cancellation native functions exist; full keyboard/long-file journey not measured. |
| AS-005 | NOT TESTED | Version rechecks and reload wiring exist; packaged external writer journey not observed. |
| AS-006 | NOT TESTED | Exact 50 MiB native tail reached; 128 MiB app memory and unrelated-tab responsiveness not measured. |
| AS-007 | BLOCKED | Visible EN/ES 640-point keyboard checks require a QA window. |
| SC-001 | NOT TESTED | Boundary unit/UI cases exist; twenty packaged fixture trials and hashes remain. |
| SC-002 | NOT TESTED | Ten packaged 25/50 MiB memory/responsiveness trials remain. |
| SC-003 | BLOCKED | Visible EN/ES packaged keyboard checks remain. |

**Remaining implementation:** Complete automatic refresh/uncertainty routes, full Find batch behavior, 20 boundary trials, and packaged keyboard/memory checks when the QA display is usable. F006 and F002R are separate approved slices. F003F has its own verification ledger.
