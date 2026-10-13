# Evidence index

- evidence/tested-paths.json and tested-snapshot.json: final scoped pre-check input inventory/hash baseline.
- evidence/frontend-final.log: final frontend regression suite; frontend.log: prior successful suite.
- evidence/native.log: final native library tests, including real filesystem permission denial.
- evidence/build.log and worker.log: production frontend build and worker checks.
- evidence/format.log and diff-check.log: touched formatting and scoped whitespace checks (empty on success).
- evidence/focused.log: focused native-entry/HTML UI regressions.
- evidence/frontend-initial-evidence-discovery-failure.log, build-initial-type-failure.log: corrected preliminary failures.
- evidence/frontend-loaded-host-failure.log and host-load.log: later two-worker run with five retained editor/timeout failures under high observed host load.
- evidence/frontend-history-timing-failure.log and history-diagnosis.log: retained intermittent passage-history failure and isolated unchanged-test diagnosis; final fixture waits for visible headings.
- evidence/existing-bundle-entitlements.log: package inspection unavailable because the documented prior bundle path is absent.
- evidence/*before*, App.tsx, assets.rs, i18n.ts: preserved task-local source/state evidence; test-source copy uses .before to avoid discovery.
- report.md, plan.md and verification.json: final engineering handoff/coverage and results. No native GUI evidence is claimed.
