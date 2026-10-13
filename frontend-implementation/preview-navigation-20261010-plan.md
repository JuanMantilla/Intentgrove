# Preview and navigation refinement — implementation plan

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../docs/current-version-acceptance-20261010.md).

USER-AUTHORIZED: “I approve this design for scoped frontend implementation” and “This authorizes the scoped frontend implementation and local verification.” Target: Intentgrove `md-reader`. Design: `../design-review/intentgroove/preview-navigation-20261010/index.html`, README.txt, embedded Behavior & handoff, validation.json. No native/backend/dependency/install/deploy/commit changes authorized.

OBSERVED: CodeGraph exists; consulted before locating current App/ImageView/FolderSearchPanel code. Stale source was omitted, so current files were read directly. Existing React 19, TypeScript, Vite, Vitest, Testing Library stack retained. Spec Kit `check-prerequisites.sh --json` identifies feature 013-windows-desktop; this user-authorized frontend refinement does not change that Windows specification. Prior dirty work and sidebar/context-menu fixes must be preserved. Relevant source baseline and worktree inventory are in evidence/preview-navigation-20261010/baseline/.

The four mockup states and light/dark, wide/narrow branches were inspected in source. Original observed PNG inspected visually. Rendered mockup inspection is blocked by browser URL security policy; no alternate rendering route attempted. The design artifact's prior PROPOSED label is superseded for this scope by the user's explicit approval. Designer artifacts stay unchanged.

1. Remove workspace toolbar; provide Projects beside tabs and through Folio rail. Keep native menu/shortcut dispatch, menu actions and selection functions. Tabs directly follow global header; Atlas shelf follows tabs.
2. Render ImageView-owned live controls into a stable header host through a React portal. Keep existing tile/cache/pinch/scroll/history owners. Distinguish actual/manual modes without changing native/session contracts; move metadata/loading-detail feedback to footer. Text Find stays in document header. Hide image Outline/Reading controls.
3. Keep narrow document content mounted but invisible and inert behind the full-width Projects surface. Keep menus/dialogs outside that inert content. Remember actual invoker, support close/Escape and nested menu precedence; retain distinct Back to explorer behavior in workspace search.
4. Migrate toolbar-dependent tests to real Projects actions. Add regression coverage for preset/manual/bounds/restore, header/footer integration, narrow keyboard/focus/editor continuity and independent find scopes. Run full suite and frontend build.
5. Attempt rendered app review using disposable fixtures; accurately distinguish jsdom/mocked checks from browser/native observation. Record unavailable wide/narrow/theme/pixel/accessibility checks without claiming fidelity.

Acceptance pending user review. Complete implementation handoff only; no deployment.
