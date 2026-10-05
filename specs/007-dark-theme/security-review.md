# F002A A1 security review — 2026-09-29

Scope: approved A1 QA harness, runner, observation bridge, build separation and
external recorder. This is a source and packaged-boundary review in the current
agent session; it is not native acceptance and did not inspect user documents.
Relevant authority: F002A R05/R09, A1 plan and acceptance-harness/capture-evidence
contracts. No production code or security setting was changed.

## Results

| Boundary | Result | Evidence and limit |
|---|---|---|
| QA control channel | PASS for inspected design | `acceptance_harness.rs` limits commands to arm/release/snapshot/finish, validates fields, sequence, peer UID/PID and inherited-pipe token. `qa_runner.py` refuses a non-QA identifier. Channel has no path, URL, shell or arbitrary invoke control. Same-user host compromise is outside this boundary. |
| Save gate/fault safety | PASS for unit coverage | Ten QA native tests passed, including timeout/disconnect without releasing a save, one-shot fault, bounds, replay and original validation after release. Gate enters before the original command; injected save failure is after validation and before staging writes. These tests do not prove every native UI state. |
| Renderer observation | PASS for inspected boundary | `qa/bridge.ts` emits bounded digests, identity/selection/scroll numbers and redacted app fields. Native `safe_snapshot` rejects plain strings other than 64-character digests; the bridge has no control command. A document can affect the observed hash, not choose a native operation. |
| Production exclusion | PASS for static/package checks | Production and QA boundary scripts passed against current bundles; four feature/config mismatch builds were rejected as expected. Both existing packages passed `codesign --verify --deep --strict`. Default `lib.rs` compiles harness module and setup only under `acceptance-harness`. Static marker absence and signing do not prove live production behavior. |
| Evidence tools | PASS for local unit coverage | Fourteen Python acceptance-tool tests passed. Recorder still has compile/clock evidence only; isolated-display calibration, frame continuity and reviewer classification remain NOT TESTED. |

No observed exploitable defect was established in this bounded review. Residual
concerns requiring native verification: QA and production data-store isolation at
runtime, real renderer snapshot timing under held operations, current production
runtime exclusion, and recorder privacy/coverage on an isolated display. T021
production request-attempt observation remains BLOCKED; QA inspection cannot
stand in for a production observer. A1 does not authorize expanded capture,
inspection or security-setting changes.

Commands run on macOS arm64: `python3 -B -m unittest discover -s tests/acceptance
-p 'test_*.py'` (14 PASS); locked offline QA `cargo test --features
acceptance-harness --lib acceptance_harness` (10 PASS); `check_build_guards.py`
(four expected rejections PASS); `check_build_boundary.py` for both profiles
(PASS); `codesign --verify --deep --strict` for both bundles (PASS).

Next: native QA on disposable fixtures and a fresh production runtime smoke,
then reviewer inspection of raw T018–T020 evidence. Keep T018–T021 open until
their own acceptance evidence is complete.
