#!/bin/zsh
set -euo pipefail

probe_app="$1"
fixtures="$2"
report="$3"
: > "$report"

for scenario in mismatch unsafe raster_tile svg_tile timing; do
  case "$scenario" in
    mismatch) source_file="$fixtures/sample.jpeg"; claim="png"; expected="status=2*error=mismatch" ;;
    unsafe) source_file="$fixtures/unsafe.svg"; claim="svg"; expected="status=2*error=unsafe_or_corrupt" ;;
    raster_tile) source_file="$fixtures/large40mp.png"; claim="tile:png:1024:0"; expected="status=0*width=1024*height=1024*" ;;
    svg_tile) source_file="$fixtures/quadrants.svg"; claim="tile:svg:1024:0"; expected="status=0*width=1024*height=1024*" ;;
    timing) source_file="$fixtures/large40mp.png"; claim="png"; expected="completed=20*total=20*" ;;
  esac
  result_file="$fixtures/contract-$scenario.txt"
  before="$(shasum -a 256 "$source_file" | cut -d' ' -f1)"
  rm -f "$result_file"
  if [[ "$scenario" == timing ]]; then
    open -W -a "$probe_app" --args "$source_file" "$claim" "$result_file" --bench20 >/dev/null 2>&1
  else
    open -W -a "$probe_app" --args "$source_file" "$claim" "$result_file" >/dev/null 2>&1
  fi
  result="$(cat "$result_file")"
  after="$(shasum -a 256 "$source_file" | cut -d' ' -f1)"
  [[ "$before" == "$after" ]]
  [[ "$result" == ${~expected} ]]
  print -r -- "$scenario PASS sha256=$after $result" >> "$report"
done
