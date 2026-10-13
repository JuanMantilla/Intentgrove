# User launch follow-up — 2026-10-10

Observed: workspace opens without prompt; double-clicking the shell script produces Terminal's short-session message. Read-only inspection confirms /Applications/Intentgrove.app exists but lacks IGMarkdownDefaultConsent; the generated app has that marker. The no-argument script targets /Applications, so the installed older copy fails eligibility and exits4 before consent. The launch response preference is already1; its reason is not established by this read-only check. Host NSWorkspace snapshots remain unresolved; actual default status is not inferred.

Resolution: quit the running workspace and run the explicit script command in an existing Terminal window, supplying the generated app path. Do not reset preferences or change Terminal profiles. No app/default association/preference changes made during this diagnosis. The returned native prompt/result is needed to distinguish already-default from unresolved status.
