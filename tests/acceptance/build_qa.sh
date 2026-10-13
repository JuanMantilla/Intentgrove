#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# Caller supplies the installed Rust toolchain on PATH; no downloads/installation.
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$PWD/target/qa-native}"
npx tauri build --features acceptance-harness \
  --config tests/acceptance/qa/tauri.conf.json --bundles app -- --locked --offline --no-default-features

# Private local delivery only: ad-hoc signing, no identity purchase/notarization.
codesign --force --deep --sign - "$CARGO_TARGET_DIR/release/bundle/macos/Intentgrove QA.app"
codesign --verify --deep --strict "$CARGO_TARGET_DIR/release/bundle/macos/Intentgrove QA.app"
python3 -B tests/acceptance/check_build_boundary.py qa target/qa-dist \
  "$CARGO_TARGET_DIR/release/bundle/macos/Intentgrove QA.app/Contents/MacOS/md_reader"
