# Preview/navigation refinement — 2026-10-10

USER-AUTHORIZED IMPLEMENT: COMPLETE_IN_SCOPE; user acceptance PENDING. Removed redundant toolbar; Projects owns opening/navigation/search; text Find and ImageView-owned zoom share the document header; image metadata moves to footer. Explicit Actual/manual modes, narrow Projects replacement/invoker focus, image-only controls and existing state/fixes retained. Changed five frontend files plus nineteen test files and a Projects test helper; no native/contracts/dependencies/install/commit/deploy changes.

PASS: final `npm test` (523 tests, 62 files), `npm run build`, `git diff --check`. DOM/mocked verification includes light/dark at 1280/390, all layouts, zoom modes/bounds/restore, nested menus/Escape/focus, search scopes and editor/draft/undo continuity. Rendered mockups/app and native/screen-reader/200% checks NOT TESTED: reference file URL blocked by browser policy; dev server bind denied EPERM. Report: `frontend-implementation/preview-navigation-20261010-report.md`; evidence: `frontend-implementation/evidence/preview-navigation-20261010/`. Next: user review and permitted rendered/native verification. Prior state retained below.

---

# Sidebar view selection — 2026-10-09

USER-AUTHORIZED scoped frontend repair: COMPLETE_IN_SCOPE; acceptance PENDING. Explorer controls select their own panel and toggle only when already visible. Folio rail now stays clickable above the scrim, below existing context menus. Changed `src/app/App.tsx`, `src/styles/app.css`, `tests/ui/workspace-layout.test.tsx`; prior dirty work preserved.

PASS: affected 5-file suite (96 tests), frontend build, diff check. Chrome mocked renderer: Margin/Folio/Atlas at 1280px/390px, both reopen sequences, direct switching, retained search/results, Folio rail, narrow Atlas Projects, menus and keyboard focus. Native exact-candidate and screen reader NOT TESTED. Evidence: `frontend-implementation/evidence/sidebar-selection-20261009/`. No install/deploy/commit/push. Next: user review and native build retest.

---

# Folio explorer context menu — 2026-10-09

USER-AUTHORIZED scoped frontend repair: COMPLETE_IN_SCOPE; acceptance PENDING. Raised shared context menus above the compact explorer and scrim (32 > 31 > 30), below modal dialogs (40), in `src/styles/app.css`. Preserved prior edits.

PASS: `npm test -- tests/ui/workspace-layout.test.tsx tests/ui/approved-navigation.test.tsx` (25 tests); `npm run build`; Chrome disposable renderer reproduces the original occlusion and verifies pointer targeting for every file menu item, Open document, root Search folder, Shift+F10, Escape and focus restoration. Native installed app and screen reader NOT TESTED; no installation. Screenshot/report: `frontend-implementation/evidence/folio-context-menu-20261009/`. Next: verify in next native build.

---

# Loading system — current phase, 2026-10-09

USER-AUTHORIZED IMPLEMENT of `design-reviews/loading-20261009/`: COMPLETE_IN_SCOPE across 34 scenarios; E05 resume is synchronous. Extended shared loader with local pending state, honest progress, placeholders, visibility/reduced-motion handling and retained content. Added race/close/save-copy fixes and disposable regression tests. Preserved original dirty work.

Verification: full suite 506 PASS; final navigation 79 PASS; final management 62 PASS; frontend build/diff check PASS. Chrome mocked bridge: both themes/all layouts, narrow views, keyboard/middle-click. Reduced-motion CSS simulated. Native, OS Reduce Motion and screen readers NOT TESTED; acceptance PENDING.

Evidence: `frontend-implementation/evidence/loading-20261009/`. Matrix/report: `frontend-implementation/loading-20261009-{matrix,report}.md`. Native picker phase events and HTML surface retention/geometry remain integration limits. No native/dependency/install/commit/deploy changes. Next: user review and exact-candidate native verification.

---

Prior state retained below:

# State — 2026-10-09

