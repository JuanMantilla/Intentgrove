# Coverage

{'PASS': 15, 'NOT TESTED': 5, 'BLOCKED': 6, 'FAIL': 1}

| ID | Check | Result | Evidence / limit |
|---|---|---|---|
| MA01 | Settings preference-only window | PASS | 02-settings.txt;02-settings.png — Separate window; General focus and Done return observed. |
| MA02 | Settings focus suppresses Go dispatch | PASS | 10-settings-history-go.txt — With committed history, Back remained enabled but dispatch was ignored; closing Settings retained entry.md. Empty-history actions were disabled. No all-focus-state guarantee. |
| MA03 | Native Back/Forward | PASS | 09-go-menu.txt;tool transcript — Back selected scoped.md; Forward selected entry.md with correct next/previous guards. |
| MA04 | Native Visited/Clear actions | NOT TESTED | 09-go-menu.txt — Enabled entries inspected; activation/clear retention not executed. |
| MA05 | Command O/F/W/Q | PASS | 05-dirty-close.txt;06-failed-save.txt;16-reopen-find.txt — O opened native chooser; F focused Find and returned 1 of 1; W/Q invoked dirty guards. |
| MA06 | Remaining Command shortcuts | NOT TESTED |  — No complete shortcut inventory, Cmd-comma/Save/close-tab matrix. |
| MA07 | Finder warm file open | BLOCKED | tool transcript — Finder getApp returned cgWindowNotFound; no accessible Finder window. launch_app is unavailable on this surface. |
| MA08 | Finder cold file open | BLOCKED | tool transcript — Same Finder access blocker; no cold-open result inferred from chooser or reopen. |
| MA09 | File drop | BLOCKED | tool transcript — No accessible Finder drag source/cross-window surface. |
| MA10 | Folder drop | BLOCKED | tool transcript — Same drag-source blocker. |
| MA11 | Settings ignores drops | BLOCKED |  — Settings event policy preserved in code; actual file drop cannot be exercised without drag source. |
| MA12 | Dirty Close Cancel | PASS | 05-dirty-close.txt;05-dirty-close.png — Cmd-W choices; Cancel retained exact Disposable unsaved draft 20261007. |
| MA13 | Dirty Quit Cancel | PASS | 06-failed-save.txt;tool transcript — Cmd-Q choices; after failed Save, Cancel retained open editor/draft. |
| MA14 | Failed Save on moved source | PASS | 06-failed-save.txt;06-failed-save.png — Temporarily moved only scoped.md to backup; Save refused missing source, retained draft and close choice. Restored exact source. |
| MA15 | Keep draft and session recovery | PASS | 07-restored-draft.txt;07-restored-draft.png — Keep draft followed by tool-managed reopen restored exact draft/root/tab and conflict review. Process-exit timing was not independently recorded for this dirty trial. |
| MA16 | Preference persistence | PASS | 08-restored-settings.txt — Changed 16 to 18 px; restored Settings showed 18 after reopen. One trial only. |
| MA17 | Close Window/LaunchServices reopen | PASS | 16-reopen-find.txt;tool transcript — File Close Window retained running app; getApp reopened same candidate; five tabs and entry.md restored, Find usable. |
| MA18 | Actual Dock reopen | BLOCKED | tool transcript — getApp(com.apple.dock) timed out. LaunchServices reopen is separately recorded, not substituted. |
| MA19 | Selected-folder search/open | PASS | 04-scoped-search.txt;04-scoped-search.png — Enabled notes action, Both mode, confirmed scope notes; Needle returned only notes/scoped.md (root match excluded), opaque native hit opened document/Find. |
| MA20 | Native pending scope/error race journeys | NOT TESTED | ../../../os-engineering/evidence/macos-20261007/scope-tests.log — Nine mocked panel tests cover scope/cancel/buffered batch/stale open/Spanish changed-scope recovery; actual native replacement and EN/ES focus matrix not executed. |
| MA21 | Image grant/security boundaries | PASS | 11-images-blocked.png;14-root-images.png — File-only Markdown blocked sibling assets; root-granted Markdown displayed PNG; remote/scripted SVG stayed blocked. No independent request/network observation. |
| MA22 | Image raster refresh | PASS | 12-standalone-png.png;13-image-refresh.png — Valid 128x128 PNG decoded by packaged helper; in-place red-to-green bytes refreshed displayed raster. |
| MA23 | Image refreshed status accuracy | FAIL | 13-image-refresh.txt;13-image-refresh.png — Supported refreshed PNG displays correctly but tab AX/help reports unsupported content. QA-0006; persisted again after reopen. |
| MA24 | Large source bounds/end/tab responsiveness | PASS | 15-large-end.txt;15-large-end.png — 12,900,027 bytes; explicit read-only mode; 65,536-byte final window reached end and another Markdown tab remained usable. |
| MA25 | Large/rich performance acceptance | NOT TESTED | 15-large-observation-ms.txt;15-large-source-ms.txt — 508/621 ms bounded action-to-observation intervals include automation overhead. Not ten trials, app-ready clock, memory profile, or rich 1/10 MiB SC proof. |
| MA26 | Source preservation/cleanup | PASS | source-preservation.txt;17-cleanup-inventory.json — entry.md/scoped.md hashes identical; disposable moved source restored; no remaining editor recovery offers; QA app isRunning=false. PNG mutation was intentional fixture work. |
| MA27 | Complete EN/ES/zoom/theme acceptance | NOT TESTED |  — Native English/System only; Spanish recovery automated with mocked bridge. No full locale/zoom/Reduce Motion matrix. |
