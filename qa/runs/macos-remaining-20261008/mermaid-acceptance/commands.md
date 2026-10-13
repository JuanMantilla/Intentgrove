# Executed commands and evidence

Working directory: `/Users/juanmantilla/projects/personal/md-reader`. Builds and runs use only local private ad-hoc signing and disposable data. Do not use the QA app as production-ID acceptance.

```sh
zsh tests/acceptance/diagram/build-diagnostic.sh
cargo test --lib --manifest-path src-tauri/Cargo.toml --locked --no-run --message-format=json
python3 tests/acceptance/diagram/run-parent.py
CARGO_PROFILE_RELEASE_STRIP=false bash tests/acceptance/build_qa.sh
python3 tests/acceptance/diagram/run-webview.py
npm run build:mac
npm test -- tests/ui/diagram-host.test.ts tests/ui/diagram-block.test.tsx
npm test
cargo test --lib --manifest-path src-tauri/Cargo.toml --locked
npm run build
npm run test:bundle-worker
python3 tests/acceptance/diagram/audit-locks.py
npm audit --json
npm audit --omit=dev --json
npm audit signatures --json
npm ls --all --json
npm ls source-map-js mermaid katex --all --json
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i glib
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i proc-macro-error
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i unic-char-property
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i unic-char-range
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i unic-common
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i unic-ucd-ident
cargo tree --manifest-path src-tauri/Cargo.toml --locked --target aarch64-apple-darwin -i unic-ucd-version
codesign --verify --deep --strict src-tauri/target/release/bundle/macos/Intentgrove.app
python3 tests/acceptance/check_build_boundary.py production dist src-tauri/target/release/bundle/macos/Intentgrove.app/Contents/MacOS/md_reader
python3 tests/acceptance/diagram/summarize.py
```

Output redirection selects the retained attempt log; final frontend run is `frontend-full-after-fix-idle.log`, production `build-production-attempt-03.log`, QA `build-webview-attempt-10.log`, WebView `webview-attempt-06.log`, real parent `parent-attempt-09.log`. The parent runner records its exact executable, fixed test arguments, explicit task environment and helper hashes in parent-command.json. Test executable is discovered from test-build.jsonl. The WebView runner records actual app hash/PID/private directory in webview-run.json; authenticated pipe/socket setup and its command are in run-webview.py. No authentication secret is emitted in reports.

The read-only audit queries OSV `/v1/querybatch` and advisory detail endpoints, and downloads tarballs to verify lock integrity without installation or lifecycle scripts. Source scripts retain exact URLs/algorithms. Build scripts retain compiler flags, entitlements and ad-hoc packaging steps. Environment/signature/architecture and production provenance are separately saved. Historical failed commands and outputs remain in numbered attempt logs; the broad `cargo test` preexisting refresh integration compile failure is not hidden by the scoped `--lib` command.
