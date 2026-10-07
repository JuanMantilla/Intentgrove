# IR-04 — IMPLEMENT

Authorized scope: the user's IR-04 IMPLEMENT request and the previously approved Settings amendment in `frontend-implementation/integration-decisions-20261006.md`. Preserve all preexisting worktree edits. F007W remains the installed Spec Kit selection; F001/F003C/F002R retain ownership of workspace, session and Reading policy.

Implement one native `settings` window bound to the actual `main` caller. Share typed preference policy through a small native coordinator, not filesystem authority or another session writer. Settings has zero core/plugin permissions: poll a preference-only snapshot instead of subscribing to existing app-wide file/search events. Intercept every application command before deserialization and delegate only four preference commands for Settings.

Workspace applies Reading/tree intents, captures the existing Reading anchor and checkpoints through its existing serialized session writer. General retains its existing localStorage keys and is usable after the workspace disappears. Requests reserve revisions, require request/revision-correlated acknowledgment, preserve applied values on persistence failure and retry with a new request ID. Reject unknown keys, invalid values, mixed scopes, stale revisions and unauthorized acknowledgment owners. Preserve legacy custom reading widths. Add an optional session boolean, omitted when true to retain historical checksum serialization.

Verify policy and real IPC dispatch, Windows/WebView2 singleton/close/focus with disposable profiles, session compatibility/draft ownership, renderer Retry/Escape/order and workspace regressions. No dependency upgrade, installed-app mutation, release, signing or commit. Current macOS build/runtime needs a Mac host; preserve its menu, quit, Finder and session paths in source.

IR-05 native follow-on: [implementation plan](ir05-plan.md). IR-04 content above is retained.
