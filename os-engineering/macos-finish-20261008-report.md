# macOS IMPLEMENT / PLAN-VERIFY delivery — 2026-10-08

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

**Partial delivery; acceptance gates remain open.** Existing workflow `CARGO_NET_OFFLINE=true npm run build:mac:dmg` rebuilt production after final application source fix. Build log: [final package log](evidence/macos-finish-20261008/package-final-after-settings-fix.log). No installation, dependency download, release credentials, notarization, security change, deployment target change or publication.

## Changes and source

QA0006 root cause: successfully decoded PNG was subsequently probed as Markdown by refresh status reconciliation. Added bounded native image fingerprint using stable image bytes/identity/generation and routed watcher/manual/root-file paths to it. Regression covers unchanged/same-inode changed images and replacement grant refusal; native library97PASS/3ignored, refresh2PASS. Actual native refresh red→green, replacement refusal, reopen, corrupt bytes/recovery and unsafe SVG PASS on final-source isolated candidate. Original failure preserved.

Frontend/parser and test reliability changes documented in [frontend report](../frontend-implementation/evidence/macos-finish-20261008/report.md). Native QA discovered Settings document Escape defect; frontend IMPLEMENT fixed it, candidates and production were rebuilt. No application source writes during QA RUN/RETEST.

HEAD7e00d3316ce46563cafb46ba928498fcb0d82880 plus dirty101-input [source manifest](evidence/macos-finish-20261008/source-manifest.json), SHA256270f687f2698fbf02605f90efda17b153bcbf913bcce020d3307fd95d9bf6e6c. [Exact input archive](evidence/macos-finish-20261008/source-inputs.tar.gz) SHA2566ba2645b93a7d8f004ebeab5cdfc5e44e0929b1a75f4a94184d2b17c4a92c082; [dirty patch](evidence/macos-finish-20261008/source.patch) SHA25650db9889c6f3779271bd74bd1b710c04647499f0abe58f63bbbf5b6b0b51fbb2. Inputs match after QA. Later test-only ownership repair is separately archived under QA final-test-inputs/final-worktree.patch; it does not alter packaged application inputs.

## Final artifacts and verification

[Intentgrove.app](../src-tauri/target/release/bundle/macos/Intentgrove.app), executable SHA256 **7885115fc30e33e5b451ab614c93770c0b2a3c950a882f36a1d3cad43cfa7491**.

[Intentgrove-local.dmg](../src-tauri/target/release/bundle/dmg/Intentgrove-local.dmg), SHA256 **0645023f6f219f920a0438b758bd43e3dbf43891149ade5cc603a5cff16d5382**.

[Checksums](evidence/macos-finish-20261008/final-checksums.json), [full bundle manifest](evidence/macos-finish-20261008/final-bundle-manifest.json), [package inspection](evidence/macos-finish-20261008/final-package-verification.txt), [read-only DMG mount comparison](evidence/macos-finish-20261008/final-dmg-mounted-verification.json). App/helper arm64, app LC_BUILD_VERSION min14, product0.1.0, IDcom.juanmantilla.markdownworkspace, md/markdown Viewer associations/icon inspected. Physical Resources contains icon; frontend/fonts are embedded assets, not loose resource files. Strict deep app and helper signatures PASS; helper code hash0d32ac9979d400bb9c6ed52c120b842c2db61b20e2507b6816b9c69de69ed194. DMG CRC/integrity PASS. Read-only mount contained app plus Applications link; mounted executable/helper/Info.plist identical, strict signature PASS, detached successfully. No app copied to Applications or executed from mount. Historical packages preserved in evidence/historical-packages and mapping.

Private ad-hoc signing is locally valid; Gatekeeper assessment rejects it. This is distinct from notarized distribution, which is not authorized or established. No bypass/security mutation. Source-only diagram probe failed to establish executing child; [concrete amendment](../specs/008-rich-reading/isolation-amendment-20261008.md) requests exact next experiment/dependency authorization. No impossibility assertion.

## Compatibility and runtime evidence

Host macOS27.0.1(26A434)arm64. Native final-source isolated-ID candidate30PASS/2FAIL/10BLOCKED; [QA report](../qa/runs/macos-finish-20261008/report.md). Production exact-identifier runtime BLOCKED pending disposable account/host. Current host has only aarch64-apple-darwin Rust target. macOS14 runtime, x86_64 compile/runtime and universal bundle unverified. Metadata/minimum load command inspection is not old-OS runtime acceptance; arm64 inspection is not Intel/universal compilation.

Ten10MiB native trials1137–1218ms usable upper bounds satisfy approved3s target; ten1MiB1009–1119ms action→AX upper bounds do not resolve approved1s-after-read target. Worker VM timings are supplementary. Full scope/drops/Dock/cancellation/stale/native languages/widths remains open. No full release readiness.

## Execution-ready install/update and compatibility procedures

1. Obtain disposable macOS account/host, record OS/build/architecture/toolchain and verify the exact DMG SHA above. Run `hdiutil verify` and mount read-only/nobrowse at a disposable mountpoint. Verify deep strict signature, product ID/version and executable/helper hashes against final-checksums; detach after use. Current account already completed these read-only checks.
2. Without an Applications copy, launch exact production bundle on disposable account; pin process path/hash and rerun the42-case coverage ledger with new evidence. Use disposable Markdown/images/folders and isolated production app data. Do not reuse isolated-ID PASS as exact-production acceptance. Observe actual Dock, Finder drops, executing cancellation and stale replies.
3. **Only after explicit Applications-install authorization:** on disposable account/host with no valuable existing install, copy app to `/Applications/Intentgrove.app`; if a prior app exists first quit and preserve it plus app-owned data to a dated rollback directory. Verify copied hashes/signature. Launch through Finder, record Gatekeeper result without changing policy; if blocked, report blocked and stop that journey. Test cold/warm Finder md/markdown association, file/folder drops, actual Dock reopen and EN/ES menus. No default association/system security changes.
4. Update journey requires a provided authorized prior package. Capture old version/hash/preferences/session/disposable draft and source checksums, quit, preserve rollback app/data, replace app only, verify new hashes, launch and verify migration/preferences/session/draft/source unchanged. Test failed-save retention. Restore rollback app/data only with operator agreement. Do not claim update from installing a fresh same-version package. Current version0.1.0 alone does not establish upgrade compatibility.
5. Run on macOS14arm64 using the same exact hashes where compatible, all native cases and resource/helper checks. For Intel use existing x86_64 target/cache and Intel runtime; if absent, request installation of the exact Rust target/dependencies rather than download now. Build both app/helper slices, inspect minOS/load libraries and signatures; run Intel acceptance. Create/verify universal only with both complete thin builds and existing workflow support; architecture inspection remains separate from runtime acceptance.

Ownership/actions: [QA handoff](../qa/runs/macos-finish-20261008/department-handoff.md). User's prohibition on dependencies/installation/security changes is the reason those steps need explicit authorization. specs012T002/T005/T006/T009/T010/T013/T014 remain open; no unverified checkbox is completed.


## Authorization update — 2026-10-08

[Actual user approval and exact boundaries](../docs/macos-continuation-approval-20261008.md) recorded. Previously pending disposable isolation probe/audited Mermaid11.17.2/project-lockfile addition and isolated Applications install/update checks are authorized. Original measured results, failed probes, packages and source provenance above remain historical; no acceptance or task gate is completed by approval alone. Separate rendering-process fallback remains subject to concrete architecture approval; environment/prior-package prerequisites remain. Documentation-only recording performed, no restricted release/security action.
