# Phase 3 verification unblock

This run independently reproduces the pre-Phase-3 strict Clippy diagnostics and resolves them through separately scoped maintenance. Phase 4/playback is outside scope.

Primary evidence:
- report.md — final verification and resulting QA state (written after checks finish).
- environment.json and baseline-command.json — toolchain, host, command, feature/package selection and environment.
- baseline-provenance.json, recovered-originals.json, baseline-inputs.json — original source hashes and recovery of the exact historical lockfile/tests.
- baseline-repeat-commands.json — identical-command/environment executions in isolated pre-Phase-3 and frozen Phase-3 checkouts.
- baseline.jsonl / current-before.jsonl and baseline-repeat.jsonl / current-before-repeat.jsonl — unfiltered raw diagnostics, with separate stderr files.
- comparison.json, repeat-comparison.json, diagnostics.diff, compare.py — exact diagnostic multiset comparison and unchanged-source line mapping.
- diagnostic-inventory.json / diagnostic-inventory.md — all 54 emissions; category A=19, B=35, C=0.
- policy-evidence.md / policy-search.txt — no approved native lint-baseline exception mechanism.
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/strict-clippy-baseline-cleanup/ — separate maintenance plan, 16-file delta, hashes and intermediate results.
- tested-snapshot-v3.json — pre-check canonical input baseline; final regression candidate and its input hashes isolate mutable frontend/fixture inputs.
- check-results-v3.json — final command results and timestamps.

The historical baseline is a dirty source snapshot atop Git HEAD 7e00d3316ce46563cafb46ba928498fcb0d82880, not a clean revision containing the intervening work. No current-tree checkout/reset/stash was used. Source copies and hash-verified older QA artifacts provide isolation. Original baseline preparation failures and earlier test failures remain available; none is relabeled PASS.

Retain this evidence, both isolated source captures, the initial-source preservation copy and all raw logs. No artifact deletion or cleanup worker is authorized by this run.
