# F002A acceptance harness contract — amendment A1

Status: PROPOSED; architecture approval required. Applies to T018/T019 and
supplemental T021 diagnostics, never to production startup timing.

## Build and authority boundary

Use the existing locked Rust/Tauri/React dependencies. Add an opt-in Cargo feature
`acceptance-harness`, empty default features, a separate frontend QA entry, and
QA-only Tauri configuration. Identifier: `com.juanmantilla.markdownworkspace.qa`;
product name: `Markdown workspace QA`; separate target and frontend output directories.
Reject builds unless native feature, QA frontend marker and QA identifier agree.
Production config must reject QA assets; QA feature must reject production ID.
Verify app-data and WebView storage resolve to QA locations before fixture access.
No migration/copy of production preferences, grants or recovery records.

Compile gates, adapters, snapshot access and channel code only into QA. An
environment variable, document, URL or preference alone cannot enable them.
Production gets no new commands, capability, inspector, listener or entitlement.
No WebDriver server or new package is selected. Inspectability, if enabled for
request diagnostics, is QA-only and not evidence about the production binary.

## Local runner protocol, version 1

Runner creates an unpredictable run directory (0700) under its temporary directory,
and a socket (0600), with exclusive creation and no symlink traversal. Runner and
QA host verify directory/socket ownership, peer UID, and a 256-bit random run token
passed through an inherited pipe, never argv or logs. Only the launching runner's
session is accepted. This is not a boundary against a compromised same-user host.

UTF-8 newline-delimited JSON; maximum 4096 bytes per input message, one client,
monotonically increasing sequence, schema version 1, run ID and token on every
request. Reject unknown keys/enums, duplicate sequence, oversized/truncated frames,
wrong peer/token, expired run, and unrecognized operation IDs. No path, URL, script,
shell, arbitrary invoke or evaluate command is supported. Run expires after 30
minutes; each armed/reached gate after 60 seconds. Output is bounded: snapshots
at most 64 KiB, trace at most 100,000 events; overflow invalidates the run.

| Command | Payload | Semantics |
|---|---|---|
| arm | operation: read-document / confirmed-refresh / save-section; ordinal: 1..100 | One outstanding one-shot gate, relative to invocation counter at arm acknowledgement |
| release | operationId | Release the reached operation once; repeated/unknown releases error |
| snapshot | none | Read bounded counters and synthetic-state digests; no mutation |
| finish | none | Close channel, clear unused arms; reject if an operation is held or in flight |

States: idle → armed → reached → released → completed/failed → idle. Timeout,
disconnect or expiry cancels an unreleased operation with an explicit QA error;
it MUST NOT release a save. A released operation completes through its normal
implementation; disconnect cannot roll back or cancel a committed write. Retain
its outcome and mark the test incomplete. Never auto-discard drafts or fixtures.

Place the asynchronous gate at native command entry before scope/version checks,
without holding a mutex or starting file mutation. Release calls the original
implementation exactly once with original arguments, including all scope,
encoding, conflict and atomic-save rechecks. No gate inside rename/write/fsync.
Trace entered/reached/released/completed/failed, opaque operation ID, monotonic
time, invocation count and result code. Paths, text and secrets are excluded.

This establishes overlap with a pending native operation, not a disk-write syscall.
T019 evidence must name the phase. Do not claim all save internals were observed.
QA snapshots compare editor/session identity, draft/history hashes, selection,
caret, focus, folder/tab identity, scroll, conflict/recovery and checkpoint sequence.
Snapshots cross the QA bridge as observations only; document content cannot issue
control commands. Treat renderer-reported state as untrusted bounded data.

## Faults and scenarios

Fault selection is a fixed launch-time enum supplied by the trusted runner, not a
socket command or document: none / preference-read / preference-write /
native-theme / fixture-read / fixture-save. One-shot adapters return the existing
error shape; no altered OS permissions or skipped native validation. Fixture-save
failure occurs before mutation and is labelled injected. Native path/version
rejection tests still execute real validation. No synthetic success response.

Run the surface matrix in instrumentation-decision.md plus all R02 surfaces in
Light/Dark × EN/ES × 640/1440. For T019, hold each operation, perform ten actual
selector changes, compare snapshots/counters, release, and check original outcome,
fixture bytes and recovery. Include success, error, conflict and open-dialog cases.
Focus movement to the selector is recorded separately from unexpected focus loss;
verify keyboard return and retained editor selection. Capture actual packaged UI.
Repeat noninjected representative journeys on production; preserve evidence class.

## Implementation verification required before native acceptance

Test authentication, bounds, replay, expiry/disconnect, double release, no write on
unreleased timeout, original scope/conflict checks after release, and isolated
storage. Verify feature/config mismatches fail builds. Build production separately;
inspect feature graph, generated ACL, assets, symbols/strings and runtime to confirm
no QA channel/hooks/inspectability, and verify signature. String absence alone is
insufficient. Record hashes for both packages and exact lockfiles. Separate QA
review must assess new channel/bridge and exclusion evidence before acceptance.
