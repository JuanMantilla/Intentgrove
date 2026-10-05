$speckit-analyze

Use $md-security-reviewer for a preimplementation review of the active feature.
Read only its spec/design/plan/tasks and applicable project principles. First run
Spec Kit's consistency analysis, then review file scopes, unsafe rendering,
resource/network policy, IPC, testability and data-integrity requirements.

Do not modify the analyzed spec/plan/tasks during the analysis itself. Record a
concise preimplementation-review.md with severity, requirement IDs, exact gaps,
proposed corrections and blocking issues. Do not fabricate test evidence: this is
an artifact review before implementation. No application code or installs.

Confirm whether actual approvals cover the current artifact versions. An empty
findings list does not approve the artifacts. Update the handoff with any required
source-artifact corrections before implementation can begin.
