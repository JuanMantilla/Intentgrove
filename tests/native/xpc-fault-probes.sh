#!/bin/zsh
set -euo pipefail

repo_root="${0:A:h:h:h}"
build_root="$repo_root/target"
mkdir -p "$build_root"
run_dir="$(mktemp -d "$build_root/f006-xpc-fault-results.XXXXXX")"
probe="$run_dir/image-xpc-fault-probe"

xcrun --sdk macosx clang -fobjc-arc -mmacosx-version-min=14.0 \
  -framework Foundation -framework ImageIO \
  "$repo_root/tests/native/xpc-fault-probe.m" \
  "$repo_root/src-tauri/src/image_xpc_client.m" \
  -o "$probe"

report="$run_dir/report.txt"
: > "$report"
for scenario in valid malformed-id malformed-payload response-cap generation-mismatch \
  decoded-cap helper-limit-error encoded-cap endpoint-loss-recovery timeout-recovery; do
  result="$run_dir/$scenario.txt"
  if ! "$probe" "$scenario" "$result"; then
    print -u2 -- "$scenario FAIL probe exit: $(cat "$result" 2>/dev/null || true)"
    exit 1
  fi
  if rg -q 'FAIL' "$result"; then
    cat "$result" >> "$report"
    print -u2 -- "$scenario FAIL: $(cat "$result")"
    exit 1
  fi
  cat "$result" >> "$report"
done

shasum -a 256 "$probe" > "$run_dir/binaries.sha256"
print -r -- "PASS report=$report"
cat "$report"
cat "$run_dir/binaries.sha256"
