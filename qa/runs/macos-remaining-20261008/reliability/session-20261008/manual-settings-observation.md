# Actual native QA observation before code rebuild

Exact QA executable60397783f841ffb1451457a58301289586b67a28d7ac44b0ac8d3bf7c9661dd4, PID31314, authenticated runner /private/tmp/f002a-qa-m6jedkmj (raw protocol/host copied to manual-qa-before-build). CUA selected exact app path. Reader AX/screenshot showed blank surface despite live native renderer snapshots; do not infer reader initialization failure from that capture. No screenshot file was saved.

Native Cmd-comma opened actual Settings, showing enabled Reading/Project tree and no owner-unavailable notice. CUA setValue first refused with “user changed app”; re-query and normal click/type/Tab succeeded. Text-size16→18 showed Waiting for acknowledgment then enabled18px controls. Restored18→16, observed pending then enabled16px. Done and normal Cmd-Q quit the owned app. Sending protocol finish after app exit caused BrokenPipeError in qa_runner; normal app quit was already observed, not an app defect. Preserve that runner failure. No production profile changes.

This establishes current package integration for the observed attempt. It does not recover the earlier owner-unavailable snapshot or explain the historical timeout cause. Subsequent instrumented run adds deterministic owner/listener/native acknowledgment records.
