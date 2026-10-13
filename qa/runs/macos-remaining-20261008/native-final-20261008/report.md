# Native final production acceptance — RUN/RETEST

**INCOMPLETE / FAILURES_PRESENT.** The ledger contains 325 constituent checks: **315 PASS, 3 FAIL, 7 NOT_APPLICABLE (explicit exclusions)**. CF42 and CF48 are not accepted. These counts do not establish the original compound journeys or release readiness. Historical fourteen production passes remain tied to their old candidate.

## Candidate

M2 MacBook Air, macOS 27.0.1 build 26A434, arm64. Identifier: `com.juanmantilla.markdownworkspace`.

Tested executable: `/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove.app/Contents/MacOS/md_reader`

SHA256: `34405daf849d83ee8330c999bb0e6be862347d2ba99ac6ad100a800ce7106b10`.

The previously tested `b7b0f872414fe5cf0e2f6205ef0bd5a234878fa5d5873a2bffe0ccf0162eb053` remains installed in Applications and represented by the existing DMG. It is superseded for current runtime acceptance. The latest app was not installed during this run.

All 13 package files match the frozen manifest. DiagramRenderer `e44b7498…` and ImageDecoder XPC `9b7f470d…` match, and strict deep signature verification succeeds. All 86 entries in the current frozen final-input manifest match. Earlier 226-input statements remain historical; this checkpoint explicitly audits the 86 final-manifest entries. Full hashes and commands are in candidate.json and final-checkpoint-integrity.json.

Older macOS, Intel/universal and older-package upgrades remain excluded. Application source/configuration stayed read-only. No profile reset, backup restoration/deletion, real-document mutation, admin/security bypass, publishing, commit or push occurred.

## Failures and implementation handoff

| Finding | Demonstrated behavior | Primary owner |
|---|---|---|
| [QA-0017](../../../findings/QA-0017.md) | Writable consistent CRLF section Save fails. Direct Save and Quit Save retain the dirty draft and unchanged source. | FRONTEND, $senior-frontend-developer; OS_ENGINEERING supports |
| [QA-0018](../../../findings/QA-0018.md) | Valid flowchart/sequence diagrams intermittently fall back during repeated layout/tab/locale transitions, then recover. Minimal trigger and root cause remain unknown. | OS_ENGINEERING, $os-senior-expert; FRONTEND and QA_AUTOMATION support |
| [QA-0019](../../../findings/QA-0019.md) | After corruption and restoration of exact valid PNG bytes, Reload retains the old error while saying “Updated from disk”. Retry displays the valid image. Minimal reproduction repeated. | FRONTEND, $senior-frontend-developer; OS_ENGINEERING supports |

No implementation fix was made in QA. No repaired candidate is available for affected retest. These ownership recommendations do not prove root cause. Historical QA-0013 remains separate and unresolved.

## Executed work

Lifecycle evidence includes forty Cancel and forty direct Permission Denied Save trials across title Close, Cmd-W, Cmd-Q and application-menu Quit. Ten earlier Keep draft process exits/restarts remain preserved. Seventy-six additional LF outcomes bring Cmd-W Save/Discard/Keep draft to ten each and Cmd-Q/menu Quit Save/Discard to ten each, plus ten new two-tab Keep draft exits/restarts for each Quit route. Main-process absence, restored markers and exact following sections were checked. Save intentionally updated only the disposable permission fixture. Earlier thirty clean route trials remain separately scoped.

Title outcomes based on disk, draft and AX do not prove repeated visible title Close → actual Dock reopen journeys. One operator Dock Quit → Cancel and actual Dock reopen evidence remain valid constituents; the remaining manual Dock repetitions were declined. Later “visible” Dock assistance briefly enabled verified geometry, not an entire compound route.

Search correctness: all twenty original manifest queries returned the expected path, line 2 and exactly one result, including Unicode. Ignore toggles returned eighteen versus twenty filename results. Empty/no-result and counted-skip states were checked. Ten additional executing Stop trials retained the verified Unicode hit and stable partial Stopped state. Ten executing query replacements, ten Search closures and ten native folder-picker root replacements passed their observable cancellation boundaries. Current unchanged, changed, moved and missing result targets were exercised. Missing targets were refused; changed targets displayed current bytes with an explanation. All 24,980 hashable regular search files matched the fixture manifest.

Trusted timing belongs to the separate opt-in packaged QA build `30d5af11…`: ten authenticated trusted-click → Stopped measurements were 1–3 ms on the same clock. The protocol was drained and finished, and the QA process exited. These are supporting QA-build measurements, not exact default-production latency. Tool-call duration is never product latency.

