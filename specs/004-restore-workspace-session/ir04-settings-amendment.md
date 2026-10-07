# IR-04 authorized native Settings amendment — 2026-10-06

Supplement to F003C/F001/F002R, scoped by the user's explicit IR-04 IMPLEMENT request and the approved integration decision. Original approved artifacts/hashes remain unchanged. Installed Spec Kit `check-prerequisites.sh --paths-only --json` resolves F007W globally; this shared session amendment does not change the feature selection.

Session schema remains 1. `panel.documentsAndImagesOnly` is optional, typed boolean, defaults true when absent and is omitted when true. This omission preserves reserialized bytes/checksums for existing records. False persists through the unchanged private, bounded/checksummed, serialized workspace writer. It affects renderer tree visibility only: no change to folder exclusions, grants, search, expanded nodes, tabs, Reading anchors or draft recovery ownership.

The separate native Settings window receives only preference state. It submits typed General or workspace-scope patches; native caller identity, revision and request ID are checked. General retains `md-reader-locale` and `md-reader-appearance` storage. Reading/tree is acknowledged only by the workspace after applying and attempting its existing session checkpoint; Settings cannot invoke session/file/document/recovery/search commands or subscribe to their events. Failed persistence retains applied values and exposes a retry patch; Retry reserves a new revision and ID. Owner loss/ack timeout disables Reading/tree, with late completion reconciled against actual workspace state.

Evidence and exact frontend contracts: `../../os-engineering/report.md` and `../../os-engineering/frontend-handoff.md`. Existing native acceptance/release gates remain open where this focused evidence does not cover them.
