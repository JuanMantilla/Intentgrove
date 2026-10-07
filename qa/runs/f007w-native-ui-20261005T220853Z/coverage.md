# Native desktop coverage

Machine ledger: [coverage.json](coverage.json). Counts are constituent case/build/environment rows, not whole charters or clicks. Native actions were exercised at user-confirmed settings; no native DPI reading. Earlier restricted-runner failures remain in the previous report. No historical native/frontend PASS was added.

- **100-launch: PASS** — Exact candidate launches and renders. Observed native UI; scale USER_ASSISTED [Evidence](evidence/01-startup.json)

- **100-unicode-file: PASS** — Individually selected Unicode/spaced fixture renders. Observed native UI; scale USER_ASSISTED [Evidence](evidence/04-unicode-file-readonly.json)

- **100-file-cancel: PASS** — Ctrl+O picker cancellation keeps empty workspace. Observed native UI; scale USER_ASSISTED [Evidence](evidence/02-cancel.json)

- **100-folder-cancel: PASS** — Folder picker cancellation retains open document. Observed native UI; scale USER_ASSISTED [Evidence](evidence/08-folder-cancel.json)

- **100-folder-enumeration: PASS** — Selected Unicode folder enumerates two original fixtures. Observed native UI; scale USER_ASSISTED [Evidence](evidence/10-folder-selected.json)

- **100-sibling-tabs: PASS** — Granted sibling link renders second.md in another tab. Observed native UI; scale USER_ASSISTED [Evidence](evidence/11-sibling-tabs.json)

- **100-outside-grant: PASS** — Unselected outside-grant link is refused; content remains. Observed native UI; scale USER_ASSISTED [Evidence](evidence/05-outside-link-refused.json)

- **100-find-match: PASS** — Ctrl+F finds marker with one match. Observed native UI; scale USER_ASSISTED [Evidence](evidence/06-find.json)

- **100-find-escape: PASS** — Escape dismisses Find and retains document. Observed native UI; scale USER_ASSISTED [Evidence](evidence/07-outline.json)

- **100-outline: PASS** — Outline panel lists actual headings. Observed native UI; scale USER_ASSISTED [Evidence](evidence/07-outline.json)

- **100-folder-search: PASS** — Ctrl+Shift+F search completes: two entries, two matches. Observed native UI; scale USER_ASSISTED [Evidence](evidence/12-folder-search.json)

- **100-automatic-refresh: PASS** — Disposable external change appears without reload. Observed native UI; scale USER_ASSISTED [Evidence](evidence/14-refresh-after-wait.json)

- **100-manual-reload: PASS** — Reload reports already current and retains changed content. Observed native UI; scale USER_ASSISTED [Evidence](evidence/15-manual-reload.json)

- **100-readonly-gates: PASS** — Edit disabled with explanation; Ctrl+S opens no save dialog. Observed native UI; scale USER_ASSISTED [Evidence](evidence/18-ctrl-save.json)

- **100-spanish-controls: PASS** — Spanish controls render and retain the document. Observed native UI; scale USER_ASSISTED [Evidence](evidence/16-spanish.json)

- **100-light-theme: PASS** — Light theme applies and retains document. Observed native UI; scale USER_ASSISTED [Evidence](evidence/17-light-theme.json)

- **100-maximize-restore: PASS** — Native maximize and restore retain readable workspace. Observed native UI; scale USER_ASSISTED [Evidence](evidence/21-maximized.json)

- **100-runtime-origin: PASS** — Native WebView reports http://tauri.localhost/ origin. Observed native UI; scale USER_ASSISTED [Evidence](evidence/04-unicode-file-readonly.json)

- **100-raw-script: PASS** — Harmless script markup renders as inert text. Observed native UI; scale USER_ASSISTED [Evidence](evidence/23-boundary-render.json)

- **100-javascript-link: PASS** — JavaScript-scheme link refused; origin/document unchanged. Observed native UI; scale USER_ASSISTED [Evidence](evidence/24-javascript-refused.json)

- **100-file-protocol: PASS** — File-scheme link refused; outside content not loaded. Observed native UI; scale USER_ASSISTED [Evidence](evidence/25-file-protocol-refused.json)

- **100-image-placeholder: PASS** — Unavailable disposable image renders blocked placeholder. Observed native UI; scale USER_ASSISTED [Evidence](evidence/23-boundary-render.json)

