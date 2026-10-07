# Department handoff — f007w-windows-desktop-20261005T214635Z

Routing recommendations, not external assignments or confirmed root causes.

| Primary owner | Finding | Support | Next action | Retest criterion |
|---|---|---|---|---|
| QA_AUTOMATION | [QA-0001](../../findings/QA-0001.md), environment blocker, S2/P1 for this test run | Desktop-session/tool provider | Supply a configured native Windows sky trusted RPC bridge; do not change product security or install Rust again | sky.list_windows returns real windows; exact app can be selected; screenshot, keyboard and native-dialog interaction work; execute 30 blocked rows |
| OS_ENGINEERING | [QA-0002](../../findings/QA-0002.md), restricted-runner startup failure, S2/P1 for investigation | QA_AUTOMATION | Launch this exact SHA in an ordinary authorized Windows desktop with its existing disposable identifier; collect setup error if it repeats. Compare normal-host success with restricted-runner failure before choosing an app or environment fix | Real render and safe open succeed on exact candidate; if host succeeds, classify runner restriction; if host fails, investigate app setup storage/runtime boundary without weakening protection |

FRONTEND/UI_UX have no confirmed defects from this run: no UI was observed. QA_TRIAGE should take over if ordinary-host comparison cannot discriminate the setup error. Product/release owner retains T012/T024 and editing/package gates. No agent or external ticket has been started, and QA has made no product fixes.
