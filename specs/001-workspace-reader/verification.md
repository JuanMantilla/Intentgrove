> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F001 verification — 2026-09-25

Host: macOS 26.2 (25C56), arm64; Node 20.19.6, npm 10.8.2, rustc 1.98.1. The Rust toolchain is local to `/private/tmp/md-reader-cargo` and `/private/tmp/md-reader-rustup`.

## Executed checks

| Check | Result | Evidence |
|---|---|---|
| TypeScript and frontend production build | PASS | `npm run build`: TypeScript passed; Vite 8.3.1 built 269 modules and emitted local JS/CSS assets. |
| Renderer/component regression | PASS | `npm test`: 9/9 tests in `tests/ui/markdown.test.tsx` and `tests/ui/workspace.test.tsx`. Covers basic GFM, inert script markup, remote image placeholder, scoped link callback, duplicate-name tabs, per-tab scroll, empty state, keyboard shortcut, cancellation control, EN/ES shell and error recovery. |
| Native unit tests | PASS | `cargo test --locked`: 10 passed, 1 explicitly ignored benchmark. Tests live in the relevant Rust modules. Covers path components, symlinks, exclusions, paging, link/image scope, binary/UTF-8/oversize/missing/denied/nonregular, Unicode/upper-case extension, atomic replacement, no-write fixture read, navigation origin. |
| Large-directory backend fixture | PASS, backend only | `cargo test --locked measures_large_folder_first_page_and_cancellation -- --ignored --nocapture`: 25,000 disposable files; first 200-entry page in 1 ms; cancellation acknowledgement over ten runs `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2]` ms. This does not measure UI paint or WebKit responsiveness. |
| Rust formatting | PASS | `cargo fmt --all -- --check` after formatting. |
| Native build | PASS | `npm run tauri build -- --bundles app`: produced `src-tauri/target/release/bundle/macos/Markdown workspace.app`; `file` reports a thin arm64 Mach-O executable. |
| Bundle integrity | PASS for local ad hoc bundle | Tauri's initial linker signature failed whole-bundle `codesign --verify`. `codesign --force --deep --sign - <app>` followed by `codesign --verify --verbose=2 <app>` passed. Signature is ad hoc, with no TeamIdentifier or notarization. The app bundle contains the executable, icon, and Info.plist; frontend assets are embedded into the executable. |
| Native process launch | PASS, limited | `open -n <app>` and a direct host launch succeeded with host escalation. A first `pgrep` raced startup, but a later check found both app processes running; macOS logs showed WebKit page-load activity and an occluded window. The sandboxed direct launch aborted in AppKit and the sandboxed `open` failed. None of this verifies visible interaction. |
| Packaged window interaction | NOT TESTED | `screencapture -x /private/tmp/md-reader-app.png` returned `could not create image from display`, even with host escalation. This session could not inspect or automate the window, native dialogs, Finder, VoiceOver, narrow layouts, or keyboard journey. |
| Disconnected offline journey/network observation | NOT TESTED | No interactive display/network monitor was available for folder → tab → local link with connectivity disabled. No dev server was needed for process launch, but launch alone is insufficient proof of offline reading or zero requests. |

## Requirement status

