#!/bin/zsh
set -euo pipefail

repo_root="${0:A:h:h:h}"
cd "$repo_root"

cargo build --manifest-path src-tauri/xpc/Cargo.toml --locked --release
zsh src-tauri/diagram/build-helper.sh
npm run tauri build -- --bundles app

app="$repo_root/src-tauri/target/release/bundle/macos/Intentgrove.app"
service="$app/Contents/XPCServices/ImageDecoder.xpc"
mkdir -p "$service/Contents/MacOS"
cp src-tauri/xpc/Info.plist "$service/Contents/Info.plist"
cp src-tauri/xpc/target/release/md_reader_image_xpc "$service/Contents/MacOS/md_reader_image_xpc"
codesign --force --sign - "$service"
mkdir -p "$app/Contents/Helpers"
ditto src-tauri/target/diagram-helper/DiagramRenderer.app "$app/Contents/Helpers/DiagramRenderer.app"
codesign --force --sign - "$app"
codesign --verify --deep --strict --verbose=2 "$app"
echo "$app"
