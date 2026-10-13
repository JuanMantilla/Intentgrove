#!/bin/zsh
# Deliberately serial: do not run compiler/package work alongside jsdom suites.
set -euo pipefail
repo_root="${0:A:h:h}"
cd "$repo_root"
run_dir="${1:-qa/runs/verification-$(date -u +%Y%m%dT%H%M%SZ)}"
if [[ -e "$run_dir" ]]; then print -u2 "Refusing to overwrite an existing verification run: $run_dir"; exit 2; fi
mkdir -p "$run_dir"
run_check() {
  local name="$1"; shift
  date -u +%Y-%m-%dT%H:%M:%SZ > "$run_dir/$name.started"
  ps -axo pid,ppid,%cpu,etime,comm > "$run_dir/$name.processes"
  local result=0
  "$@" > "$run_dir/$name.log" 2>&1 || result=$?
  date -u +%Y-%m-%dT%H:%M:%SZ > "$run_dir/$name.finished"
  print "$result" > "$run_dir/$name.exit-code"
  if (( result != 0 )); then print -u2 "Failed: $name; evidence: $run_dir/$name.log"; return "$result"; fi
}
run_check frontend npm test
run_check native cargo test --manifest-path src-tauri/Cargo.toml --locked --offline --lib
run_check frontend-build npm run build
run_check worker-bundle npm run test:bundle-worker
print "Checks passed; packaging and native acceptance remain separate. Evidence: $run_dir"
