# Reveal local files — implementation handoff

User-authorized IMPLEMENT completed in scope; user acceptance pending. Existing unrelated worktree edits preserved. Host: native macOS 27.0.1 (26A434), arm64. No install, release, dependency, sandbox, commit, push or cleanup changes.

## Changes

- `/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx`: shared explorer-file/tab ActionMenu includes the platform-labelled action. Local absolute-path guard hides it for empty/relative/virtual paths; folders do not offer it. Both mouse and keyboard entry points retain existing menu focus behavior. Saved files with unsaved edits remain revealable. This product creates new Markdown files on disk immediately; no new untitled-tab model was introduced. Errors use the existing notice/error translation flow and leave tabs/content intact.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/api.ts`: typed narrow reveal_file invocation carries native grant IDs/segments, never a renderer-selected absolute path.
- `/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/reveal.rs`: resolves absolute paths from existing root/file grants, validates segments, reopens a regular local file, verifies its identity and rejects missing/replaced/expired/nonlocal requests. Blocking filesystem/native work runs on the existing Tauri blocking pool. Root-backed opened tabs use their file grant identity, while unopened explorer items use root-scoped segments. Normal OS races remain possible after final validation; no file data is modified.
- `/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/lib.rs`: registers the command in the existing invocation handler.
- `/Users/juanmantilla/projects/personal/md-reader/src-tauri/src/macos_quit.m`: adds a narrow function to the already compiled Cocoa bridge, using NSURL fileURLWithPath and NSWorkspace activateFileViewerSelectingURLs. Existing build settings/framework linkage retained. Apple documents this method as thread-safe: https://developer.apple.com/documentation/appkit/nsworkspace/activatefileviewerselecting(_:).
- Windows uses SHParseDisplayName + SHOpenFolderAndSelectItems, with balanced COM initialization and PIDL cleanup, retaining HRESULT failures. No shell or subprocess path interpolation. API reference: https://learn.microsoft.com/en-us/windows/win32/api/shlobj_core/nf-shlobj_core-shopenfolderandselectitems. Linux remains unsupported per the existing platform compile_error; no new Linux support claim.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/platform.ts`: existing platform detection extended for availability/absolute-path UI guard.
- `/Users/juanmantilla/projects/personal/md-reader/src/app/i18n.ts`: English/Spanish macOS and Windows labels and failure prefix.
- `/Users/juanmantilla/projects/personal/md-reader/tests/ui/reveal-file.test.tsx`: focused consumer tests; native policy tests colocated in reveal.rs.

## Verification

PASS: 32 frontend tests across reveal-file, manual-reload, approved-navigation and windows-platform. Both context menus, keyboard activation, native grant payloads, missing files in both menus, absent/relative/virtual paths and Windows wording covered with mocks. Initial test run exposed a missing test-environment platform setup and unused test imports; corrected, with original logs retained.

PASS: macOS native library compilation and 140 tests, 5 existing ignored. Reveal resolver tests use disposable real filesystem inputs; special characters, invalid paths, deleted/replaced files and expired grants covered.

PASS: TypeScript and isolated production frontend build. Existing chunk-size warning retained. PASS: diff whitespace check.

PASS: standalone production Cocoa adapter probe actually selected the exact Finder fixture `café # $&' (draft), %.md` inside `fixture space # &`. Selection readback exactly equals its absolute path. Missing file returns failure. This is a real native-adapter observation, separate from the mocked menu tests.

NOT TESTED: packaged native app menu-to-Finder end-to-end, Windows native compilation/runtime, full frontend suite, screen reader. To finish runtime coverage, launch an isolated current native candidate with disposable data, invoke both context menus, then repeat on a Windows host. Linux NOT APPLICABLE under the existing supported-target policy.

Evidence: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-file-20261011/coverage.json`, final logs, Finder selection JSON, standalone probe/fixture and explicit tested snapshot. Snapshot covers listed source/config/test inputs only, not all transitive modules or the whole dirty repository. Final source scope did not change after baseline. No DONE_ACCEPTED or cleanup authorization claimed.
