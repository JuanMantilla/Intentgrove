# Owning-team repair and retest handoff

Existing implementation scope is authorized by October6; no design reapproval requested. QA performed no repairs. Return an exact source/config/package manifest and runnable disposable repaired candidate for retest. Do not modify current evidence, dirty unrelated editor work or historical approvals.

| Owner | Findings / priority | Smallest next action | Retest |
|---|---|---|---|
| NATIVE/OS_ENGINEERING | QA-0020 S2/P1 | Convert web-client bounds into actual native parent coordinates; instrument scale/flipping/titlebar. FRONTEND supplies measured region, no magic offset. | R04/R05/L05/L06/A07/A11 |
| NATIVE/OS_ENGINEERING | QA-0021 S2/P1 | Preserve source-relative original link context before virtual URL normalization; deliberate access only. | N08–N11 plus encoded/nested/explicit-file links |
| FRONTEND | QA-0022 S3/P2 | Separate HTML opening/no-follow IO copy from Markdown Save errors; native support verifies actual error classification. | R18/R24/O10 and real Markdown Save-failure regression |
| NATIVE/OS_ENGINEERING | Known handoff dependencies, not newly runtime-proven findings | Generated-heading capture keys, exact initiating-link focus, atomic ready-stage Reload replacement, rendered-text Find limits; IR03 deliberate default-handler contract remains outside this viewer-only runtime claim. | N03/L02/L08 and heading/history/refresh/restore failure cases |
| QA_AUTOMATION | Essential verification gaps | Add authorized final-package execution/IPC denial counters with positive controls and bounded delays for real lifecycle races; obtain valid native geometry/resize/VoiceOver capture and reference raster access. Do not change product assertions or security settings to manufacture PASS. | S02/S03/S07/S08/N15/L07 plus all BLOCKED/NOT TESTED rows |

No repaired candidate supplied during this run; no fix verified. All30 NOT TESTED cases and10 BLOCKED cases remain enumerated in coverage.json; they are not waived. Some reachable residual cases were left unexecuted once this candidate had actionable required failures; this run is PARTIAL, not completed acceptance. Owning repairs plus remaining QA execution are the exact next phase. Existing QA0018/19 are not closed by this snapshot or its444 mocked tests. Windows/minimum OS/installation restrictions retained.
