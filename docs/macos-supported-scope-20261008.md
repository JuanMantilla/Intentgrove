# Supported acceptance scope — 2026-10-08

User direction: “let's focus on apple silycon only, older versions aren't supported”, clarified as “Remove both older macOS and older-package upgrade testing”.

Current delivery acceptance targets Apple Silicon arm64 on the current macOS release (host 27.0.1). CF52 (macOS 14), CF53 (Intel/universal) and CF55 (older-package upgrade/rollback) are removed from the active gate, with historical evidence retained; no PASS is inferred. Production-identifier runtime remains required. The later seven-check amendment removes fresh Applications installation/rollback from the active gate. Package minimum-OS metadata is unchanged and does not promise older-OS support. No security/deployment/signing/publication changes are authorized by this scope decision.


Additional current acceptance exclusions: [seven-check amendment](macos-acceptance-exclusions-20261008.md). All three demonstrated defects remain open.
