# F005 current delivery readiness — 2026-10-07

OS PLAN/VERIFY; no application fixes in this phase. Current source at HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` plus recorded dirty source manifest. Existing historical packages and evidence retained. Not installed, notarized or published.

| Environment / stage | Current result | Evidence / exact limit |
|---|---|---|
| macOS 27.0.1 (26A434), arm64 native host | PASS compiler/package integrity | Locked offline compiler; native library 96 passed/3 ignored; Settings 8 passed. Runtime acceptance is separately scoped in QA report. |
| macOS 14 minimum | NOT TESTED | Plist and binary minimum are 14.0; configuration is not execution evidence. No macOS 14 runner available. |
| Intel x86_64 | NOT TESTED | Only aarch64-apple-darwin target installed. No Intel host or x86_64 cached target; no dependency/toolchain install authorized. |
| Universal | NOT TESTED / not produced | Current app/helper are thin arm64. No universal artifact claimed. |
| Product metadata | PASS inspection | Intentgrove 0.1.0, stable production ID, Markdown associations (Alternate Viewer), icon, high-resolution flag, 14.0 minimum. Not a runtime association or icon UX pass. |
| Image helper | PASS package inspection | arm64 nested ImageDecoder.xpc, expected plist/executable, strict deep signature verification. Runtime helper decode/security is in QA coverage. |
| Private ad-hoc signing | PASS integrity | Signature=adhoc, TeamIdentifier not set. Strict verification passes. |
| Gatekeeper | FAIL acceptance | Sandbox assessment initially gave internal signing-subsystem error; read-only unsandboxed retry rejected the app (exit 3). Never bypassed or changed trust/security. |
| DMG | PASS integrity | Existing script created Intentgrove-local.dmg after sandbox Device not configured failure; CRC verify VALID. No disk mounted. |
| Developer ID / notarization | NOT TESTED / outside current delivery | No release credentials used, submission, ticket or distribution claim. |
| Installation / upgrade | NOT TESTED | Explicitly excluded on this host. T006/T013 stay open. |
| Full v1 acceptance | NOT TESTED / partial | Rich diagrams and full parser/performance remain incomplete; current QA coverage is not release certification. |

App executable SHA-256 `8139d3e00ad31ee571884dba9b14a8124cc1c64905b62ab1a2ffd4e842a07f7c`.
Helper SHA-256 `0d32ac9979d400bb9c6ed52c120b842c2db61b20e2507b6816b9c69de69ed194`.
DMG SHA-256 `c895c773db01d6f84902f9e43088e32c2370c2fddd247d8d09b5dc6456c00ae3`.
Evidence: `../../os-engineering/evidence/macos-20261007/` (architecture, plist, helper plist, signatures, Gatekeeper attempts, source manifest, package logs, DMG verify/imageinfo/checksums).

## Unavailable-environment procedures

1. **Minimum OS:** On a disposable physical/VM macOS 14 arm64 host, record `sw_vers`, `uname -m`, exact app/helper/DMG hashes and quarantine state. Obtain explicit authorization for mounting/installing the private package. Verify strict signatures and Gatekeeper without removing quarantine or changing policy. Record rejection separately; an operator-authorized launch, if permitted, is not Gatekeeper acceptance. Run the full native QA cases with a fresh profile, exact fixtures and before/after hashes; include Settings focus, cold/warm Finder, scoped search, dirty Cancel/save failure, Dock/restart, images and large-file timings. Repeat ten authorized install/launch trials for SC-001.
2. **Intel:** In an authorized Intel macOS environment with already available pinned x86_64 toolchain/dependencies, build both main app and image helper for x86_64, package/sign using private policy, record `file`/`lipo`, linked libraries/minimum metadata and hashes, then execute the same acceptance ledger on native Intel. Cross-compilation alone cannot establish support. Do not reuse an arm64 helper.
3. **Universal:** Only after separate CPU checks, build both architectures for app/helper; verify each bundled executable has both slices, consistent minimum metadata and nested signatures. Test the delivered universal bundle separately on both native CPUs. This report authorizes neither target installation nor architecture changes.
4. **Update:** In a disposable authorized user/VM, install the archived prior build, create fixture preferences/session/draft, record source/app-data hashes, quit normally, replace only the application with the exact candidate under an approved install procedure, relaunch and verify preferences/session/draft/grant recovery and source preservation. Include interrupted replacement/rollback as permitted; retain prior binaries/data. No real-user profile reset.

## Task reconciliation

T005 metadata inspection is established, supported-target/association runtime remains open. T006 package/signature/image integrity is established; Gatekeeper acceptance fails and installation remains unrun. T009 source menu integration is present but complete native shortcuts/focus acceptance remains open. T010/T013 require current QA evidence, not older bounded journeys. T002/T014 full v1 matrix remain open. No task was checked merely because a package compiled. The 2026-09-29 host and packages in the original ledger remain historical evidence.

Final packages include the reference-context follow-up. Current-prefixed signature/plist/architecture/Gatekeeper/DMG logs and current-package-hashes.txt are authoritative. The earlier DMG hash 07f97f… is retained under Intentgrove-local-before-reference-20261007.dmg; the main native QA ledger remains attached to its recorded earlier candidate, with any final follow-up acceptance stated separately.

Final native follow-up MF01–03 ran in a fresh final-source QA profile; full native acceptance remains partial. Main LC_BUILD_VERSION minos14.0/SDK27.0; helper minos11.0/SDK15.5 (compatible build floor only, no minimum-runtime proof). Final current frontend serial retry310 PASS; earlier intermittent failures retained.


## Current approval status — 2026-10-08

This older readiness table remains historical. [Current delivery report](../../os-engineering/macos-finish-20261008-report.md) and [new user authorization](../../docs/macos-continuation-approval-20261008.md) supersede approval-pending statements for the exact Mermaid addition/probe and isolated Applications install/update checks. Actual compatibility/install/update remains unverified; environments and authorized prior package remain missing. No OS-security or release permission is added.


## Final-source reconciliation —2026-10-08

Current report: ../../qa/runs/macos-completion-20261008/report.md; ledger56cases40PASS/1FAIL/15BLOCKED, explicitly separated default-isolated/instrumented/package/environment scopes. Final226-input manifest unchanged;344frontend PASS/50files,100nativePASS/3ignored, build/worker PASS. Production executable64811928…; DMG12cfc97d…; strict signatures/arm64/resources/read-only DMG integrity PASS. Exact production-ID runtime remains BLOCKED pending disposable host; min14 metadata is not macOS14 runtime proof.

Approved process/engine amendments and exact Mermaid11.17.2/KaTeX0.18.2 remedy supersede earlier approval-pending labels. Supported flowchart/sequence, bounded killable rendering and per-block fallback implemented. Executing final helper deadline sampled; held native stale batch/open replies pass; sampled executing cancellation/full final resource/forgery/network observation incomplete. Final source current anchor/Settings/image/lifecycle constituents pass within recorded scope. Ten ordinary large-file reopen trials per size meet measured upper bounds; richer mixed/full after-read contract remains partial. Unrelated instrumented tabs10/10<=250ms.25,000-entry packaged Stop timing/layout matrix incomplete.

Complete dependency audit FAIL: HIGH development source-map-js1.2.1; exact integrity-checked1.2.2 amendment proposal awaits its additional approval. QA-0013 retains unexplained historical frontend timeouts. Native CUA now cgWindowNotFound for app and Finder after documented reset; no tool delay called app slowness. Drops/Dock/closed-window proof/macOS14/Intel/install/update remain blocked. See department-handoff.md, v1-requirements.md and external-environment-procedure.md for each owner/prerequisite/action. No unmet checkbox is completed; no overall completion or release certification.
