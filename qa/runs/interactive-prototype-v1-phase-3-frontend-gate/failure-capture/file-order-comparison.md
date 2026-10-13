# Actual file order and cache observations

Actual order is derived from JSON reporter file startTime with maxWorkers=1, not guessed from CLI argument order. No observer reporter was added.

Entry-time current uninstrumented passing D-seeded-1 and failing recorder-seeded-1 have identical complete 70-file execution orders. Both start close-edit → workspace-handoff. Instrumentation and host scheduling differ, so this comparison does not isolate their effects.

Explicit disposable sequencer replay order exactly matches the failed recorder order: True. Uninstrumented entry-time current source result: 711/712, 1 failed.
**file order alone is insufficient for the workspace-handoff heading failure**. Workspace-handoff passes 24/24; the full replay result above remains authoritative, including any unrelated failures.
The replay configuration is external to canonical source; it is not a suite fix.

- D-seeded-1: 712/712, 0 failures; private cache before/after preserved.
- D-warm-2: 712/712, 0 failures; private cache before/after preserved.
- D-fresh-3: 712/712, 0 failures; private cache before/after preserved.

Only run-owned `.vite` directories were renamed for fresh-cache attempts. Dependencies were reused unchanged. Fresh here means Vitest/Vite result-cache state, not a cold OS filesystem cache or rebooted host. Initial historical failure cache contents were unavailable; the existing earlier failing order remains preserved separately.

The later external App/test update was verified separately at 713/713 and does not redefine this frozen 712-test order experiment.
