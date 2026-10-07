# QA run plan — f007w-windows-desktop-20261005T214635Z

Mode RUN. Requested scope: actual Windows desktop checks described in the conversation, at 100/150/200% scaling. Acceptance source: [F007W spec](../../../specs/013-windows-desktop/spec.md), FR-001–010 and SC-001/002/004; existing T012/T024 gate. Installed Spec Kit confirms the same active feature.

Candidate: C:\Users\jsman\projects\personal\Intentgrove\artifacts\windows\2026-10-05T18-02-57-021Z-e15e8e5f\Intentgrove.exe
SHA-256: 3c152124ce291119aaa6c742ee82f36352ea1bcec9086d3067415b3c72db9801
Identifier: com.juanmantilla.markdownworkspace.windowsfixture20261005T180257021Ze15e8e5f.
Unsigned x64 release, no bundle, editing disabled, production acceptance harness absent per build receipt. No source/config/baseline changes permitted in RUN.

Native host process OS: Microsoft Windows NT 10.0.26200.0; x64 OS/process; volume format NTFS. WMI OS/volume probes denied 0x80041003; basic unprivileged metadata is separately recorded. Physical versus virtual host, active viewport, scale and GUI locale are UNKNOWN. Installed WebView2 154.0.4258.53 is present; this run does not verify usability.

Capability proof: filesystem/hash/PE/runtime-presence/process-launch/log capture VERIFIED_AVAILABLE. Native window inventory/input/screenshots/dialogs/scale control UNAVAILABLE: trusted sky RPC not configured, including after reset. Browser inventory exists but is NOT_NEEDED and cannot substitute Chrome for the app's WebView2. No browser tab was operated.

Synthetic data: .cache/f007w-windows-desktop-20261005T214635Z/Unicode café workspace/first.md and second.md; outside grant/unselected.md. Run-owned markers only. No real user documents opened or hydrated. Preexisting older Intentgrove PID 28644 is excluded and preserved. Changes to run-owned documents for refresh or move/delete scenarios would be permitted, but none occurred.

Execution: prove native access before input; if blocked, attempt one scoped direct executable launch and static diagnostics, retain truthful errors and mark GUI cases BLOCKED. No tool installation, privilege changes, debug protocol injection, Windows harness port, dependency upgrades, NSIS installation/signing/publication or product fixes. Preserve scratch data and logs; stop only verified run-owned processes. Actual launch exited itself before interaction.
