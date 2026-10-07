# QA retest report — f007w-retest-20261006T004857Z

Execution **BLOCKED**. Assessment **INSUFFICIENT_EVIDENCE**; existing acceptance blockers remain open. No current native product fix verification or whole-charter PASS; release readiness is **NOT ESTABLISHED**.

Latest identified Windows candidate: [Intentgrove.exe](../../../artifacts/windows/2026-10-06T00-21-45-964Z-72a87848/Intentgrove.exe), SHA-256 `d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0`, disposable identifier `com.juanmantilla.markdownworkspace.windowsfixture20261006T002145964Z72a87848`. Saved and release outputs match. The executable predates QA-0004; no newer product candidate was located in scoped hidden/ignored executable inventory excluding dependencies/test binaries. Candidate identification PASS is not QA-0004 inclusion or native acceptance.

Dedicated Windows Computer Use initialized successfully but sky.list_apps failed three times (including after reset/reinitialization) with `Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified. (os error 2)`. No window selected. Settings, Task Manager, native chooser, screenshots and AX are BLOCKED before access. This is an environment failure, not a new product failure. No custom helper, alternate UIA, elevation, policy change or bypass attempted.

[Coverage](coverage.json): 75 planned rows; 69 BLOCKED, 2 PASS, 3 NOT_RUN, 1 NOT_APPLICABLE. Only identity and product-read-only supplementary checks execute. Zero native product cases execute. All 22 cases at each requested scale remain explicit. Current Scale UNKNOWN; no display mutation occurred, so original setting was left untouched, with no restoration/current-scale verification inferred. Mac current close/session/packaged checks NOT_RUN; Linux NOT_APPLICABLE because unsupported.

## Finding reconciliation

- **QA-0003 OPEN / RETEST_BLOCKED.** Original six close failures on 3c1521… remain. Engineering establishes protected-DACL initialization ordering and source repair; earlier user-assisted both-close passes, ordinary-host app/six-WebView2 descendant exit, and first-file restart are retained as scoped historical evidence at unspecified DPI. Later exact d95d2bcb candidate two-tab restore/sibling and single-file restriction USER_ASSISTED PASS remains T038 acceptance. Neither proves current full DPI/cancellation/crash charter. No resolved finding asserted here.
- **QA-0004 OPEN / RETEST_BLOCKED / candidate fix inclusion unestablished.** Full287/build/worker and synthetic Chrome notices/locales remain engineering evidence. Native operation/code/status, current profile, refresh, live locale and failure preservation are unexecuted. Identical historical startup DACL cause is not asserted.
- **QA-0005 OPEN / RETEST_BLOCKED; current transport unavailable.** Preserve earlier absent inventory/launch error, minimized Settings/refresh guard, higher-integrity Task Manager and 16x16 popup bounds. Current pipe failure does not prove those narrower failures disappeared or recur. Prior keyboard chooser success and user-assisted Scale restoration remain historical.
- Prior QA-0001 resolved route and QA-0002 ordinary-host launch PASS stay historical; present transport outage does not erase them or establish restricted runner access.

## Evidence, UX and cleanup

[Evidence index](evidence/index.md). Actual error/identity/process/hash artifacts only; **no new screenshot or AX captured** because inventory failed. No current UI/UX/accessibility judgment or conformance claim. Prior screenshot/AX evidence stays in original run with original build/scale provenance. Old user-assisted work is not recounted as current runtime testing.

No product/test/configuration change; run-local documentation helper only. No candidate launched, no disposable fixture/profile created, no edits enabled, no installer constructed/installed, sign/publish/commit performed. Read-only process inventory exposes preexisting diagnostic PIDs 12340 and 25688 from older artifact paths; they were not created or stopped by this run. Their presence is not failure of this candidate's termination. No worker lineage observed and no cleanup PASS fabricated. Product hash comparison is separately recorded.

Known Mac user report: window remains visible and Cmd+Q fails; cause unknown. Current Windows host cannot reproduce it. Mac-only compile guard remains unchanged. Earlier automatic-refresh watcher failures and later report without referenced raw log are preserved; no current Mac PASS assigned.

## Department handoff

[Detailed handoff](department-handoff.md): QA_AUTOMATION restores permitted native access and probes QA-0005; FRONTEND supplies exact QA-0004 rebuilt receipt then returns QA-0004 to native acceptance; OS_ENGINEERING retains QA-0003/T036 and separately diagnoses Mac T037; QA_TRIAGE/release owner keeps T012/T024/T033 gates open. No new release approval.
