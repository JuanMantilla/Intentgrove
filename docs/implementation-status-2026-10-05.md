# Markdown workspace implementation status

Reviewed on 2026-10-05 for the owner of `md-reader`. The repository contains a working macOS application, substantial automated coverage, local app and DMG packages, and extensive specifications and design artifacts. It is beyond the original read-only reader. The complete approved product and redesign are still unfinished, and no feature ledger establishes full acceptance of the current combined application.

The clearest distinction is: **many bounded implementations are finished and tested; full native acceptance and several approved capabilities remain open.** Windows has prototype source now, but no verified Windows build or runtime result.

## Scope and evidence

The accompanying [file inventory](status-audit-2026-10-05/file-inventory.csv) lists **969 existing project files**, with category, feature directory where applicable, size, SHA-256, and document title. It includes 820 text files and 149 binary artifacts. See the [inventory summary](status-audit-2026-10-05/inventory-summary.json).

There is no reliable per-file AI authorship record: Git `main` has no commits, and the project files are untracked. Consequently, this report covers the project artifacts produced during the AI-assisted workflow without asserting that every file was authored by AI. Fonts, licenses, dependencies, templates, generated outputs, and captured screenshots have different provenance.

All included files were inventoried and hashed. Status assessment uses current source entry points and native boundaries, all 13 feature task ledgers, verification records, approval records, and the latest frontend handoff. Historical screenshots, recordings, and binary fixtures were inventoried; they were not individually visually re-reviewed. Dependencies, build caches, `.git`, `.codegraph`, OS metadata, secrets, and generated app trees were excluded from that inventory. Root app/DMG artifacts were checked separately. This report and its own evidence directory are excluded from the baseline inventory.

CodeGraph was consulted first. Its index omitted several changed files and did not locate the new Windows adapter; current on-disk source was used for those areas. Windows evidence, tasks, handoff and Windows-only fixtures changed during the audit. The final inventory incorporates those changes; the [observed changes](status-audit-2026-10-05/observed-changes.json) retain their fingerprints. The handoff inventory hash precedes this audit's final handoff update. This is a working-tree snapshot without a commit baseline, not a complete security audit.

## What is created

| Artifact group | Files | What exists | What creation establishes |
| --- | ---: | --- | --- |
| App source and local fonts | 44 | React/TypeScript interface, reader/editor/viewers, state models, styling, bundled font assets and notices | Executable application code and local assets |
| Native source and configuration | 70 | Rust/Tauri host, filesystem boundaries, storage, watchers, search, image helper, platform adapters, packaging and six integration test files | Native implementations and build infrastructure |
| Test and QA tooling | 69 | Component/behavior tests, disposable fixtures, worker checks, Python evidence validation, Swift capture tools, native image probes | Test infrastructure; a procedure or fixture alone is not a passing run |
| Feature artifacts | 412 | 13 feature directories with specifications, plans, designs, contracts, tasks and retained evidence | Defined scope and recorded progress; not automatic feature completion |
| Design review artifacts | 155 | Approved shell proposals, interaction specifications, SVG mockups, option D arrow variants, approval/hash records and revisions | Design work exists and current proposals have recorded approval |
| Frontend implementation artifacts | 136 | Plan, report, state, integration requests, source snapshots, patches, screenshots, renderer data and logs | Implementation traceability and bounded renderer evidence |
| Project documentation | 18 | Product brief, roadmap, approvals, architecture input, audits, build records and handoffs | Product decisions and historical context |
| Agent and workflow infrastructure | 52 | `.agents`, `.specify`, and `prompts` files | Reusable role instructions and Spec Kit workflow; not product features |
| Public license notices | 4 | Bundled font and highlighting notices | Third-party attribution |
| Root configuration and entry files | 9 | README, AGENTS, package/lock files, HTML entry, TypeScript/Vite config, build script and ignore rules | Project setup and local build entry points |

Generated artifacts also exist: `dist/`, Rust build outputs, `Markdown workspace.app`, `Markdown-workspace-local.dmg`, and its checksum. They can be rebuilt; their presence does not establish that they include every latest source change.

## Implementation by feature

“Implemented” below means the described code exists with bounded evidence. “Partial” means required capability or acceptance work remains. Detailed evidence is linked in each row.