- **100-alt-f4: FAIL** — Alt+F4 leaves app running with unsupported error.  [Evidence](evidence/19-alt-f4-still-open.json) Finding: QA-0003.

- **100-title-close: FAIL** — Title-bar Close leaves same app running.  [Evidence](evidence/20-title-close-still-open.json) Finding: QA-0003.

- **100-supported-status: FAIL** — Unexplained unsupported banner accompanies supported reading; old notice stays English after locale switch.  [Evidence](evidence/16-spanish.json) Finding: QA-0004.

- **100-normal-restart: BLOCKED** — Normal-close session restore. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **100-abnormal-restart: BLOCKED** — Forced-process-exit/restart recovery. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **100-recents-moved: BLOCKED** — Restart/recents with moved/deleted selection. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **100-close-inflight: BLOCKED** — Close during loading/search and verify cancellation. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **100-worker-termination: BLOCKED** — Verify final app and worker termination. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **100-drag-drop: NOT_RUN** — Native cross-window file drop. Not executed; no grounded cross-window drop fixture interaction.

- **100-inflight-search-cancel: NOT_RUN** — Cancel active folder search. Tiny query completes before an active cancellation can be observed; no stress fixture created.

- **100-full-csp: NOT_RUN** — Full runtime CSP/network/new-window enforcement. Origin, inert markup and protocol refusal are separate passes; no independent CSP enforcement/traffic instrumentation performed.

- **150-normal-restart: BLOCKED** — Normal-close session restore. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **150-abnormal-restart: BLOCKED** — Forced-process-exit/restart recovery. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **150-recents-moved: BLOCKED** — Restart/recents with moved/deleted selection. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **150-close-inflight: BLOCKED** — Close during loading/search and verify cancellation. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **150-worker-termination: BLOCKED** — Verify final app and worker termination. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **150-drag-drop: NOT_RUN** — Native cross-window file drop. Not executed; no grounded cross-window drop fixture interaction.

- **150-inflight-search-cancel: NOT_RUN** — Cancel active folder search. Tiny query completes before an active cancellation can be observed; no stress fixture created.

- **150-full-csp: NOT_RUN** — Full runtime CSP/network/new-window enforcement. Origin, inert markup and protocol refusal are separate passes; no independent CSP enforcement/traffic instrumentation performed.

- **200-normal-restart: BLOCKED** — Normal-close session restore. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **200-abnormal-restart: BLOCKED** — Forced-process-exit/restart recovery. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **200-recents-moved: BLOCKED** — Restart/recents with moved/deleted selection. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **200-close-inflight: BLOCKED** — Close during loading/search and verify cancellation. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **200-worker-termination: BLOCKED** — Verify final app and worker termination. Normal close remains broken. User-assisted cleanup removed the previous candidate; autonomous cleanup for a restarted candidate remains unavailable (Task Manager higher-integrity AX, restricted Stop-Process denial). No normal/crash restore or worker PASS inferred. [Evidence](evidence/22-owned-stop.json) Finding: QA-0003/QA-0005.

- **200-drag-drop: NOT_RUN** — Native cross-window file drop. Not executed; no grounded cross-window drop fixture interaction.

- **200-inflight-search-cancel: NOT_RUN** — Cancel active folder search. Tiny query completes before an active cancellation can be observed; no stress fixture created.

- **200-full-csp: NOT_RUN** — Full runtime CSP/network/new-window enforcement. Origin, inert markup and protocol refusal are separate passes; no independent CSP enforcement/traffic instrumentation performed.

- **dirty-edit-close: NOT_APPLICABLE** — Dirty-edit close confirmation. Production Windows editing deliberately disabled; no gate bypass or fabricated draft.

- **150-render: PASS** — Workspace/Unicode document render and disabled edit control. Native UI; Scale changed manually by user [Evidence](evidence/31-scale150-unicode.json)

- **150-find: PASS** — Find locates one marker; Escape closes Find. Native UI; Scale changed manually by user [Evidence](evidence/32-scale150-find.json)

- **150-outline: PASS** — Open outline displays the actual document headings. Native UI; Scale changed manually by user [Evidence](evidence/31-scale150-unicode.json)

- **150-grant: PASS** — Outside-folder link refused. Native UI; Scale changed manually by user [Evidence](evidence/33-scale150-grant.json)

