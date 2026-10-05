# Implementation Plan: Refresh External Changes

**Branch:** `005-external-change-refresh` | **Date:** 2026-09-25 | **Status:** Draft architecture proposal  
**Spec:** [spec.md](spec.md) | **Design:** [design.md](design.md) | **Research:** [research.md](research.md)

## Summary

Extend the existing Tauri desktop app with a native, grant-scoped change monitor. Watcher events only trigger rechecks; native code validates each path and publishes a confirmed disk version or an unavailable status. Clean tabs and the folder tree update while preserving reading position and tree state. Dirty F004 drafts remain untouched and receive a conflict notice with Keep my edit, Use disk version, and Save a copy. Right-click Reload runs the same reconciliation path on demand, with a cancellable folder job.

## Technical Context

| Item | Planning choice |
|---|---|
| Language and version | Existing Rust 2021 (declared minimum 1.77.2), TypeScript 7.0.2, React 19.3.0; actual Rust toolchain absent and compatibility **NOT TESTED** |
| Primary dependencies | Existing Tauri 2.11.6, Tauri JS API 2.11.1, Vite 8.3.1; propose backend `notify` 8.2.0, exact pin and lockfile during approved implementation |
| Storage | No refresh database or repository files; in-memory watch, generation, snapshot, and disk-version state. F004 alone stores recovery drafts in local app data |
| Testing | Existing Vitest UI tests and Rust tests, plus disposable external-writer integration tests and packaged macOS acceptance |
| Target platform | Observed macOS 26.2, arm64; configured minimum macOS 14 remains unverified. Windows/Linux work is outside this slice |
| Project type | Tauri desktop app with React webview and Rust filesystem authority boundary |
| Performance goals | Spec SC-001: 19/20 clean ≤1 MiB saves shown within 2 seconds, all 20 shown or errored by 5 seconds; SC-002: 9/10 25,000-entry tree changes visible within 5 seconds |
| Constraints | No app network, no source writes by refresh, no filesystem scope expansion, no dirty-draft loss, bounded asynchronous scans, keyboard/EN/ES/Reduce Motion support |
| Scale | One active root per window, explicit file-only grants, multiple tabs, up to 25,000 visible entries and 10 MiB rich Markdown per existing scope |

## Constitution Check

| Principle | Design gate |
|---|---|
| I. Local Desktop Operation | **PASS for proposal:** native local watcher/read path; no service, CDN, telemetry, or runtime dependency download. Packaged native behavior remains **NOT TESTED**. |
| II. Preserve User Documents | **PASS for proposal:** refresh reads only; draft stays separate; conflict actions cannot overwrite changed original; F004 retains save-time check. Concurrent-writer evidence remains **NOT TESTED**. |
| III. Treat Documents as Untrusted Data | **PASS for proposal:** only native grant IDs and validated relative segments cross IPC; events never authorize a path. Symlink/alias and replacement cases require fresh scoped validation. Security review remains pending. |
| IV. Simple, Readable, and Accessible | **PASS for proposal:** contextual Reload and persistent but nonblocking conflict/status states; keyboard, EN/ES, Reduce Motion required. The feature design is proposed in `design.md`; approval and rendered checks remain pending. |
| V. Traceable, Evidence-Based Delivery | **PASS for proposal:** requirement IDs map to contracts and validation cases below. No implementation or macOS UX result is claimed. |

The current spec, applicable visual direction, and this architecture have **not** been approved for implementation. No constitution exception is proposed. The 0.2.0 UI amendment is still a draft; the last approved 0.1.0 principles continue to govern until the user approves the amendment.

## Architecture and state flow

### Native boundary

Add a `refresh` service under `src-tauri/src/` and register narrow commands/events in `lib.rs`. Its state lives alongside `AppState`, keyed by opaque root/file grants and a monotonically increasing workspace generation. It owns watcher handles, per-item disk-version fingerprints, and cancellable folder jobs. It never accepts renderer-supplied absolute paths, generic watch paths, or arbitrary file reads. Register a root watch before taking its baseline snapshot. Root switch/last-window close stops old watches and invalidates pending results.

