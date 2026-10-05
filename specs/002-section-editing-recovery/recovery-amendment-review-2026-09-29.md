# F004 moved-path recovery and safety-copy amendment

**Status:** Proposed, awaiting user approval. The approved 2026-09-26 baseline remains historical in `docs/approvals.md`; the revised canonical artifacts below reopen their affected gates. The visual sketch is unchanged, and the revised `design.md` adds the new states in text.

| Gate | Artifact | SHA-256 |
|---|---|---|
| Behavior | `spec.md` | `d84758e7524b974a2221ed6d55d38d2446a9692ef3c0244b47576077dac81ae7` |
| Visual direction | `design.md` | `49339d96c80d7e2854d83ff990364aeec70377c1d90ecdabd6646f3bc73abafd` |
| Existing sketch | `design/section-editing-states.svg` | `54c93eb73ebb1fe2b144167b93035abc7eb62ddf9ebf65953beee4197429301e` |
| Architecture | `plan.md` | `1cfc77af8de935c22e87ccc5435dc1c63bb5966f296079af6a2627ea8f5b1825` |

The amendment adds F004-R16/AS-018/SC-008 for owner-bound, durable migration after picker-approved moved-path reselection; and F004-R17/AS-019/SC-009 for private retained Save safety copies, explicit resolved-copy cleanup, preservation of unresolved copies, and a proposed 1 GiB storage budget. An over-budget Save stops before changing the original and keeps the draft. [The decision record](recovery-storage-decision.md) explains the gap and tradeoffs; [the verification guide](quickstart.md) adds disposable fixtures. No existing user data is cleared by approving implementation; actual deletion still requires the user's in-app confirmation.

Approval authorizes scoped implementation and local tests/builds for these additions, not publication, commit/push, destructive cleanup of existing app data, or claiming unexecuted packaged tests as PASS.
