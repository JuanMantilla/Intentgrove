# Final-source native acceptance — 2026-10-08 UTC

QA RUN/RETEST, application source read-only. Separate final-source candidate `Intentgrove Final Acceptance 20261008.app`, identifier `com.juanmantilla.intentgrove.finalacceptance20261008`, fresh app data and disposable documents `/private/tmp/intentgrove-finish-20261008/fixtures`. Native macOS 27.0.1 arm64, real Tauri WKWebView/XPC; no mocks in UI acceptance. Exact binary/source/config hashes recorded in evidence. Source matches production package, identifier/product name differs and executable therefore differs. Production-identifier isolated runtime is a separate explicit gate, not inherited PASS.

All cases in coverage.json must have observable postconditions and saved evidence. Finder first had no window; opening the disposable directory through LaunchServices established native access. Native actions/tree/screenshots via cua_repl. Launch/fixture creation/file hashes via permitted shell. No install, disk attach, policy changes, dependencies, release credentials or publication. Prior ledgers are historical and never carried forward. Existing production app data remains untouched. Screenshots must be visually inspected. Timing records distinguish worker algorithm from action-to-observed GUI upper bounds; driver time does not establish exact after-read latency.


## Permitted verification extension

Read-only final-DMG attach/inspection/detach was performed after native QA, without installation or production execution. The initial no-disk-attach plan constraint above is superseded only for this isolated read-only verification; user restrictions remain unchanged. Evidence: ../../../os-engineering/evidence/macos-finish-20261008/final-dmg-mounted-verification.json.
