# Edit section context-menu repair — 2026-10-10

USER-AUTHORIZED: scoped implementation of the two menu bugs and the behaviors in the current request. IMPLEMENTATION: COMPLETE_IN_SCOPE. USER_ACCEPTANCE: PENDING. Prior worktree changes preserved; no dependency, native, deployment, installation, commit or push changes.

OBSERVED: CodeGraph was consulted first for the affected code; it flagged the changed MarkdownView/App files for direct reading. App applies CSS `zoom` to `.document-page`; `usePinchZoom` consumes WebKit gesture events and ctrl-wheel, and App restores the reading anchor by scrolling. The fixed menu was a DOM descendant of this zoomed page and used pointer client coordinates. It had no outside-click listener; Escape only worked through the article's React handler.

IMPLEMENTED: `src/reader/MarkdownView.tsx` renders the menu through a body portal, outside page zoom and content layout. Fixed positioning uses `clientX/clientY` directly (including zero); there are no offsets or scale corrections. A layout effect clamps measured, untransformed menu dimensions to the viewport before paint and on window resize. `src/styles/app.css` bounds only this menu's width/height and allows scrolling if needed. Document capture listeners dismiss normal outside clicks even when application controls stop bubbling, preserve inside clicks, and handle Escape with the existing focus fallback. Listeners are removed on close/replacement/unmount; the retained exit animation is preserved.

VERIFIED in macOS jsdom with the production MarkdownView and pinch hook: eight focused regression tests cover preview/application/body dismissal without edits; inside background clicks and one selection callback; global Escape and Shift+F10 reopening; repeated open/reposition during retained exit; body portal and zero coordinates independent of content bounds; mocked measured edge clamping/resize; open-menu anchoring and subsequent placement through ctrl-wheel/WebKit events and 25%/400% zoom; StrictMode listener cleanup. Existing App edit-flow tests also pass with mocked native commands.

Commands run from `md-reader`:

- `npm test -- tests/ui/section-context-menu.test.tsx tests/ui/edit-flow.test.tsx tests/ui/markdown.test.tsx`: initial 29 PASS / 1 FAIL. The failing assertion expected a nonfocusable paragraph to receive focus; corrected to verify the existing article fallback.
- `npm test`: PASS, 542 tests in 63 files, including all eight corrected regression tests.
- `npm run build`: PASS, TypeScript and Vite. Existing configuration/chunk-size advisories remain.
- `git diff --check`: PASS.
- `npm run dev -- --port 5175`: FAIL, sandbox `listen EPERM` on 127.0.0.1:5175.

FUNCTIONAL_CHECKS: PASS for the named DOM/event cases. INTEGRATION: MOCKED_ONLY for native editing. VISUAL_REVIEW and native physical trackpad verification: NOT TESTED. jsdom does not render CSS zoom or provide real menu geometry; edge tests mock dimensions. The portal/event assertions verify the implementation boundary, not actual WebKit pixels. Remaining check: in a permitted renderer/native build, right-click before/after pinching at several scales, pinch with the menu open, try viewport corners, click menu/outside across app regions, press Escape, and repeat. No installed application was replaced.

Spec Kit initially reported global F013. A nonpersistent feature override confirmed F002 (`SPECIFY_FEATURE_DIRECTORY=specs/002-section-editing-recovery SPECIFY_FEATURE_NO_PERSIST=1 bash .specify/scripts/bash/check-prerequisites.sh --json --paths-only`); global feature state remains unchanged. The rendered/native gap is recorded in F002 verification.
