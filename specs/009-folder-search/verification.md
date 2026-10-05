# F003F verification — 2026-09-29

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
