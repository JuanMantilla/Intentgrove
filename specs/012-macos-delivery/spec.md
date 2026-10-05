# Feature Specification: Private macOS Delivery

**Feature ID:** F005 | **Status:** Draft for approval | **Date:** 2026-09-29

## Outcome and boundary

Install and use the private Markdown workspace on macOS without development tools. Deliver a local `.app` and `.dmg` for the verified host architecture, with native menus, Finder Open With, file drop, safe Quit/Close and Dock reopen. A personal ad-hoc signed artifact can be verified locally. Developer ID signing, notarization, upload, publication, certificate purchase or OS security changes require separate explicit approval and are outside this draft's implementation authority.

## Stories and acceptance scenarios

1. **Install and launch (P1).** **AS-001** (R01/R02): Mount a local DMG, drag the app to Applications and launch it without Node/Rust/dev server; first-run state has useful Open Folder/File actions. **AS-002** (R03): Artifact metadata names actual macOS/CPU target, signature/notarization status and checksum accurately; unsupported OS/CPU shows a truthful compatibility limit rather than a false universal claim.
2. **Use macOS entry points (P1).** **AS-003** (R04): Native application/File/Edit/View/Window menus expose applicable open, Save, Find, Reload, zoom/appearance and Quit actions with macOS shortcuts; disabled items explain unavailable actions. **AS-004** (R05): Finder Open With on `.md`/`.markdown` and supported images opens the exact selected file in a tab using file-only scope, including when the app was already running. **AS-005** (R06): Dropping an allowed file/folder on the window opens it only after native validation; denied/unsupported/out-of-scope content gets a visible error and no broad grant.
3. **Preserve work across lifecycle (P1).** **AS-006** (R07): Titlebar Close, Cmd+W, Cmd+Q, app-menu Quit and Dock Quit honor F004 dirty choices; Cancel/failed Save keeps work open. **AS-007** (R08): Closing the last window then Dock reopening returns a window and F003C's session when available. **AS-008** (R09): App update/relaunch of a locally installed build retains user app data and source hashes; no files are written inside repositories by install, launch or restore.
4. **Release honestly (P1).** **AS-009** (R10): A private acceptance report lists every v1 requirement and packaged test as PASS/FAIL/BLOCKED/NOT TESTED, with host/build/fixture evidence; no untested platform or signing state is claimed as verified.

## Requirements

- **F005-R01:** Build a self-contained `.app` and local `.dmg` for the measured host macOS/CPU target, installable and launchable without development tools or browser.
- **F005-R02:** Provide a useful first-run empty state and clear local folder/file opening paths in the installed app.
- **F005-R03:** Record exact build hash, target, minimum OS decision, signing/notarization status and Gatekeeper results; do not claim Intel/universal or notarized support without evidence.
- **F005-R04:** Provide native macOS menus and conventional Command shortcuts for applicable actions; unavailable items must not invoke unsafe or misleading behavior.
- **F005-R05:** Finder Open With must accept supported Markdown and image files through file-only native scope on cold and warm launches, without granting sibling access.
- **F005-R06:** Window file/folder drop must validate type, scope and no-follow safety and show recoverable errors, with no source write.
- **F005-R07:** All native Close/Quit routes must coordinate with F004 dirty edit choices and durable F003C session completion before ordinary exit.
- **F005-R08:** Dock reopening after last-window close must restore a reachable window and available session state.
- **F005-R09:** Installation, launch and app update must preserve source files and private app data unless the user explicitly clears it through the app.
- **F005-R10:** Release readiness requires an evidence matrix for all v1 features, EN/ES keyboard/layout, filesystem integrity, untrusted content and actual packaged behavior; use PASS/FAIL/BLOCKED/NOT TESTED.

## Success criteria

- **SC-001:** Ten install/launch trials of the packaged app on a recorded compatible Mac work without dev tools; local DMG and installed app checksums/signing results are captured.
- **SC-002:** Ten Finder Open With and ten drop trials open exact fixture files/folders or show scoped errors; zero sibling files become readable through file-only selection and hashes remain unchanged.
- **SC-003:** All five Close/Quit routes and Dock reopen pass ten disposable dirty/clean journeys after F003C/F004 integration, including Cancel and failed Save.
- **SC-004:** The final v1 matrix contains an explicit status and evidence path for every accepted feature criterion; no BLOCKED/NOT TESTED check is described as verified.

## Assumptions

The verified development host is macOS arm64. Minimum supported macOS and extra architectures require tested decisions. Private ad-hoc signing is sufficient for local development evidence but is not a public distribution claim. F006 image association is conditional on F006 approval/implementation; F003C and F004 supply lifecycle state.
