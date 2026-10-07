# F007W native desktop QA report

RUN/RETEST; PARTIAL; BLOCKING_FINDINGS_PRESENT. Windows x64/local NTFS, unsigned no-bundle release 0.1.0. Exact SHA256: `3c152124ce291119aaa6c742ee82f36352ea1bcec9086d3067415b3c72db9801`. Executable: `artifacts/windows/2026-10-05T18-02-57-021Z-e15e8e5f/Intentgrove.exe`. It was actually launched through native Computer Use and rendered with the installed WebView2 runtime. This establishes a tested host launch, not release certification.

The user confirmed 100% and manually changed the same display to 150% and 200%. Native UI workflows ran after each confirmation. Settings was not targetable; scaling evidence is USER_ASSISTED, with no independent per-monitor DPI API or Settings observation. No launch/restart was claimed at the changed scales.

## Coverage and findings

[Ledger](coverage.json), [readable coverage](coverage.md): **77 constituent rows — 38 PASS, 7 FAIL, 15 BLOCKED, 16 NOT_RUN, 1 NOT_APPLICABLE**. Rows are actual checks and explicitly unexecuted checks, not whole acceptance charters. Six failed normal-close attempts span the three reported scales; one additional failure is a heuristic status-feedback concern.

- [QA-0003](../../findings/QA-0003.md): S2 / suggested P1. Alt+F4 and title-bar Close each leave the same read-only candidate running at all three scales. Zero edits/recovery offers; unsupported-content error. Normal close/session restart/worker-termination acceptance fails or remains blocked.
- [QA-0004](../../findings/QA-0004.md): S3 / suggested P2, USABILITY_CONCERN. Empty startup and successful Markdown operations show an unexplained unsupported-content notice. Existing notice text stays English after Spanish controls render. Protocol refusal is expected and excluded from this concern.
- [QA-0005](../../findings/QA-0005.md): ENVIRONMENT_BLOCKER. Settings exposes no targetable window, restricted exact-PID cleanup is denied, Task Manager native launch approval times out, and chooser popup bounds are inconsistent. Native keyboard selection works; manual scale changes unblocked the scale-dependent constituent tests.
- [QA-0001](../../findings/QA-0001.md): original RPC inventory blocker resolved for this run through dedicated mcp__node_repl__js. Prior unified-tool failures are preserved.
- [QA-0002](../../findings/QA-0002.md): exact candidate normal-host launch and disposable-document opening PASS. Earlier restricted-runner exit101/Win32 5 remains a runner diagnostic, not a demonstrated normal-host startup defect.

## Observed behavior and practical limits

At 100%, individual Unicode/spaced file selection, folder enumeration, file/folder cancellation, Markdown/tabs/outline, grant refusal, Find/Escape, folder search, automatic refresh/manual reload, Spanish controls/light theme, maximize/restore, inert raw script markup, refused JavaScript/file protocols and blocked missing-image placeholder were exercised. Native WebView accessibility reports `http://tauri.localhost/`. Windows Edit remains disabled and Ctrl+S opens no save dialog.

At reported 150% and 200%, Unicode reading, existing outline, Find/Escape, sibling navigation, outside-grant refusal, file-dialog cancellation and folder search were repeated. Search scans three disposable entries and returns the two expected matches. At 200%, automatic refresh after refused close and manual reload also retain correct content. The 200% window exposes scrollbars for constrained height. Existing Spanish/dark controls remain visible; independent theme/locale switching and maximize/restore at these scales were not executed.

Preserve the working reading/navigation/search behavior, accurate grant refusal and explicit read-only explanation. The unsupported banner needs an operation-specific explanation; its root cause may relate to checkpoint failure, but no IPC trace establishes that. Source inspection identifies the guarded close → final checkpoint → finishEditingClose path as the next diagnostic boundary, not proof of a specific patch.

No screen-reader session, full accessibility conformance, measured contrast, network/CSP enforcement instrumentation, cloud-provider behavior, power-loss durability, Save/Save As production UI, drag/drop, active long-running search cancellation, moved/deleted restore or final worker cleanup was certified. Two-file searches complete too quickly for an observed in-flight cancellation. Native Mac regressions, automatic_refresh and packaged lifecycle/XPC are NOT_RUN; historical evidence remains historical. Linux is explicitly unsupported. No Mac acceptance harness was ported.

## Evidence and cleanup

[Evidence index](evidence/index.md). Actual native screenshots are unmodified JPEGs, visually inspected during capture; tool-returned AX snapshots retain origin, disabled state and document text. Build/environment, original fixture hashes, exact tool errors and process observations are saved separately. Native captures use logical window coordinates; a GPU metrics overlay appears in some wide/200% captures and is not treated as application UI or a performance measurement.

The original three disposable documents were restored to their original SHA256 values after external-change checks. The harmless boundary.md fixture is retained for retest. The isolated QA identifier/profile is retained; no production profile reset or real/cloud document selected or hydrated. The older window was inspected/activated to identify its build; the agent did not open/edit/close its documents or terminate older user PID28644. After six refused close attempts and denied restricted cleanup, the user reported restoring 100% and completing manual cleanup. [Final process check](evidence/53-user-cleanup-processes.json) observes no Intentgrove process, including neither PID2484 nor the prior PID28644; the latter absence follows user activity and is not an agent cleanup claim. No app-owned worker descendant termination was verified.

The manually opened Settings and Task Manager windows subsequently appear in inventory. Settings reading remains blocked by minimized-window/refresh-guard errors. Task Manager AX explicitly reports higher Windows integrity than the helper and exposes only a title bar. No elevation or policy change was attempted. Restart verification remains blocked: another launch would need another user-operated cleanup while normal close fails. Forced cleanup is not a normal-close PASS. The scale restoration remains user-confirmed.

Product source/configuration, approvals and lockfiles were not modified by this QA run. Seven approval hashes still match. No dependency installation, security change, installer construction/application installation, signing, publication, commit or push. Editing and T012/T024/T033 remain gated.

## Department handoff

- **OS_ENGINEERING — QA-0003, P1:** trace final finish_workspace_session response and storage/serialization error, then finish_editing_close if checkpoint succeeds. Preserve guarded close and safety protections. Retest both close paths, normal/crash restore and actual app/worker termination at each scale.
- **FRONTEND — QA-0004, P2:** identify the operation producing the notice and correlate native failures; clarify truthful feedback and existing-notice locale handling, with OS_ENGINEERING/UI_UX support. Retest supported startup/open/navigation and preserve negative protocol/refusal behavior.
- **QA_AUTOMATION — QA-0005 and historical QA-0001/0002 runner boundaries:** provide actual Settings/Task Manager targets and correct popup bounds, or retain explicit user-assisted steps. Complete the ledger's blocked/not-run cases after lifecycle repair. Rebuild identity and approvals must be verified before retest.

Detailed [handoff](department-handoff.md). This report recommends routing and retest criteria; it neither fixes the app nor authorizes release.
