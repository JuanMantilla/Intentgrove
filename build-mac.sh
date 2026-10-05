#!/bin/zsh
# Build a native, locally signed app and DMG next to this script.
set -euo pipefail

repo_root="${0:A:h}"
cd "$repo_root"

if (( $# != 0 )); then
  echo "Usage: ./build-mac.sh (no arguments)" >&2
  exit 2
fi
if [[ "$(uname -s)" != Darwin ]]; then
  echo "This build requires macOS." >&2
  exit 1
fi
for tool in node npm cargo rustc xcrun codesign hdiutil ditto shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing prerequisite: $tool. Install Node.js, Rust, and Xcode Command Line Tools before building." >&2
    exit 1
  fi
done
xcrun --find clang >/dev/null
xcrun --show-sdk-path >/dev/null

# Existing packaging scripts use native builds at these default target paths.
unset CARGO_TARGET_DIR CARGO_BUILD_TARGET

echo "Building on macOS $(sw_vers -productVersion) ($(uname -m))"
node --version
npm --version
rustc --version
cargo --version

# Include build tools even when the caller has NODE_ENV=production.
npm ci --include=dev --no-audit --no-fund
npm run build:mac:dmg

source_app="$repo_root/src-tauri/target/release/bundle/macos/Intentgrove.app"
source_dmg="$repo_root/src-tauri/target/release/bundle/dmg/Intentgrove-local.dmg"
output_app="$repo_root/Intentgrove.app"
output_dmg="$repo_root/Intentgrove-local.dmg"
staging="$(mktemp -d "$repo_root/.mac-build.XXXXXX")"
trap 'rm -rf "$staging"' EXIT

ditto "$source_app" "$staging/Intentgrove.app"
cp "$source_dmg" "$staging/Intentgrove-local.dmg"
codesign --verify --deep --strict "$staging/Intentgrove.app"
hdiutil verify "$staging/Intentgrove-local.dmg"

# Replace only the named generated artifacts; stage first to preserve the last
# successful root outputs if compilation, packaging, or verification fails.
rm -rf "$output_app"
mv "$staging/Intentgrove.app" "$output_app"
mv -f "$staging/Intentgrove-local.dmg" "$output_dmg"
(cd "$repo_root" && shasum -a 256 "Intentgrove-local.dmg" > "Intentgrove-local.dmg.sha256")

printf '\nCreated:\n  %s\n  %s\n  %s\n' "$output_app" "$output_dmg" "$output_dmg.sha256"
echo "Native architecture, ad hoc signed for local use; not notarized."