| Requirement | Status | Current evidence and limit |
|---|---|---|
| F001-R01 | PASS in backend/UI tests; native NOT TESTED | Root grant, paged listing, exclusions and tree are implemented; 25k backend fixture measured. Native picker and UI progress/cancel require a visible Mac session. |
| F001-R02 | PASS in component/native tests; native NOT TESTED | `.md`/`.markdown` matching, bounded reads, GFM and file picker command exist. Real WebKit document rendering remains unobserved. |
| F001-R03 | PASS in component tests; native NOT TESTED | Duplicate-name tabs, identity reuse and per-tab scroll restoration tested in the component harness. Native window behavior remains unobserved. |
| F001-R04 | PASS in native scope tests; native NOT TESTED | Root links, anchors, file-only grants, raster images, remote/traversal/symlink/SVG blocking tested at command level. Actual image paint and heading scroll are unobserved. |
| F001-R05 | PASS in fixture test; app journey NOT TESTED | Native read test compares source bytes before/after; no write command exists. Full repository hash/inventory comparison around a packaged journey remains. |
| F001-R06 | PASS in component/native tests; network NOT TESTED | Raw script markup makes no script element; remote image makes no remote `<img>`; scoped buttons avoid live external hrefs. CSP and navigation/new-window/download guards are configured. Packaged network capture is outstanding. |
| F001-R07 | PASS in native tests; UI partial | Binary, invalid UTF-8, oversize, missing, denied, nonregular and atomic replacement errors tested; UI retry recovery tested. Native dialog/window presentation remains unobserved. |
| F001-R08 | PARTIAL | Keyboard shortcut and cancellation control tested in the UI harness; backend cancellation measured. Full keyboard-only journey, arrow-key tree navigation, VoiceOver, narrow-width and scaling acceptance remain untested. |
| F001-R09 | PARTIAL | Packaged arm64 process launches without a dev server. The full disconnected fixture journey is not tested. |
| F001-R10 | PASS in component tests; native NOT TESTED | Shell and error state switch between EN/ES. Native dialog localization and screen-reader announcements remain untested. |

F001 is a runnable implementation candidate, not an accepted offline release. The next required step is a visible macOS session: run the packaged app on disposable fixtures, disconnect networking, observe app-requested traffic, navigate folder → tab → link/image, compare fixture hashes and inventory, and exercise keyboard/VoiceOver at the minimum window size. See [test-matrix.md](test-matrix.md) and [security-review.md](security-review.md).

## Implementation continuation — 2026-09-25

