# Windows desktop QA report — f007w-windows-desktop-20261005T214635Z

Execution **PARTIAL / desktop BLOCKED**; scope assessment **INSUFFICIENT_EVIDENCE**. Candidate Intentgrove 0.1.0, unsigned x64 no-bundle release, SHA-256 3c152124ce291119aaa6c742ee82f36352ea1bcec9086d3067415b3c72db9801. Host process reports Microsoft Windows NT 10.0.26200.0, x64, NTFS; actual viewport/scales UNKNOWN. Tested through restricted local process/filesystem tooling, not observed native GUI or a browser substitute.

[Coverage ledger](coverage.md): **36 rows — 4 PASS, 1 FAIL, 30 BLOCKED, 0 NOT_RUN, 1 NOT_APPLICABLE**. Four passes concern artifact/runtime-file/static-PE/cleanup evidence only. The failure is a real restricted-runner startup diagnostic, not a confirmed normal-host product defect. Thirty GUI rows are unexecuted after a shared access failure; dirty-edit confirmation is inapplicable to this read-only candidate.

## Actual execution and preserved behavior

Candidate hash matches delivered binary; PE is x64 with only inspected Windows system/UCRT imports; installed WebView2 154.0.4258.53 executable exists. These do not establish rendered UI or runtime dependency resolution. Three synthetic documents remained byte-identical. The run-owned PID 30632 exited; existing user PID 28644 remains running. No screenshots were obtainable or created. No user work, display/security settings, app installation, source/config, editing gates or baseline was changed.

## All findings and attempts

- **QA-0001 ENVIRONMENT_BLOCKER:** sky.list_windows returned “Error: Trusted RPC service is not configured: sky” twice, including after a session reset. No target window or screenshot was available; all requested desktop charters and 100/150/200% scale combinations remain BLOCKED. [Canonical finding](../../findings/QA-0001.md).
- **QA-0002 ENVIRONMENT_BLOCKER / root cause UNKNOWN:** the exact candidate reached Tauri setup then exited 101: “Failed to setup app: error encountered during setup hook: Access is denied. (os error 5)”. This was a restricted tool runner. Prior startup success belongs to an older artifact; it does not prove this exact binary works outside the runner. [Canonical finding](../../findings/QA-0002.md).
- **Preserved earlier launch attempt:** PowerShell Start-Process failed before creating a child because its environment contained duplicate Path/PATH keys. The shell-independent Node attempt then created PID 30632 and exposed the separate setup error. The first failure was not discarded or counted as an app launch. [Attempt 1](evidence/process-launch.json), [attempt 2](evidence/node-process-launch.json), [actual stderr](evidence/node-launch-stderr.txt).
- **Metadata limitation:** WMI Get-CimInstance/Get-Volume returned Access denied, 0x80041003. No elevation was attempted. Basic process OS/x64 and DriveInfo NTFS metadata were obtained separately and are explicitly labeled.

## Limits and readiness

No real app clicks, typing, shortcuts, dialog/drop/cancel, Find/search, links/image state, refresh, recents/session restart, Alt+F4/window close, worker termination, accessibility/visual review or display scaling were tested. Static CSP config is not runtime CSP/origin evidence. No mock, Windows acceptance harness or debugging bypass was introduced. Prior automated frontend/native results remain separate historical evidence; they were not rerun or added to current counts. Current macOS native/packaged checks NOT_RUN; Linux unsupported; both are outside this Windows run. No installer was constructed or installed. Windows editing remains disabled; T012/T024/NSIS and release readiness remain open.

## Cleanup and residual data

[Cleanup](evidence/cleanup.json) confirms the run-owned process is gone and the preexisting app process is preserved. This does not prove actual user close semantics or all WebView2 worker termination. Scratch fixtures and evidence remain under their run-owned folders for retest. No private app profile was reset or deleted; any setup-created profile content is retained and not claimed cleaned.

## Department handoff

[Detailed handoff](department-handoff.md): **QA_AUTOMATION — QA-0001**, restore host-supplied Windows native automation and re-run GUI cases. **OS_ENGINEERING — QA-0002**, compare the exact binary on an ordinary authorized host, then investigate setup only if the error reproduces there. QA_TRIAGE owns the next discriminating check if routing remains uncertain. These are recommendations, not proven root causes, code-fix authorization, ticket publication or release approval.
