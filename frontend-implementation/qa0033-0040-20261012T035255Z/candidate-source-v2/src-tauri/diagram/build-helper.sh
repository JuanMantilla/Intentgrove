#!/bin/zsh
set -euo pipefail
repo_root="${0:A:h:h:h}"
cd "$repo_root"
output="${1:-$repo_root/src-tauri/target/diagram-helper/DiagramRenderer.app}"
mkdir -p "$output/Contents/MacOS" "$output/Contents/Resources"
cargo build --manifest-path src-tauri/xpc/Cargo.toml --locked --release --lib
node_modules/.bin/rolldown src-tauri/diagram/reader.js --format iife --file "$output/Contents/Resources/reader.bundle.js"
cp src-tauri/diagram/index.html "$output/Contents/Resources/index.html"
cp src-tauri/diagram/Info.plist "$output/Contents/Info.plist"
cp public/licenses/MERMAID-DEPENDENCIES.txt "$output/Contents/Resources/THIRD-PARTY-NOTICES.txt"
xcrun clang -fobjc-arc -fblocks -mmacosx-version-min=14.0 -framework Cocoa -framework WebKit -framework ImageIO -framework CoreGraphics src-tauri/diagram/renderer.m src-tauri/xpc/target/release/libmd_reader_raster.a -o "$output/Contents/MacOS/DiagramRenderer"
codesign --force --sign - --entitlements src-tauri/diagram/entitlements.plist "$output"
codesign --verify --strict --verbose=2 "$output"
