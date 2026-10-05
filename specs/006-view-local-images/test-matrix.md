# F006 acceptance matrix — updated 2026-09-29 after fresh SVG QA

Status refers to the **complete scenario in the packaged macOS app**. Component, native and helper evidence is listed separately. `NOT TESTED` does not mean the implementation is absent. The user's reported SVG is in this repository; the QA probe read a disposable byte-identical copy and did not modify the original. [Confirmed bugs](qa-bugs-2026-09-29.md) describe the earlier helper; [engineering verification](engineering-fix-2026-09-29.md) records the repaired signed helper and new DMG. Visible tab/inline acceptance on that new bundle is still pending.

| Scenario | Component/helper evidence | Packaged status and remaining observation |
|---|---|---|
| AS-001 — open from tree | UI image-tree test; eight-format helper decode matrix; repaired SVG text pixels **PASS** in signed helper | **NOT TESTED** — tree route for each format in the new bundle. |
| AS-002 — explicit picker scope | Native no-follow grant/path checks; picker filter inspected | **NOT TESTED** — actual picker and sibling-file denial. |
| AS-003 — one tab on reopen | UI duplicate-tab test | **NOT TESTED** — actual file selection twice. |
| AS-004 — read-only switch/close | UI close-during-decode test; source hashes unchanged in helper matrix | **NOT TESTED** — packaged switch/close and no-write hashes. |
| AS-005 — whole-image Fit | ImageView Fit and metadata component test | **BLOCKED** — no visible packaged window for 640/1440-point observation. |
| AS-006 — Actual Size/zoom/edges | UI zoom/tile test; raster and SVG XPC tile probes | **BLOCKED** — visual edge, center and Retina inspection. |
| AS-007 — keyboard/focus | Buttons and text have accessible names in component DOM | **BLOCKED** — packaged keyboard and focus ring observation. |
| AS-008 — safe inline image/alt | MarkdownView scoped PNG/SVG tests; repaired SVG text and quoted gradient **PASS** in signed helper | **NOT TESTED** — actual packaged inline matrix in the new bundle. |
| AS-009 — image link opens tab | Native scoped link-classification test; UI link-activation test | **NOT TESTED** — packaged link activation. |
| AS-010 — hostile content inert | UI remote URL has no image element/native request; malicious SVG rejected by XPC | **NOT TESTED** — app-request observation and packaged hostile fixture. |
| AS-011 — external change/reload | UI refresh/replacement mock; native watcher suite | **NOT TESTED** — separate writer, atomic replacement and manual Reload in app. |
| AS-012 — specific errors/Retry | XPC mismatch/unsafe errors; UI corrupt/Retry test | **NOT TESTED** — packaged corrupt/mismatch/over-limit journeys. |
| AS-013 — unstable read | Native stable-byte/version tests | **NOT TESTED** — concurrent writer and uncertain-status journey. |
| SC-001 — eight families, tabs/inline | Eight families return decoded bytes; repaired SVG text and symbols **PASS** in the signed helper | **NOT TESTED** — earlier app failed per user report; the new bundle's full tab/inline paths remain unobserved. |
| SC-002 — 19/20 under 2 s, all under 5 s | Final helper 40 MP fixture: 20/20, max 396.7 ms | **NOT TESTED** — end-to-end app latency and memory. |
| SC-003 — edge reach at 640/1440 | Tile protocol and CSS/component tests | **BLOCKED** — visible packaged layout. |
| SC-004 — source hashes after workflows | All eight helper fixture hashes unchanged | **NOT TESTED** — hash before/after open, zoom, reload and close in app. |
| SC-005 — EN/ES keyboard/Reduce Motion | EN/ES keys and DOM tests | **BLOCKED** — visible packaged keyboard and motion check. |

Use the [verification record](verification.md) and `quickstart.md` for commands and the exact next packaged procedure. App distribution is not authorized; the local DMG has an ad-hoc signature and is not notarized.

## Fresh QA snapshot — 2026-10-01

Platform: macOS 26.2 (25C56), arm64. Current artifact hashes and regression details are in [verification.md](verification.md). Status below refers to packaged acceptance; a PASS in the component/helper column is explicitly narrower.

