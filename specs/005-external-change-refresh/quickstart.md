# Validation Guide: External Change Refresh

**Status:** Planned procedure. No F003D behavior has been implemented or tested. Use [spec.md](spec.md) for acceptance IDs, [data-model.md](data-model.md) for states, and [refresh-ipc.md](contracts/refresh-ipc.md) for the native/UI contract.

## Prerequisites

- An approved F003D spec, visual direction, architecture, and completed implementation tasks before acceptance claims.
- A macOS host with recorded `sw_vers -productVersion`, `uname -m`, Rust/Cargo, Node/npm, and the app's pinned dependencies. On the current host Rust is absent; native commands below are **NOT TESTED**.
- F004 section editing and recovery integrated for the dirty-conflict scenarios. The current F001 app is read-only and cannot prove AS-008–AS-012/SC-004.
- A disposable local fixture folder and a second local writer process or terminal. Never run these scenarios on the user's real documents.

## Create a disposable workspace

```sh
fixture_root="$(mktemp -d /tmp/md-refresh.XXXXXX)"
mkdir -p "$fixture_root/docs"
printf '# Original\n\nFirst passage.\n' > "$fixture_root/docs/README.md"
printf '# Other\n\nSecond passage.\n' > "$fixture_root/docs/other.md"
printf 'Fixture: %s\n' "$fixture_root"
```

Open this folder in the app. Keep this terminal open for writer commands, or set `fixture_root` to the printed path in another terminal. Record the fixture path and source-file hashes immediately before each Reload or conflict action; compare them after the action. The app must not create files in the fixture on its own.

## Fast checks after implementation

```sh
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

These commands check UI/native units and compilation. They do **not** verify macOS watcher behavior or the packaged app. Run the feature's disposable-writer integration cases once added; record their exact test names and output in verification evidence. Do not mark missing tests PASS.

## Manual external-writer journeys

1. **Clean file, automatic update — AS-001/SC-001.** Open both fixture tabs, leave one inactive, then run `printf '# External\n\nNew passage.\n' > "$fixture_root/docs/other.md"` in a terminal with `fixture_root` set. Time from writer completion to visible complete content or specific error. Repeat with 20 disposable variants, including inactive tabs and up to 1 MiB source. Check that the app did not write to either source.
2. **Atomic replacement and staged write — AS-003/SC-001.** Write a complete temporary Markdown file in the same fixture directory and rename it over `README.md`; separately test a writer that truncates and appends in stages. The reader must show only a confirmed complete version or a recoverable checking/error state. Record any intermediate partial content as **FAIL**.
3. **Tree changes and position — AS-002/AS-004/SC-002.** Add, rename, and remove fixture files and nested folders while the tree is expanded. Confirm surviving expansion, selection, tree scroll, and the current reading passage. Run the 25,000-entry benchmark fixture for the timed SC-002 trials and record fixture shape, Mac model, cold/warm state, and timing distribution.
4. **File and folder Reload — AS-005–AS-007/AS-016/SC-003.** Use right-click and keyboard context menus. File Reload checks only that file; folder Reload checks descendants without freezing the active tab. Cancel a long folder job and verify confirmed updates stay while the remainder is visibly unchecked. Repeat with an individually selected file outside the root, without reading siblings.
5. **Dirty conflict — AS-008–AS-012/SC-004/SC-007.** Edit one section through F004, then externally change the same fixture file. Verify automatic and manual Reload retain the draft, show both versions, and offer Keep my edit, Use disk version, and Save a copy. Keep my edit must not replace disk. Save a copy creates a separately selected whole-document file under F004. Use disk version requires confirmation and a current-version check before draft discard; Cancel preserves the draft. Change disk again while the decision is open. Repeat with several dirty tabs under folder Reload.
6. **Failures and scope — AS-013–AS-015/AS-017–AS-019/SC-005–SC-006.** Delete or deny a fixture file, replace a file-only selected item at the same path, and add a symlink pointing outside the fixture. In a separate trial, rename the selected fixture root and create a different folder at its original path; keep open tabs and a disposable F004 draft, then trigger refresh. Verify the root is unavailable, tabs/drafts remain, no replacement-root content is read before explicit folder reselection, unaffected explicit-file tabs remain usable, and no automatic network request occurs. Background the app, change a file, then refocus it to check reconciliation.

## Packaged macOS acceptance

After approved implementation, build the `.app` with the repo's Tauri build command, stop the Vite server and launch the actual bundle. Repeat representative clean, atomic-save, file-only replacement, dirty-conflict, manual Reload, focus-return, EN/ES keyboard, and Reduce Motion journeys. Record app path, OS/CPU, build hash, commands, fixture hashes, timings, and PASS/FAIL/BLOCKED/NOT TESTED per acceptance scenario. A development window or Vitest mock is insufficient for packaged native-watcher acceptance.

## Evidence to retain

- Requirement/acceptance ID, fixture path and shape, writer command or app, before/after source hashes, expected and actual UI state, and elapsed time from settled write.
- Watcher failure/overflow and focus-return results; whether any event was missed and how Reload recovered it.
- Any intermediate partial rendering, draft loss, out-of-scope access, unconfirmed discard, or changed-original overwrite is a **FAIL**, even if later refresh succeeds.
- Explicitly mark unrun checks **NOT TESTED**. The current planning phase produces no PASS for app behavior.