| Feature | Already implemented | Current status and remaining work |
| --- | --- | --- |
| [Workspace reader](../specs/001-workspace-reader/verification.md) | Native folder/file selection, scoped grants, paged tree, Markdown tabs, GFM, local links/anchors/images, render worker and recoverable errors. Historical packaged reading journeys exist. | **Implemented; acceptance partial.** Full current packaged keyboard/recovery and UI cancellation/performance coverage remain. Earlier SVG-blocking and “no write command” statements describe the initial slice, not today's app. |
| [Section editing and recovery](../specs/002-section-editing-recovery/evidence.md) | CodeMirror source/split section editor, Undo/Redo, dirty guards, explicit Save/Save As, BOM/line-ending preservation, version checks, conflict inspection, durable drafts, moved-path ownership migration and safety copies with a 1 GiB budget. | **Implemented baseline; acceptance partial.** Packaged save-failure, moved-path, quota/cleanup and repeated recovery journeys remain. This source editor does not fulfill the newer direct rich-editing design. |
| [Document Find](../specs/003-document-text-search/verification.md) | Find in rendered text and live draft, Unicode matching, counts, next/previous/wrap, focus and tab/refresh ownership. One native-menu query is historically observed. | **Implemented; acceptance partial.** Full packaged highlight, keyboard, fixture and warm-load timing matrix remains. |
| [Workspace session](../specs/004-restore-workspace-session/verification.md) | Private validated checkpoints, tab order/active state, lazy reads, layout/reading settings, scroll anchors, recovery ownership and clear-session flow. Historical clean and dirty restart subsets pass. | **Implemented; acceptance partial.** Full tree/scroll/window restoration, stale paths, crash/restart, clear-state integrity and timing trials remain. Task checkboxes significantly lag the implementation. |
| [External refresh](../specs/005-external-change-refresh/evidence.md) | Watch hints, reconciliation, clean refresh, dirty conflict protection, manual reload, atomic replacement handling, uncertainty/reselection and watcher mutex repair. | **Implemented; acceptance partial.** Packaged external-writer/reselection and full performance series remain. Current native watcher tests pass with host access. |
| [Local images](../specs/006-view-local-images/verification.md) | Image tabs, inline image reads, Fit/actual-size/zoom, retained position, refresh, bounded native decoding and macOS XPC helper. Formats include PNG/JPEG/GIF/WebP/SVG/BMP/TIFF/HEIF. Safe SVG is rasterized rather than executed as document markup. | **Implemented; acceptance partial.** Packaged format/security matrix, real helper termination/recovery, memory/timing and physical gestures remain. Windows decoding is explicitly unavailable. |
| [Dark theme](../specs/007-dark-theme/verification.md) | System/Light/Dark, persistence, startup appearance setup, reader/editor palettes, EN/ES controls and Reduce Motion behavior. Historical native layout, contrast and editor-state subsets pass. | **Implemented; acceptance partial.** Complete operation/surface coverage, ten fully observed cold starts and app-scoped request observation remain. |
| [Rich reading](../specs/008-rich-reading/verification.md) | Bounded YAML metadata, bundled syntax-highlighting worker with plain fallback, exact code copy, duplicate-aware heading outline, Roboto/Roboto Mono and adjustable saved typography. | **Partial implementation.** Mermaid is not installed or enabled. Approved isolated diagram rendering, per-block fallback and large rich-document performance proof remain. |
| [Folder search](../specs/009-folder-search/verification.md) | Native scoped name/content/both search, nested ignore rules, include-ignored, incremental results, Stop, result reopening and stale-result protection. Pending-start cancellation repaired in the latest frontend pass. | **Implemented root search; acceptance partial.** Subtree search is absent. Packaged manifest, passage navigation, cancellation and keyboard/performance trials remain. |
| [Recent items](../specs/010-recent-items/verification.md) | Private recent folder/document records, order/cap, identity validation, reselection, remove and confirmed clear. One packaged recent item historically observed. | **Implemented; acceptance partial.** Repeated restart/reselection, ordering, cleanup, layout and keyboard trials remain. |
| [Large-file source mode](../specs/011-large-file-mode/verification.md) | Explicit read-only mode above 10 MiB through 50 MiB, larger-file rejection, private streaming snapshots, sparse offsets, virtual source windows, Go to Line, bounded copy and cancellable Find. | **Partial implementation and acceptance.** Full Find batch behavior and refresh/uncertainty integration are listed as unfinished; packaged boundary, memory and responsiveness trials remain. |
| [macOS delivery](../specs/012-macos-delivery/verification.md) | Local app/DMG packaging, ad hoc signing, native menus, Finder/drop intake queue and explicit access confirmation, close/Quit guards and reopen. Historical cold Finder crash repaired and bounded native journeys recorded. | **Local packaging implemented; delivery acceptance partial.** Current installed-app/update/drop/shortcut journeys, minimum-OS compatibility and complete v1 acceptance remain. No notarized/public release is established. |
| [Windows desktop](../specs/013-windows-desktop/evidence/implementation.md) | Approved Windows 11 x64/local NTFS review set; platform extraction, handle-relative NTFS access, path validation, private storage/locking adapters, Ctrl hints, final-exit composition, Windows fixture tests and unsigned per-user NSIS configuration. | **Prototype implementation; Windows NOT TESTED.** `windows_scoped` executes zero tests on this Mac. Original-document editing and image decoding are deliberately unavailable. No verified Windows build, constructed installer or WebView2 journey exists in the reviewed evidence. |

