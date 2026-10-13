# Mermaid process and WebView acceptance

These tests use macOS arm64, disposable files and private ad-hoc packages. They do not install, notarize, publish, alter OS protections or access the production profile.

The production `execute`, reply validator, `render_diagram`/`cancel_diagram`, pixel decoder, Markdown reader, DiagramBlock and diagram queue remain the systems under test. The library test executable must be placed in a test app with the real XPC service; running it bare cannot discover that service and correctly returns `image_unavailable`.

`build-diagnostic.sh` compiles an additional helper with `INTENTGROVE_DIAGNOSTICS`. It retains the production entitlements and CSP. Its bundle transform fails closed if the exact Mermaid parser/renderer anchors drift. Phase events occur inside the actual Mermaid parser after lexer input installation, and inside the real flowchart renderer after layout-data creation. `busy-parse` and `busy-render` deliberately stall there; label these as fault-injected deadline tests. Ordinary executing cancellation uses `observe`, with no busy loop. Resources/native file/socket/bridge/navigation tests intentionally attempt prohibited operations and record refusals. They are separate from the zero-document-network-attempt interval.

The authenticated QA bootstrap selects `diagram-acceptance`. Its extra command exists only under `acceptance-harness`, only for main, and only in that authenticated mode. It admits 20 fixed task-owned fixture filenames; it exposes no general script, file or process runner. Parent snapshots retain every child within each bounded stage. Malicious reply modes mutate real child output; held/forged renderer transport cases start with actual successfully decoded native output. None fabricate successful rendering.

Run from the repository root, preserving logs and attempt results:

```sh
zsh tests/acceptance/diagram/build-diagnostic.sh
cargo test --lib --manifest-path src-tauri/Cargo.toml --locked --no-run --message-format=json > qa/runs/macos-remaining-20261008/mermaid-acceptance/test-build.jsonl
python3 tests/acceptance/diagram/run-parent.py
CARGO_PROFILE_RELEASE_STRIP=false bash tests/acceptance/build_qa.sh
python3 tests/acceptance/diagram/run-webview.py
python3 tests/acceptance/diagram/audit-locks.py
npm audit --json
npm audit --omit=dev --json
npm audit signatures --json
```

`run-webview.py` copies the current production helper and XPC unchanged, adds the diagnostic helper separately, verifies signatures, launches with a private inherited-pipe/socket bootstrap, observes ownership, verifies source hashes and saves the native report. It allows a bounded automatic run and does not kill arbitrary processes. A failing run must remain FAIL; inspect its retained private host log and results before correction. Production runtime claims need explicit package mapping and separate default-feature checks; instrumented QA is never the production-ID runtime.

Production excludes the diagnostic header, mode/environment handling, native command and WebView test entry. `build.rs` and `check_build_boundary.py` reject diagnostic markers in production assets/binary. Check the nested helper resources/binary and entitlements separately as recorded in the continuation report.

The final full WebView run uses diagnostic variant A. Later diagnostic variant B adds explicit font/form/download positive controls and is independently tested through the real parent; exact distinct hashes are recorded in the report. Parent tests also cancel actual stalled parser and renderer execution, separately from ordinary non-stalled cancellation and two-second watchdog tests. Cancellation may race the child's exit-status observation: either diagram_cancelled or diagram_rejected is permitted only with cancellation set, no successful pixels, bounded completion, reaping and empty ownership. Saved results retain the actual error code.

Regression PNGs come from actual production helper/XPC output. The consumer validates full bounded chunks and CRCs; held/forged transport tests modify those real pixels, including one-byte truncation. See qa/findings/QA-0014.md.
