# Subtle shell motion implementation — 2026-09-29

Approval: `docs/approvals.md` records the user's “please add them” reply and SHA-256 of `docs/animation-opportunities.md`. This is a scoped visual addendum to the existing shell. The installed Spec Kit currently resolves F006 (`specs/006-view-local-images`); no F006 specification, design or plan was changed for this cross-shell work.

| Proposal area | Implementation | Verification |
|---|---|---|
| Settings and custom menus | 120 ms fade/4 px entry, 90 ms exit; close removes focus and accessibility immediately; settings and menu triggers regain focus. Settings are immediate at ≤700 px. | PASS: `tests/ui/workspace.test.tsx`, `tests/ui/manual-reload.test.tsx`, `tests/ui/edit-flow.test.tsx` (rapid toggle, Escape, focus, action paths). |
| Selected tab | 110 ms background/accent transition; content and tab labels switch immediately. | PASS: existing tab navigation tests; visual timing NOT TESTED. |
| Sidebar and outline | Sidebar width changes over 170 ms on toolbar toggle only, immediate at ≤700 px and during manual resize; outline width/opacity over 140 ms above 900 px, immediate at ≤900 px. Closed panels are inert and hidden from accessibility. | PASS: rapid toggle and accessibility state in `tests/ui/workspace.test.tsx`; real text reflow and scroll anchoring NOT TESTED. |
| Find and notices | Find opacity enters in 100 ms while focus is immediate. Notice background changes in 100 ms; text is readable immediately. | PASS: existing Find tests and UI suite; packaged visual timing NOT TESTED. |
| Reduce Motion | Optional motion CSS is inside `prefers-reduced-motion: no-preference`; settings exit unmounts immediately under Reduce Motion. | PASS: `tests/ui/workspace.test.tsx` reduced-motion close; packaged macOS Reduce Motion NOT TESTED. |

## Checks

- **PASS** — macOS 26.2 arm64: `npm test` after implementation, 198/198 UI tests across 29 files. After the final section-menu Escape focus fix and ≤700 px CSS rule: affected three files 23/23 tests passed.
- **PASS** — `npm run build` and `npm run test:bundle-worker` after implementation. `npm run tauri build -- --bundles app` passed with the existing nonfatal `rust-objcopy`/missing `libLLVM.dylib` strip warning.
- **PASS** — Ad hoc signed arm64 `.app` at `src-tauri/target/release/bundle/macos/Markdown workspace.app`; `codesign --verify --deep --strict` passed. Executable SHA-256: `4a221decec7ffdc21402fedb70edb0e345c2ce4e2a7dcfb268da8490f249db33`.
- **PASS** — Local DMG at `src-tauri/target/release/bundle/dmg/Markdown-workspace-current-source-2026-09-29-motion.dmg`; SHA-256 `14ac4fa48ed08f8cad2bfde02aa17d41f7b38a6f277b2d6a585925221dd3c8fc`. `hdiutil verify` passed. Read-only mount confirmed matching executable hash, strict signature and `/Applications` link; image ejected.
- **NOT TESTED** — Visible packaged motion, 200% zoom, 640/900/1440-point reflow, real scroll anchoring during sidebar/outline motion, and macOS Reduce Motion/light/dark appearance. The isolated QA display used for earlier work did not expose a usable window. This build was not installed or launched against existing app data.

The local artifact is a development build; F002R Mermaid/per-block performance and F006 image work remain open in their own verification records. No commit, push, publication or system security setting change occurred.
