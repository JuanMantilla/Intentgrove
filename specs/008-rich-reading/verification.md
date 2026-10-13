# F002R verification — 2026-09-29

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

Reference host: macOS 26.2 (25C56), arm64. Tests use disposable content. The approved `spec.md`, `design.md`, `design/reading-states.svg`, and `plan.md` SHA-256 values still match `docs/remaining-roadmap-review-2026-09-29.md` (`59c46b5b…`, `bf418d97…`, `f443d3d5…`, `9eea6a7c…`). Installed Spec Kit task setup generated `tasks.md`; this record describes implementation evidence, not a new approval.

## Implemented slices

- **F002R-R03 / AS-002 — PASS in UI/worker tests:** The worker parses a bounded, failsafe YAML map. Metadata is collapsed with EN/ES labels and source access. Duplicate keys, aliases, tags, collections and over-limit input show invalid source. A small-document fallback also works without a worker. No metadata is applied to app settings. `tests/ui/frontmatter.test.tsx` and `tests/worker-bundle.mjs` cover these paths. Packaged visual/keyboard acceptance remains **BLOCKED**.
- **F002R-R04 / AS-003 — PASS in UI/worker tests:** Ten bundled grammars tokenize known fences in a separate worker with 32 KiB input, 5,000-token and 2-second UI bounds. React renders only text and fixed classes. Unknown or over-budget fences stay plain; Copy uses authored fence bytes including CRLF. `tests/ui/code-block.test.tsx` and the production `tests/worker-bundle.mjs` cover known/unknown/hostile text and exact Copy. Packaged keyboard/visual acceptance remains **BLOCKED**.
- **F002R-R05 / AS-004 — PASS in UI tests:** One duplicate-aware h1–h6 heading sequence supplies rendered IDs and the outline. The optional outline has level indentation, current-location text and navigation. `tests/ui/heading-model.test.tsx` and `tests/ui/workspace.test.tsx` cover duplicate headings. Refreshed/renamed-heading packaged behavior is **NOT TESTED**.
- **F002R-R06/R07 — PASS in local code and native/UI tests:** Roboto and Roboto Mono variable fonts are bundled with OFL notices. EN/ES reading controls select font and bounded size, line height and width; the chosen values enter the versioned F003C session checkpoint. Native validation rejects out-of-range values and restores defaults from an older checkpoint; UI restore/change is covered in `tests/ui/session.test.tsx`. Ten normal packaged restarts and no-write proof are **BLOCKED**.
- **Dependency provenance — PASS for bundled fonts/YAML/code:** Fonts came from `google/fonts` commit `23e54b51ddffbc7713c583748e3bd86f62b1fa4a`, `ofl/roboto` and `ofl/robotomono`, SIL OFL 1.1. SHA-256: Roboto regular `d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134`, italic `9725a847af6b460ffca162ae66d20dad48b01876137947180b42d7dcd7887182`, Mono regular `66a80e79d17e4c7cabd162e2916578a4cc08fd19eef6e2a643305eae9c567b2b`, italic `49ac343bb7b070071e53f0a8a501d68d140ed98ebd0a43b6b8fb96cf22f09ff7`. `dist/licenses/` includes font and tokenizer notices. `remark-frontmatter` 5.0.0, `yaml` 2.8.4 and `lowlight` 3.3.0 are direct exact pins; the lock resolves `highlight.js` 11.11.2. Lowlight is MIT, highlight.js BSD-3-Clause. `npm audit --omit=dev --audit-level=moderate` after the code dependency reported zero vulnerabilities; Mermaid is not installed.

## Current checks and open work

