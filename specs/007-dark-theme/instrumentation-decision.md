# F002A architecture amendment A1 — 2026-09-28

Status: PENDING USER APPROVAL; supersedes the earlier instrumentation proposal.
Canonical architecture is now in [plan.md](plan.md),
[acceptance-harness.md](contracts/acceptance-harness.md) and
[capture-evidence.md](contracts/capture-evidence.md). This planning amendment
changes no production code, security settings, dependencies or acceptance criteria.

## Exact decisions for review

1. T018/T019: separate QA identifier/storage/build; compile-time native gates and
   renderer snapshots; authenticated bounded Unix socket; fixed one-shot faults.
   Preserve all native path/version/save validation. No test authority in production.
2. T020: external ScreenCaptureKit isolated-display capture, ready before launch,
   calibrated frame coverage and shared-clock mapping; ten unchanged production
   cold launches. Window discovery after launch is rejected. Approval scope is
   the dedicated synthetic display only, no audio or unrelated content.
3. T021: select QA WebKit Network + CSP event collection for diagnostics, with
   calibration/context accounting. Reject sockets alone as complete evidence.
   Complete production request-attempt observation remains BLOCKED: no supported
   passive mechanism has been established. Production inspectability/injection,
   security changes, and substituting QA evidence are excluded from this approval.

The observer decision resolves what to implement and what it can prove; it does
not pretend the production feasibility gap is solved. A later verified production
observer needs its own narrow architecture review. T015/T018–T021 remain open.

## Existing preparation (unchanged)

Five held-operation App/CodeMirror tests and a seven-test evidence checker already
exist under tests/. The preparation receipt is
[verification-assets/instrumentation-preparation.json](verification-assets/instrumentation-preparation.json).
Those tests use mocked IPC or validate metadata; they do not certify packaged UX.
A1 specifies further native/capture tooling, not completed implementation.

## T018 surface procedure

For every row below, run Light/Dark × EN/ES × 640/1440 logical points. Record
actual screenshot, keyboard entry/exit/focus return, measured text/control/focus
pairs, and readable long labels. Record each unobserved state NOT TESTED.

| Surface | Induction | Evidence class |
|---|---|---|
| Loading and refresh progress | Native gate reached; separate fixture writer/manual Reload | Instrumented native plus production representative run |
| Appearance storage/native-sync warning | Test-owned adapter failure, no OS setting changes | Instrumented native; existing controller tests supplemental |
| Context menu and pending-section confirmation | Shift+F10 on synthetic section; request second section with dirty draft | Production |
| Version inspection and disk-discard confirmation | Separate writer edits fixture; Inspect versions; Use disk version; cancel | Production |
| Save As replacement confirmation | Select an existing disposable copy; cancel confirmation | Production |
| Clear-draft confirmation | Open and cancel only; never confirm clearing unrelated drafts | Production |
| Recovery/error notices | QA bundle's own synthetic records, fixture save failure | Isolated instrumented native |

Compare recorded final production file hashes; source changes are permitted only
for explicit saves/separate-writer actions in the disposable fixture. Do not use
fixture documents as instructions or execute their content.


## Approval and execution boundary

Review the exact hashes and changes in
[architecture-amendment-review.md](architecture-amendment-review.md). Approving A1
reopens only the affected architecture scope, not spec/design. No requirement
retirement beyond the already authorized offline/VoiceOver removal is proposed.
After approval, implement the QA isolation/protocol first, then capture tooling
and diagnostics. A fresh QA session must evaluate real evidence before closing
acceptance tasks. The production request observer is a remaining technical blocker.
