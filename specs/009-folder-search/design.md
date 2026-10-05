# F003F folder search — visual proposal

**Status:** Draft. [Sketch](design/search-states.svg) depicts proposed states, not a running-app screenshot. Reuse the F001 sidebar/tab language and F002A semantic tokens.

Command+Shift+F opens Search in the left panel, focusing one query field. A segmented Name/Text choice and labeled `Include ignored` toggle sit beneath it. Results stream as filename, relative parent path, line/context and match emphasis. The header gives scanned files, matches, skipped files and an honest `Searching`, `Complete`, `Stopped` or `Partial` label. Stop is visible during work. Selecting a result opens the file in a tab and locates the current passage; a changed result shows a compact location-fallback notice.

At 640 points the Search panel temporarily takes the sidebar width and can be hidden to read, without discarding verified results. At 900/1440 points it is resizable but cannot consume the page. Long paths wrap or truncate visually with full accessible names. Empty query gives instructions, zero results says so, skipped-file details are expandable, and cancelled scans keep verified hits marked partial. A new root/query clears old results before progress restarts.

Status is text and shape, not color alone. Results use ordered list semantics, keyboard arrow/Tab behavior, visible focus, and polite throttled count announcements. EN/ES labels must fit; no progress animation is essential. Default exclusion help explains `.gitignore` and the visible ignored toggle. Hostile filenames are plain text, never HTML. Packaged focus, 200% zoom and timing need verification.
