# F001 input — workspace reader

This brief is input to `$speckit-specify`; it is not the final `spec.md`.
Read the confirmed product context and relevant proposed defaults before drafting.
Do not build all later roadmap slices in this specification.

## User story
As a developer, I select a local repository folder, browse its directory tree,
and open Markdown files in tabs so I can read documentation without a browser,
internet connection or modifications to the source files.

## Slice boundary
Include the installed desktop shell, folder/file selection, incremental directory
browsing, tabs, basic GFM rendering (headings, lists, links, local images, tables,
task lists and fenced code), safe relative local navigation, and meaningful
empty/error/blocked states. Provide testable security boundaries from day one.
This slice is read-only; editing, advanced rendering and continuity arrive in
later explicitly listed roadmap slices.

## Candidate requirements
- F001-R01: Selecting a local root exposes its directory structure with the
  documented exclusions and a visible Markdown filter.
- F001-R02: Opening supported Markdown renders its body in a tab. Reopening the
  same canonical file activates that tab instead of accidentally duplicating it.
- F001-R03: Multiple different files retain independent active/scroll state within
  the running session; duplicate names show a distinguishable parent path.
- F001-R04: Local relative Markdown links and heading anchors resolve inside the
  allowed scope. Out-of-scope assets/paths are blocked with a meaningful state.
- F001-R05: Document loading/reading does not alter bytes, names, metadata on which
  the app relies, or create app files in the opened repository. Test byte hashes;
  do not promise that OS access timestamps never change.
- F001-R06: Remote images, embedded HTML/scripts, executable URLs, MDX and fenced
  code cannot initiate network requests or native execution through this app.
- F001-R07: Missing/denied/binary/invalid-encoding/oversize files have recoverable
  states. No partial buffer is presented as a complete editable file.
- F001-R08: Navigation is keyboard-accessible, loading is cancellable where needed,
  and long/deep folders do not require a full blocking scan before any content.
- F001-R09: The built app reads bundled fixtures
  without a separately running browser or development server.

## Acceptance examples to refine
1. Given a nested local repo with two README.md files, open both and distinguish
   them; switch tabs and retain their individual positions.
2. Given a document with a table, checklist, local PNG and a relative Markdown
   link, render it and follow the local link without altering either source file.
3. Given a document with a remote image and a script element, show the defined
   placeholders/escaped source; observe no remote request or script execution.
4. Given a linked path that escapes through `..` or a symlink/alias, refuse implicit
   access. An explicitly selected external file can be opened without granting
   automatic access to the entire external directory.
5. Given a file deleted after listing, selecting it shows an error and the rest
   of the workspace remains usable.
6. Given a non-ASCII/spaced path, open the intended file and resolve allowed local
   assets correctly. Add adversarial percent-encoded/path-case variants.
7. Compare content hashes across all opened test files before and after reading.
8. Run the packaged development build with the dev server stopped. Record
   which macOS version/architecture/WebKit runtime and which desktop checks were actually tested.

## Required planning outputs
A spec with prioritized stories and IDs; explicit exclusions; a UX design with
states; a technical plan with file/IPC trust boundaries; an acceptance test matrix;
and small dependency-ordered tasks. Use disposable sample repositories for tests.
No completed test results or approvals should be pre-filled.
