# Coverage — f007w-windows-desktop-20261005T214635Z

Source ledger: [coverage.json](coverage.json). Counts are case/environment/build rows, not clicks.

- **TC-P01: PASS** — Candidate identity. SHA-256 3c152124ce291119aaa6c742ee82f36352ea1bcec9086d3067415b3c72db9801; matches delivered candidate: true [Evidence](evidence/environment.json).

- **TC-P02: PASS** — WebView2 installed-file presence. Installed executable 154.0.4258.53; runtime usability NOT verified [Evidence](evidence/webview2-presence.json).

- **TC-P03: PASS** — PE architecture and static companion requirements. x64=true; unresolved non-system imports=[]. This is static inspection, not runtime DLL resolution [Evidence](evidence/pe-inspection.txt).

- **TC-P04: FAIL** — Restricted-runner process startup diagnostic. Actual run-owned launch PID 30632 exited 101; setup panic: Access is denied (os error 5). Root cause unconfirmed; not a confirmed normal-host defect [Evidence](evidence/node-process-launch.json).

- **TC-P05: PASS** — Run cleanup and synthetic fixture integrity. Three run-owned fixtures unchanged; run-owned process exited; preexisting app PID remains. No GUI close or worker-termination claim [Evidence](evidence/cleanup.json).

- **TC-D01-100: BLOCKED** — Launch/render; Unicode/spaced folder and individually selected document, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D02-100: BLOCKED** — Native file/folder dialogs, drag/drop and cancel, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D03-100: BLOCKED** — Ctrl commands and disabled Windows edit/save UI, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D04-100: BLOCKED** — Markdown/tabs/outline; scoped links and image limitation, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D05-100: BLOCKED** — Find and folder search with cancellation, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D06-100: BLOCKED** — External change, automatic refresh and manual reload, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D07-100: BLOCKED** — Session/recents restart and moved/deleted selection, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D08-100: BLOCKED** — Alt+F4/window close; loading/search cancellation; worker/process termination, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D09-100: BLOCKED** — Resize, keyboard focus, core controls, EN/ES and themes at requested scaling, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D10-100: BLOCKED** — WebView2 origin/CSP/navigation runtime boundary, requested 100% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D01-150: BLOCKED** — Launch/render; Unicode/spaced folder and individually selected document, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D02-150: BLOCKED** — Native file/folder dialogs, drag/drop and cancel, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D03-150: BLOCKED** — Ctrl commands and disabled Windows edit/save UI, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D04-150: BLOCKED** — Markdown/tabs/outline; scoped links and image limitation, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D05-150: BLOCKED** — Find and folder search with cancellation, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D06-150: BLOCKED** — External change, automatic refresh and manual reload, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D07-150: BLOCKED** — Session/recents restart and moved/deleted selection, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D08-150: BLOCKED** — Alt+F4/window close; loading/search cancellation; worker/process termination, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D09-150: BLOCKED** — Resize, keyboard focus, core controls, EN/ES and themes at requested scaling, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D10-150: BLOCKED** — WebView2 origin/CSP/navigation runtime boundary, requested 150% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D01-200: BLOCKED** — Launch/render; Unicode/spaced folder and individually selected document, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D02-200: BLOCKED** — Native file/folder dialogs, drag/drop and cancel, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D03-200: BLOCKED** — Ctrl commands and disabled Windows edit/save UI, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D04-200: BLOCKED** — Markdown/tabs/outline; scoped links and image limitation, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D05-200: BLOCKED** — Find and folder search with cancellation, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D06-200: BLOCKED** — External change, automatic refresh and manual reload, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D07-200: BLOCKED** — Session/recents restart and moved/deleted selection, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D08-200: BLOCKED** — Alt+F4/window close; loading/search cancellation; worker/process termination, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D09-200: BLOCKED** — Resize, keyboard focus, core controls, EN/ES and themes at requested scaling, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-D10-200: BLOCKED** — WebView2 origin/CSP/navigation runtime boundary, requested 200% (not selected/observed). Shared desktop access probes failed twice before window selection. No GUI actions, screenshots, dialogs or display-setting changes occurred. [Evidence](evidence/desktop-access-attempts.json).

- **TC-N01: NOT_APPLICABLE** — Dirty-edit close confirmation in read-only candidate. Candidate intentionally disables Windows editing. No gate/harness was changed to manufacture a dirty buffer; future editing candidate requires separate native/desktop retest.

Totals: 36 rows; PASS 4, FAIL 1, BLOCKED 30, NOT_RUN 0, NOT_APPLICABLE 1. The 30 GUI rows share two access probes and have zero workflow attempts. No historical/native-suite PASS was added to these totals.