Latest phase: uiux-marketing-designer design-only. User requested all app loading mockups; created design-reviews/loading-20261009/index.html with 34 scenarios, portable assets, source mapping and handoff. PROPOSED; approval pending. Chrome wide/narrow review controls and overflow checks PASS; static assets/JS and selected contrast pairs checked. Evidence/limits: design-reviews/loading-20261009/STATE.md. No app code/build/install changes in this phase. Next: user design review.

Latest scoped task: user-authorized preview loading animation IMPLEMENTED with shared PreviewLoading.tsx and CSS in Markdown/images/diagrams/HTML/large-source/history preview paths. Hidden localized status retained; reduced-motion rule stops animation; errors/cancel retained. Restored pending images now show loader. Targeted runs PASS (86 initial, 16 reader follow-up, 75 final session/navigation); final build/diff check PASS. Chrome mocked image preview verified three staggered dots and hidden text; evidence frontend-implementation/evidence/preview-loading-20261009/loading.png. Native/reduced-motion runtime NOT TESTED. No install; acceptance pending.

Latest preference supersedes outlined focus: user requested removal of all blue focus rectangles. src/styles/app.css now removes authored/browser focus outlines throughout shared UI, retaining tab-wide fill and keyboard fill/underline. Build and diff check PASS. Chrome fixture verifies tab/× outline none and keyboard underline; evidence: frontend-implementation/evidence/tab-focus-20261009/no-rectangles.png. Native retest NOT TESTED; installed app unchanged; acceptance pending.

Latest follow-up: whole-tab focus and filename pressed feedback IMPLEMENTED in src/styles/app.css. npm run build PASS; git diff --check PASS. Chrome disposable preview: filename click and keyboard focus on × both use a full-tab 3px focus outline; child outline removed. Screenshot: frontend-implementation/evidence/tab-focus-20261009/focus.png. Native visual retest NOT TESTED; installed app unchanged. User acceptance pending.

Latest scoped task: user-authorized middle-click file-tab closing IMPLEMENTED in src/app/App.tsx, with regression coverage in tests/ui/{workspace,close-edit}.test.tsx. npm test -- tests/ui/workspace.test.tsx tests/ui/close-edit.test.tsx: PASS (50 tests). npm run build: PASS. Background/last-tab closing and dirty-edit Save/Discard/Keep draft/Cancel verified with mocked APIs; native physical mouse check NOT TESTED. Existing close button/keyboard flow retained. No installation. User acceptance pending; next: try wheel-click in the next native build. Prior visual work below remains unchanged.

Intentgrove Theonira correction, senior-frontend-developer IMPLEMENT. Shared branded shell, paired themes and three compositions IMPLEMENTED; verification PARTIAL; user acceptance pending. Latest explicit user selection supersedes prior branding exclusion. Margin default, option-D arrows, real documents and native state owners retained.

Evidence: frontend-implementation/evidence/theonira-themes-20261009/{report.md,design-comparison.html,candidate.json,preservation.json}. Final local app Intentgrove Themes 20261009, identifier com.juanmantilla.intentgrove.themes20261009, main3c32fe8f775f7ab5177423203c21b6b756dd2a7eb65e464dabd2ab12b6a78d16.491/61 tests PASS; final native rebuild/signature PASS after transition-only fix.12 matched renderer pairs,6 editor states, narrow ES and Settings; native save/search/image/HTML/restart;6 final theme/layout captures. WKWebView tab transition defect fixed/retested.

Reference rendering blocked by browser policy; source read. Native HTML metadata overlap remains OS_ENGINEERING dependency; prior native-boundary-request.md identifies contract. Saved preferences retained. Transient freshness warning cleared by Retry; saved byte fidelity confirmed. Exhaustive native/accessibility coverage not run.

Native/contracts/dependencies/installed app/designer files unchanged. Prior state and dirty work backed up. No install/deploy/commit/push. Next: visual user review and native geometry fix/retest, then separate installation phase.
