# Preview/navigation implementation handoff — 2026-10-10

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

IMPLEMENTATION: COMPLETE_IN_SCOPE. FUNCTIONAL_CHECKS: PASS, final full suite 523 tests across 62 files plus the named focused checks below. VISUAL_REVIEW: NOT TESTED for rendered mockups or changed application. INTEGRATION: MOCKED_ONLY. USER_ACCEPTANCE: PENDING.

Authority: the user's explicit IMPLEMENT approval for `../design-review/intentgroove/preview-navigation-20261010/index.html`. SHA-256: c409b2b759d68bdde158bbd3bc9735db625a238173cf3dddcc77ac3f1e8a9067. README, embedded notes and validation.json read; all four states and sixteen theme/width source combinations inspected. Original observed PNG visually inspected. Browser policy blocked the design's file URL and explicitly forbade workaround rendering. No design artifacts changed.

Implemented behavior:

- Removed the full redundant toolbar. Projects is available beside tabs in every layout and through the Folio rail. Its panel exposes real Open file/Open folder buttons and workspace search, retaining the existing Projects menu, folder switching, tree, native menu dispatch and keyboard commands. Atlas retains its shelf below tabs, so tabs follow the global header.
- Text Find is a document-header action; its query/index/editor/native HTML owners remain independent of folder search. Removed image Find, Outline and Reading controls from both header and Document menu. Image states keep Document actions. A pre-existing browser-only empty-workspace Reading settings action remains available in the welcome area.
- ImageView retains ownership of fit measurements, pinch, zoom steps, anchoring, tiles and scroll. A React portal renders its live controls into the existing document header. Format/dimensions/still-image/detail-loading feedback are in a quiet footer. Actual has an explicit client-only mode; manual 100% selects neither preset. Existing manual bounds remain 25–400%; Fit retains its existing whole-image measurement and no-upscale behavior. Native and persisted session shapes are unchanged.
- Image scrolling is confined to its viewport, with the header outside scrolling content. Narrow headers put identity above wrapping actions. Narrow Projects covers the content area; the document/editor stays mounted but is hidden and inert. Menus and dialogs remain outside that inert subtree. Close/Escape restores the actual invoker; nested menu Escape takes priority. Narrow workspace-search Escape dismisses Projects, while Back to explorer retains its existing view-selection behavior. Existing wide Search Escape conventions remain intact.
- Removed a delayed duplicate Find focus request that could steal focus from a subsequent workspace-search invoker; new Find inputs focus after commit and already-open inputs focus directly.

Changed application files: `src/app/App.tsx`, `src/app/FolderSearchPanel.tsx`, `src/app/i18n.ts`, `src/reader/ImageView.tsx`, `src/styles/app.css`. `DocumentLocation.tsx` and `ActionMenu.tsx` were inspected and preserved. Nineteen existing test files migrate obsolete toolbar selectors and/or add focused cases; `tests/ui/project-navigation-helpers.ts` queries the actual replacement entry points. Full list: evidence/preview-navigation-20261010/changed-files.json. Source baselines and task-specific diffs distinguish this change from the already dirty worktree.

| Requirement | Evidence and result | Limits |
| --- | --- | --- |
| Toolbar removal/navigation | App, Projects helper, workspace/approved-navigation/close/session suites; real selection callbacks and Cmd+O/Cmd+Shift+O exercised with mocked API | Native menus/pickers not observed |
| Distinct search scopes | workspace-layout/find suites; different inputs, retained queries, header action, Cmd+F vs Cmd+Shift+F, no folder-search request from document Find | Real filesystem search not observed |
| Image header/footer/modes | image-view/image-refresh suites; portal containment, localized Zoom percentage, aria-pressed presets, manual 100%, min/max disabled, scroll reset/restoration and tab returns | jsdom geometry, no browser pixels |
| Narrow Projects/focus | workspace-layout cases for Margin/Folio/Atlas at 390px; Enter/Space/Escape, nested menu precedence, Close, invoker focus, content inert/hidden | Browser reflow and focus styling not observed |
| Retained state | workspace-layout/editor/close/session suites; same reader/editor nodes, draft and undo, tab/query retention; image mode/scroll across byte reacquisition | Native persistence not observed |
| Shared navigation fixes | Existing six layout/width selection cases preserved; context menu 32, Folio rail 31, scrim 30 unchanged | Pointer hit-testing not rerun in browser |
| Themes/widths | Image App DOM cases for light/dark × 1280/390; original layout tests cover all three layouts | CSS geometry/color fidelity is NOT TESTED |

All commands ran in `/Users/juanmantilla/projects/personal/md-reader`:

- `npm test -- tests/ui/image-view.test.tsx tests/ui/workspace-layout.test.tsx tests/ui/workspace.test.tsx tests/ui/find.test.tsx tests/ui/approved-navigation.test.tsx`: PASS, 64 tests at the initial implemented slice (tests-targeted.log).
- `npm test -- tests/ui/workspace-layout.test.tsx tests/ui/workspace-handoff.test.tsx tests/ui/find.test.tsx`: PASS, 48 tests after focus fixes (tests-focus-verified.log).
- `npm test`: PASS, 523 tests across 62 files, exit 0 (tests-complete.log). The final full run also passes the large-source pinch case. Earlier development failures are retained in separate logs; obsolete selectors, asynchronous tab assertions and focus defects were corrected. An earlier overlapping run also reported a large-source pinch assertion failure; it is not labeled pre-existing or suppressed.
- `npm run build`: TypeScript + frontend Vite build PASS in build-final.log; Vite's large-chunk advisory remains. No native build or packaging script was run.
- `git diff --check`: PASS in diff-check.log.

Accessibility evidence is limited to DOM roles/names/pressed state, live zoom output, standard buttons, keyboard activation, inert content and focus return. EN/ES zoom percentage labels added through existing localization. Existing fill/underline focus conventions preserved. No screen-reader, measured contrast, 200% scaling or accessibility conformance claim.

Rendered verification gaps: `npm run dev -- --port 5188` was denied EPERM binding 127.0.0.1:5188; no existing Vite server was available. No sandbox bypass, alternate reference rendering, installation, dependency changes, native/backend edits, commits, pushes or deployment occurred. Both-theme/wide/narrow screenshots, whole-image containment, actual two-axis scroll/header geometry, Atlas shelf proportions, pointer stacking and native HTML placement must be checked in a permitted browser/native candidate environment. See evidence/preview-navigation-20261010/verification-limits.txt for exact blockers and next checks.

Next: user review of the source handoff; permitted rendered fixture verification followed by exact-candidate native verification. The installed application was left unchanged and is not evidence for this implementation.
