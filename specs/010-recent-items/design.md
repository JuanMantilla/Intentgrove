# F003R recent items — visual proposal

**Status:** Draft. [Sketch](design/recent-states.svg) is a state proposal, not a screenshot. Reuse existing first-run panel and tab/menu styles.

The no-folder start view shows `Recent folders` and `Recent documents` below Open Folder/Open File, with the most recent first. Each row shows filename/folder name and muted distinguishing parent context; full path is accessible and available on hover/focus without clipping. Current workspace entries are identified in text. A missing/replaced item remains visible with `Reselect` rather than silently opening another item. A recent item selection never bypasses the native scope check.

`Remove from Recents` belongs to each row's labeled action menu. `Clear Recents` is a separate footer action with a confirmation that explicitly says current open tabs and drafts remain. Session clearing stays in its F003C settings location with its own draft-aware copy. Empty history has one sentence and primary Open actions. Corrupt-list recovery uses the same empty view with a localized nonblocking explanation.

At 640 points rows wrap and their action buttons remain keyboard reachable; at 900/1440 points two compact columns may appear without overpowering the reading view. Use existing F002A text, surface and focus tokens. EN/ES, visible focus, list semantics and no motion-dependent meaning require packaged checks.
