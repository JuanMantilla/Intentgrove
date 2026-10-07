# Remaining approved-design integrations — implementation decisions

Status: PROPOSED technical scope; design remains USER-APPROVED. The current request authorizes frontend implementation and verification. This document makes the additional native, security and architecture work reviewable. It does not change approved canonical specifications or their hashes.

## First delivery: native Settings and Go/subfolder search (IR-04/05)

Proposed authorization: scoped native implementation, command/capability review and a backward-compatible session amendment. No new dependency, installation, signing, publishing or Windows editing enablement.

### Settings contract

- `show_settings(group: General | Reading | ProjectTree)` is called from the owning workspace. Native code creates or raises one window labeled `settings` and binds it to the actual caller's workspace; renderer-supplied labels cannot select another owner. Initial size 800×720, constrained to work area, with a scrollable body and reachable Done. Native titlebar and close behavior remain platform-owned.
- `get_settings_state()` returns validated app language/appearance and the owning workspace's reading values/filter plus a monotonic revision. It returns no file paths, grants, content, recent items, recovery data or tabs.
- `apply_settings_change(requestId, expectedRevision, patch)` accepts only typed preference keys. General keeps the existing language/appearance storage paths; Reading calls the workspace's existing reading transition and session checkpoint. Latest acknowledged state is returned. Failed persistence retains the applied value, reports a failure and allows Retry. The window never calls file/session commands directly. Responses and events are correlated to request and owner; stale changes are rejected and refreshed, never silently overwrite newer workspace choices.
- Initially the workspace remains the existing persistence owner. Settings exchanges validated intents through the native coordinator; it does not become a second independent session writer. If the workspace closes or fails to acknowledge, disable its Reading/tree controls and explain the unavailable owner. General remains app-scoped. Native theme synchronization applies to the relevant windows.
- Add one `documentsAndImagesOnly` boolean to the existing workspace session panel, default true for records lacking the key. This is the only proposed persistence amendment. It affects tree visibility only. Preserve folders, exclusions, grants, tabs, drafts, expanded nodes and search scope. Move the checkbox only when the separate window works.
- Done/native close returns focus to the invoker through a workspace event, using its retained connected element. Closing Settings never invokes document close or final workspace checkpoint. Escape in a numeric draft reverts the draft first; Escape from the window body closes Settings. App-menu Settings and Reading entries raise the same window/group.
- Security gate: enumerate actual command access for the new window. A capability description alone is insufficient. Explicitly deny all document/file/recovery/search/launch commands to Settings using the appropriate command ACL and/or native caller checks. Grant only the required preference coordination and window/event operations; no widening of `main` file authority. Verify denial with direct IPC probes.

Frontend files: new Settings entry/body, existing `ReadingSettings.tsx`, App preference/event wiring, i18n and shared CSS. Native/config changes: the coordinator/window/menu owner, command registration, a narrowly scoped settings capability, and session panel decode/validation. Canonical owners: F001/F003C/F002R and applicable F007W window rules. Use installed Spec Kit to reconcile supplemental changes before implementation; retain original approved versions.

Acceptance: one window; all entry points and group focus; English/Spanish and System/Light/Dark; numeric fields/preview; persistence failure/retry and stale acknowledgments; defaults from an old session; filter does not change grants or search; close/focus/keyboard routing; no file IPC from Settings; 640×480 and enlarged layouts. Run real Windows/macOS journeys separately. A browser fixture does not satisfy this gate.

### Native Go and subfolder search contract

- Extend current native menu state with `back`, `forward`, `visited`, `clearHistory` booleans derived from committed client history and current guards. Deliver `go_back`, `go_forward`, `go_visited`, `go_clear` through the existing main-window menu channel. Reuse client actions; do not assign new accelerators or enable a Windows menu path absent from the platform plan.
- Add optional `scopeSegments: string[]` to `start_folder_search`; missing/empty means the existing root behavior. Validate components and resolve the directory beneath the existing root grant without following an escaping link/reparse point. A root-relative string from the renderer is a request, never authority.
- Start acknowledgment includes confirmed scope. Native jobs retain root generation and scope; every emitted/opened hit must be inside both. A replaced root or scope invalidation stops the job truthfully. Keep existing ignore rules, bounded batches, cancellation, partial results and stale-job protections.
- Folder action enables only after the contract exists. Scope is displayed separately from Names/Contents/Both. Return to Explorer preserves tree state; Clear cancels current/pending work without changing file grants or closing the panel.

