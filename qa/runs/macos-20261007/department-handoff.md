# Department handoff

| Primary owner | Finding / gap | Next action |
|---|---|---|
| FRONTEND | QA-0006 | Trace supported image refresh versus tab error routing; retest truthful status without hiding native failures. |
| FRONTEND + QA_AUTOMATION | QA-0007 intermittent session checkpoint exception | Reproduce parallel suite `Invalid active session tab` with pending folder/tab transitions; retain failed run and serial/focused passing retries. No root-cause assertion. |
| QA_AUTOMATION / native provider | Finder/drop and Dock BLOCKED | Restore supported Finder window/drag/Dock access without changing security policy; run procedures in report. |
| OS_ENGINEERING | F005 compatibility/signing/install gaps | Follow current readiness procedures on authorized macOS 14/Intel/disposable install environments; preserve Gatekeeper rejection. |
| FRONTEND + OS_ENGINEERING | F002R T004/T007/T008 | Complete parser-wide localized fallback/performance and packaged isolated diagram spike before enabling Mermaid. |

These are local routing recommendations, not external tickets or release approval. No application fixes occurred during QA RUN.

Additional automated investigation: numeric Settings Escape failed once in the final broad run (draft reverted but close called too early); focused Settings5 passed. FRONTEND/QA_AUTOMATION should distinguish hydration/timer scheduling from an Escape propagation race. The accidental evidence .test.ts discovery failure was a run-owned archive naming mistake and is corrected as .test.ts.txt, not a product defect.

QA_AUTOMATION (supporting FRONTEND): QA-0007 and QA-0008 are separate intermittent mocked-run failures. Reproduce the session invariant and numeric Escape scheduling separately; native impact is not established. FRONTEND owns QA-0006's observed image status. Native provider owns Finder/drop/Dock access recovery; OS_ENGINEERING owns unavailable compatibility/install acceptance. Final-source focused reference/fallback/outline follow-up passed three cases; no broad acceptance promotion.
