#!/bin/bash
# 0 verified, 2 declined, 3 partial/error/unverified, 4 invalid/unavailable.
set -euo pipefail
if [[ $# -gt 1 ]]; then echo 'Usage: set-default-markdown.sh [path-to-Intentgrove.app]' >&2; exit 4; fi
app=${1:-/Applications/Intentgrove.app}
[[ "$app" = /* ]] || app="$PWD/$app"
plist="$app/Contents/Info.plist"
if [[ ! -d "$app" || "$app" != *.app || ! -f "$plist" ]]; then echo 'Expected an Intentgrove.app bundle.' >&2; exit 4; fi
id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist") || exit 4
executable=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$plist") || exit 4
enabled=$(/usr/libexec/PlistBuddy -c 'Print :IGMarkdownDefaultConsent' "$plist") || exit 4
if [[ "$id" != com.juanmantilla.markdownworkspace || "$enabled" != true || -z "$executable" || "$executable" = */* || "$executable" = . || "$executable" = .. || -L "$app/Contents/MacOS/$executable" || ! -f "$app/Contents/MacOS/$executable" || ! -x "$app/Contents/MacOS/$executable" ]]; then
  echo 'Bundle is not eligible for Intentgrove Markdown consent.' >&2; exit 4
fi
exec "$app/Contents/MacOS/$executable" --request-default-markdown
