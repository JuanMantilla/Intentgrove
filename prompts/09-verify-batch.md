$md-qa-engineer

Start a separate review pass on the just-implemented batch. Read AGENTS.md,
.agents/state.md, relevant active feature criteria and changed paths; do not rely
on the implementer's summary as proof. Run available relevant tests, inspect actual
behavior and use disposable fixtures for file operations.

Update active feature test-matrix.md and verification.md: requirement/scenario,
command or procedure, platform/version, result and evidence. Label unavailable
native macOS/visual checks NOT TESTED rather than PASS. Give reproducible
steps for checks the user must perform; never claim they were performed.

Do not patch production code in this review. Record defects for the next engineering
batch and preserve the approved specification. Update the handoff. Feature status
remains incomplete until all required criteria and platform checks have evidence.
