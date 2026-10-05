# F002R verification — 2026-09-29

Reference host: macOS 26.2 (25C56), arm64. Tests use disposable content. The approved `spec.md`, `design.md`, `design/reading-states.svg`, and `plan.md` SHA-256 values still match `docs/remaining-roadmap-review-2026-09-29.md` (`59c46b5b…`, `bf418d97…`, `f443d3d5…`, `9eea6a7c…`). Installed Spec Kit task setup generated `tasks.md`; this record describes implementation evidence, not a new approval.

## Implemented slices

- **F002R-R03 / AS-002 — PASS in UI/worker tests:** The worker parses a bounded, failsafe YAML map. Metadata is collapsed with EN/ES labels and source access. Duplicate keys, aliases, tags, collections and over-limit input show invalid source. A small-document fallback also works without a worker. No metadata is applied to app settings. `tests/ui/frontmatter.test.tsx` and `tests/worker-bundle.mjs` cover these paths. Packaged visual/keyboard acceptance remains **BLOCKED**.
- **F002R-R04 / AS-003 — PASS in UI/worker tests:** Ten bundled grammars tokenize known fences in a separate worker with 32 KiB input, 5,000-token and 2-second UI bounds. React renders only text and fixed classes. Unknown or over-budget fences stay plain; Copy uses authored fence bytes including CRLF. `tests/ui/code-block.test.tsx` and the production `tests/worker-bundle.mjs` cover known/unknown/hostile text and exact Copy. Packaged keyboard/visual acceptance remains **BLOCKED**.
- **F002R-R05 / AS-004 — PASS in UI tests:** One duplicate-aware h1–h6 heading sequence supplies rendered IDs and the outline. The optional outline has level indentation, current-location text and navigation. `tests/ui/heading-model.test.tsx` and `tests/ui/workspace.test.tsx` cover duplicate headings. Refreshed/renamed-heading packaged behavior is **NOT TESTED**.
- **F002R-R06/R07 — PASS in local code and native/UI tests:** Roboto and Roboto Mono variable fonts are bundled with OFL notices. EN/ES reading controls select font and bounded size, line height and width; the chosen values enter the versioned F003C session checkpoint. Native validation rejects out-of-range values and restores defaults from an older checkpoint; UI restore/change is covered in `tests/ui/session.test.tsx`. Ten normal packaged restarts and no-write proof are **BLOCKED**.
- **Dependency provenance — PASS for bundled fonts/YAML/code:** Fonts came from `google/fonts` commit `23e54b51ddffbc7713c583748e3bd86f62b1fa4a`, `ofl/roboto` and `ofl/robotomono`, SIL OFL 1.1. SHA-256: Roboto regular `d7598e12c5dbef095ff8272cfc55da0250bd07fbdecbac8a530b9b277872a134`, italic `9725a847af6b460ffca162ae66d20dad48b01876137947180b42d7dcd7887182`, Mono regular `66a80e79d17e4c7cabd162e2916578a4cc08fd19eef6e2a643305eae9c567b2b`, italic `49ac343bb7b070071e53f0a8a501d68d140ed98ebd0a43b6b8fb96cf22f09ff7`. `dist/licenses/` includes font and tokenizer notices. `remark-frontmatter` 5.0.0, `yaml` 2.8.4 and `lowlight` 3.3.0 are direct exact pins; the lock resolves `highlight.js` 11.11.2. Lowlight is MIT, highlight.js BSD-3-Clause. `npm audit --omit=dev --audit-level=moderate` after the code dependency reported zero vulnerabilities; Mermaid is not installed.

## Current checks and open work

| Check | Status | Evidence or gap |
|---|---|---|
| Full UI suite | PASS | `npm test -- --run`: 194 passed, 29 files. |
| Native suite | PASS | Locked offline `cargo test --lib`: 74 passed, 3 ignored. |
| Production web and worker bundle | PASS | `npm run build`, `npm run test:bundle-worker`; font assets and OFL notices emitted. |
| AS-001 diagrams / R01–R02 | BLOCKED | Opaque-origin packaged Mermaid isolation, CSP and inert raster proof not established; diagrams remain disabled. |
| AS-003 code highlighting / R04 | PASS (scoped) | Local token worker, plain fallback and exact Copy pass UI/worker tests; packaged visual/keyboard check BLOCKED. |
| AS-006 renamed-heading fallback | NOT TESTED | Current scroll-top fallback exists; packaged refresh journey remains. |
| AS-007–009, SC-001–004 | BLOCKED | Hostile fixture matrix, packaged EN/ES/focus/width/Reduce Motion, request observation, 1/10 MiB timings and 10 restarts lack a visible QA window and completed renderer. |

The current worker still applies a whole-document 10,000-node cap and the renderer paints the returned document as one tree. Per-block fallback and 10 MiB timing targets remain open. No Mermaid or SVG execution path was enabled. The last isolated packaged QA launch produced no accessible window or usable display capture; compile/bundle checks cannot substitute for these acceptance checks.

A dense synthetic 10 MiB Markdown repetition (many short headings, lists and tables) took more than 60 seconds in a direct parser benchmark and was stopped; this is a complexity probe, not the specified non-adversarial timing fixture. The current app rejects this shape via its line/node budget. It confirms why the approved per-block architecture and timing work remain necessary.

Current local artifact: the thin arm64 ad hoc signed `.app` has executable SHA-256 `b61bfc5864c0474caf0eef3501d12428a8422c71465598aaa7127184cd5236f4`; `codesign --verify --deep --strict` PASS. The current-source v4 DMG SHA-256 is `3c034dc6657fe148ebd1212720c0a17c27e48ae7c001968a7007fc2269125d8d`; `hdiutil verify` PASS, read-only mounted executable hash/signature and `/Applications` link PASS. This is package integrity evidence only.
