> Scope update — 2026-09-28: Offline-operation and VoiceOver-specific requirements/checks are retired by user decision. Historical results below remain unchanged and are not current gates for those retired portions. Mixed checks retain their security, integrity, keyboard, layout, and packaged-runtime requirements; no untested work is promoted to PASS. See [scope decision](../../docs/requirement-retirement-2026-09-28.md).

# F004 scoped security review — 2026-09-26

**Scope:** approved F004 editing and recovery IPC, native file Save/Save As, Markdown preview, Tauri navigation/CSP/capability. This is a source review with existing disposable tests, not an independent packaged penetration test. No user document was opened.

## Observed defects

| ID | Severity | Requirement | Evidence | Corrective action |
|---|---|---|---|---|
| SEC-01 | Medium, fixed in source | F004-R13–R14 | Recovery and save copies previously relied on the process umask. `private_storage_dir` now opens app-owned directories without following a leaf symlink, checks owner, sets `0700`; both writers create records with `0600`. A disposable permission/symlink test passes. Packaged behavior remains untested. | Verify permissions in a packaged app before final acceptance. |
| SEC-02 | Medium, open | F004-R09, R14 | `editing.rs::durable_backup` retains the latest original, staged output and observed race copy per granted file indefinitely. The “Clear saved drafts” action clears `drafts/` only. The modal now discloses that safety copies remain. | Define and implement a bounded retention/clear policy for safety copies; preserve copies needed for an unresolved Save race. |

## Plausible risk and unverified behavior

| ID | Severity | Evidence / limit | Follow-up |
|---|---|---|---|
| SEC-03 | Implemented; packaged verification open | The required native `applicationShouldTerminate:` bridge is now installed on the existing delegate, fails startup if unavailable, cancels pending edits and preserves the original termination decision. Objective-C ABI harness, bundled symbols and signed app startup PASS on 2026-09-28. All four dirty close choices and late confirmation invalidation have component coverage. | Actual Dock/system/menu/shortcut/titlebar journeys remain NOT TESTED. Prove them before F004-R08/AS-009 PASS; assistive access is currently blocked. |
| SEC-04 | Medium, disclosed | The actual Save transaction now has separate-writer regressions for changes before both checks and an observed post-commit mismatch; original/staged/intervening copies are retained and the session stays open on the observed race. An uncooperative writer can still race between the last check and replacement. | Keep the residual race disclosure and run packaged conflict/failure trials. Do not claim an absolute no-overwrite guarantee. |
| SEC-05 | Low | `checkpoint_section_edit_impl` bounds serialized records at 32 MiB but accepts a large JSON payload before that check. The worker may briefly allocate more than the limit while encoding. | Add pre-serialization input limits if adversarial renderer IPC is in scope; test quota/failure handling. |

## Controls observed

- Native commands use granted file/session IDs; the renderer does not supply a save path or byte range. `scope.rs` uses `openat`, `O_NOFOLLOW`, regular/local-file checks, and bounded relative segments. The native Save recomputes the selected section from a version-bound snapshot and checks bytes and identity before replacement.
- Save As obtains a native destination choice, rejects symlinks and non-Markdown targets, rechecks existing content/version, and uses an exclusive hard-link creation for a new destination. The original file remains outside the Save As write path.
- `MarkdownView.tsx` renders through `react-markdown` without a raw-HTML plugin; links become app buttons and images pass through the native scoped raster reader. `tauri.conf.json` sets a local-only CSP and `lib.rs` denies external navigation/new windows/downloads. The separately approved dark theme adds only `core:window:allow-set-theme` to `core:default`; no filesystem/network capability is added.
- Recovery records have schema, size and checksum checks, durable acknowledgment, and a prior checkpoint fallback. Conflict recovery does not write source files.

**Verification:** `cargo test` and UI tests pass on disposable fixtures; exact commands and counts are in `evidence.md`. Packaged accessibility, Quit, offline runtime, cross-process race and recovery timing remain NOT TESTED. A clean source review is not a security guarantee.

## Engineering audit follow-up — 2026-09-28

- PASS: Save previously wrote NUL-containing content before section parsing rejected it. Invalid binary drafts now fail before stage creation or source writes, with a failing-then-passing actual transaction regression.
- PASS: late failures could leak a same-directory stage. RAII cleanup now covers source, Save As and app-data backup stages; disappearance and injected backup/commit failures are tested.
- PASS: Use disk confirmation now revalidates the inspected version and generation; newer disk events or native Quit invalidate pending confirmation before draft discard. Component and native token tests pass.
- OPEN (F004 T036): recovery records are keyed by display-path hash and lack a session-owner field. Moved-path reselection can leave a stale old record after Save/Discard. An ownership-aware migration is needed before cleanup can safely distinguish an old record from a newer draft at that path. No existing user records were deleted during this audit.
- OPEN (SEC-02): retained safety copies still have no bounded retention/clear policy. See the concrete proposed decisions in `recovery-storage-decision.md`; they are not implemented or approved.
