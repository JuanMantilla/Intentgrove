# F003L large-file source — visual proposal

**Status:** Draft. [Sketch](design/large-file-states.svg) depicts proposed states, not a running-app screenshot. Reuse F001 tab/shell and F002A tokens.

Before a >10 MiB file is loaded fully, an in-tab choice shows name/size and `Open read-only source` / `Abrir código fuente de solo lectura` or Cancel. For >50 MiB, show the limit and no open action. The source view has a persistent `Large file · read-only` label, line gutter, bounded loading progress and a compact Find/Go to Line band. Rich preview, section edit and Save controls are absent. Copy selection is available up to 1 MiB; a larger selection gets a clear narrowing message. Scrolling uses a virtualized window with stable line positions; long lines can scroll horizontally inside the source pane without widening the app shell.

Changing files show `Checking…`, then a fresh source or an uncertain/error state; old chunks never carry a current label. Cancel/close stops work and returns focus to the prior tab. Empty, unsupported encoding, missing, permission denied and storage/read errors have localized in-tab explanations and Retry or Reselect where scope allows.

At 640 points mode/Find controls wrap, leaving usable source height. Visible focus, EN/ES labels, line/column text, status announcements and no essential animation apply. Verify real trackpad scroll, text selection, 200% zoom and memory in a packaged app.