- **150-sibling: PASS** — Granted sibling navigation retains tabs. Native UI; Scale changed manually by user [Evidence](evidence/34-scale150-sibling.json)

- **150-file-dialog: PASS** — Ctrl+O chooser opens and Escape retains document/tabs. Native UI; Scale changed manually by user [Evidence](evidence/36-scale150-dialog-cancel.json)

- **150-search: PASS** — Folder search completes: three entries scanned, two matches. Native UI; Scale changed manually by user [Evidence](evidence/38-scale150-search.json)

- **150-alt-f4: FAIL** — Alt+F4 still refuses close.  [Evidence](evidence/37-scale150-close-failed.json) Finding: QA-0003.

- **150-title-close: FAIL** — Title-bar Close still refuses close.  [Evidence](evidence/39-scale150-title-close-failed.json) Finding: QA-0003.

- **200-render: PASS** — Unicode document renders with read-only control. Native UI; scale USER_ASSISTED [Evidence](evidence/41-scale200-unicode.json)

- **200-find: PASS** — Find locates one marker; Escape dismisses it. Native UI; scale USER_ASSISTED [Evidence](evidence/42-scale200-find.json)

- **200-outline: PASS** — Outline displays actual headings. Native UI; scale USER_ASSISTED [Evidence](evidence/41-scale200-unicode.json)

- **200-grant: PASS** — Outside-grant link refused. Native UI; scale USER_ASSISTED [Evidence](evidence/43-scale200-grant.json)

- **200-sibling: PASS** — Granted sibling opens and renders second.md. Native UI; scale USER_ASSISTED [Evidence](evidence/44-scale200-sibling.json)

- **200-file-dialog: PASS** — Ctrl+O native dialog opens; Escape retains document. Native UI; scale USER_ASSISTED [Evidence](evidence/47-scale200-dialog-cancel.json)

- **200-search: PASS** — Folder search completes: three entries, two matches. Native UI; scale USER_ASSISTED [Evidence](evidence/45-scale200-search.json)

- **200-automatic-refresh: PASS** — External disposable change appears after refused close. Native UI; scale USER_ASSISTED [Evidence](evidence/51-scale200-refresh.json)

- **200-manual-reload: PASS** — Reload retains current externally changed content. Native UI; scale USER_ASSISTED [Evidence](evidence/52-scale200-reload.json)

- **200-alt-f4: FAIL** — Normal close refused; same candidate remains running.  [Evidence](evidence/48-scale200-close-failed.json) Finding: QA-0003.

- **200-title-close: FAIL** — Normal close refused; same candidate remains running.  [Evidence](evidence/49-scale200-title-close-failed.json) Finding: QA-0003.

- **150-repeat-folder-selection: NOT_RUN** — Repeat new folder grant/selection/cancellation at this scale. Folder selection/cancel actually exercised at 100%; file-dialog cancel repeated at this scale. No transfer of the 100% folder PASS.

- **150-repeat-theme-locale-resize: NOT_RUN** — Repeat theme/locale changes and maximize/restore at this scale. Existing Spanish/dark controls and reading layout observed; interactive theme/locale switching and maximize/restore were exercised at 100% only.

- **150-repeat-protocol-boundary: NOT_RUN** — Repeat raw script and protocol-click boundary at this scale. Observed document/grant results are separate; raw-script/JavaScript/file-scheme negative fixtures exercised at 100% only.

- **200-repeat-folder-selection: NOT_RUN** — Repeat new folder grant/selection/cancellation at this scale. Folder selection/cancel actually exercised at 100%; file-dialog cancel repeated at this scale. No transfer of the 100% folder PASS.

- **200-repeat-theme-locale-resize: NOT_RUN** — Repeat theme/locale changes and maximize/restore at this scale. Existing Spanish/dark controls and reading layout observed; interactive theme/locale switching and maximize/restore were exercised at 100% only.

- **200-repeat-protocol-boundary: NOT_RUN** — Repeat raw script and protocol-click boundary at this scale. Observed document/grant results are separate; raw-script/JavaScript/file-scheme negative fixtures exercised at 100% only.

- **150-refresh-reload: NOT_RUN** — Repeat automatic refresh/manual reload at 150%. Actually exercised at 100% and 200%; no 150% result inferred.

77 rows: PASS 38, FAIL 7, BLOCKED 15, NOT_RUN 16, NOT_APPLICABLE 1.