| Requirement / scenario | Component/native evidence in this QA pass | Packaged status |
|---|---|---|
| R01–R03; AS-001–004 — tree/picker, duplicate focus, read-only tabs | UI suite PASS (210 tests); Rust scope and helper format matrix evidence remains available | **NOT TESTED** — actual tree/picker selection, duplicate open, close/switch and hashes. |
| R04; AS-005–007; SC-003/005 — Fit/Actual/zoom, edges, accessibility | UI zoom/resize/focus component tests PASS; worker and Rust regressions PASS | **NOT TESTED** — 640/1440 layout, edges, visible focus, EN/ES keyboard, Retina and Reduce Motion. |
| R05/R06/R11; AS-008–010 — inert inline images, links and hostile content | UI local/remote/escape/alt checks PASS; native/helper rejection checks PASS; XPC client seam malformed-response probes PASS | **NOT TESTED** — packaged inline/link journeys and observed app-request activity. |
| R07; AS-012 — errors and recovery | Helper and UI component error paths PASS; XPC client cap/generation/timeout recovery probe PASS (simulated connection) | **NOT TESTED** — actual helper termination, packaged error display and app remains usable. |
| R08; AS-011/013 — external change and stable read | Existing component refresh and native watcher suites PASS | **NOT TESTED** — separate writer, root/explicit atomic replacement, uncertain read and manual Reload in app. |
| R09; SC-004 — no source/neighbor writes | Helper format fixture hashes unchanged in recorded evidence | **NOT TESTED** — full packaged open/zoom/reload/close source and neighbor hash comparison. |
| SC-001 — eight families | Signed helper matrix and SVG pixel repair evidence PASS at helper boundary | **NOT TESTED** — full standalone and inline format matrix in current packaged app. |
| SC-002 — 20-trial latency/memory | Previous helper-only 20-trial measurement is recorded; it is not a fresh end-to-end target-device measurement | **NOT TESTED** — 20 packaged journeys, app response time and peak memory on identified target Mac. |
| Tauri host/packaging | Current app/helper deep signature and DMG checksum **PASS** | **NOT TESTED** — launch interaction, Finder/Cmd/Dock, permissions, window lifecycle and installed behavior. |

## Earlier QA requirement-to-result checks (pre-repair helper)

| Requirement and scenario | Procedure | Actual result and evidence | Status |
|---|---|---|---|
| R01/R05, AS-001/008, SC-001 — safe SVG text | Decode a byte-identical disposable copy of `theme-states.svg`; compare original and Roboto-only variants visually | Original success PNG omits all text; Roboto-only variant restores it. User confirms original SVG loses all text in the app. [Outputs](evidence/qa-svg-fixtures/), [raw result](evidence/qa-probe-2026-09-29.txt) | **FAIL** |
| R01/R05, SC-001 — SVG symbols | Decode disposable Roboto `symbols.svg` and inspect PNG | Latin letters appear; menu/check/down glyphs are missing-glyph boxes. [Fixture/output](evidence/qa-svg-fixtures/) | **FAIL** |
| R06/R07, AS-008/010 — literal URL versus resource | Decode SVG with URL only as `<text>`, then script and embedded-data controls | Safe visible text wrongly returns `unsafe_or_corrupt`; hostile controls return the same code as expected. [Raw result](evidence/qa-probe-2026-09-29.txt) | **FAIL** for safe text; **PASS** for helper rejection of hostile controls |
| R05/R07, AS-008 — local paint fragment | Decode `url(#g)` and `url('#g')` variants | Unquoted fragment succeeds; quoted local fragment returns `unsafe_or_corrupt`. [Fixture/result](evidence/qa-svg-fixtures/gradient-quoted.svg) | **FAIL** |
| R01/R07, SC-001 — eight format decode | Invoke the signed helper separately for SVG, PNG, JPEG, GIF, WebP, BMP, TIFF and HEIC/HEIF; wait for each result, inspect simple raster pixels and compare source hashes | Eight `status=0` replies; source hashes unchanged. Raster outputs match expected solid colors, including WebP against `sips`. This does not prove packaged journeys or complex-image fidelity. [Raw result](evidence/qa-probe-2026-09-29.txt), [raster pixels](evidence/qa-raster-pixels/) | **PASS** for helper decode and simple raster pixels only |
| R07, AS-010/012 — invalid content | Claim JPEG bytes as PNG; decode script and embedded-data SVGs | Mismatch returned `mismatch`; hostile SVGs returned `unsafe_or_corrupt`. No app-request observer was available. [Raw result](evidence/qa-probe-2026-09-29.txt) | **PASS** for helper rejection; packaged network check **NOT TESTED** |
| R04/R08/R10 — UI regression | Run four focused UI files with `npm test -- --reporter=dot --maxWorkers=1 ...` | 30/30 component tests passed; native responses were mocked. [Raw result](evidence/qa-probe-2026-09-29.txt) | **PASS** for components; packaged UX **NOT TESTED** |
| T020/T021 — format-matrix script | Run `zsh tests/native/xpc-format-matrix.sh` on disposable samples | Script exited 1 after `open -W` returned before a result file existed; direct per-format waits succeeded. [Raw result](evidence/qa-probe-2026-09-29.txt) | **FAIL** for QA script |
