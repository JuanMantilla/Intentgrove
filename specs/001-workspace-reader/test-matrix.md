> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F001 test matrix

| Scenario | Procedure/evidence | Status |
|---|---|---|
| Nested same-name Markdown files create distinguishable tabs; reopening reuses one | `npm test`, workspace component fixture | PASS |
| GFM headings, table and display-only task checkbox | `npm test`, Markdown component fixture | PASS |
| Raw script markup and remote image do not produce executable/remote DOM elements | `npm test`, Markdown component fixture | PASS |
| In-scope relative Markdown link and local raster image | `cargo test --locked`, assets fixture | PASS |
| Traversal, encoded separator, symlink, remote URL, SVG and explicit-file adjacency | `cargo test --locked`, assets/scope fixtures | PASS |
| `.git` and dependencies hidden; `.github` and upper-case `.MARKDOWN` retained | `cargo test --locked`, scope fixture | PASS |
| Binary, invalid UTF-8, missing and >10 MiB file states | `cargo test --locked`, document fixtures | PASS |
| Failed tab recovers with Retry; Spanish error labels | `npm test`, workspace component fixture | PASS |
| Per-tab scroll restoration, keyboard Open File shortcut, cancellation control and filtered empty state | `npm test`, workspace component fixture | PASS |
| 25k-entry first page and cancellation backend timing | Explicit ignored benchmark, values in `verification.md` | PASS at backend |
| Permission-denied, nonregular, atomic replacement, Unicode name and upper-case extension | `cargo test --locked`, document fixture | PASS |
| Case-variant collisions on a case-sensitive volume | No disposable case-sensitive volume in host session | NOT TESTED |
| Anchors and keyboard-only native navigation | No visible display in host session | NOT TESTED |
| Empty and Markdown-free directory native states | No visible display in host session | NOT TESTED |
| Native folder dialog and installed-app WebKit rendering of the disposable README and local guide | System Events picker/controls and visible packaged window; GFM, local image, blocked remote image, inert HTML, local link observed | PASS for tested fixture |
| Packaged fixture hashes and inventory after reading | `node tests/fixtures/f001.mjs verify` for both generated roots after folder → README → local guide | PASS for tested journey |
| Disconnected packaged journey and app network requests | Network remained connected; app traffic was not observed | NOT TESTED |
| VoiceOver, 640×480 window and display scaling | No visible display in host session | NOT TESTED |
| 1 MiB Markdown warm-load target, 9/10 WebKit runs | No visible display in host session | NOT TESTED |
| Packaged worker startup on ordinary Markdown | Initial and classic-worker trial both showed render fallback; bounded small-document fallback now renders fixture | FAIL in worker path; small fallback PASS |
| T032–T035 packaged acceptance continuation | Visible session now works; native fixture journey partly executed. Large-document, 25k UI, offline, keyboard/VoiceOver and scaling checks remain | PARTIAL; open tasks |
| Final production Worker without DOM globals | `npm run test:bundle-worker`; packaged 1 MiB fixture rendered after Vite resolution repair | PASS |
| 1 MiB ordinary mixed Markdown, read-to-React-frame in WKWebView | Ten packaged warm runs: 676–695 ms; details in `verification.md` | PASS 10/10 for SC-001 |
| Pathological 1 MiB Markdown and deep nesting | Packaged complexity fallback; bundled Worker depth case | PASS for tested shapes |
| 25k-entry packaged tree first page | Native picker selected fixture; app showed first page without loading all entries | PASS for first-page display; UI cancellation NOT TESTED |
| English/Spanish empty shell at 640×480 | Packaged screenshots and Accessibility selector; essential empty-state controls visible | PASS for tested state |
| Spanish keyboard Open File at 640×480 | Cmd+O, native picker, disposable README rendered with tab and GFM | PASS for tested path; full SC-006 NOT TESTED |
| Packaged keyboard tree and tab navigation | Tab focus order; Right expands docs, Down reaches child, Enter opens nested README, Left moves tab focus | PASS for tested path |
| English and Spanish invalid UTF-8 Retry by keyboard | Packaged 640×480 error states; Tab focused Retry/Reintentar; Enter invoked action | PASS for tested recovery; other recovery states NOT TESTED |
| Current Retina display scale at 640×480 | Built-in 2560×1664 Retina display; visible empty, document, and error screenshots | PASS for current scale; alternate scale NOT TESTED |
| Actual VoiceOver speech/navigation | Accessibility element labels and focus inspected, VoiceOver itself not operated | NOT TESTED |
| Disconnected folder → tab → link | Functional journey and hashes PASS, but en0 gateway ping succeeded during purported offline run | NOT TESTED as disconnected; final run pending |
| Final disconnected fresh packaged journey | `en0` inactive and no network state; folder picker → README tab → local guide heading; no dev server | PASS for SC-005 |
| Offline fixture SHA-256 and inventory | `node tests/fixtures/f001.mjs verify` on both generated roots immediately after journey | PASS for SC-004 |
| Scoped offline app/WebKit socket sampling | 80 `lsof -a -i` samples across app and three WebKit PIDs; zero socket rows | PASS for observed sockets; transient request trace NOT TESTED |

All fixtures are under temporary directories. The generated acceptance roots are retained for the remaining checks. No real user repository document was opened in the tests.