| Check | Status | Evidence or gap |
|---|---|---|
| Full UI suite | PASS | `npm test -- --run`: 194 passed, 29 files. |
| Native suite | PASS | Locked offline `cargo test --lib`: 74 passed, 3 ignored. |
| Production web and worker bundle | PASS | `npm run build`, `npm run test:bundle-worker`; font assets and OFL notices emitted. |
| AS-001 diagrams / R01–R02 | BLOCKED | Opaque-origin packaged Mermaid isolation, CSP and inert raster proof not established; diagrams remain disabled. |
| AS-003 code highlighting / R04 | PASS (scoped) | Local token worker, plain fallback and exact Copy pass UI/worker tests; packaged visual/keyboard check BLOCKED. |
| AS-006 renamed-heading fallback | NOT TESTED | Current scroll-top fallback exists; packaged refresh journey remains. |
| AS-007–009, SC-001–004 | BLOCKED | Hostile fixture matrix, packaged EN/ES/focus/width/Reduce Motion, request observation, 1/10 MiB timings and 10 restarts lack a visible QA window and completed renderer. |

The current worker still applies a whole-document 10,000-node cap and the renderer paints the returned document as one tree. Per-block fallback and 10 MiB timing targets remain open. No Mermaid or SVG execution path was enabled. The last isolated packaged QA launch produced no accessible window or usable display capture; compile/bundle checks cannot substitute for these acceptance checks.

A dense synthetic 10 MiB Markdown repetition (many short headings, lists and tables) took more than 60 seconds in a direct parser benchmark and was stopped; this is a complexity probe, not the specified non-adversarial timing fixture. The current app rejects this shape via its line/node budget. It confirms why the approved per-block architecture and timing work remain necessary.

Current local artifact: the thin arm64 ad hoc signed `.app` has executable SHA-256 `b61bfc5864c0474caf0eef3501d12428a8422c71465598aaa7127184cd5236f4`; `codesign --verify --deep --strict` PASS. The current-source v4 DMG SHA-256 is `3c034dc6657fe148ebd1212720c0a17c27e48ae7c001968a7007fc2269125d8d`; `hdiutil verify` PASS, read-only mounted executable hash/signature and `/Applications` link PASS. This is package integrity evidence only.

## Current-source rendering checkpoint — 2026-10-07

See [rendering/isolation checkpoint](macos-20261007-rendering.md). Approved hashes rechecked exactly. Bounded per-block rich results/source fallback, staged painting, generation and cancellation implemented; focused UI/production-worker checks recorded under `../../os-engineering/evidence/macos-20261007/`. Whole-input parser fallback/performance acceptance remains open. T004 remains partial; T007/T008 BLOCKED by missing audited dependency and unproven packaged isolation/CSP exception. Mermaid remains disabled. Historical artifacts/results above are preserved and do not verify this source.

Final frontend review also preserves reference-definition context and counts that context against rich output caps, with a scoped reference-navigation regression. Source/production package were rebuilt after the main native run; do not treat earlier candidate QA as a pass for that adjustment. Footnote numbering/shared anchors and parser-wide localized failure/performance are explicitly unverified compatibility cases.

Final-source isolated native MF01–03 PASS: scoped reference-definition navigation, disabled valid/malformed/hostile Mermaid **source fallback only** with neighboring blocks intact, metadata disclosure presence and second repeated-heading outline navigation. Candidate 1243af65…/new QA identifier; final-followup.md under ../../qa/runs/macos-20261007/. These do not prove T007/T008 or complete T004/performance/footnote compatibility. Current full frontend serial retry310/types/build/worker PASS; earlier failed attempts retained.


## Final-source macOS continuation — 2026-10-08

[Implementation](../../frontend-implementation/evidence/macos-finish-20261008/report.md), [native report/ledger](../../qa/runs/macos-finish-20261008/report.md), [raw42cases](../../qa/runs/macos-finish-20261008/coverage.json), [fixture hashes](../../qa/runs/macos-finish-20261008/evidence/rich-fixture-manifest.json), [worker timings](../../qa/runs/macos-finish-20261008/evidence/worker-performance.json), [native timings](../../qa/runs/macos-finish-20261008/evidence/native-performance.json).

