#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
repo=/Users/juanmantilla/projects/personal/md-reader
app="$PWD/DiagramRenderer.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
"$repo/node_modules/.bin/rolldown" reader.js --format iife --file "$app/Contents/Resources/reader.bundle.js"
cp index.html "$app/Contents/Resources/index.html"
cp Info.plist "$app/Contents/Info.plist"
xcrun clang -fobjc-arc -fblocks -mmacosx-version-min=14.0 -framework Cocoa -framework WebKit renderer.m -o "$app/Contents/MacOS/DiagramRenderer"
codesign --force --sign - --entitlements entitlements.plist "$app"
codesign --verify --strict --verbose=2 "$app"
