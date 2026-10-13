#!/bin/zsh
set -euo pipefail

repo_root="${0:A:h:h:h}"
app="$repo_root/src-tauri/target/release/bundle/macos/Intentgrove.app"
dmg="$repo_root/src-tauri/target/release/bundle/dmg/Intentgrove-local.dmg"
staging="$(mktemp -d /private/tmp/md-reader-dmg.XXXXXX)"
trap 'rm -rf "$staging"' EXIT

codesign --verify --deep --strict "$app"
ditto "$app" "$staging/Intentgrove.app"
ln -s /Applications "$staging/Applications"
mkdir -p "${dmg:h}"
hdiutil create -volname "Intentgrove" -srcfolder "$staging" -format UDZO -ov "$dmg"
shasum -a 256 "$dmg"
