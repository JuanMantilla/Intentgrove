#!/bin/zsh
set -euo pipefail

probe_app="${1:A}"
fixtures="${2:A}"
report="$3"
: > "$report"

for extension in svg png jpeg gif webp bmp tiff heic; do
  source_file="$fixtures/sample.$extension"
  result_file="$(mktemp "${TMPDIR:-/tmp}/md-reader-probe-$extension.XXXXXX")"
  rm -f "$result_file"
  expected="$extension"
  if [[ "$extension" == "heic" ]]; then expected="heif"; fi
  before="$(shasum -a 256 "$source_file" | cut -d' ' -f1)"
  if launch_output="$(open -n "$probe_app" --args "$source_file" "$expected" "$result_file" 2>&1)"; then
    :
  else
    print -u2 -- "$extension FAIL launch: $launch_output"
    exit 1
  fi
  for attempt in {1..100}; do
    [[ -f "$result_file" ]] && break
    sleep 0.1
  done
  if [[ ! -f "$result_file" ]]; then
    print -u2 -- "$extension FAIL timeout waiting for decoder result: $launch_output"
    exit 1
  fi
  result="$(cat "$result_file")"
  rm -f "$result_file"
  after="$(shasum -a 256 "$source_file" | cut -d' ' -f1)"
  if [[ "$before" != "$after" ]]; then
    print -u2 -- "$extension FAIL source changed: $before -> $after"
    exit 1
  fi
  if [[ "$result" != status=0\ format=$expected\ * ]]; then
    print -u2 -- "$extension FAIL decoder: $result"
    exit 1
  fi
  print -r -- "$extension PASS sha256=$after $result" >> "$report"
done
