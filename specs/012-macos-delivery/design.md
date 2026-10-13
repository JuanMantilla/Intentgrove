# F005 macOS delivery — visual and interaction proposal

**Status:** Draft. [Sketch](design/macos-entry-states.svg) shows proposed entry states, not a screenshot or Finder proof. Reuse approved app chrome, system traffic lights and F002A palettes.

The native application menu has About, Settings and Quit; File has Open File/Folder, Close Tab and Save when relevant; Edit keeps standard text actions; View has Find, Folder Search, Reload and appearance/reading controls where implemented; Window has normal window actions. Shortcut labels match the actual command map. A disabled action is discoverable with an accessible reason. Menus do not create a parallel custom title bar.

Finder Open With on supported files routes to the same tab shell as Open File, showing an unavailable/unsupported error inside a tab if validation fails. Window drop uses a restrained in-window target outline and textual `Open file or folder`; rejected items show a localized reason. Neither entry point silently grants a parent directory. A second file event while the app is running opens/focuses the exact requested file.

Last-window Close and app Quit use F004 choices when dirty. Cancel returns focus to the editor. Dock reopen shows the F003C restored window or the ordinary no-folder start view. The DMG uses a simple drag-to-Applications layout with app icon/alias and no invented brand; exact icon/name require a separate product naming decision before external publication. At 640/900/1440 points, EN/ES focus and prompts use existing design language. Actual Finder, Gatekeeper, install and Dock behavior require packaged testing.


## Proposed Markdown default-app opt-in — 2026-10-10

New user-requested work; DRAFT FOR REVIEW, separate from accepted current-version closeout. Visual direction: [concrete amendment](default-markdown-20261010/design.md). No implementation or real association changes performed.

## Automatic native file interaction — 2026-10-10

User chose automatic focused tabs with workspace/draft preservation and all supported native file entries. Supported files no longer require an Open item action; folder entries keep it. Rejected entries retain localized error and accessible Dismiss controls. Restore/destructive decisions take precedence. [Scoped amendment](automatic-native-open-20261010/amendment.md). No visual redesign.
