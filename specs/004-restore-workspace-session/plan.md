# Implementation Plan: Restore Workspace Session

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Branch**: `004-restore-workspace-session` (Spec Kit feature ID; no Git branch change) | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md) | **Status**: Proposal; user approval required before production implementation

## Summary

Persist the last explicitly selected workspace, ordered tabs, reading anchors,
tree state, panel layout and window geometry in a private native session record.
Rebuild fresh scoped grants after restart by verifying the saved native selection
identity. Restore the active document first, defer inactive work, and coordinate
final durable checkpoints with F004's dirty-edit close choices. Recovery remains
usable when one path is unavailable; no document is written by restoration.

## Technical Context

| Item | Choice |
|---|---|
| Language / versions | Existing TypeScript 7 / React 19 and Rust 2021; locked Tauri JS 2.11.1 / Rust 2.11.6; no new dependency planned |
| Platform | Observed macOS 26.2 arm64, system WebKit, current unsandboxed one-window package; other OS/CPU combinations remain unverified |
| Storage | Schema-1 bounded JSON envelope in per-user Tauri app data, separate from F004 drafts; private 0700/0600, checksum and prior-valid fallback |
| Testing | UI and Rust state/fixture tests, separate-writer cases, packaged Mac quit/restart/keyboard/display/performance acceptance |
| Performance | Completed in-run checkpoint <=2 s; active view usable <=2 s in 9/10 warm 25,000-entry runs; inactive content deferred |
| Constraints | No repo writes from session work, no source bytes in ordinary session record, EN/ES, 640-point minimum, existing CSP/scoped IPC |

## Constitution Check

The approved 0.1.0 principles, as narrowed by the user's 2026-09-28 retirement of
offline-specific checks, govern this proposal. The unrelated 0.2.0 UI amendment
is pending and is not treated as approved.

| Principle | Planning result |
|---|---|
| I — Local desktop operation | PASS for proposal: app-owned local storage and existing bundled runtime, no service or new runtime dependency. |
| II — Preserve documents | PASS for proposal: session writes only app data; F004 decides dirty edit outcomes before close or folder replacement. |
| III — Untrusted documents and scope | PASS for proposal: only native-recorded prior selections can be restored; no saved renderer path becomes authority. Revalidate identity/no-follow and file-only scope. |
| IV — Readable and accessible | PASS for proposal: reuse shell/palette, bounded inline states, EN/ES, visible focus and narrow layouts in design.md. Native checks remain open. |
| V — Evidence-based delivery | PASS for proposal: R/AS/SC mapping below and packaged procedures in quickstart.md. No implementation or macOS behavior is claimed yet. |

## Architecture

### Native storage and access

Add a `session.rs` native service. The only persisted access descriptors originate
from previous native picker selections: selected root or explicit file, its path,
device/inode identity and kind. Session IPC never accepts an arbitrary new path.
At startup, decode/validate a <=2 MiB checksum-protected record and reopen the
prior selections using existing no-follow/regular-file checks. Compare stored
identity before issuing **new** process-local grants. A root-relative tab uses
validated path components inside that root; an explicit file outside the root
remains file-only. If the root or explicit item was replaced/moved/denied, retain
its descriptor as a recoverable placeholder and require the native picker. Clean
changed files under an intact root can show current content with an anchor
fallback; F004 drafts remain governed by F004 conflict rules.

Persist bounded navigation state using temp create, file sync, atomic rename and
parent sync, with a previous valid record. Reject invalid schema/checksum,
oversized paths/counts, duplicate tab IDs, nonfinite geometry and stale sequence.
Checkpoint within two seconds of a completed user navigation/layout action;
coalesce rapid scroll changes without losing the final normal-quit state. A
completed acknowledgment follows durability. Record `running` for crash offers
and `normal` only after a final flush before ordinary exit. Storage failure shows
a localized warning and holds a normal close rather than pretending restoration
is safe. F004 drafts and retained Save safety copies remain separate stores.

Current ad-hoc package has no App Sandbox entitlement. This plan assumes its
existing native selection and filesystem policy. If F005 enables App Sandbox or
security-scoped bookmarks, revisit access persistence and approval before use.
[Research and primary references](research.md) record the platform limit.

### Renderer and window lifecycle

Create a small session coordinator in `src/app/` to serialize the existing
`App.tsx` root, tab order, active tab, per-tab heading+offset/scroll, tree
expansion/scroll and panel state. It sends opaque current grant IDs and bounded
numeric layout state; native code derives stored paths/identities and captures
window bounds. Do not persist document source or editor history here. Reuse F004
recovery for active edit mode and draft data, then finish F004 T029 once this
contract is approved and implemented.

