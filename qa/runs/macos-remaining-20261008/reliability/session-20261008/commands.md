# Reproduction commands

Working directory: `/Users/juanmantilla/projects/personal/md-reader`. Exact test/compiler commands, environments, PIDs and sampled resources are also stored in `*-processes.json`; generated source hashes are in the generated manifests. No testTimeout changes.

```sh
python3 tests/diagnostics/reliability/generate.py
INTENTGROVE_TRACE="$PWD/qa/runs/macos-remaining-20261008/reliability/session-20261008/focused" node_modules/.bin/vitest run --config tests/diagnostics/reliability/vitest.config.ts
INTENTGROVE_TRACE="$PWD/qa/runs/macos-remaining-20261008/reliability/session-20261008/isolated" node_modules/.bin/vitest run --config tests/diagnostics/reliability/vitest.config.ts -t 'cancels Save As without clearing the original dirty state|quit: Cancel'
INTENTGROVE_HOLD_EDIT=1 INTENTGROVE_TRACE="$PWD/qa/runs/macos-remaining-20261008/reliability/session-20261008/held-adapter" node_modules/.bin/vitest run --config tests/diagnostics/reliability/vitest.config.ts -t 'cancels Save As without clearing the original dirty state|quit: Cancel'
python3 tests/diagnostics/reliability/run.py eight-worker-attempt-01 --workers 8 --full
python3 tests/diagnostics/reliability/run.py concurrent-attempt-01 --workers 8 --full --compile
node_modules/.bin/vitest run tests/ui/listener-cleanup.test.tsx
node_modules/.bin/vitest run tests/ui/settings-owner-lifecycle.test.tsx
node_modules/.bin/vitest run tests/ui/workspace-handoff.test.tsx tests/ui/close-edit.test.tsx tests/ui/listener-cleanup.test.tsx tests/ui/settings-owner-lifecycle.test.tsx tests/ui/qa-bootstrap.test.ts tests/ui/qa-snapshot.test.ts
npm test
npm run build:mac
npm run test:bundle-worker
python3 tests/acceptance/check_build_boundary.py production dist 'src-tauri/target/release/bundle/macos/Intentgrove.app/Contents/MacOS/md_reader'
codesign --verify --deep --strict 'src-tauri/target/release/bundle/macos/Intentgrove.app'
VITE_QA_SETTINGS_ACCEPTANCE=1 CARGO_PROFILE_RELEASE_STRIP=false bash tests/acceptance/build_qa.sh
python3 tests/acceptance/settings/run.py settings-runtime-attempt-04
python3 tests/diagnostics/reliability/summarize.py
```

Historical labels intentionally refuse overwrite; use a new unique label for a retest. Baseline lifecycle regressions were run before the corresponding product fix and failed as recorded; do not undo product code to reproduce them in the shared dirty tree. Held-adapter control intentionally fails; it is not expected product behavior. The first eight-worker run overlapped QA packaging and cannot serve as an idle baseline. Canonical idle run occurred after all native compilation and Settings probes completed. Native Settings commands require the exact QA opt-in build; selecting it and pressing Command-comma uses native CUA, not production state or automation privileges. No commits, publishing or installation.
