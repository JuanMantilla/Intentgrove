# Verification summary

Completed 2026-10-12T05:12:44.865394+00:00.

| Check | Result |
|---|---|
| Historical exact-command rerun 1 | PASS — 711/711 |
| Historical isolated close-edit | PASS — 27/27 |
| Historical exact-command rerun 2 | PASS — 711/711 |
| Historical predecessors replay | PASS — 56/56; failure not reproduced |
| Current isolated close-edit | PASS — 27/27 |
| Current isolated workspace-handoff | PASS — 24/24 |
| Current prefix diagnostic | PASS — 51/51 |
| Current prefix diagnostic with native overlap | PASS — 51/51 |
| Complete instrumented diagnostic | 712/712 PASS; observational copy, not a repair |
| Current complete frontend | FAIL — 707/712; five workspace-handoff failures |
| Prototype-specific frontend | PASS — 33/33 within current full run |
| Markdown regression | FAIL — full-suite workspace-handoff setup/deadline failures |
| Phase 1 | PASS — 86 model tests within workspace |
| Phase 2 | PASS — 332 workspace tests |
| Phase 3 native | PASS — 184 tests; five existing ignored |
| Native IPC contract | PASS — 1 additional test |
| Whole-app strict Clippy | PASS — exit 0; 0 compiler-message diagnostics |
| TypeScript / Vite / native compilation | PASS |
| Workspace Clippy / formatting / dependency boundaries | PASS |
| Scoped source integrity | PASS — 398 paths, no byte/stat drift |
| Causal diagnosis and regression repair | BLOCKED — no demonstrated contaminator or correct fix |

Exact current command set and timestamps: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/check-results-current.json. Historical commands: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/reproduction-commands.json. Prefix commands: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/predecessor-replay-command.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/diagnostic-prefix-command.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/diagnostic-overlap-command.json. All tests use unchanged deadlines/assertions. Diagnostic runs are supplemental, not replacements for the failing full suite.