The watcher uses `notify` in Rust. A recursive root watch covers selected-folder descendants. An explicit file outside the root uses a nonrecursive watch on its parent only to detect candidate changes to that selected filename; the service does not read sibling content. Events, overflow flags, errors, and focus return schedule reconciliation. Debounce and coalesce repeated hints; do not apply event kinds directly to UI state. A watcher failure marks affected content freshness-uncertain and leaves manual Reload available. The frontend receives typed status/events through Tauri, not OS paths.

### Scoped version reads

Before and after any root-relative read or listing, compare the selected root path's current identity with the retained original root descriptor. If the root is missing or replaced, invalidate its grant and jobs, mark its tree and tabs unavailable, retain drafts, and require picker reselection before reading a replacement root. This is distinct from a file replaced *inside* the unchanged selected root. For a root-relative tab under a valid root, reopen from the retained root directory descriptor through existing `open_relative`, reject symlinks/nonregular/cloud-placeholder/network-mount targets, and verify the candidate's pathname still refers to the opened item after the bounded read. This permits a validated atomic replacement inside the selected root. For an individually selected file-only grant, compare the current path's identity with the originally selected item; a replacement requires explicit picker reselection. Extend native grant state to retain selected paths for identity checks, never as new authority.

Build a disk-version token from device/inode, size, high-resolution change/modified metadata, and a digest of the bounded bytes. Hold the last confirmed content while a candidate is unstable. After a short quiet interval, perform two consistent checks and publish only a candidate that remains stable; retry boundedly on mutation. A long-pause writer can resemble a completed write, so tests must record any intermediate display as FAIL and the residual limitation must stay visible at approval/verification. Do not infer change solely from modification time. Existing `DocumentResponse` currently lacks a version token, and `read_document_impl` currently rejects every inode replacement; both require scoped extension.

### Tree and tab reconciliation

Reconcile affected loaded directories into generation-bound, sorted snapshots before paging, so a changed directory cannot mix old and new live `readdir` offsets. Preserve expansion, selected node, and tree scroll for surviving items. Keep removed open tabs with an unavailable status. A missing or replaced selected root leaves its tree unavailable until reselection, with tabs and drafts retained; a matching path alone cannot restore the grant. New root-relative inode versions update the existing tab rather than creating a duplicate; tab UI identity remains stable while disk identity changes. Keep all inactive open tabs eligible for refresh without mounting every reader view.

Folder Reload walks the requested subtree asynchronously with bounded concurrency and existing exclusions. It publishes per-directory confirmed changes and checks open tabs in scope independently. Progress reports examined counts rather than an invented total; cancellation stops future work, keeps confirmed updates, and marks remaining scope unchecked. File Reload checks only the selected file and never opens a closed tab. Switching the root or closing a window invalidates the job generation and drops stale events.

### F004 conflict handoff

F004 is specified but not implemented in the current F001 app. A single document store must eventually expose clean/dirty state, selected section draft, base disk version, and recovery checkpoint. Refresh cannot write or mutate that draft. If the disk token differs while dirty, it records a per-document conflict and exposes both versions for read-only comparison. Keep my edit retains draft and conflict badge; Use disk version asks for discard confirmation, then revalidates that the inspected disk token is still current before F004 discards; Save a copy delegates to F004 Save As. Save to original stays blocked under F004-R09 while the conflict exists. A newer disk change invalidates the pending choice. Multiple conflicts stay independent so folder reload can continue.

The current app has no F004 editor/draft state. Implementation tasks must make F004's document-store contract available before claiming F003D-R06–R08/SC-004 complete. This plan does not mark refresh complete from read-only watcher behavior alone.

### UI and accessibility

