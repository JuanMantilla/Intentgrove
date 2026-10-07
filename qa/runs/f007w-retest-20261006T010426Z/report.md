# QA RETEST — f007w-retest-20261006T010426Z

Execution **BLOCKED**, assessment **INSUFFICIENT_EVIDENCE**. No finding resolved in this run; release readiness **NOT ESTABLISHED**.

New candidate [Intentgrove.exe](../../../artifacts/windows/2026-10-06T01-06-06-305Z-4e8e006d/Intentgrove.exe), SHA-256 `ad594484d4687ca994354cefc48ff2ab10ad81e577e185f0597e9ad13517906c`, 15,969,792 bytes, identifier `com.juanmantilla.markdownworkspace.windowsfixture20261006T010606305Z4e8e006d`. Unsigned x64 release/no bundle. Receipt 2026-10-06T01:06:06.306Z–2026-10-06T01:07:04.063Z; saved/release hashes agree. [Source cutoff](evidence/source-cutoff.json) matches six QA-0004 engineering hashes and 197 captured product/test/build inputs unchanged across build. This replaces the previously latest located d95d2bcb candidate for future QA; old artifacts and its user-assisted acceptance preserved.

[Ledger](coverage.json): 80 rows, 71 BLOCKED, 5 PASS, 3 NOT_RUN, 1 NOT_APPLICABLE. **Zero native product cases executed**. Supplementary source/build/identity/read-only passes are separate from 22 native cases per target scale. Current and original Scale UNKNOWN; no mutation occurred, so setting left untouched without claiming restoration verification.

52 focused tests in 4 mocked UI suites PASS; offline no-bundle builder's 287 frontend tests, frontend build, bounded worker bundle, all-target compiler/release/PE checks PASS. Existing chunk-size/Rust warnings retained. No dependency restoration/install, native runtime tests or installer.

QA-0003 OPEN / RETEST_BLOCKED: Windows protected-storage order repair and historic close/observer passes retained; original six failures on 3c1521… remain. Current close/crash/cancellation/exit/DPI unexecuted. Mac symptom/cause separate and unknown.

QA-0004 OPEN / RETEST_BLOCKED: new candidate includes verified current operation/locale source; old candidate predates it. 52 focused mocked and builder 287 checks PASS; actual startup/storage error, notices/locales/refresh/pickers/DPI remain untested. No identical startup DACL cause inferred.

QA-0005 OPEN / RETEST_BLOCKED: native pipe outage persists after supported reset; current actual Settings/Task Manager/dialog access unobservable. Existing narrower failures retained.

[Connection investigation](connection-investigation.md) records actual 3 probes, supported reset, Windows client context, capability/manifest/log checks and exact missing actuator. A process or successful import/build does not prove native GUI access. No screenshots or AX captured; no current visual/a11y judgment.

Cleanup: no candidate launched or fixture/profile created by this run. Preexisting Intentgrove PID 14840 (old d95d2bcb path) and Settings PID 11552 recorded through Get-Process and left untouched; these are not termination failures of the new candidate. CIM parent inventory denied 0x80041003; no worker lineage claim. Product/test/build 197 hashes unchanged. Generated dist, target, isolated build cache and new artifact/receipt outputs are permitted build outputs. No edits enabled, security/elevation, install/sign/publish/commit. Mac-only harness preserved; actual current Mac checks NOT_RUN, Linux unsupported.

[Evidence index](evidence/index.md), [department handoff](department-handoff.md). T038 historical exact sibling/restart USER_ASSISTED completion remains; T036/37/39/12/24/33 and release/editing/installer gates remain open. Next: QA_AUTOMATION/provider restores host endpoint and returns actual inventory; QA observes original Scale and executes remaining ledger on the new exact candidate.
