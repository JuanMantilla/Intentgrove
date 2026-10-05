# Appearance interface contract

## App controller

- readPreference(): returns a validated schema-1 preference or System plus optional storage warning.
- applyPreference(mode): validates enum, updates resolved root palette, persists locally, synchronizes native appearance; returns warnings without blocking reading.
- subscribe(listener): receives preference/resolved/warnings, never Markdown text.
- dispose(): releases media-query, storage, and native theme listeners.

Root data-theme is only light/dark; the selector value is system/light/dark. CSS color-scheme matches the resolved appearance. Markdown, image content and links never supply preference values.

## Native calls

Existing Tauri main window: setTheme(light/dark/null), theme(), onThemeChanged. Proposed added permission: core:window:allow-set-theme for main only. No new production file/network/IPC command is introduced. Calls are ordered; older completion cannot change newer state.

## Error behavior

Invalid preference falls back to System. Storage save error retains current mode and shows localized persistence warning. Native sync error retains readable app-owned theme and shows localized warning; retry is allowed on the next explicit selection. No error resets tabs, editing state, folder grants, or source content.

## Test architecture boundary (A1, pending approval)

The separate [acceptance harness](acceptance-harness.md) may observe/inject fixed
QA states only in its opt-in build. The [capture contract](capture-evidence.md)
defines external production startup recording and supplemental QA diagnostics.
Neither adds a production appearance API, changes errors/persistence, or grants
Markdown control-channel authority. Production receives no QA bridge or inspector.