Layouts: System Events verified 640/900/1440 × 800-point reader and Settings sizes in EN/ES during the working native window phase. Sixty new visible/exact captures were dimension-audited and inspected. Reader, Settings top/bottom, PNG, search, malformed/hostile Mermaid source fallback and Find focus constituents are preserved. Initial Loading, drawer-occluded and misleadingly named captures are qualified by actual content. Reduce Motion was enabled for Find focus/Escape in both languages at all three widths, then restored OFF. Static captures do not establish animation timing or full keyboard journeys.

Native Find counted three case-insensitive matches, navigated offscreen, wrapped forward/backward, retained reading position on Escape and cleared on tab switching. Empty and zero-match AX states were verified. Later screenshots showed a blank Find strip while AX remained responsive and System Events reported zero windows. That visibility discrepancy is BLOCKED, not a confirmed product defect or a visible keyboard PASS.

PNG tests verified changed same-inode bytes/dimensions, specific corruption refusal, Retry recovery, valid replacement bytes, Open File acceptance and tab deduplication. Reload recovery failed as QA-0019. Original PNG bytes were restored.

## Current acceptance scope

The user explicitly excluded the seven blocked checks and retained all three defects. See [scope amendment](../../../../docs/macos-acceptance-exclusions-20261008.md). Their historical blocked outcomes remain in the JSON receipt and ledger; current gate status is NOT_APPLICABLE, never PASS. No active BLOCKED rows remain in this run ledger.

Excluded: actual Dock repetitions; title Close → Dock reopen repetitions; exact default-production Stop timing; the full six EN/ES keyboard folder-search journeys; current installation/launch/removal/rollback; current Finder Open With/drop repetitions; and the Find visibility-discrepancy check. Do not require those checks to close the gate.

QA-0017, QA-0018 and QA-0019 remain OPEN/FAIL. CF42/CF48 retain their defects and non-excluded requirements. Remaining non-excluded original criteria, including large-image edge panning/Fit and warm 1/10 MiB performance measurements, are not waived or claimed complete. Overall acceptance remains incomplete pending those criteria and defect repair/retest.

## Attempt history and safe checkpoint

Preserved test corrections: the no-result helper awaited the wrong completion label; closed Search correctly retained partial Stopped results rather than becoming empty; early Find Return trials lacked focused input and were excluded; the PNG picker’s initially disabled Open button was transient and later accepted the file; one recovery assertion assumed the wrong trailing newline. Capture errors and expected Quit/LaunchServices transitions remain in evidence. Main PID changed between interrupted turns; no additional crash or intentional exit is inferred without causal evidence.

All six original fixture hashes match baseline. The search manifest matches. permission.md intentionally contains the last successful LF Save; file modes are 0644 and fixture folder mode 0755. The new Find fixture remains identical to its created bytes. Spanish, Roboto 18, line height 1.6, page width 760, system appearance, document/image filter and Reduce Motion OFF are restored. The private backup exists and was untouched. Observer 14112 finished; no QA app remains. The production reader has clean Find/PNG fixture tabs and Settings is closed.

[Coverage](coverage.json), [checkpoint](resumption-checkpoint.md), [evidence index](evidence/index.md), [handoff](department-handoff.md). This is a preserved incomplete QA checkpoint, not a claim that every original criterion or reachable journey is complete.


## User-approved scope change — 2026-10-08T21:38:45.559000+00:00

User: “Exclude the seven blocked checks; retain all three defects”. Authoritative amendment: docs/macos-acceptance-exclusions-20261008.md (exact seven IDs and historical records in the adjacent JSON receipt).

The seven former BLOCKED rows are now NOT_APPLICABLE by explicit exclusion, not PASS. Current native-final ledger: 325 rows, 315 PASS, 3 FAIL, 7 NOT_APPLICABLE; zero active BLOCKED rows. QA-0017/0018/0019 remain OPEN and FAIL. Overall acceptance remains incomplete; this decision does not waive other non-excluded original criteria or approve a release. Do not continue requiring the excluded Dock/title, exact production Stop timing, full six keyboard-search journeys, current installation/rollback, Finder/drop repetitions or Find visibility-discrepancy checks.

Earlier blocked counts and next steps are historical and superseded for these seven checks only. CF42/CF48 retain their defects and non-excluded scope. CF54 is removed from the active gate. Product source, backup, fixtures and preferences are unchanged by this scope amendment.
