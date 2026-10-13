# Every-launch default check — 2026-10-10

Implemented the user's [scoped amendment](every-launch-amendment.md). Each fresh eligible packaged process launch queries actual Markdown defaults after workspace readiness. If already this exact app, no prompt. Otherwise native Make Default / Not Now appears regardless of an earlier response. Not Now prevents further startup prompts in that process; a later launch checks again. Existing saved markers are preserved but ignored for startup gating. Explicit consent, narrow Markdown types, asynchronous NSWorkspace, verified outcomes and all candidate exclusions remain unchanged.

Changed only the native startup policy and focused tests, plus canonical authorization/task/verification/state records. Prior reviewed artifacts and earlier evidence remain unchanged. Native library121PASS/5ignored, fake adapter/external-switch/script checks PASS, final packaged build/strict signature/disabled CLI-script checks PASS. Evidence: evidence/every-launch/. No automated real default changes or installation. Actual external-default-switch/relaunch UI acceptance remains NOT TESTED; prior user observation confirmed the script's already-default message.

Quit the running copy before opening the rebuilt bundle:
`/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove.app`
The older /Applications copy was not replaced. Since the app is currently the default, absence of a launch prompt is expected. If another app becomes default, the next eligible fresh launch offers consent.
