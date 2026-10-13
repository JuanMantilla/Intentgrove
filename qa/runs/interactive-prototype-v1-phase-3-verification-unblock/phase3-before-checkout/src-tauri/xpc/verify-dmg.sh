#!/bin/zsh
set -euo pipefail

repo_root="${0:A:h:h:h}"
dmg="$repo_root/src-tauri/target/release/bundle/dmg/Intentgrove-local.dmg"
original="$repo_root/src-tauri/target/release/bundle/macos/Intentgrove.app"
mount="$(mktemp -d /private/tmp/md-reader-image-mount.XXXXXX)"
trap 'hdiutil detach "$mount" >/dev/null 2>&1 || true; rmdir "$mount" >/dev/null 2>&1 || true' EXIT

hdiutil attach -readonly -nobrowse -mountpoint "$mount" "$dmg"
app="$mount/Intentgrove.app"
codesign --verify --deep --strict --verbose=2 "$app"
[[ -L "$mount/Applications" ]]
for relative in Contents/MacOS/md_reader Contents/XPCServices/ImageDecoder.xpc/Contents/MacOS/md_reader_image_xpc; do
  from="$(shasum -a 256 "$original/$relative" | cut -d' ' -f1)"
  inside="$(shasum -a 256 "$app/$relative" | cut -d' ' -f1)"
  [[ "$from" == "$inside" ]]
  print -r -- "$relative $inside"
done
