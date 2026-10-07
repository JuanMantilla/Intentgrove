# QA-0005 connection investigation

User authorization confirmed for necessary QA work. Connection remains BLOCKED; one native discovery case BLOCKED, zero product cases executed. [Raw observations](evidence/connection-investigation.json).

Direct client import is available through the tool loader; ordinary Node resolution cannot expose its source. Local manifest declares only node_repl turn_ended hooks, not a native helper start/reconnect/log command. Bundled documented API contains app/window/input operations and client reset recovery. An actual sky.list_windows probe also returns absent native-pipe OS error2. These observations narrow the available repair boundary; they do not establish why the native endpoint failed to start or disappeared. No provider startup logs available through supplied API.

General official [plugin troubleshooting](https://developers.openai.com/plugins/deploy/troubleshooting) recommends isolating server/client layers; it supplies no specific Windows native-helper repair for this error. No generic API-hosted computer-use substitute used for native Windows acceptance.

Next prerequisite is lifecycle recovery of the host-managed Computer Use session, then fresh inventory. The agent has no host restart/reconnect control and cannot automate the ChatGPT/Codex host UI through this connection. Already-authorized QA does not require another approval; it requires a working endpoint. A user/provider host restart or reconnect is an unverified recovery suggestion. If that fails, provider startup/session logs are needed. QA_AUTOMATION/native-session provider remains the investigating owner.

Product remains read-only; no helper installed/launched manually, custom protocol client, security change or elevation. Existing QA-0003/4/5 open statuses, candidate mismatch, prior minimized/refresh/integrity/popup failures and Mac/Linux restrictions remain. Previous 75-row product/scale ledger unchanged.
