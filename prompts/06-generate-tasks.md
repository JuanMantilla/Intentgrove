$speckit-tasks

Read AGENTS.md, .agents/state.md and the active approved spec/design/plan. Generate
small dependency-ordered implementation tasks for this feature only. Every task
must reference its requirement/scenario or explain its necessary infrastructure.

Include security, unit/component tests and actual macOS filesystem/desktop
verification. Separate automated checks from manual native checks. Define small
batches so a new session can implement one batch without reading the whole repo.
Include fixture generation and failure cases; do not mark tasks done in advance.

No production code, dependency installs, commits or pushes. Update the handoff.
Do not use checked task boxes as a substitute for evidence or approval.