## Completed frontend work and missing approved capabilities

The latest [frontend report](../frontend-implementation/report.md) records a completed bounded pass, while explicitly marking the full approved package PARTIAL. Existing fixed option D Back/Forward controls, committed visit history, per-file location/zoom retention and image loading ownership are implemented. The latest pass adds cause-aware menu dismissal, folder Expand/Collapse, guarded batch tab closing, root/tab context actions, Projects Reload/Copy, reserved neutral reload feedback, retained outcomes and search cancellation fixes. These need no repeat implementation.

The same report records nine WKWebView states and 204 checks with native APIs mocked. That is useful renderer evidence, not native Save, permissions, durable recovery, physical trackpad or installation acceptance. This audit did not rerun those captures.

Five [integration requests](../frontend-implementation/integration-requests.md) define remaining approved-design work:

1. **IR-01 rich editing:** direct rich document editing, structured transactions/serialization and checkpoint/history ownership. Current CodeMirror source/split editing remains a design mismatch.
2. **IR-02 HTML viewing:** isolated HTML/CSS/resources and an explicit resource-access broker.
3. **IR-03 other files:** native metadata and default-handler launch routes for generic files.
4. **IR-04 Settings:** separate native Settings window, capability/preference ownership and persisted filter behavior. Current preferences live in the existing popover/tree controls.
5. **IR-05 native navigation and search:** OS Go menu routes and validated subtree search. Client history exists; the native menu/search contract does not yet supply these capabilities.

Design approval is recorded in [approval-all-2026-10-05](../design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.md). Approval of mockups does not establish implementation of the missing native/editor contracts.

## Checks executed for this report

Host: macOS 26.2 (25C56), arm64; Node 20.19.6; Rust/Cargo 1.88.0. Existing tools and disposable test fixtures were used. No dependency installation, app launch, OS setting change, commit, push or publication was performed.

| Check | Result | Evidence and limit |
| --- | --- | --- |
| `npm test -- --maxWorkers=2 --reporter=dot` | **PASS** | 40 files / 272 tests. [Log](status-audit-2026-10-05/tests.log). Component/behavior coverage; native bridge is mocked where applicable. |
| `npm run build` | **PASS** | TypeScript and Vite production build. [Log](status-audit-2026-10-05/build.log). Existing chunk-size warning; no native app rebuild. |
| `npm run test:bundle-worker` | **PASS** | Production Markdown and code worker checks. [Log](status-audit-2026-10-05/worker.log). |
| Locked offline native suite inside sandbox | **FAIL** | Library: 79 pass, 3 ignored. Automatic-refresh binary: 16 pass, 2 fail, 1 ignored; both failures wait for watcher hints. Later binaries were not reached. [Log](status-audit-2026-10-05/native.log). |
| Same native suite with host filesystem access | **PASS** | 170 passing executions across library/integration binaries, 8 ignored entries. [Log](status-audit-2026-10-05/native-host.log). Some shared module tests execute in multiple binaries, so 170 is not a count of unique scenarios. Windows-specific binary runs zero tests. |
| Python acceptance-tool unit tests | **PASS** | 14 tests. [Log](status-audit-2026-10-05/qa-tools.log). Evidence-validator/tool coverage, not desktop acceptance. |
| Existing root app signature | **PASS** | `codesign --verify --deep --strict`; executable identified as arm64 Mach-O. [Artifact log](status-audit-2026-10-05/artifacts.log). Existing local artifact only. |
| Existing root DMG checksum | **PASS** | `shasum -a 256 -c Markdown-workspace-local.dmg.sha256`. [Artifact log](status-audit-2026-10-05/artifacts.log). This audit did not mount/install the DMG or repeat its filesystem integrity test. |
| Current packaged app journey and Windows runtime | **NOT TESTED** | No native UI acceptance or Windows runner used. Existing app/DMG were not rebuilt from this source snapshot. |

The controlled rerun is consistent with the previously documented sandbox watcher limitation. Both runs are retained rather than hiding the initial failure. Ignored benchmarks/harness entries are not promoted to PASS.