Add contextual Reload to tree rows and explicit-file tab menus, with the keyboard context-menu key/Shift+F10 path. Keep the active document readable while a folder job runs. Use centralized EN/ES strings for changed/current/loading/uncertain/unavailable/conflict states and accessible live status/focus management. A replaced root uses a persistent folder-unavailable state and Select folder again action without hiding tabs or drafts. Conflict stays visible until resolved; the comparison view labels local draft and disk version in text, not color alone. Nonessential motion respects Reduce Motion. [design.md](design.md) and its SVG sketch propose the layout and copy for user approval.

## Project Structure

### Documentation

```text
specs/005-external-change-refresh/
  spec.md
  design.md
  design/refresh-states.svg
  plan.md
  research.md
  data-model.md
  contracts/refresh-ipc.md
  quickstart.md
  tasks.md                 # current draft implementation task list
```

### Proposed source changes after approval

```text
src-tauri/src/
  lib.rs                   # register refresh commands and typed events
  state.rs                 # native grant and generation ownership
  scope.rs                 # existing secure opens, snapshot helpers
  document.rs              # version-aware bounded reads
  listing.rs               # generation-bound directory snapshots
  refresh.rs               # watcher, reconciliation, cancellation
src/app/
  App.tsx                  # orchestration, context menus, status
  api.ts                   # typed refresh IPC and event payloads
  i18n.ts                  # EN/ES refresh messages
src/workspace/             # small document/tree refresh state modules if extraction is needed
tests/ui/                  # context-menu, focus, conflict-state cases
src-tauri/tests/           # disposable writer/native integration cases
```

The existing React shell and Rust authority boundary remain the two project layers; no new service or general filesystem plugin permission is introduced. F004 integration may add its separately approved document-state modules before or with this feature.

## Requirement-to-validation mapping

| Requirements | Contract / design | Validation |
|---|---|---|
| F003D-R01–R05 | watch hints, `refresh_file`, tree snapshot, stable read | AS-001–AS-007; SC-001–SC-003 |
| F003D-R06–R08 | version token and F004 conflict handoff | AS-008–AS-012; SC-004, SC-007 |
| F003D-R09–R11 | grant-specific replacement, unavailable/focus/uncertain states | AS-013–AS-015, AS-017–AS-019; SC-005–SC-006 |
| F003D-R12–R13 | context menu, statuses, cancellable job | AS-007, AS-016–AS-017; SC-002–SC-003, SC-007 |

## Post-design Constitution Check

Phase 1 artifacts preserve the same boundaries: [data-model.md](data-model.md) keeps disk versions separate from F004 drafts; [refresh-ipc.md](contracts/refresh-ipc.md) uses opaque grants, typed events, and no write command; [quickstart.md](quickstart.md) requires packaged and disposable-file evidence. The later [design.md](design.md) reuses the F001 shell and adds no new filesystem authority. Principles I–V remain **PASS for proposal** with no exception. Actual security, accessibility, performance, and macOS behavior remain **NOT TESTED**, and spec, visual, and architecture approvals remain pending.

## Verification strategy and risks

Use disposable folders with a second writer process to exercise in-place writes, staged writes, atomic replacement, same-size rewrites, rename/delete/recreate, selected-root replacement, symlink escapes, permission loss, multiple dirty tabs, watch overflow/failure, missed events on focus, and cancellation. Compare hashes immediately before/after refresh, and validate that only explicit F004 Save or Save As writes source output. Run Rust boundary tests, UI keyboard/EN/ES tests, and a packaged macOS journey; record OS/CPU, commands, timing distributions, fixture shape, and PASS/FAIL/NOT TESTED per acceptance case.

Open risks to validate before architecture approval: the stable-read quiet interval may not meet SC-001 on all editors; a paused in-place writer has no reliable finished signal; directory snapshot memory/work must remain bounded at 25,000 entries; the native watcher may omit events and must recover on focus/manual Reload; a file-only grant cannot follow atomic replacement without explicit reselection. No source implementation, toolchain installation, or app acceptance test is authorized by this plan document alone.
