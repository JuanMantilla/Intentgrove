# QA retest plan — f007w-retest-20261006T004857Z

RETEST QA-0003/0004; investigate QA-0005. AUTOMATE restricted to this run-local reconciliation helper. No product fixes, builds, installer, editing, elevation, security change, sign, publish or commit.

Latest located executable: `C:\Users\jsman\projects\personal\Intentgrove\artifacts\windows\2026-10-06T00-21-45-964Z-72a87848\Intentgrove.exe`. SHA-256 `d95d2bcb83f5275a91c776f2d6c977f0187331c16a50e09d6120749937b32ae0`. Disposable compiled identifier: `com.juanmantilla.markdownworkspace.windowsfixture20261006T002145964Z72a87848`. Unsigned x64 no-bundle 0.1.0. Receipt and both saved/release hashes verified before any planned launch. Receipt finished 2026-10-06T00:23:11.017Z; this is the earlier sibling-link candidate. QA-0004 engineering explicitly reports no native build. Fix inclusion is not established; user instructed QA to find latest created executable, which this run did.

Acceptance: specs/013-windows-desktop/spec.md FR-001/003/006/008/011 and SC-004; canonical QA-0003/4/5; T036–T039 and latest engineering reports. Exact historical QA-0004 startup code remains uncaptured. Seven approvals and T012/T024/T033 gates remain unchanged.

Environment: Windows PowerShell host, intended native Windows 11 x64/WebView2; exact current OS/runtime/display geometry/scale/locale unavailable through the failed native connection. @oai/sky via dedicated mcp__node_repl__js. Prior run had USER_ASSISTED 100/150/200% then restored 100%; this does not prove current Scale. No alternate browser renderer/mock substitutes.

Plan: fresh run-owned copied first/second Unicode documents plus bounded loading/search and inert boundary fixtures; select folder and verify source hashes. The compiled disposable identifier is previously used; it is not a fresh empty profile. Do not inspect/reset old app data or modify DACLs. If access returns, establish a safe disposable candidate/profile and owner PIDs before testing. Native crash recovery is limited to an exact run-owned instance. Never stop older diagnostic processes.

All 22 constituent cases at each of 100/150/200% are explicit in coverage.json, including both close routes in empty/open states, truthful notices/locales, session/recents, normal/crash restart, live cancellation, app/worker exit, native drag/drop, CSP and navigation. Native chooser and Settings/Task Manager access are separate checks. Verify original display Scale first and restore that exact setting after testing.

Stop condition reached: three failed inventories including reset/reinitialize. No launch, input, fixture/profile creation or scale mutation. Continue safe identity/evidence reconciliation and preserve prior attempts. Screenshots/AX cannot be captured before window selection; record that limitation, not synthetic evidence.
