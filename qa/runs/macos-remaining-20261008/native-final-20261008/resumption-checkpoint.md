# Current native acceptance checkpoint


## User-approved scope change — 2026-10-08T21:38:45.559000+00:00

User: “Exclude the seven blocked checks; retain all three defects”. Authoritative amendment: docs/macos-acceptance-exclusions-20261008.md (exact seven IDs and historical records in the adjacent JSON receipt).

The seven former BLOCKED rows are now NOT_APPLICABLE by explicit exclusion, not PASS. Current native-final ledger: 325 rows, 315 PASS, 3 FAIL, 7 NOT_APPLICABLE; zero active BLOCKED rows. QA-0017/0018/0019 remain OPEN and FAIL. Overall acceptance remains incomplete; this decision does not waive other non-excluded original criteria or approve a release. Do not continue requiring the excluded Dock/title, exact production Stop timing, full six keyboard-search journeys, current installation/rollback, Finder/drop repetitions or Find visibility-discrepancy checks.

Earlier blocked counts and next steps are historical and superseded for these seven checks only. CF42/CF48 retain their defects and non-excluded scope. CF54 is removed from the active gate. Product source, backup, fixtures and preferences are unchanged by this scope amendment.

Read report.md and coverage.json for retained evidence and non-excluded work. The frozen production candidate remains34405daf…; no product or profile change occurred.


## CRLF Save scope deferral — 2026-10-08

User explicitly removed CRLF Save support from current requirements for now. QA-0017 is DEFERRED, a known defect preserved with original failed evidence, not fixed/PASS and no longer an acceptance gate. CRLF-SAVE is NOT_APPLICABLE in current scoped coverage. LF Save, failure data preservation and other requirements unchanged. Current native-final counts:315PASS/2FAIL/8NOT_APPLICABLE. Remaining confirmed active defects: QA-0018 intermittent diagram fallback and QA-0019 PNG Reload recovery. CF42 no longer fails because of QA-0017; its broader unverified scope is not automatically promoted to PASS. CF54 complete, SC-001 withdrawn, newer-build installation testing user-owned. Decision: docs/macos-crlf-save-deferral-20261008.md.
