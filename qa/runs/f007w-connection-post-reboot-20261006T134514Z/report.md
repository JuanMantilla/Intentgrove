# Post-reboot Windows connection retest

**BLOCKED**: 1 connection case, 2 actual discovery attempts; 0 PASS/FAIL and 0 native product cases. Windows restart is USER_REPORTED; the reboot itself was not independently inspected.

Dedicated node_repl/@oai/sky list_windows fails before returning a window. Supported client reset succeeds; direct import and fresh list_apps then fail identically:

`Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified. (os error 2)`

The reported reboot and fresh client did not restore observed native access. Underlying cause remains UNKNOWN. No Settings, Task Manager, native dialog, screenshot/AX, input or product launch. Previous candidate ad594484d4687ca994354cefc48ff2ab10ad81e577e185f0597e9ad13517906c was not launched or reverified in this connection-only check. Prior 80-row charter ledger and build/source evidence remain separate and unchanged; no native repair or release readiness inferred.

Product source, display settings and processes untouched. Earlier minimized/refresh-guard, higher-integrity, popup-bound, restricted-runner failures and historical per-build/scale passes preserved. QA-0003/4/5 remain OPEN. Current Mac acceptance still requires actual Mac evidence; Linux unsupported.

[Coverage](coverage.json), [exact tool outputs](evidence/connection.json).

**Department handoff — QA_AUTOMATION/native-session provider, QA-0005:** restore host-managed native endpoint or collect provider startup/session logs to explain why the listener is absent/unreachable. Acceptance: dedicated list_windows returns actual windows, then inspect the narrower Settings/Task Manager/dialog boundaries. No further authorization is needed. OS_ENGINEERING/QA-0003 and FRONTEND/QA-0004 native acceptance remain dependent on restored access.
