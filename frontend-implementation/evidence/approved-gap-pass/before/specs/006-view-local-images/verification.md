# F006 verification — 2026-09-29, updated after fresh SVG QA

## Scope and approved baseline

Active Spec Kit feature: `006-view-local-images` (`check-prerequisites.sh --paths-only`). The approved spec SHA-256 is `b8ee8619282446852ce955e04e1d027cd298c7982bfa658fc227c4fb25873fea`; design is `f131f06a6d07b1c3f867888f8ff4fa0a016ae10b4a6d59b5edd01547fe0042d9`. The user approved the narrow Rust-minimum correction; revised plan SHA-256 is `b51332d53c2f620c74e47c28aa94a765d242c93e7f31fe5575391d2f4e726c44`. See `docs/approvals.md`. Host: macOS 26.2 (25C56), arm64, Apple SDK 15.5, Rust 1.88.0. Local ad-hoc build only.

## Executed checks

| Check | Result | Observed evidence |
|---|---|---|
| `npm run build` / Tauri release build with `RUSTUP_TOOLCHAIN=1.88.0` | **PASS** | TypeScript and Vite compiled; arm64 `.app` built from local frontend. No dev server is needed by the bundle. |
| `npm test -- --reporter=dot --maxWorkers=1` | **PASS** | 31 UI files, 206 tests. Includes image tabs and links, close during decode, Fit/Actual/zoom, tile request and cleanup, inline SVG alt/error, external-change replacement and Retry. The same suite had intermittent existing `edit-flow` timing failures during earlier concurrent builds; its wait was stabilized and the final sequential run passed. |
| `cargo +1.88.0 test --manifest-path src-tauri/xpc/Cargo.toml --locked --offline --quiet` | **PASS** | Safe SVG raster/tile and active/external SVG rejection test passed. `resvg` and `usvg` are pinned to 0.48.1 in the isolated helper lockfile. |
| Locked helper dependency audit | **PASS** | Offline `cargo metadata --locked` resolved 57 packages including the local helper. All 56 third-party packages declare a license; the listed terms are MIT, Apache-2.0, BSD-2/3-Clause, 0BSD, Zlib, Unlicense or Unicode-3.0 alternatives/combinations. `resvg` and `usvg` both resolve to 0.48.1, declare `Apache-2.0 OR MIT`, and state Rust 1.85.0; the actual locked app build requires and passed on the approved Rust 1.88.0 toolchain. |
| `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --offline --quiet` | **PASS** | 158 tests passed, 8 existing measured tests ignored, none failed. This run used normal macOS event access: the sandboxed watcher tests did not receive file events, whereas the authorized normal-access run passed. New native tests cover image extension classification, bounded read/no-write, stale tile version and scoped image links. |
| `npm run test:bundle-worker` | **PASS** | Production Markdown/code worker guard passed. |
| Signed XPC format matrix, `tests/native/xpc-format-matrix.sh` | **PASS** | SVG, PNG, JPEG, GIF, WebP, BMP, TIFF, HEIC/HEIF decoded to PNG; each disposable input hash was unchanged before/after. Exact results: [format matrix](evidence/format-matrix-2026-09-29.txt). WebP sample came from the [libwebp test-data project](https://chromium.googlesource.com/webm/libwebp-test-data/+/refs/heads/main/one_color_no_palette.webp); other rasters were generated under `/private/tmp` using `sips`. |
| Versioned XPC contract probes | **PASS** | JPEG claimed as PNG returned `mismatch`; script-bearing SVG returned `unsafe_or_corrupt`. Raster and SVG 1024 × 1024 tiles decoded, and the requested right-hand SVG tile was visibly blue. Protocol version, UUID and selection generation are sent and reply-matched. Final helper SHA-256 `9702ee59ee6ffdf24d92743af27c1e7e0fa1037a7b353efef47d6cb5dc5677e5`; exact outcomes and unchanged source hashes: [contract probes](evidence/contract-probes-2026-09-29.txt). |
| 20-trial decoder timing | **PASS for helper only** | Disposable 8000 × 5000 PNG, 693 KiB encoded: 20/20 complete on the final helper; mean 362.6 ms, maximum 396.7 ms. Source SHA-256 `f2aefc6049ef920f339fde7549fc624b004b57cfc76e6b8e4d817531d1be`. This does not establish whole-app F006-SC-002 timing or peak memory. |
| `.app` signature and local DMG | **PASS** | Deep `codesign --verify --strict` passed for app and nested helper. DMG was created, mounted read-only, verified, hash-compared against the built app, and detached. App executable SHA-256 `065eae7da347edb85cedd71d042ed0e25ef1818425cedd60445fbc5a531a1fe1`; DMG SHA-256 `a4729520b696741aac76fa6d6c32afd978b4e24a6924150384dc3e598322699a`. Signature is **ad-hoc**, with no Team ID or notarization. |

## Fresh QA pass — confirmed SVG failures

This separate QA pass used macOS 26.2 (25C56), arm64 and the signed helper whose SHA-256 matches the packaged app. The user reported that `specs/007-dark-theme/design/theme-states.svg` loads in the app with all text missing. A disposable byte-identical copy (SHA-256 `fc9bba6fc65e61d2538818738f07f595cd7fa0159463561900d4cd64b0686303`) reproduced that output through the helper: **FAIL** for F006-R01/R05 and SC-001 image fidelity. Changing only its inherited system-font list to bundled Roboto restored text; `sans-serif` or Arial alone did not. Two other project SVG drawings also lost their text. Common symbols rendered as missing-glyph boxes even with Roboto.

The helper also returned `unsafe_or_corrupt` for two otherwise safe SVGs: one with a URL only in visible `<text>` and one with a quoted local paint reference `url('#g')`. Unquoted `url(#g)` passed. These are **FAIL** for safe SVG compatibility, while the script and embedded-data SVG controls remained rejected as intended. [Reproduction steps and bug IDs](qa-bugs-2026-09-29.md), [raw status/hashes](evidence/qa-probe-2026-09-29.txt), and [comparison PNGs](evidence/qa-svg-fixtures/) preserve the observations.

Fresh helper decode checks for SVG, PNG, JPEG, GIF, WebP, BMP, TIFF and HEIC/HEIF returned `status=0` with unchanged source hashes (**PASS for helper decode only**). Visual inspection of small raster output showed the expected red pixels for six formats and black for the WebP sample; the WebP matched an independent `sips` conversion. [Raster output files](evidence/qa-raster-pixels/) preserve this limited check. JPEG claimed as PNG returned `mismatch` (**PASS**). Focused UI regression, `npm test -- --reporter=dot --maxWorkers=1 tests/ui/image-view.test.tsx tests/ui/markdown.test.tsx tests/ui/workspace.test.tsx tests/ui/image-refresh.test.tsx`, passed 30 tests in four files (**PASS for components only**). `tests/native/xpc-format-matrix.sh` itself **FAILed** in this session because `open -W` returned before a result file arrived; direct invocations with result waits passed all formats. T022–T026 in `tasks.md` track the fixes and test reliability gap. Production code was not changed during this QA pass.

Native automation assessment: the [Tauri WebDriver guide](https://v2.tauri.app/develop/tests/webdriver/) supports macOS through a test-only embedded WebDriver service. This repository's current image tests do not include that service or a packaged image UI driver. The existing F002A QA harness has a separate app identity and does not exercise the current production image bundle. WebDriver was therefore **NOT TESTED** here and cannot substitute for the missing visible packaged checks.

## Engineering repair after the fresh QA report

The later [engineering verification](engineering-fix-2026-09-29.md) documents the repaired, rebuilt helper and a separate new DMG. **PASS for signed-helper pixels:** the original SVG's disposable copy now shows text and symbols; the URL label and quoted gradient render; script SVG is still rejected. **PASS for QA tooling:** the corrected matrix script passed all eight format families, including when called with relative paths. These results supersede the earlier helper-only failures above. Visible packaged tab and inline Markdown acceptance remains **NOT TESTED** on the new build.

## Acceptance limits

The repaired signed helper passes SVG visual fidelity checks, but **F006 is not ready for final packaged acceptance**. The earlier eight-format status matrix proved that decoding returned bytes; the later engineering pass added rendered-pixel inspection. T006's deterministic helper crash/timeout/malformed-reply probes remain open, so the foundation's fault-handling test gate is also incomplete. The available isolated QA environment has no usable visible application window; do not infer real macOS reading, picker, keyboard focus, Retina rendering, 640/1440-point edge access, or Reduce Motion behavior from component tests. The user's SVG failure was observed in the earlier build; the new DMG has not undergone a visible app journey.

The following remain **NOT TESTED**: full-app 20-trial latency/memory target (SC-002); visual/keyboard EN/ES and 640/1440-point journeys (SC-003/005); actual picker and Finder flows; network-request observation for hostile Markdown/SVG; external writer and atomic-replacement image journey; deterministic helper crash/timeout/malformed-response injection; high-entropy preview fallback under the 8 MiB response cap. Source-hash evidence covers the decoder matrix, not every UI zoom/reload operation. See [test matrix](test-matrix.md) and [security review](security-review.md).

**Next task:** Fresh QA should use the newly signed DMG and a visible disposable macOS account for `quickstart.md`: tab and inline display of the repaired SVG, app-request observation, 20 end-to-end trials, picker, EN/ES keyboard/zoom/Reload at 640 and 1440 points, and before/after fixture hashes. Do not mark the remaining scenarios PASS until observed.

## Follow-up execution — 2026-10-01

| Check | Result | Evidence |
|---|---|---|
| `npm test -- --reporter=dot --maxWorkers=1` | **PASS** | 31 UI files, 206 tests. |
| `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked` | **PASS** | 77 library tests passed; integration suites passed with only the repository's documented measured tests ignored. |
| `cargo +1.88.0 test --manifest-path src-tauri/xpc/Cargo.toml --locked` | **PASS** | 4 helper tests passed. |
| `npm run build:mac` | **PASS** | Fresh arm64 ad-hoc signed app and bundled XPC helper built and deep signature verification passed. |
| XPC contract probes against disposable fixtures | **PASS** | Mismatch, hostile SVG, raster tile, SVG tile, and 20/20 timing probes passed; source hashes remained unchanged. Latest timing: mean 344.9 ms, max 379.4 ms. |
| Local DMG packaging | **PASS** | `Markdown-workspace-local.dmg` created; SHA-256 `7ba4936ada4a08db8990361a0b9d4b863774fd0fc22fa9b607770b84ea7e46e4`; nested `codesign --verify --deep --strict` passed. `spctl` rejection is expected for the ad-hoc local signature. |

The repository packaged QA bridge could not run because another QA session was already active. Visible packaged tab/inline, picker, keyboard/layout, external-writer, app-request-observation, and end-to-end memory journeys remain **NOT TESTED**.

## Implementation follow-up — 2026-10-01, current run

| Check | Result | Evidence |
|---|---|---|
| `npm test -- --reporter=dot --maxWorkers=1` | **PASS** | 31 UI files, 206 tests. This includes the current image tab/tree, inline/link safety, zoom/tile, refresh and retry coverage. |
| `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --offline` | **PASS** | 77 library tests; native integration suites passed with the repository's measured cases ignored. The first sandboxed run suppressed macOS watcher events; the same command passed with normal macOS event access. |
| `cargo +1.88.0 test --manifest-path src-tauri/xpc/Cargo.toml --locked --offline` | **PASS** | Four helper SVG security, font and rendered-pixel tests. |
| `npm run test:bundle-worker` | **PASS** | Production workers remain local and bounded. |
| `npm run build:mac` | **PASS** | Fresh macOS 26.2 arm64 ad-hoc signed app; deep signature verification passed. App executable SHA-256 `20deab4d245c9a05c7ba631647611b7210c10f0ae2b837c05694a591e5da2c9c`; XPC helper SHA-256 `43148ee945ee3c9b9bad977ff98030dc98a54016ffed3c3e7d368464b9ea5192`. |
| `zsh src-tauri/xpc/package-dmg.sh` and `zsh src-tauri/xpc/verify-dmg.sh` | **PASS** | Refreshed local DMG mounted read-only; `hdiutil verify`, deep signature and app/helper hash comparisons passed. DMG SHA-256 `4e4c483152df47f0e67ab96efcf84b19c956ca6d6ccebe5a734f7f3f1132e34f`. Packaging required normal macOS access after sandboxed `hdiutil` returned `Device not configured`. |

The run confirms current component/native behavior and packaging, but does not close T006 fault injection or the packaged acceptance tasks. The refreshed DMG has not been driven through visible image-tab, inline, picker, zoom/layout, external-writer, or app-request-observation journeys. T006/T010/T013/T016/T019/T021 and convergence tasks T027–T037 remain open until those exact procedures have evidence; component tests do not substitute for the packaged steps.

## Follow-up implementation checks — 2026-10-01

| Check | Result | Evidence |
|---|---|---|
| Focused UI additions (`workspace`, `markdown`, `image-view`) | **PASS** | 32 tests passed. Covers Cmd+O picker-selected image routing, remote/protocol-relative no-IPC behavior and alt text, escaping-local scoped validation, Fit resize recalculation, and keyboard-focusable controls. |
| Full `npm test -- --reporter=dot --maxWorkers=1` | **PASS** | 31 files, 210 tests. |
| `npm run test:bundle-worker` | **PASS** | Local bounded Markdown/code worker guard passed. |
| `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --offline --quiet` | **PASS** | 77 library tests plus 81 integration tests passed; 8 repository-measured tests ignored. Sandboxed attempt suppressed two macOS watcher events; same command passed with normal macOS event access. |
| `cargo +1.88.0 test --manifest-path src-tauri/xpc/Cargo.toml --locked --offline --quiet` | **PASS** | Four helper tests passed. |
| `npm run build` | **PASS** | TypeScript and production Vite build succeeded; bundle emits the existing >500 kB advisory. |
| `tests/native/xpc-fault-probes.sh` | **PASS (simulated endpoint/timeout paths)** | `target/f006-xpc-fault-results.0Ad0sf/report.txt`; malformed request ID/payload, oversized response, generation mismatch, decoded cap, helper limit error, encoded-cap short circuit, service-loss error handling/recovery and timeout/recovery all passed. Probe executable SHA-256 `22816f3b5f7608b0543ca943656fff4b2f554e3c8ec10f95fd6f32025af200cf`. The harness swizzles the client connection in-process: it does **not** kill or restart the actual bundled helper, so T006/T027/T032 remain open for true process-termination containment. |

Packaged UI acceptance remains **NOT TESTED**: visible app journeys, actual picker/Finder flow, app-request observation, 640/1440-point keyboard/edge access, external-writer replacement, and whole-app 20-trial timing/memory. Component probes above do not replace those requirements. No production source was changed in this follow-up; the added fault probe is test-only.

## Fresh QA review — 2026-10-01

This is a separate QA pass against the current approved artifacts. Host reports macOS 26.2 (25C56), arm64. Host model and physical memory could not be queried (`sysctl` returned `Operation not permitted`); no target-hardware performance claim is made.

| Check | Result | Procedure / observed result |
|---|---|---|
| Active feature and approvals | **PASS** | `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` selected `006-view-local-images`. Current spec SHA `b8ee8619282446852ce955e04e1d027cd298c7982bfa658fc227c4fb25873fea`, design SHA `f131f06a6d07b1c3f867888f8ff4fa0a016ae10b4a6d59b5edd01547fe0042d9`, plan SHA `b51332d53c2f620c74e47c28aa94a765d242c93e7f31fe5575391d2f4e726c44`; all match `docs/approvals.md`. |
| UI regression | **PASS** | `npm test -- --reporter=dot --maxWorkers=1`: 31 files, 210 tests passed. Includes image viewer resize/zoom/focus, local and blocked inline references, picker routing and refresh component coverage. This uses mocked frontend/native boundaries; it is not packaged acceptance. |
| Native Rust regression | **PASS** | `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --offline --quiet`: 77 library and 81 integration tests passed; 8 measured tests ignored. Required normal macOS file-event access; the sandbox suppressed two watcher notifications in the initial run. |
| Decoder and worker regression | **PASS** | Helper suite: four tests passed. `npm run test:bundle-worker`: production worker guard passed. |
| XPC client fault probe | **PASS (simulated client seam only)** | `tests/native/xpc-fault-probes.sh`: `target/f006-xpc-fault-results.twLxW6/report.txt`; malformed reply, response/decoded caps, generation mismatch, encoded-cap short-circuit, helper error, simulated service loss and timeout/recovery all passed. This swizzles an in-process client connection; it does not terminate the bundled helper and does not count as native packaged acceptance. |
| Current local bundle integrity | **PASS** | `codesign --verify --deep --strict --verbose=2` accepts the arm64 app. App SHA `20deab4d245c9a05c7ba631647611b7210c10f0ae2b837c05694a591e5da2c9c`, helper SHA `43148ee945ee3c9b9bad977ff98030dc98a54016ffed3c3e7d368464b9ea5192`; `hdiutil verify` accepts DMG SHA `4e4c483152df47f0e67ab96efcf84b19c956ca6d6ccebe5a734f7f3f1132e34f`. Ad-hoc signed, not notarized. |
| Packaged visible macOS scenarios | **NOT TESTED** | This QA shell has no installed WDIO/Tauri service or tauri-driver; `pgrep` cannot inspect GUI processes (`sysmon` unavailable), and no packaged app journey was driven. Current Tauri documentation names embedded `@wdio/tauri-service` as its macOS route; this repo has no service/plugin integration. Browser/component evidence is not a substitute. |
| App-request/network observation | **NOT TESTED** | No current app-level resource/request observer is wired into F006; the F002A acceptance bridge explicitly excludes request observation for this batch. No claim of zero app requests from hostile content. |
| Packaged workload and file workflows | **NOT TESTED** | No end-to-end 20-trial response/memory run, actual picker/Finder/Cmd/Dock flow, 640/1440-point Retina edge/focus/Reduce Motion check, external-writer atomic replacement, or whole-workflow before/after hashes were observed in the packaged app. |

### Artifact consistency and convergence

Spec Kit review found no uncovered behavior gap beyond the existing open acceptance tasks T006/T010/T013/T016/T019/T021 and T027–T037; no duplicate task was added for those. It did identify stale governance labels: `spec.md` says approval is still pending, `design.md` remains labeled a draft for review, and `plan.md` remains a proposal requiring approval, while their unchanged hashes are recorded as approved in `docs/approvals.md`. T038 tracks only alignment of those labels; it does not change approved behavior. Several later convergence tasks overlap the original task groups, which makes progress reporting noisy but does not alter acceptance scope.

### Result and residual risk

**F006 packaged acceptance: BLOCKED / NOT TESTED, not release PASS.** Software-level regression, test helper faults, and local artifact integrity pass; they do not prove desktop behavior or native request isolation. Exact next step: use an approved visible macOS QA runner with a test-only embedded WebDriver setup (or manual disposable session), add an actual helper-termination/recovery probe, and complete the procedures in `quickstart.md`; capture app-request observation and target-Mac timing/memory before closing T006/T021/T027–T037. The current task list has no new uncovered acceptance task other than metadata alignment T038.

## Approved option-D frontend pass — 2026-10-04

Current frontend implementation evidence is [frontend-implementation/report.md](../../frontend-implementation/report.md). This implementation pass is not a separate QA session or packaged acceptance. The approved design package remains preserved; canonical specification/design/architecture and native contracts were not revised.

| Check | Result | Evidence / boundary |
|---|---|---|
| Full frontend regression | PASS | 37 files / 255 tests, `npm test -- --reporter=dot --maxWorkers=2`; native operations mocked. |
| TypeScript/Vite and production worker guard | PASS | `npm run build` and `npm run test:bundle-worker`; web build only. |
| Rendered workspace/viewer checks | PASS for named cases | Seven actual WKWebView captures / 150 checks: light/dark, EN/ES, 640×480, 200% enlargement, synthetic pinch, file switching, menu focus and dirty Save/recovery flows. Native APIs mocked. |
| Image load ownership | PASS with mocked native responses | Released inactive image pixels now remain pending instead of briefly appearing unavailable; stale reactivation cannot replace a newer success. Genuine failures remain visible. Original-image regression failed against saved pre-change App and passes after the fix. |
| Physical/native image acceptance | NOT TESTED | No physical trackpad or fresh packaged Tauri picker/grants/helper/save workflow exercised. Historical native evidence above does not verify this changed frontend. |

Append these current verification gaps to the existing open packaged procedures: physically repeat pinch in/out on images and Markdown, switch files and return to the retained image view/passage, exercise pending/genuine/late image responses and failed/cancelled history traversal, confirm narrow/enlarged keyboard access, and test real native permissions/reselection and save/recovery/restart with disposable fixtures. Existing T006/T010/T013/T016/T019/T021/T027–T037 remain open; no acceptance box was closed by renderer evidence. Rich editing, isolated HTML/other-file routing, separate Settings and native Go/subtree scope require the concrete IR-01–05 technical requests before their missing capabilities can be tested.

## Local packaging script — 2026-10-05

User requested a script to compile and create the app and DMG in the project
folder. `./build-mac.sh` now installs locked frontend dependencies, invokes the
existing native app/XPC/DMG scripts, verifies the staged outputs and places the
app, DMG and checksum at the project root. Generated outputs are ignored.

Environment: macOS 26.2 (25C56), arm64 / Rust host `aarch64-apple-darwin`,
macOS SDK 15.5, Node 20.19.6, npm 10.8.2, Rust/Cargo 1.88.0.
Configured minimum macOS remains 14.0; other OS/CPU combinations NOT TESTED.

| Check | Result | Evidence |
| --- | --- | --- |
| Script syntax and invalid-argument handling | PASS | `zsh -n build-mac.sh`; extra argument exits 2 with usage. |
| Full script | PASS | `./build-mac.sh` exits 0; npm install, TypeScript/Vite, Rust app/helper, signing and DMG creation complete. Network/native macOS sandbox access required for this run. |
| Production worker guard | PASS | `npm run test:bundle-worker`. |
| Artifact integrity | PASS | Deep strict signature checks; `hdiutil verify`; root `shasum -a 256 -c Markdown-workspace-local.dmg.sha256`. |
| Mounted DMG contents | PASS | `zsh src-tauri/xpc/verify-dmg.sh`: read-only mount, app/helper signatures and binary hashes match the build; Applications symlink present; cleanup ejects the image. |
| Signing scope | PASS for local build | Root app is thin arm64 with an ad hoc signature; not notarized. |
| Finder launch, installation and native UX | NOT TESTED | Existing packaged acceptance gaps remain open. |

DMG SHA-256: `4d2e0ae163f613801fc801cb9776b508fcf213de5c85cb3eac01d5ce55dbf657`.
App executable: `bcf0b8fc75018c383049591af06a3df40749e706e199461453740ee53f0277ed`.
Image helper: `43148ee945ee3c9b9bad977ff98030dc98a54016ffed3c3e7d368464b9ea5192`.