At launch, native restore returns descriptors and new grants without reading all
documents. Render the shell/placeholders, load the active tab first, and defer
inactive tabs and unvisited tree branches. Every asynchronous response carries
a restore generation; a new folder choice invalidates the old generation and
cancels obsolete work. Preserve tab order even if one read fails. Anchor restore
uses heading ID plus relative offset when version/display match, then nearest
valid heading/scroll position with a localized explanation when they do not.

Capture window bounds and display scale through the native window handle. Clamp
physical bounds to the available work area before showing/restoring; do not add
renderer `setPosition`/`setSize` permissions merely for this feature. Reuse F001
toolbar/tree/tabs and F002A palettes; add only the states and Clear session
action in [design.md](design.md).

Integrate with current F004 native close/quit guard. Every normal Quit or last
window Close waits for dirty-edit choices and then `finish_workspace_session`.
Cancel or failed Save/flush leaves the window and existing workspace open. Folder
switch resolves each dirty tab before replacing the root/tabs; stage choices so
a failed action cannot partially replace the workspace. F005 later wires the
native Dock reopen entry point; F003C supplies the state to display after reopen.
Clear session uses explicit draft-aware confirmation. It removes session and F004
draft records only, never source documents or unresolved Save safety copies.

### Source and artifact map

| Touch point | Planned work |
|---|---|
| `src-tauri/src/session.rs`, `lib.rs`, `state.rs`, `selection.rs` | Durable record, native scoped grant rebuilding, session IPC, final close/quit sequencing |
| `src/app/App.tsx`, new `src/app/session.ts`, `src/app/api.ts`, `i18n.ts` | Capture/restore state, lazy tabs, stale-work cancellation, EN/ES recovery/clear UI |
| `src/styles/app.css` | Reuse semantic tokens for bounded restore/missing/confirmation surfaces and narrow layouts |
| `src-tauri/src/recovery.rs`, `src/reader/SectionEditor.tsx` | Integrate existing F004 draft recovery only where F004 T029 requires; avoid new draft storage |
| `tests/ui/`, `src-tauri/tests/`, `specs/004-restore-workspace-session/verification.md` | State, corruption, path/race, writer, close/quit and packaged evidence |

## Requirement-to-validation mapping

| Requirements | Validation |
|---|---|
| R01–R05/R14; AS-001–004/015; SC-001/002 | Ten packaged normal quit/reopen journeys; active/root/tab/tree/window/scroll comparison, last-window reopen |
| R06; AS-008/012/016/017 | F004 Save/Keep/Discard/Cancel and multi-draft folder-switch trials, including cancelled/failed Save |
| R07/R08/R12; AS-005–007; SC-003 | Missing/replaced/denied root and explicit-file fixtures; current clean content, no scope widening, unaffected tabs |
| R09; AS-013; SC-005 | 25,000-entry fixture, ten warm active-view timings, inactive defer and cancellation |
| R10/R11; AS-009–012; SC-004/007 | App-data vs fixture inventory/hash, app-request observation, draft-aware Clear, EN/ES keyboard/focus/layout |
| R13; AS-014; SC-006 | 100 completed checkpoints under two seconds, ten controlled post-ack process exits and latest-state offers |

## Validation and limits

Follow [quickstart.md](quickstart.md) on disposable fixtures with a packaged app,
no development server. Record the exact executable hash, macOS/CPU/display,
commands, measured results and PASS/FAIL/BLOCKED/NOT TESTED per criterion.
Current agent sandbox does not expose a verified isolated display or process list;
no native acceptance is inferred from planning or component tests. A production
request-attempt observer is also not yet established; SC-004 request coverage
must remain BLOCKED until an approved observer can cover that interval.

## Post-design Constitution Check

[Data model](data-model.md), [native contract](contracts/session-ipc.md),
[visual proposal](design.md) and [validation guide](quickstart.md) retain the
same local storage, no-write and scoped-access boundaries. No exception is
proposed. User approval of the current F003C spec, visual sketch and architecture
is required before generating implementation tasks or changing production code.


## Authorized HTML native reconciliation — 2026-10-08

**F003C-H01**: HTML uses the existing schema1 native selection/identity restore. Optional anchor htmlZoom (0.5–3) and htmlScrollLeft preserve viewer state, restored kind identifies HTML, and HTML edit/recovery state is refused. Reopen through open_local_view, mount, then set_html_location; never restore document forms or replay resource grants.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.


## Authorized Workspace layouts extension — 2026-10-08

F003C-L01–L03 uses existing IR-04 preference owner and schema1 PanelState. Strict shared enum; default Margin omitted in storage to retain legacy canonical checksums, always emitted in Settings/restore IPC. No document/grant/store/schema migration. Native/frontend handoff and verification: ../../os-engineering/evidence/workspace-layout-native-20261008/report.md.
