# Dedicated Windows connection retry - 2026-10-06

QA-0005 connection check BLOCKED: 0 PASS, 0 FAIL, 1 BLOCKED case, three actual attempts. [Raw evidence](evidence/connection-retry-20261006T005732Z.json). No product cases executed or previous coverage totals changed. Latest located candidate remains the prior d95d2bcb sibling build; no new build attempted.

Direct @oai/sky initialization succeeds. Both inventory attempts and final attempt after supported kernel reset/reinitialization return native-pipe unavailable / OS error2. Reset repaired no observable native connectivity. No window, screenshot or AX returned. Underlying provider startup/session cause remains UNKNOWN; no helper startup log is exposed by the documented client.

Why QA cannot fix the remaining boundary: documented sky API only exposes app/window/input operations, not helper service restart/log inspection. Bundled computer-use SKILL explicitly says: "Do not spawn `codex-computer-use.exe`, search for the helper executable, or build a custom helper protocol client." Its recovery guidance ends with reporting failure after reset/retry. QA did not bypass that connection, elevate, change security settings, install dependencies or modify product code.

Department handoff: QA_AUTOMATION/native-session provider owns QA-0005 connection provisioning. Restore the supported native helper endpoint or expose provider startup logs to distinguish stopped helper, startup failure and session routing. Then rerun inventory before any native QA. Reconnecting the Computer Use session or restarting its host is a reasonable provider-side recovery to try, not a verified fix. QA-0003/4 acceptance remains blocked; old minimized/refresh-guard, higher-integrity and popup-bound failures are retained.
