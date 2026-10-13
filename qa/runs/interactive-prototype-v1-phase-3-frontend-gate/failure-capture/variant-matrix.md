# Selection-readiness variant matrix

Plan: two runs per available uninstrumented A/B/C/D combination; the table below includes completed runs only. First run uses an identical preserved result-cache seed; second uses that candidate’s own resulting warm cache. Runs are sequential within this investigation. External host work is uncontrolled. These frequencies are descriptive and cannot establish causation.

| Variant | Source | App SHA-256 | New test SHA-256 |
|---|---|---|---|
| A | Historical Phase 3 frontend | 01c46e3233d16c41f7e6e5515fe09b6fc538671a7e78771ef0d2d63842448940 | absent |
| B | Historical + current App patch only | b037e12f17f976592fddc9d8f7c21e270be4423c3739da6c39ccb78ff15a0c29 | absent |
| C | Historical + added readiness test only | 01c46e3233d16c41f7e6e5515fe09b6fc538671a7e78771ef0d2d63842448940 | 515e607b0e21cba9e62d288b495a9e81c21074e2c694443c6bd479e1f2284a26 |
| D | Historical + both; equals current frontend at entry | b037e12f17f976592fddc9d8f7c21e270be4423c3739da6c39ccb78ff15a0c29 | 515e607b0e21cba9e62d288b495a9e81c21074e2c694443c6bd479e1f2284a26 |

| Run | Passed/total | Failed | Workspace-handoff failed |
|---|---:|---:|---:|
| D-seeded-1 | 712/712 | 0 | 0 |
| recorder-seeded-1 | 711/712 | 1 | 1 |
| A-seeded-1 | 711/711 | 0 | 0 |
| B-seeded-1 | 711/711 | 0 | 0 |
| C-seeded-1 | 710/712 | 2 | 0 |
| D-warm-2 | 712/712 | 0 | 0 |
| A-warm-2 | 711/711 | 0 | 0 |
| B-warm-2 | 711/711 | 0 | 0 |
| C-warm-2 | 711/712 | 1 | 0 |
| profile-seeded-1 | 712/712 | 0 | 0 |
| recorder-warm-2 | 712/712 | 0 | 0 |
| D-fresh-3 | 712/712 | 0 | 0 |
| D-failing-order-replay | 711/712 | 1 | 0 |
| current-late-seeded-1 | 713/713 | 0 | 0 |

The C-only test deliberately exercises behavior implemented by the excluded App patch. Its own failure is a patch-dependency result, distinct from incidental workspace-handoff or deadline failures. No test is skipped or weakened in this combination.

Exact paths, hashes and patch provenance are retained in /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/variant-provenance.json, /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/selection-readiness-app.patch, and /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/selection-readiness-test.tsx. Each run has its exact command, cwd, timestamps, raw JSON result, stdout/stderr, actual file order, and before/after private cache.
