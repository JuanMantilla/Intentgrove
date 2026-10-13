# Interactive Prototype V1 Phase 3 — frontend verification gate

2026-10-12T05:09:19.912021+00:00. **FAIL / QA_FAILED / BLOCKED. Phase 3 implementation remains PARTIAL pending verification.** This investigation has not resolved the gate. No corrective application/test patch or acceptance is claimed.

## Reproduction and classification
Node v20.19.6; Vitest 4.1.11; macOS arm64; no NODE_ENV/NODE_OPTIONS/CI/TZ/VITEST overrides in exact-command reproductions. Full PATH and environment: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/environment.json. Original command arguments and cwd were replayed exactly except for output artifact destinations:

```text
node /Users/juanmantilla/projects/personal/md-reader/node_modules/vitest/vitest.mjs run --dir tests/ui --maxWorkers 1 --reporter=json --outputFile=<recorded absolute evidence file>
```

The historical candidate passed 711/711 twice, and close-edit passed 27/27 alone. Historical file order differs from current cache-derived order; explicit replay of workspace-handoff → refresh-conflict → close-edit passed 56/56. The original `window: Save to file` error did not recur. The missing label is the editable Markdown heading before editor mounting or Save, not the editor itself.

The current complete run failed **707/712**, with five workspace-handoff failures. Four cannot find the editable section button during setup; the first has a runner stack-trace/deadline signature at 5619.9 ms. Close-edit passes 27/27 in that run. Isolated current suites pass 27/27 and 24/24. Tracing the exact current prefix close-edit → workspace-handoff passes 51/51, including a controlled overlap with native verification. Successful traced cleanups leave no editor DOM or mock-native listeners. No failed-state trace identifies a leaked owner.

**Classification: OTHER — nondeterministic frontend verification failure, cause unresolved.** A Phase 3 defect, pre-existing leak, concurrent-change cause, or compiler-contention cause cannot be asserted. No minimal reproducer is established. No speculative production/test fix, arbitrary timeout/retry, broad reset, assertion removal, test skip or permanent ordering change was made.

The current total is 712 because unrelated concurrent work already added one selection-readiness test at task start. Its App change and test are preserved; they are excluded from historical reproduction and included in current verification. Source provenance and scope expansion are explicit in /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/changed-files.md. Native lint maintenance remains separate.

## Results
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

## Evidence and remaining work
Root-cause answers and inspected state categories: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/root-cause.md. Exact files/raw traces/commands: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/evidence-index.md. The required names full-suite-before.txt and full-suite-after.txt contain actual attempts; “after” means after investigation began, not after a nonexistent fix. Passing focused attempts do not override the latest failed full suite.

Remaining blocker: Current full frontend suite fails 5 workspace-handoff cases (707/712 PASS); original Save-to-file failure and causal contaminator/repair remain unestablished despite isolated and ordered diagnostic passes.

Next discriminating step: capture a failing trace at the heading lookup, then reduce that actual condition, repair its owner and encode the violated invariant. No permanent waiver is requested or invented. Current native/TypeScript/Vite/format/boundary gates pass. No Phase 4, prototype playback, WKWebView, contract or VectorCraft changes, commit, push or deployment.

## QA workflow
Record QA_FAILED / BLOCKED through the existing completion helper. User acceptance remains unsatisfied. Recommendation: **FIX REMAINING GATE**.