| Check | Result | Evidence and limit |
|---|---|---|
| Frontend build after rendering/keyboard changes | PASS | `npm run build`: TypeScript and Vite production build passed. |
| UI regression | PASS | `npm test`: 11/11 tests, including parse-shape fallback and tree/tab arrow focus. This is jsdom, not WKWebView. |
| Native regression | PASS | `cargo test --locked` with the local temporary toolchain: 12 passed, 1 ignored benchmark. Added dataless-flag and vanished-root/symlink-cycle fixtures. |
| Cloud placeholder on real File Provider item | NOT TESTED | `scope.rs` checks Darwin `SF_DATALESS` on metadata before opening selected and root-relative entries. Apple [TN3150](https://developer.apple.com/documentation/technotes/tn3150-getting-ready-for-data-less-files) documents this flag and warns that checking a path can materialize intermediate folders. No disposable cloud placeholder was available for a live test; OS-managed downloads cannot be ruled out. |
| WebdriverIO Tauri service evaluation | PASS, design evaluation only | [Tauri's WebDriver documentation](https://v2.tauri.app/develop/tests/webdriver/) says `@wdio/tauri-service` supports macOS through an embedded driver. This requires test-only Tauri plugins; no driver or plugin was installed and no native automation ran. The production bundle must continue to exclude them. Native dialogs, Finder, VoiceOver, display scaling, traffic observation, and fixture inventory remain manual acceptance checks. |
| Packaged interactive acceptance and SC-001–SC-006 | NOT TESTED | A focused shell screenshot became available later in this pass, but no disposable-fixture journey, performance, accessibility, or offline traffic behavior was executed. |

## Final checks in this implementation pass

| Check | Result | Evidence and limit |
|---|---|---|
| UI tests | PASS | `npm test`: 15/15, covering bounded render preflight, local image bytes, same/cross-document anchors, tree/tab arrow focus, pending-folder replacement/cancellation, tab scroll, error retry, and EN/ES component states. Tests are in `tests/ui/markdown.test.tsx` and `tests/ui/workspace.test.tsx`; equivalent native fixtures remain in Rust module tests rather than the initially proposed integration-test filenames. |
| Native tests and formatting | PASS | `cargo test --locked`: 12 passed, 1 ignored 25k benchmark; `cargo fmt --all -- --check` passed. Tests use disposable temporary folders. |
| Packaged arm64 build and signature | PASS | `npm run tauri build -- --bundles app` passed; local `codesign --force --deep --sign -` and `codesign --verify --verbose=2` passed. `file` identified an arm64 Mach-O. No WebDriver binary was found in the bundle. |
| Packaged shell appearance | PASS, limited | The built app launched with host permissions and a focused window capture showed the toolbar, explorer, and empty reader shell. The window showed a non-fixture folder already selected; this pass did not open any of its documents or use it as acceptance evidence. The launched test process was closed. |
| Native fixture journey, keyboard/VoiceOver, minimum size, offline traffic, file hashes, SC-001–SC-006 | NOT TESTED | `System Events` returned `osascript is not allowed assistive access` for scripted controls. No OS security setting was changed. A disposable fixture journey and interactive checks still require an authorized visible Mac session. |

Open implementation gaps: the render guard is a synchronous input-shape budget, not a worker or elapsed-time cutoff; a 1 MiB mixed-document WKWebView timing run has not been measured. The dataless metadata check is tested with a synthetic flag, not a live cloud placeholder. Case-variant collisions on a case-sensitive volume and full repository hash/inventory checks remain untested.

Additional native fixture run: `cargo test --locked` PASS, 13 passed and 1 ignored benchmark; `cargo fmt --all -- --check` PASS. The new disposable test compares file inventory and content digests before and after reads and checks whether case-variant names reuse or distinguish a grant according to actual file identity. The asset fixture now follows an encoded Unicode link. This host run does not prove two case variants can coexist on a case-sensitive volume. The fixture digest is a test assertion; the packaged repository-wide SHA-256 and inventory check in T019/T027 remains NOT TESTED.

## Implementation continuation — parsing worker and fixture preparation

| Check | Result | Evidence and limit |
|---|---|---|
| Approved artifact integrity | PASS | SHA-256 of `spec.md`, `design.md`, `design/window.svg`, and `plan.md` still matches `docs/approvals.md`. |
| Bounded Markdown parsing | PASS in component tests | Parsing now runs in a dedicated Worker with a five-second cutoff and a 20,000-node budget. Worker failure, timeout, and over-budget input show a recoverable fallback. `npm test`: 18/18, including real worker-module GFM parsing and simulated worker failure. The packaged WKWebView path remains unobserved. |
| Focus and announcement behavior | PASS in component tests | Tree parent/child arrow focus, tab focus after close, and accessible loading/error roles are covered in jsdom. Native keyboard, VoiceOver, 640×480, and display scaling remain NOT TESTED. |
| Production app build | PASS | `npm run tauri build -- --bundles app` emitted a local Markdown worker asset and the arm64 app bundle. After ad hoc signing, `codesign --verify --deep --strict --verbose=2` passed. This is not a release signature. |
| Ordinary 1 MiB parser timing | PASS, parser only | Ten Node parser runs on a 1,048,576-byte mixed Markdown fixture took 453–988 ms each. This does not measure packaged WKWebView paint or shell usability, so SC-001 remains NOT TESTED. |
| Disposable acceptance fixtures | PASS, preparation only | `node tests/fixtures/f001.mjs create --large` generated a workspace with local/remote assets, links, excluded folders, invalid/oversize files, and a symlink escape, plus a separate 25,000-entry folder. `verify` reported unchanged SHA-256 inventories for both generated roots before app interaction. Fixture parent: `/var/folders/q1/w_vhh3xs5xg7tzvgskbvgj440000gn/T/md-reader-f001-E1d9XU`. |
| Packaged F001 journey and SC-001–SC-006 | BLOCKED | macOS denied `System Events` assistive access for native UI control. Accessibility permission has been requested from the user; no OS security setting was changed. Disconnected journey, traffic observation, post-journey fixture hashes, 25,000-entry UI responsiveness, warm-load timing, VoiceOver, and minimum-size/scaling checks have not run. |

T019, T022, T024, T027, T029, T030, and T031 remain open because their native acceptance or performance clauses are unverified. The code portions of T022/T024/T029/T030 are implemented and pass component/build checks.

## Implement continuation — native automation attempt

| Check | Result | Evidence and limit |
|---|---|---|
| Checklist and approval gate | PASS | `check-prerequisites.sh --json --require-tasks --include-tasks` selected F001; `checklists/requirements.md` has 14/14 checked items. SHA-256 of approved spec, design, visual, and plan matched `docs/approvals.md`. |
| Packaged app accessibility probe | BLOCKED | The existing arm64 app launched with `open -n`. `System Events` initially exposed one window and its control tree. Subsequent native folder-picker interaction did not switch to the disposable fixture; the final `osascript` query failed with `osascript is not allowed assistive access` (-25211). No user repository document was opened or changed in this attempt. |
| T032–T035 packaged acceptance | NOT TESTED | The fixture journey, complete WKWebView timing, 25,000-entry UI timing, disconnected traffic, post-journey hashes, keyboard/VoiceOver, and 640×480/scaling checks could not be completed. Existing component, parser, and backend results remain as recorded above; no task checkbox was closed. |

Next: in an authorized visible Mac session, grant the automation process macOS Accessibility access through the normal OS controls, then select the disposable fixture and execute T032–T035. Do not infer this permission from a successful process/window query alone.

## QA continuation — display availability recheck

| Check | Result | Evidence and limit |
|---|---|---|
| Active feature and approval integrity | PASS | `check-prerequisites.sh --json --require-tasks --include-tasks` selected F001. SHA-256 of the approved spec, design, visual, and plan still matches `docs/approvals.md`. |
| Disposable fixture baseline | PASS | `node tests/fixtures/f001.mjs verify` reported unchanged SHA-256 hashes and inventories for both `workspace` and `large` under `/var/folders/q1/w_vhh3xs5xg7tzvgskbvgj440000gn/T/md-reader-f001-E1d9XU`. This is a pre-journey check, not a post-app read-only result. |
| Visible macOS session | BLOCKED | `screencapture -x /private/tmp/md-reader-acceptance-probe.png` returned `could not create image from display`. No app process was running when `System Events` was queried. The prior assistive-access denial remains unresolved; this probe alone does not retest that permission. |
| T032–T035 packaged acceptance | NOT TESTED | No fixture selection or packaged UI interaction occurred. WKWebView, 25,000-entry UI, offline traffic, keyboard/VoiceOver, and sizing results remain outstanding. No task checkbox was closed. |

Next: run T032–T035 in a visible macOS login session with Accessibility access granted to the automation process through macOS settings, then compare both fixture inventories and hashes again.

## Packaged fixture journey and render repair

Host: macOS 26.2 arm64, visible Aqua login session. The bundled `.app` was launched with `open -n`; System Events drove the native picker and app controls. Screen capture succeeded with host-level execution. No real repository document was opened.

| Check | Result | Evidence and limit |
|---|---|---|
| Initial packaged README rendering | FAIL | After selecting the disposable `workspace` folder and opening its small `README.md`, WKWebView showed “This document is too complex to render safely.” The renderer worker failure path was reached for ordinary Markdown. |
| Worker launch-mode trial | FAIL | Removing `{ type: "module" }` and rebuilding the `.app` left the same fallback. The trial was reverted. The exact worker startup failure is not yet diagnosed. |
| Bounded small-document fallback | PASS | `MarkdownView.tsx` now uses synchronous rendering only after worker failure and only for input at most 256 KiB that passes the existing shape guard. `npm test`: 19/19, including small-worker-failure recovery and large-worker-failure fallback. The rebuilt arm64 `.app` passed `codesign --verify --deep --strict`. |
| Native folder → README → local guide | PASS for this fixture | In the rebuilt app, the native picker selected the generated `workspace`; WKWebView displayed the GFM heading, task checkbox, table, code fence, local image, blocked remote image, and literal script markup. Clicking “Local guide” opened `docs/guide.md` and displayed “Destination” and “A local target.” |
| Fixture read-only check | PASS for this journey | `node tests/fixtures/f001.mjs verify` reported unchanged SHA-256 hashes and file inventories for both `workspace` and `large` after the app journey. |
| Offline, network observation, 1 MiB/25k UI timing, keyboard/VoiceOver, 640×480/scaling | NOT TESTED | This pass did not disconnect the network or run those measurements. T032–T035 remain open; the worker failure means large-document rendering needs further diagnosis before SC-001 can pass. |

Next: diagnose the packaged worker failure, then run the 1 MiB and 25,000-entry native measurements and the disconnected/accessibility checks. The small-document fallback is a scoped repair, not evidence that the larger performance target passes.

## Implementation continuation — packaged worker repair and visible acceptance

Host: same macOS 26.2 arm64 machine and disposable F001 fixture roots as above. These results supersede the earlier worker-startup failure and display-access blocker, but do not erase the earlier untested results for other scenarios.

| Check | Result | Evidence and limit |
|---|---|---|
| Worker startup cause and repair | PASS | Diagnostic packaged worker error was `ReferenceError: Can't find variable: document` in `decode-named-character-reference/index.dom.js`. `vite.config.ts` now resolves that package's standard entry for the main and Worker bundles. The packaged WKWebView rendered an ordinary 1 MiB mixed fixture after the repair. `npm run test:bundle-worker` executes the production Worker bundle without `document` or `window` globals and passes GFM, ordinary 1 MiB, and deep blockquote cases. |
| Bounded render path | PASS for tested shapes | Worker parsing has a five-second timeout, 10,000-node limit, and depth limit of 128; the main-thread preflight rejects long lines, excessive separators, and over 50,000 lines. A pathological 1 MiB mixed fixture with more than 20,000 nodes showed the recoverable complexity fallback in packaged WKWebView. A 140-deep blockquote showed `overBudget` in the bundled Worker test. This is a finite guard, not a proof for every possible Markdown input. |
| SC-001 ordinary 1 MiB mixed document | PASS, 10/10 warm runs | Fixture `/private/tmp/md-reader-f001-worker-probe/mixed-ordinary.md` was exactly 1,048,576 bytes with headings, prose, emphasis, lists and tables; the parsed tree had 7,431 nodes. A test-only packaged build measured elapsed time from completed native file read to `requestAnimationFrame` after the Markdown React tree commit: `[695, 692, 680, 684, 679, 683, 676, 680, 680, 681]` ms. All 10 were under the 1,000 ms target; an earlier first run was 717 ms. The timing UI was removed and the app was rebuilt without it. The measurement does not isolate compositor paint after that animation frame. |
| Final frontend and package | PASS | `npm test`: 19/19; `npm run build`: TypeScript and Vite PASS; `npm run test:bundle-worker`: PASS; `npm run tauri build -- --bundles app`: PASS. Ad hoc `codesign --verify --deep --strict --verbose=2` PASS. The final executable contains no `F001 render` timing text. No development server was running for the packaged UI checks. |
| 25,000-entry packaged folder | PARTIAL | The native picker selected the disposable `large` root and the packaged explorer displayed its first page of entries while the folder has 25,000 files. The page request is limited to 200 entries. No reliable UI first-paint or 10 cancellation-acknowledgement timing was captured; AX traversal of the 25,000-entry native picker was slow and interrupted. The earlier 1 ms page and ten 2 ms cancellation values are backend-only. SC-002 remains NOT TESTED at UI level. |
| 640×480 packaged window, English and Spanish | PASS for tested states | `System Events` set the packaged window to `{640, 480}` logical points. Visible screenshots of the empty state in both languages showed sidebar toggle, Open file, Open folder, language selector, explorer and welcome actions without clipping. In Spanish, `Cmd+O` opened the native file picker; choosing the disposable README rendered a tab, GFM heading, list, task checkbox and table within the small window. A second native folder-picker run selected `workspace` and exposed `README.md`, `docs`, `empty`, and `.github` in the tree. These observations do not cover all recovery actions, VoiceOver, or changed macOS display scaling, so SC-006 remains partial. |
| Fixture integrity after connected packaged runs | PASS | `node tests/fixtures/f001.mjs verify <workspace>` and `verify <large>` both reported unchanged SHA-256 hashes and file inventories after the packaged runs. This is not yet the disconnected SC-005 journey. |
| Network socket precheck | PASS, limited | `lsof -nP -i -a -p 50061` showed no internet sockets in the packaged app process before the planned disconnected journey. This snapshot cannot prove zero app requests across the full run or cover WebKit child processes. |

Open acceptance work: disconnected folder → tab → local link/image with traffic and execution observation (SC-003/SC-005), 25,000-entry UI cancellation timing (SC-002), and keyboard/VoiceOver/recovery/display-scaling coverage (SC-006). The user agreed to disconnect the Mac when prompted; the request was sent after the fixture and final build were prepared.

### Keyboard, scaling, and network-condition follow-up

| Check | Result | Evidence and limit |
|---|---|---|
| Packaged keyboard focus and tree | PASS for tested journey | `System Events` sent Tab keys to the 640×480 app and read `AXFocusedUIElement`. Focus advanced through sidebar, language, file/folder actions, Markdown filter, folder tree, tab close buttons, and tab strip. Right Arrow on `docs` expanded it; Down Arrow focused its child `README.md`; Enter opened the nested same-name file as a distinct `README.md docs` tab. Left Arrow moved tab focus to `guide.md`. |
| EN/ES error recovery by keyboard | PASS for invalid UTF-8 state | Enter on disposable `docs/invalid.md` showed Spanish `Este archivo no es UTF-8 válido` and `Reintentar`; Tab focused Retry and Enter invoked it. Switching language showed English `This file is not valid UTF-8` and `Retry`; Tab and Enter invoked that action too. A 640×480 screenshot showed the error text, Retry button, and focus ring without clipping. Other recovery states have component/native coverage but were not each traversed by keyboard in the packaged app. |
| Display scaling | PASS for current mode only | Packaged 640×480 screenshots were inspected on the built-in 2560×1664 Retina display at the Mac's current scaled desktop mode. No alternate macOS display scale was set. Actual VoiceOver speech/navigation was NOT TESTED; accessibility roles, names, and focus were inspected through System Events only. |
| Initial disconnected claim | FAIL to establish offline condition | The user reported `offline`, and `networksetup -getairportnetwork en0` said Wi-Fi was not associated, but `scutil --nwi` still reported reachable `en0` at `192.168.1.26`; a local ping to the configured gateway `192.168.1.1` succeeded. Thus this journey cannot count as SC-005 disconnected acceptance. The user asked to make disconnection the final test after other checks. |
| Packaged local-link journey during ambiguous network state | PASS for functionality and integrity; offline NOT TESTED | From the disposable `workspace` tree, the packaged app opened `README.md`, exposed `Local guide` and a blocked remote-image placeholder, then opened `docs/guide.md` and announced heading `Destination`. Scoped `lsof -nP -a -i -p 50061,50063,50064,50065` snapshots before/after showed no internet sockets for the app and its WebKit child processes. Both generated fixture inventories and SHA-256 hashes remained unchanged. Snapshots are not a continuous request capture, and gateway reachability prevents calling this an offline pass. |

Remaining open before F001 acceptance: 10 packaged UI cancellation acknowledgements for SC-002, actual VoiceOver feedback and full keyboard recovery coverage for SC-006, and the final verified network-disconnected SC-003/SC-005 journey. The user asked for the disconnect to be the last test.

### Final disconnected packaged run

| Check | Result | Evidence and limit |
|---|---|---|
| Disconnected Mac state | PASS | After the user turned Wi-Fi off, `ifconfig en0` reported `status: inactive` and `scutil --nwi` returned `No network information`. The earlier gateway-reachable attempt above is excluded from this result. |
| SC-005 packaged offline journey | PASS | With no development server running, a fresh launch of the signed arm64 `.app` used its native folder picker to select the disposable `workspace`; its tree exposed `README.md` and `docs`. Opening README showed heading `Workspace guide`, a local image element, and the blocked remote-image placeholder. Activating `Local guide` opened `docs/guide.md` and exposed heading `Destination`. No browser or runtime tool installation was involved. |
| Scoped app traffic observation | PASS for observed sockets; request-level capture NOT TESTED | During the offline README/link journey, an 80-sample `lsof -nP -a -i` poll of the app PID and its three WebKit child PIDs wrote zero socket rows. This detects open internet sockets at sample times; it cannot prove no transient attempted request. Component tests verify remote image and raw script markup do not create remote `<img>` or executable `<script>` DOM nodes; the packaged README displayed the remote placeholder. No script/native execution was observed, but a dedicated execution trace was not collected. |
| SC-004 fixture integrity | PASS | Immediately after the offline journey, `node tests/fixtures/f001.mjs verify` returned `PASS: fixture hashes and inventory unchanged` for both `workspace` and the 25,000-file `large` root. The check compares every generated file's SHA-256 digest and the full file inventory, including symlinks. |

F001 is still not fully accepted: SC-002's ten packaged UI cancellation measurements and SC-006's actual VoiceOver/full keyboard recovery checks remain NOT TESTED. The user requested that the disconnected run be the last assisted test; no further OS setting change was made.

## Folder-opening regression — 2026-09-26 to 2026-09-28

Request: “make sure specs are running properly and the app can open folders.” Host: macOS 26.2, arm64. This is a scoped regression, not a fresh independent release review.

| Check | Result | Procedure and evidence |
|---|---|---|
| UI regression, including folder selection/tree navigation | PASS | npm test: 44 tests across 11 files. Workspace cases exercise Open folder, nested files, cancellation, another selection while listing, and error recovery with mocked native IPC. |
| Frontend production build and bundled worker | PASS | npm run build and npm run test:bundle-worker completed successfully. |
| Native regression | PASS outside sandbox | With the temporary Rust toolchain on PATH, cargo test --locked: 79 passed, 4 ignored. The two FSEvents watcher tests timed out inside the sandbox but passed outside it with the same source. Native folder scope, listing, Unicode/case variants, replacement, and read-only fixture tests passed. Stderr log: /private/tmp/md-reader-folder-check-native-stderr.log. |
| Current .app build/signature | PASS | npm run tauri build -- --bundles app succeeded. Local ad hoc codesign followed by codesign --verify --deep --strict --verbose=2 passed. The initial pre-signature check failed; it is superseded by this result. |
| App launch | PASS outside sandbox | open -n of the current bundled .app returned success; a read-only process check confirmed PID 86682 executing that bundle. Sandboxed LaunchServices reported -10827 and direct execution aborted; neither reproduced when launched outside the sandbox. |
| Native picker → tree → document interaction | PASS, user observed | In the current app the user chose /private/tmp/md-reader-folder-check-9UyJql through the folder picker and reported: “the folder took a while to open but it opened, the md file is opened”. Baseline README SHA-256: a1849513599afbacc624438a43c9aca5e3db8d0859a99e9d6cf2a60a89bd8a4e. This establishes functional opening; latency was not measured. System Events automation remained BLOCKED by -25211 assistive-access denial; no OS settings were changed. |
| Active Spec Kit artifacts | BLOCKED for analysis | feature.json selected specs/006-view-local-images. check-prerequisites.sh --json --require-spec --require-tasks --include-tasks reported missing plan.md; tasks.md is also absent. F006 has a draft spec and quality checklist, not executable implementation artifacts. |

No production source change was necessary for this regression. Current folder/document opening is confirmed by the user. The reported opening delay remains unmeasured, and this functional check does not establish the broader performance/accessibility acceptance.

## Subsequent missing-work audit — 2026-09-28

The refresh worker held its mutex during idle receive/debounce, contending with native picker/watch registration. The approved F003D repair polls briefly under lock and waits outside it; idle_mutex and watch-error tests pass. A disposable 25,000-file native benchmark returns its first page in 159 ms, with ten cancellation totals [5,17,5,3,3,13,46,21,5,6] ms. Backend timing does not establish picker-to-window latency or SC-002's packaged trials.

Current aggregate regression: 143 UI and 126 native tests pass (7 native ignored entries, including separately exercised benchmark/child harness). Production build/worker and signed arm64 app startup pass; latest artifact/hash are in ../007-dark-theme/evidence.md. Folder fixture README retains its recorded hash. The user-confirmed opening journey remains valid historical evidence; the latest folder-picker UI was not re-exercised because assistive access is blocked. Existing VoiceOver/cancellation acceptance remains open.