## Task ledger snapshot

| Feature directory | Checked | Open |
| --- | ---: | ---: |
| 001 workspace reader | 27 | 8 |
| 002 section editing recovery | 30 | 8 |
| 003 document text search | 13 | 1 |
| 004 restore workspace session | 4 | 17 |
| 005 external change refresh | 32 | 5 |
| 006 view local images | 22 | 20 |
| 007 dark theme | 19 | 5 |
| 008 rich reading | 7 | 12 |
| 009 folder search | 9 | 7 |
| 010 recent items | 10 | 4 |
| 011 large file mode | 9 | 8 |
| 012 macOS delivery | 7 | 7 |
| 013 Windows desktop | 10 | 4 |

These are literal checkbox counts, not completion percentages. Tasks vary in size, some overlap, and several unchecked tasks already have implementation code but lack full verification.

## Documentation discrepancies

- **README understates the app:** it still describes a read-only F001 candidate and later editing features as open. Source editing, recovery, search, recents, themes and image viewing exist now.
- **Roadmap implementation statements are stale:** it says image implementation is pending and describes later slices primarily as approved work. Current source and feature evidence show implementation of many of them.
- **Windows handoff was reconciled during this audit:** the initial handoff described preparation and the task ledger checked only T001. The final handoff now records prototype implementation, ten checked tasks and new implementation evidence. That evidence reports sandbox watcher failures; this audit supplies a separate passing host-access rerun. Neither result establishes Windows support.
- **Historical approval drafts retain old labels:** September review documents and some approved Windows artifacts say Draft/Pending. Later approval records supersede those labels; they should be read with `docs/approvals.md` and the Windows `review.md`.
- **Historical evidence includes superseded gaps:** for example, early editing evidence says safety copies are unimplemented; later entries and `save_copies.rs` establish their implementation. Evidence should be read through its latest continuation, with its exact build limits.
- **Toolchain claims changed:** folder-search evidence refers to an obsolete declared Rust 1.77.2. Cargo now declares 1.88, and the current Mac suite compiles/tests with 1.88. This does not verify Windows or minimum macOS compatibility.
- **Retired requirements remain in historical wording:** [the scope decision](requirement-retirement-2026-09-28.md) removes offline/disconnected and VoiceOver-specific gates. They are not current release blockers. Keyboard access, ordinary accessibility, integrity and untrusted-content network restrictions remain required.
- **Artifact integrity and source currency differ:** the existing root app/DMG verify, but current source contains later frontend/platform changes. The audit does not establish that those binaries match this source snapshot.

Historical and approved artifacts were preserved. This report documents discrepancies without rewriting specifications, approval hashes or acceptance results.

## Remaining work in practical order

1. Verify the Windows read-only milestone on an actual Windows 11 NTFS runner, including compilation, scoped reads, private storage, locks, recovery and desktop behavior. Reconcile the host watcher rerun with the Windows handoff's earlier Mac failures. Enable editing only after native safe-save evidence.
2. Resolve IR-01–05 through the owning feature contracts and implement the missing rich editor, HTML/resources, generic-file routes, Settings and native Go/subtree integrations.
3. Complete isolated Mermaid rendering, per-block reading fallback and large-file refresh/Find behavior.
4. Rebuild a disposable macOS QA package from an identified source snapshot and finish native picker, Save/failure/conflict/recovery/restart, image-helper, physical input, keyboard/layout, performance and resource-request acceptance.
5. Reconcile README, roadmap and handoff status with the final evidence; close task boxes only when their full required checks are supported. Complete installation/update and compatibility acceptance for the intended private release.

**Delivery assessment:** working local macOS application with tested subsystems and verified existing package integrity; full approved design, complete v1 acceptance and Windows support remain unfinished.

## Historical image Markdown and HTML cleanup review

Follow-up check on 2026-10-05: **525 files inspected by path, role and content hash**: 274 Markdown, 9 HTML, 141 PNG, 99 SVG, one ICNS and one ICO. Dependency/build caches and generated app bundles were excluded. At the time of this review, all 969 baseline inventory paths existed and no files had been deleted. This historical section records the candidate assessment before the authorized cleanup below.

The [complete cleanup review](status-audit-2026-10-05/remaining-cleanup-review.csv) lists each path, recommendation, reason and any identical files. The [summary](status-audit-2026-10-05/remaining-cleanup-summary.json) records counts. Hashes describe the scan before this section was appended to the report. Image comparison here is byte comparison, not a new visual QA pass.

