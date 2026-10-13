# Sidebar view selection repair — 2026-10-09

USER-AUTHORIZED frontend repair: COMPLETE_IN_SCOPE. User acceptance PENDING.

CodeGraph was consulted first; its App source was omitted because the index was stale, so current source was inspected directly. Visibility has two owners: `sidebarOpen` for wide Margin/Atlas and `compactSidebarOpen` for Folio/narrow layouts. `sidebarPanel` owns Explorer/Search selection. Explorer controls previously toggled visibility without selecting their panel.

Implemented the smallest shared state fix in `src/app/App.tsx`: `toggleExplorer` explicitly selects Explorer, switches directly when Search is visible, and otherwise preserves the existing visibility toggle, reading-position capture, animation and focus behavior. It serves the toolbar, Folio rail and narrow Atlas Projects control. Search remains an explicit open action. Both panel hosts stay mounted, retaining queries/results and editor/document identity.

Browser testing also found that the Folio scrim intercepted rail clicks while open. `src/styles/app.css` raises the grid rail to 31, above the scrim (30), below the existing context menu (32) and dialogs (40). Existing context-menu stacking is unchanged. No visual redesign.

PASS: `npm test -- tests/ui/workspace-layout.test.tsx tests/ui/approved-navigation.test.tsx tests/ui/folder-search.test.tsx tests/ui/close-edit.test.tsx tests/ui/workspace.test.tsx` — 96 tests across 5 files. Six added App regression cases cover Margin/Folio/Atlas at 1024px and 390px: Search → close → Explorer, Explorer → close → Search, switching while open, Explorer same-view closing, Search repeated opening, retained input/result identity, Folio rail, Atlas Projects, Projects menu, root/nested context menus and folder scope. Active document, reader identity and read/save/discard counts remain stable. Existing editor continuity and close/edit tests also pass. Integration is MOCKED_ONLY.

PASS: `npm run build` (TypeScript + Vite). Vite emitted its large-chunk advisory. PASS: `git diff --check`. Commands ran in `/Users/juanmantilla/projects/personal/md-reader`. Logs accompany this report.

Chrome/macOS with the existing disposable `redesign-preview.html` renderer and mocked native bridge: all layouts at 1280×900 and 390×844 passed both reopen sequences, direct toolbar switching, and retained query/12 search results. Narrow Atlas Projects passed. Wide Folio rail switches both directions with the sidebar open; Search close then rail Explorer passed. Projects/root context-menu Search actions passed. File menu Open README.md receives pointer hits above the explorer; Escape from Explorer closes it and restores focus to Toggle sidebar. Screenshots and browser-checks.json accompany this report. Dark theme reviewed; no theme/color/style changes beyond stacking.

Native exact-candidate WKWebView, real native search/files, installed app and screen reader: NOT TESTED. Browser and jsdom checks do not establish native integration. No installation, native edits, dependency changes, deployment, commit or push. Existing unrelated dirty work preserved. Next: verify these workflows in the next native build.
