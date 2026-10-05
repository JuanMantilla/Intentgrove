# F004 Implementation and Verification Path

The approved baseline is partly implemented; this guide also covers the proposed 2026-09-29 moved-path and safety-copy amendment. It does not claim packaged acceptance.

## Before implementation

1. Preserve the historical baseline approval and obtain renewed approval of the revised [spec.md](spec.md), [design.md](design.md), and [plan.md](plan.md) for the amendment. Record paths and hashes in `docs/approvals.md`.
2. Confirm the active Spec Kit feature is `specs/002-section-editing-recovery`. Append bounded amendment tasks after approval, preserving F004 requirement/acceptance IDs.
3. Resolve the packaged macOS Dock Quit delegate feasibility before relying on a close prompt. A failure keeps F004-R08/AS-009 blocked and requires architecture review.
4. Treat F003C workspace restoration as a separately approved prerequisite for F004-R12/AS-009/SC-003. Do not absorb its work into F004 without its own gate.

## Suggested build slices

1. Native source section discovery and parity fixtures (F004-R01, R04, R05, R10).
2. Section context menu, keyboard route, focused editor, preview, dirty state, EN/ES and accessibility (R01–R06, R11, R15).
3. Native Save/Save As and conflict paths with failure injection (R07, R09, R10).
4. Durable checkpoint/session protocol and normal/abrupt restart (R08, R12–R14).
5. F003C session integration and F003D dirty conflict handoff; packaged macOS acceptance.

## Disposable verification matrix

After implementation, use a disposable workspace folder outside any real repository and open only fixture Markdown files. From the repository root, run the existing automated gates:

```sh
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Run the packaged `.app` on macOS for the human journeys below. Record the fixture path, app build, macOS version, locale, actual result, and evidence for each acceptance ID. Build success is a prerequisite, not a substitute for the packaged UI tests.

| Evidence | Required result |
|---|---|
| Native section fixtures: first/middle/last, empty, pre-heading, heading-free, nested/repeated/setext, fence/quote/list, BOM, LF/CRLF/CR, emoji | Correct nonoverlapping byte spans or explicit read-only reason; no guessed section (AS-001, AS-004, AS-013, SC-002). |
| Twenty source saves, including BOM and line endings | 20/20 preserve all bytes outside original selected span; Save As creates full copy; original unchanged (AS-005, AS-014, SC-002). |
| Conflict and failure injection: external write before Save and before final commit, missing/denied target, stage error, post-commit mismatch | Zero detected pre-commit overwrites and draft losses; observed race reported with draft, staged output, captured disk versions, and any uncaptured-version limitation (AS-006, AS-007, SC-004). |
| One hundred accepted edits, durable acknowledgment timing, corrupt checkpoint and abrupt termination after acknowledgment | 100/100 acknowledgments within 1 second while running; latest completed checkpoint offered; no original write on reopen (AS-010, SC-005, SC-007). |
| Packaged app close/quit: tab, titlebar, Cmd+W, Cmd+Q, app menu, Dock Quit, failed Save/checkpoint | Save/Keep draft/Discard/Cancel semantics; Cancel and failure keep app open (AS-008, AS-009). |
| Ten normal Keep draft close/reopen trials after F003C integration | Exact workspace, tab, layout, section, draft, history, selection, and scroll restored; source unchanged (AS-009, SC-003). |
| Keyboard-only in EN/ES at 1440, 900, 640 points and Reduce Motion | Section targeting, focus, controls, conflict and recovery messages perceivable and operable (AS-003, AS-015, SC-006). |
| Ten moved-path reselections: single/repeated moves, legacy record, competing owner, migration failure, crash after acknowledgment | Complete draft/history survives; Save/Discard removes only matching owner; failure preserves prior checkpoint and blocks false protection (AS-018, SC-008). |
| Ten safety-copy lifecycle/quota fixtures, including failed cleanup and symlink attempt | Resolved count/size and confirmation; unresolved copies retained; over-budget Save leaves original/draft intact; no repository deletion (AS-019, SC-009). |

Use only disposable fixtures. Record PASS, FAIL, BLOCKED, or NOT TESTED against AS/SC IDs in the feature evidence file. A passing compile or task checklist does not prove packaged macOS behavior.
