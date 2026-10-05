# Delivery roadmap

Each row is a vertical feature with its own approved specification, tasks and
verification. The first slice is intentionally smaller than the full first release.
The initial five slices and the later image-viewing request constitute the proposed v1 scope.

| Slice | Outcome | Included work | Required gate evidence |
|---|---|---|---|
| F001 workspace-reader | Open a local folder and read documents in a desktop window | Directory browsing, Markdown tabs, GFM basics, local links/images, scoped file reads, basic empty/error states | Approved spec/design/architecture; macOS reading proof; no input file modifications |
| F002 rich-reading | Read technical documentation comfortably | Mermaid, YAML metadata, code highlighting completion, table of contents, Roboto/local fonts, typography, themes and EN/ES | Rendering fixtures, blocked network/resource fixtures, visual/accessibility review |
| F003 workspace-continuity | Navigate a repo across sessions | Document/folder search, recents, tab/session/scroll restoration, automatic refresh for clean buffers, large-file mode | Search/cancellation tests, restart scenarios, external writer tests, bounded performance evidence |
| F004 safe-editing | Edit without losing user work | Source/split editor, undo/redo, dirty tabs, save/save-as, encoding/line-ending preservation, conflict UI, recovery drafts | Save failure and concurrent-writer tests; data-integrity regression |
| F005 macos-delivery | Install and use without development tools | .app/.dmg, native menus, Finder Open With and file-drop completion, signing decision, release hardening | macOS installation; real Finder/quit/reopen checks; full v1 acceptance matrix |
| F006 image-viewing | Open local images while reading a workspace | Read-only image tabs, common-format inline images including safe SVG, Fit/zoom and refresh | Approved image spec/design/architecture, image fixtures, unsafe-content and no-write evidence |

F002A is the bounded dark-theme slice of F002, specified in specs/007-dark-theme.
Its System/Light/Dark preference, visual palette, and architecture were approved on 2026-09-28 and implemented. Automated verification and the local signed build pass; packaged accessibility and appearance/restart acceptance remain open in its evidence.md.
F006 is specified in specs/006-view-local-images; its format list and viewer controls were approved on 2026-09-29 and implementation is pending.

The remaining v1 work has approved Spec Kit review sets: F002R in `specs/008-rich-reading`, F003F folder search in `specs/009-folder-search`, F003R recents in `specs/010-recent-items`, F003L large-file source mode in `specs/011-large-file-mode`, and F005 private macOS delivery in `specs/012-macos-delivery`. F003S document Find and F003C session restoration remain in `specs/003-document-text-search` and `specs/004-restore-workspace-session`. The user approved these sets on 2026-09-29; [the recorded gates](approvals.md) identify the exact approved hashes. Implementation and packaged verification remain separate.

Security and accessibility apply from F001 onward. F005 is not permission to defer
filesystem safety, localization architecture, UI consistency or test foundations.
The designer may design the coherent shell early; implementation still follows
the slices. Ensure F001's foundations can add the later slices without premature
framework-building or shipping their behavior before approval.

Proposed later releases: Windows, Ubuntu; then reconsider requests such as exporting,
printing and multi-root workspaces only when explicitly prioritized.
