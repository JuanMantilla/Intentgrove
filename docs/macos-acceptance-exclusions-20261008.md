# Native acceptance scope amendment — 2026-10-08

User authorization: **“Exclude the seven blocked checks; retain all three defects”.**

The following seven checks are no longer required for current Apple Silicon/current macOS acceptance. This amendment supersedes conflicting requirements in the original completion contract, continuation handoffs and current run documents for these exact checks only.

| Check ID | Excluded requirement |
|---|---|
| DOCK-MATRIX | Remaining actual Dock Quit/reopen compound repetitions |
| TITLE-CLEAN-MATRIX | Ten visible clean title Close → actual Dock reopen journeys |
| SEARCH-TIMING-DEFAULT | Exact default production Stop latency measurement |
| CF48-KEYBOARD-SEARCH-JOURNEYS | All start/result-open/toggle/Stop/empty/error/close keyboard journeys EN/ES each exact width |
| CURRENT-INSTALL-ROLLBACK | Install latest frozen package, ten ordinary launches and reversible uninstall/rollback |
| CURRENT-NATIVE-OPEN-DROPS | Current-candidate Finder Open With and real file/folder/Settings drops, required repetitions |
| FIND-VISIBLE-GEOMETRY | Find control painting/visible geometry discrepancy |

The recorded BLOCKED results and evidence remain historical. Current gate status is NOT_APPLICABLE (explicit user exclusion); no PASS is inferred. Do not request these gestures, measurements or repetitions merely to close the acceptance gate.

QA-0017 (CRLF Save), QA-0018 (intermittent valid Mermaid fallback) and QA-0019 (PNG Reload recovery) remain OPEN with their recorded FAIL results. This amendment does not waive those defects or grant implementation/release approval.

Broader criteria are narrowed only by the listed exclusions: CF42 retains the CRLF Save failure and other non-excluded requirements; CF48 retains the diagram failure and non-excluded image/layout requirements. Exact default-production Stop latency and the listed full keyboard-search matrix are excluded. Other previously required performance checks, such as warm 1/10 MiB measurements, are not silently waived by this amendment.

Current installation/rollback and current-candidate Finder/drop repetitions are removed from the active gate, including CF54. Historical installation/drop constituent passes stay tied to their original candidate. Existing older-OS, Intel/universal and older-package-upgrade exclusions remain unchanged. No package metadata, source code, profile, backup or security settings change.

Machine-readable authorization, exact IDs and historical blocked records: [scope receipt](macos-acceptance-exclusions-20261008.json).
