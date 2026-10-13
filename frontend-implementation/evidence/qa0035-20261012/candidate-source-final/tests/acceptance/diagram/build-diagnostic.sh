#!/bin/zsh
set -euo pipefail
cd "${0:A:h:h:h:h}"
output="$PWD/src-tauri/target/diagram-diagnostic/DiagramRenderer.app"
mkdir -p "$output/Contents/MacOS" "$output/Contents/Resources"
node tests/acceptance/diagram/build-diagnostic.mjs
cp src-tauri/diagram/{index.html,Info.plist} "$output/Contents/Resources/"
mv "$output/Contents/Resources/Info.plist" "$output/Contents/Info.plist"
xcrun clang -DINTENTGROVE_DIAGNOSTICS -fobjc-arc -fblocks -mmacosx-version-min=14.0 -framework Cocoa -framework WebKit -framework ImageIO -framework CoreGraphics src-tauri/diagram/renderer.m src-tauri/xpc/target/release/libmd_reader_raster.a -o "$output/Contents/MacOS/DiagramRenderer"
codesign --force --sign - --entitlements src-tauri/diagram/entitlements.plist "$output"
codesign --verify --strict "$output"
