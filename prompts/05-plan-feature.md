$speckit-plan

Use $md-software-engineer in planning mode. Read the active approved spec/design
and docs/architecture-proposal.md. Evaluate the proposed Tauri 2 + React/TypeScript
architecture against this feature, confirming current relevant APIs/dependencies
from primary documentation and recording exact choices in the plan.

Define narrow native file/IPC contracts, path and local-asset scopes, bundled asset
packaging, parsing/security boundaries, test fixtures and a macOS verification
strategy. Keep later editor/search APIs as small extension points, not implemented
features. Include a first runnable vertical slice and measurable acceptance tests.

Use Spec Kit's real plan artifacts. Do not install/build application dependencies,
write production app code, commit or push. Update the handoff and stop for the
user's architecture approval. Report unresolved risks without inventing evidence.