| Remaining files | Count | Assessment |
| --- | ---: | --- |
| PNGs in `frontend-implementation/evidence/option-D/` | 7 | Earlier renderer captures. Candidates for consolidation after retaining the needed option-D regression evidence and repairing evidence references. |
| PNGs in `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/` | 12 | Earlier failed/baseline captures. Current captures exist, but the earlier failures establish what was repaired; review the paired JSON and report references before removal. |
| Markdown in `frontend-implementation/evidence/approved-gap-pass/before/` | 6 | Pre-edit snapshots of state, plan, report, tasks and verification. Potential consolidation candidates; with no Git commits, these may be the only retained originals. |
| Historical status/build reports in `docs/` | 3 | `missing-work-audit.md`, `remaining-work-review-2026-09-28.md`, and `local-build-2026-09-29.md`. Current status supersedes their progress summaries. Preserve unique evidence and repair references before deleting them. |
| Relevant files in `design-reviews/03-10-27-01/proposals/archive/` | 97 | 35 Markdown, 5 HTML and 57 SVG. Keep as approval/revision snapshots unless approval history is explicitly being consolidated. Current approval records link to these archives, and they also describe unfinished rich editing, HTML and Settings. |
| Remaining HTML outside archives | 4 | Keep `index.html` as the app entry point, `tests/fixtures/redesign-preview.html` as the test entry point, and the current proposal/arrow preview pages as active design references. |

There are **31 groups of byte-identical files, with 59 additional copies** across the scanned types. These comprise 52 additional copies in design archive groups and seven in feature evidence groups. They are not automatically deletion candidates: identical raster output can document different image formats, separate startup trials or a reference comparison. Likewise, an archived approved SVG can match its current version while still being part of a referenced approval snapshot.

Keep current specifications, tasks, security/verification records, approval records, active handoffs, current renderer evidence and application icons. No complete feature currently qualifies for wholesale deletion based on the acceptance ledgers. The initial review identified 28 frontend/historical-report consolidation candidates. The authorized cleanup below removes only the subset compatible with preserving ongoing work. Deleting only PNG/Markdown/HTML files from those groups would leave incomplete manifests, JSON pairs and links; cleanup must account for those associated references.

## Completed cleanup and deleted files

On 2026-10-05 the user authorized deletion of disposable files while explicitly preserving code and files related to ongoing tasks. **Deleted 20 files: 19 superseded PNG captures and one obsolete Markdown progress summary, totaling 6,117,477 bytes.** No HTML files were deleted.

The seven earlier option-D screenshots and twelve before-fix/reference captures each have a retained current capture with the same case name under `frontend-implementation/evidence/approved-gap-pass/`. These current captures show later source; they are not represented as byte-identical originals. The old case JSON, aggregate renderer results, failure details, logs, drivers and source snapshots remain available. Historical screenshot links in archived reports refer to deliberately removed captures and should be read with this deletion record. Historical execution records do not imply those old images are still retained.

The deleted September 28 report was an obsolete progress summary. Its remaining work is covered by this report and the retained canonical feature ledgers. `docs/missing-work-audit.md` and `docs/local-build-2026-09-29.md` were retained because feature evidence and tasks still cite them. All six pre-edit Markdown snapshots, all approval archives, and current task/specification/security/verification files were retained.

| Deleted path | Reason |
| --- | --- |
| `frontend-implementation/evidence/option-D/dark-en-reading-controls.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/dark-en-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/dark-es-narrow-editing.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/light-en-narrow-search.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/light-en-save-recovery.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/light-es-enlarged-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/option-D/light-es-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/dark-en-reading-controls.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/dark-en-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/dark-en-reload.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/dark-es-narrow-editing.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/light-en-narrow-search.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/light-en-save-recovery.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/light-es-enlarged-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/light-es-narrow-reload.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/light-es-reading.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/reference-D.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/reference-menus.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `frontend-implementation/evidence/approved-gap-pass/renderer-before-fix/reference-narrow.png` | Superseded capture; current same-case PNG and historical JSON/logs retained |
| `docs/remaining-work-review-2026-09-28.md` | Obsolete status summary; current report and canonical feature ledgers retained |

The [deletion receipt](status-audit-2026-10-05/deletion-receipt.json) records every original SHA-256, byte size, reason, retained replacement and confirmed deletion. **PASS:** all 20 selected paths are absent; 968 protected files were checked byte-for-byte unchanged immediately after deletion, including app code, tests, task/specification artifacts, approval archives and retained evidence. Only this report, the frontend evidence notice, the compact handoff and the new receipt are written by this cleanup. Runtime tests were not repeated because no application or test code changed.

The original file inventory and cleanup-review CSV remain historical pre-deletion snapshots; consult this receipt for their intentionally removed entries.
