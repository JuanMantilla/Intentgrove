# Executed checks

Host macOS27.0.1/arm64, SDK27.0, Apple clang21.0.0, Cargo/Rust1.88.0. Commands ran at repository root; evidence logs identify mocked scope and residual checks.

- `SPECIFY_FEATURE_DIRECTORY=specs/012-macos-delivery SPECIFY_FEATURE_NO_PERSIST=1 .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
- `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked --lib` — PASS
- `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked` — FAIL, existing integration harness imports
- `npm test` — PASS
- `npm run build` — PASS
- `node tests/worker-bundle.mjs` — PASS
- `npm run build:mac` — PASS; final source rebuilt after fixes
- `xcrun clang -fobjc-arc -fblocks -mmacosx-version-min=14.0 -Wall -Wextra -Werror tests/native/default-markdown.m -framework Cocoa -framework UniformTypeIdentifiers -o /private/tmp/ig-default-markdown-tests`
- `/private/tmp/ig-default-markdown-tests` — PASS, mocks only
- `/private/tmp/ig-default-markdown-tests --snapshot` — read-only unresolved before/after snapshots; not actual consent proof
- `python3 -B scripts/tests/test_set_default_markdown.py` — PASS, fake disposable bundle/executable
- `bash -n scripts/set-default-markdown.sh` — PASS
- `xcrun clang -fobjc-arc -fblocks -mmacosx-version-min=14.0 -Wall -Wextra -Werror -c src-tauri/src/default_markdown.m -o /private/tmp/ig-default-markdown-final.o` — PASS
- `codesign --verify --deep --strict src-tauri/target/release/bundle/macos/Intentgrove.app` — PASS
- Actual packaged CLI/script were executed only with `INTENTGROVE_DISABLE_DEFAULT_MARKDOWN=1`: exact flag and flag+extra argument both exit4, script exit4. No native preferences/workspace initialization or real association requests in these paths.
- `git diff --check` — PASS

No actual Markdown consent or setter action was executed. OS handler snapshots remain unresolved in this execution environment; equal snapshots alone are not proof of actual defaults.
