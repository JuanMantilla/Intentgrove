# Native acceptance handoff

**INCOMPLETE / FAILURES_PRESENT:** production `34405daf…`; 315 PASS, 3 FAIL, 7 NOT_APPLICABLE constituent checks. Full CF42/CF48 acceptance is not established. Historical fourteen b7 passes remain unchanged.

| Owner / skill | Next action |
|---|---|
| FRONTEND / $senior-frontend-developer | QA-0017: compare CRLF source, editor value and actual Save payload; repair supported consistent line endings. QA-0019: compare Reload/Retry invalidation and clear resolved image errors. Freeze a rebuilt candidate for QA. |
| OS_ENGINEERING / $os-senior-expert | QA-0018: correlate render generation, helper start/exit/reply, validation and cancellation during layout transitions. Root cause unknown. Support native payload diagnosis for 0017/0019. |
| QA_AUTOMATION | The seven excluded checks need no further gate work. Preserve their evidence. Support trusted measurements for non-excluded performance criteria and causal capture for open defects; QA-0013 remains unresolved. |
| RELEASE / OS_ENGINEERING | Current installation/launch/removal/rollback acceptance is explicitly excluded. Preserve candidate/package provenance; no installation or publication is required by this gate. |
| QA | Retest the three retained defects after fixes and finish non-excluded original criteria, including image-edge and warm performance checks. Do not require any of the seven excluded checks. |

Read report.md, coverage.json and resumption-checkpoint.md. Application source remains read-only in QA. Backup, original fixtures and historical evidence are preserved; preferences restored. Older OS, Intel/universal and older-package upgrades remain excluded.


## User-approved scope change — 2026-10-08T21:38:45.559000+00:00

User: “Exclude the seven blocked checks; retain all three defects”. Authoritative amendment: docs/macos-acceptance-exclusions-20261008.md (exact seven IDs and historical records in the adjacent JSON receipt).

The seven former BLOCKED rows are now NOT_APPLICABLE by explicit exclusion, not PASS. Current native-final ledger: 325 rows, 315 PASS, 3 FAIL, 7 NOT_APPLICABLE; zero active BLOCKED rows. QA-0017/0018/0019 remain OPEN and FAIL. Overall acceptance remains incomplete; this decision does not waive other non-excluded original criteria or approve a release. Do not continue requiring the excluded Dock/title, exact production Stop timing, full six keyboard-search journeys, current installation/rollback, Finder/drop repetitions or Find visibility-discrepancy checks.

Earlier blocked counts and next steps are historical and superseded for these seven checks only. CF42/CF48 retain their defects and non-excluded scope. CF54 is removed from the active gate. Product source, backup, fixtures and preferences are unchanged by this scope amendment.