Native owners: current native menus and folder-search service. Frontend owners: api types, folder context action and `FolderSearchPanel`. Canonical owner: F003F plus shared navigation reconciliation.

Acceptance: native/client history parity; no new shortcut collisions; root behavior unchanged when scope omitted; sibling/outside-root paths rejected; nested scope and ignored files; cancellation before/after start; replacement jobs and changed hits; actual native boundary and UI fixtures.

## Rich editing: approve a bounded architecture spike first (IR-01)

The current source editor and its checkpoint JSON remain the fallback until an engine is selected and proven. Proposed first step is a disposable, unshipped source-span transaction prototype using the existing parser and CodeMirror state/history dependencies. No library installation or production recovery-format change is included in this spike.

The prototype must cover heading/paragraph/text emphasis, lists/tasks, links, tables and literal code. Track UTF-16 editor positions and original byte ranges separately. Each edit patches explicit source spans; never serialize a whole edited DOM back over the section. Untouched bytes, BOM/EOL and opaque YAML/Mermaid/raw HTML/unknown constructs remain original. Unsupported mixtures become read-only with an explanation. Transaction Undo/Redo, selection, IME/paste and section boundaries must be exercised, including dirty tab traversal.

Deliver an executable fixture, byte-diff corpus, source-to-selection mapping, transaction/history evidence and a documented engine choice. Then reconcile F004 architecture and checkpoint compatibility with actual results. Any dependency or versioned recovery envelope requires its own exact amendment. Spike approval does not authorize replacing the production editor, migrating existing recovery data or enabling Windows editing.

## HTML and other files: routing/security spike first (IR-02/03)

Proposed first step is a disposable native routing/resource prototype, not a production viewer. Use the existing native grants and opened identities. Return the typed view/details descriptors described in `integration-requests.md`; only deliberate links become workspace visits. Keep Markdown/image behavior unchanged.

HTML must live in a separate unprivileged surface with document JavaScript and IPC unavailable. The spike must prove authored CSS/local resource rendering and that scripts, handlers, forms, frames, network access, redirects, automatic navigation and escaping links cannot acquire authority. Define concrete byte/count/decode/time budgets before enabling resources. Test CSS imports/fonts/URLs and SVG resources, not just script tags. Do not remove the main renderer's CSP to make HTML display.

Other files open a metadata/details view first. Explicit default-handler launch remains two-step with a short-lived identity-bound token. Specify executable/package exclusions and no-handler/replacement/access failures in the security decision. Do not construct shell commands from paths. An external app's navigation is not workspace history.

Deliver platform-specific isolation/broker evidence, budgets, descriptor/error schemas and launch policy. Reconcile owning canonical features through Spec Kit and review these results before production integration. No new dependencies, privilege widening, automatic launches or production grant changes are authorized by this document.

## Existing work and current blockers

Frontend Reading numeric fields/preview and preference Retry paths are implemented separately in this pass. The native Settings window, filter persistence, new native Go/search contracts, rich transaction engine and HTML/details capabilities remain absent. Existing sibling continuity and QA-0004 repairs are preserved.

QA-0004 native acceptance still requires actual startup/profile, picker, refresh, refusal, locale and scale evidence. Fresh native discovery and a post-reset retry both returned native-pipe OS error 2 on 2026-10-06; no native product case was executed. Current macOS acceptance also requires a Mac host. Provider transport recovery is an environment dependency, not a frontend implementation change.

Approval requested: the Settings/Go/subfolder native implementation amendment above, plus the two isolated architecture/security spikes. Production rich editing and HTML/default-handler integration remain gated on the subsequent concrete results.
