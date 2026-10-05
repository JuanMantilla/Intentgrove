# Dark theme decisions — 2026-09-28

## Existing foundation

**Decision:** Keep the installed React/Tauri/CodeMirror stack and reuse the current toolbar and app-owned localStorage approach. No dependency installation is needed.

**Rationale:** Current source has one stylesheet with hardcoded light colors, a language select, and a CodeMirror editor created once per session. Semantic variables and one shared appearance controller fit these boundaries.

**Alternatives:** A new settings subsystem or third-party theme package adds scope beyond the requested appearance feature.

## Native appearance

**Decision:** Use Tauri Window.setTheme with Light/Dark or null for System and onThemeChanged/theme for effective appearance.

**Evidence:** The [official Tauri API](https://v2.tauri.app/reference/javascript/api/namespacewindow/#settheme) documents null as system-following and macOS overrides as app-wide. The installed API declarations at node_modules/@tauri-apps/api/window.d.ts:1185–1196 and 1328–1339 confirm the methods. The generated local ACL contains allow-set-theme, which is absent from default window permissions.

**Rationale:** Existing single-window scope and an app-wide preference are compatible. No custom titlebar or native appearance bridge is needed.

**Alternative:** CSS-only recoloring would leave native app chrome disconnected from explicit appearance.

## CodeMirror state preservation

**Decision:** Reconfigure a Compartment containing EditorView.darkTheme.of(...) and use bundled semantic CSS for feature colors.

**Evidence:** Installed primary API declarations at node_modules/@codemirror/state/dist/index.d.ts:725–751 describe effect-only Compartment reconfiguration; @codemirror/view/dist/index.d.ts:1402–1415 exposes the theme and darkTheme facet. The upstream documentation pages could not be fetched in this session; the exact installed declarations are the compatibility evidence.

**Rationale:** Keep editor lifetime, draft, selection and history stable; avoid new runtime stylesheet or CSP requirements for feature colors.

**Alternative:** Recreating the editor on each appearance change risks losing history, selection, and recovery continuity.

## Startup and persistence

**Decision:** Resolve a validated preference synchronously before the first React content render; use system-aware CSS for the empty startup canvas.

**Rationale:** A React effect runs after rendering and risks a bright first document frame. Enum-only local storage keeps the preference separate from repositories and needs no new filesystem capability.

**Limits:** Native pre-content chrome and media-query behavior under native overrides still need packaged checks. A storage failure keeps the choice only for the current session and gives a warning.
