# F005 macOS delivery — visual and interaction proposal

**Status:** Draft. [Sketch](design/macos-entry-states.svg) shows proposed entry states, not a screenshot or Finder proof. Reuse approved app chrome, system traffic lights and F002A palettes.

The native application menu has About, Settings and Quit; File has Open File/Folder, Close Tab and Save when relevant; Edit keeps standard text actions; View has Find, Folder Search, Reload and appearance/reading controls where implemented; Window has normal window actions. Shortcut labels match the actual command map. A disabled action is discoverable with an accessible reason. Menus do not create a parallel custom title bar.

Finder Open With on supported files routes to the same tab shell as Open File, showing an unavailable/unsupported error inside a tab if validation fails. Window drop uses a restrained in-window target outline and textual `Open file or folder`; rejected items show a localized reason. Neither entry point silently grants a parent directory. A second file event while the app is running opens/focuses the exact requested file.

Last-window Close and app Quit use F004 choices when dirty. Cancel returns focus to the editor. Dock reopen shows the F003C restored window or the ordinary no-folder start view. The DMG uses a simple drag-to-Applications layout with app icon/alias and no invented brand; exact icon/name require a separate product naming decision before external publication. At 640/900/1440 points, EN/ES focus and prompts use existing design language. Actual Finder, Gatekeeper, install and Dock behavior require packaged testing.
