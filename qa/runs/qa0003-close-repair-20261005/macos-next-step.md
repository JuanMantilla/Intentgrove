# Related Mac close/quit failure: next diagnostic step

USER_REPORTED: older Mac build keeps its window visible and Cmd+Q also fails; Force Quit required. Exact build identifier, failed operation and error are not captured. Windows DACL diagnosis does not establish a Mac cause. No Mac behavioral repair or native test result claimed from this Windows host.

Use the current project checkout on an authorized Mac with the existing locked dependencies/toolchain. The checkout must contain the opt-in VITE_CLOSE_DIAGNOSTICS branch in src/app/App.tsx; an older checkout lacks it. Do not upgrade/install prerequisites or dependencies, alter security settings, sign, package, install, publish or commit for this diagnostic. Keep the macOS-only acceptance harness restriction; do not enable that feature for this run.

Prepare an identifier-only Tauri override in a disposable project cache file, using a unique identifier such as `com.juanmantilla.markdownworkspace.macclosefixture20261005a`:

```json
{"identifier":"com.juanmantilla.markdownworkspace.macclosefixture20261005a"}
```

With that file at `.cache/mac-close-diagnostic.json`, the scoped existing CLI build is:

```sh
VITE_CLOSE_DIAGNOSTICS=1 npm run tauri -- build --no-bundle --no-sign --config .cache/mac-close-diagnostic.json -- --locked
```

This command is **NOT TESTED here**. It creates a non-bundled diagnostic executable using isolated continuity data, not a complete Mac app/XPC package or release. Use the executable path printed by the build; do not assume the target directory if the Mac environment overrides it. Test only disposable Markdown reading and Close/Cmd+Q. Capture the full operation/code/message notice, exact executable hash, Mac version/architecture and how the executable was launched. A missing tool/runtime/build failure is a blocker, never permission to change protections.

Diagnose the actual returned error before a cause-specific Mac repair. Then verify the distinct Mac window-close/reopen and application-Quit paths, session/restart recovery and any owned worker termination on the native runner. Preserve existing profiles and current source/approval/failure evidence.