T004 implemented bounded linear preflight,64KiBregions/128KiBcumulative rich budget/10MiBdocument limit, source fallback and generation/version/deadline worker handling; tests plus native hostile Before/After/End continuity PASS. Complex cross-region Markdown semantics and complete worker-deadline packaged busy proof remain partial; no whole-feature completion. Native metadata/highlight/folder-granted references/footnotes/repeated-heading targets PASS. Actual source-only overlimit11MiB consent/window PASS. T006 fixture files/hashes recorded, reference host macOS27.0.1arm64; exact production runtime separate.

T007 unchanged-CSP packaged probe FAILS to establish child execution: parent bridge present,0childmessages, parent removesframe1005ms. This is not denial/termination proof. [Concrete architecture amendment/exact authorization](isolation-amendment-20261008.md). T002dependency installation prohibited; T007/T008diagram architecture/implementation still open. Valid Mermaid AS001 FAIL; malformed diagram fallback AS002 FAIL; metadata/code constituents pass but entire AS003/AS007/SC001 remain PARTIAL/BLOCKED without diagrams/network observations. No production diagram enablement.

SC003:10native10MiB trials1137–1218ms Open→AX upper bound PASS for3s-after-read target.1MiB1009–1119ms includes driver/read latency and does not establish1s-after-read criterion; BLOCKED precise measurement. Warm worker algorithm timing is supplementary, no paint claim. T018 unrelated-tab response/complete timing contract remains open. SC002/AS008 EN/ESthreewidths/ReduceMotion full matrix NOT RUN. AS004–006/SC004 duplicate target and one restart preference/session constituents PASS; ten restarts/refreshed anchors complete contract open. AS009 large behavior constituents PASS, completeperformanceacceptancePARTIAL. T011/T012/T015–19 stay open.

322frontendPASS46files; native97PASS3ignored; package checks PASS. Final app/DMG and source identities in OS report. Native isolated-source ledger30PASS/2FAIL/10BLOCKED, no historical passes carried forward, production exact identifier runtime explicitlyBLOCKED. Full feature not accepted.


## User authorization update — 2026-10-08

User approved the scoped outstanding actions: [canonical approval and boundaries](../../docs/macos-continuation-approval-20261008.md), [reviewed hashes](../../docs/macos-continuation-approval-20261008.json). Disposable blob-frame probe and audited Mermaid11.17.2 installation/lockfile changes are now authorized; isolated Applications install/update tests are authorized on a disposable account/host. Earlier approval-pending/no-install labels are historical and superseded only for these actions. Production proof gates, acceptance results and unchecked tasks stay unchanged. Separate killable-process architecture requires a concrete amendment if needed; release/security/commit restrictions remain. Environments/prior update package are still prerequisites. Next: execute the approved probe/audit, then implementation/rebuild/retest; run installation checks when the isolated environment is available.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.

## 2026-10-08 scoped Mermaid security/cancellation completion

CF37/CF38 original resource/authority/forged-reply/executing-cancellation/stale/ownership gates now PASS in authenticated real-parent/WebView integration with directly executed unchanged packaged helper/XPC on macOS27.0.1arm64. Actual transport injection exposed QA-0014; final production consumer validates complete bounded PNG chunks/CRCs.90WebView checks,351frontend tests and real-process opt-in tests pass. CF56 source-map-js1.2.2 complete npm lock audit reverified; native maintenance advisories retained. Exact original-criteria mapping, commands, candidate/instrumentation applicability and preserved failures: [continuation report](../../qa/runs/macos-remaining-20261008/mermaid-acceptance/report.md).

This supersedes earlier Mermaid security/cancellation proof gaps only. It does not close broader mixed-performance/UX/accessibility/production-ID acceptance tasks; task checkboxes and historical ledgers remain scoped as recorded. New default-feature package6fb642de… built/signature/boundary verified, not installed or published.
