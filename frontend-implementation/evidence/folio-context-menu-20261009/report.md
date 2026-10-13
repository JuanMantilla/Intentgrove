# Folio explorer context menu repair

User requested fixing right-click in the Folio explorer. Implementation is complete in the frontend; user acceptance is pending.

Observed before: a file right-click created `.context-menu` at z-index 20, below the compact sidebar (31) and scrim (30). Browser hit testing at the first menu action returned an explorer file row instead of the action. The menu was largely hidden and unclickable.

Implemented: shared context menus use z-index 32, above the explorer and below modal dialogs (40). The fix also covers Projects and compact navigation in narrow layouts. Only the CSS stacking rule and explanatory comment changed; no new dependencies, contracts or native changes.

PASS: `npm test -- tests/ui/workspace-layout.test.tsx tests/ui/approved-navigation.test.tsx` — 25 tests across 2 files. `npm run build` — exit 0; Vite emitted its large-chunk advisory. Checks ran in the md-reader repository.

Chrome on macOS, disposable `tests/fixtures/redesign-preview.html?layout=folio` with a mocked native bridge: all four file menu actions receive pointer hits; Open README.md selects the document; root menu Search folder opens the search box; Escape dismisses the menu, keeps the explorer open and restores focus to README.md; Shift+F10 opens the file menu. Final screenshot: `menu.jpg`.

Native app verification, real clipboard/reload integration and screen-reader checks: NOT TESTED. Installed app unchanged. Existing worktree changes preserved.
