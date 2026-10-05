# Feature Specification: Dark Theme

**Feature ID:** F002A (bounded rich-reading slice)  
**Feature directory:** specs/007-dark-theme  
**Created:** 2026-09-28  
**Status:** Draft for user approval  
**Input:** “add a dark theme”

## User outcome and boundaries

The reader can use a calm dark appearance across the app, choose Light or Dark explicitly, or follow macOS appearance. The choice survives app restart and applies to the existing reader, navigation, editor, menus, notices, and app-owned dialogs.

This slice changes appearance and adds one appearance control. It does not add custom palettes, themes downloaded from the internet, typography settings, full settings pages, Markdown features, or session restoration. Native OS dialogs retain platform behavior where the application cannot control their appearance.

## User Scenarios & Testing

### User Story 1 — Read in a dark workspace (P1)

The reader chooses Dark and can continue reading and navigating without a bright document panel or unreadable controls.

**Independent test:** Open a disposable Markdown folder with prose, links, code, tables, task lists, and local images. Choose Dark, navigate files, and inspect loading, empty, error, context menu, and modal states.

**Acceptance scenarios**

- **F002A-AS-001:** Given a running workspace, when Dark is selected, then all app-owned surfaces use the dark palette, the choice stays visible, and the active folder, tab, reading position, and keyboard focus are retained.
- **F002A-AS-002:** Given a Markdown document with code, tables, links, and an image, when Dark is selected, then text remains readable and the image pixels are not inverted or recolored.
- **F002A-AS-003:** Given a dark workspace, when a context menu, error, conflict, recovery, or confirmation dialog appears, then it uses legible dark surfaces and visible keyboard focus; status meaning does not depend only on color.

### User Story 2 — Follow system appearance or remember a choice (P1)

The reader can select System, Light, or Dark. An explicit preference remains stable; System follows macOS appearance changes.

**Independent test:** Exercise all three choices, restart the packaged app for each, and change OS appearance while System is selected and while an explicit choice is selected.

**Acceptance scenarios**

- **F002A-AS-004:** Given no saved preference, when the app opens, then System is selected and the first visible content uses the current macOS light or dark appearance.
- **F002A-AS-005:** Given System, when macOS appearance changes while the app is open, then the app updates without requiring restart or resetting document state.
- **F002A-AS-006:** Given an explicit Light or Dark preference, when macOS appearance changes or the app restarts, then the app keeps that explicit preference.
- **F002A-AS-007:** Given preference storage cannot be read or written, when the app opens or the user changes appearance, then reading remains available; invalid saved data falls back to System, and a failed save visibly explains that the current choice may not persist.

### User Story 3 — Change appearance during an edit (P1)

The reader changes appearance while editing one Markdown section without losing text, undo history, selection, recovery status, or editor position.

**Independent test:** Edit a disposable section, make two changes, switch theme, undo one change, and compare draft, disk bytes, selection, scroll, and recovery status.

**Acceptance scenarios**

- **F002A-AS-008:** Given an active dirty section edit, when appearance changes, then the same editor session, draft, undo/redo history, selection, caret, scroll, and conflict/recovery state remain available.
- **F002A-AS-009:** Given keyboard-only use in English or Spanish, when the user chooses appearance, then the control and all choices have localized accessible names, visible focus, and no clipped labels at the 640-point minimum width.

### Edge cases

- Theme changes during loading, refresh, saving, error recovery, or an open dialog do not trigger those operations again.
- Reduced Motion removes nonessential theme transition effects; input never waits for a transition.
- Transparent images keep their transparency and use the surrounding viewer surface; their underlying colors remain unchanged.
- Invalid or missing preference data resolves to System. A storage failure affects only appearance persistence.
- Platform titlebar and native picker colors may follow macOS where not controlled by the app; custom titlebar replacements are excluded.

## Requirements

### Functional requirements

- **F002A-R01:** The app MUST offer one keyboard-accessible appearance selector with System, Light, and Dark, defaulting to System when no valid saved choice exists.
- **F002A-R02:** Selecting Light or Dark MUST update every existing app-owned surface: shell, toolbar, tree, tabs, reader, source editor, preview, code, tables, context menus, notices, errors, recovery/conflict panels, and app-owned dialogs.
- **F002A-R03:** System MUST track macOS appearance changes while open; an explicit Light or Dark choice MUST override those changes.
- **F002A-R04:** The app MUST save the preference locally outside opened repositories, restore it on restart, and apply it before the first visible document content. Storage failures MUST keep the app usable and give a persistence warning.
- **F002A-R05:** Appearance changes MUST preserve folder and tab identity, reading/editor scroll, focus, selection, draft text, undo/redo history, conflict state, and recovery state, and MUST NOT modify source documents.
- **F002A-R06:** Body and control text MUST meet at least 4.5:1 contrast; large text and necessary focus/control indicators MUST meet at least 3:1. Existing status text/icons MUST remain understandable without color alone.
- **F002A-R07:** Images and other document-provided visual assets MUST retain their original colors; theme switching MUST NOT apply blanket inversion or modification to document content.
- **F002A-R08:** New controls and messages MUST support EN/ES, keyboard, 640-point layouts, and Reduce Motion. Optional UI color transitions MUST finish within 150 ms and MUST NOT move content.
- **F002A-R09:** Theme selection MUST use bundled assets and MUST NOT add network requests, repository writes, or new file-access authority.

### Key entities

- **Appearance preference:** System, Light, or Dark, stored locally for the app.
- **Resolved appearance:** Light or Dark, derived from the preference and current system appearance.
- **Palette:** App-owned semantic surface, text, focus, selection, accent, code, and status colors for the resolved appearance.

## Success Criteria

- **F002A-SC-001:** All three preference choices pass packaged startup/restart acceptance; System responds within one second of a confirmed macOS appearance change in ten consecutive trials.
- **F002A-SC-002:** Every listed app-owned surface passes the specified contrast checks in both themes; EN/ES controls remain reachable without clipping at 640 and 1440 points.
- **F002A-SC-003:** In ten theme changes during a disposable section edit, draft text, undo/redo, selection, focus, scroll, and source-file hashes are preserved.
- **F002A-SC-004:** Ten cold launches using a saved Dark preference show no light document frame before the first dark document frame. Native pre-content window chrome is checked separately according to platform limits.
- **F002A-SC-005:** Appearance selection and persistence complete with no app request for remote assets and no app-created files inside the disposable workspace.

## Assumptions and dependencies

- System / Light / Dark is the proposed interaction, matching docs/design-direction.md. Only dark-theme support was explicitly requested; this selector and default require review.
- The existing light palette remains the visual baseline. Dark uses restrained neutral surfaces with one blue-green accent.
- This feature changes the existing F001/F004 surface colors without changing their approved behaviors. F003C workspace restoration and F006 image tabs remain separately scoped.
- This draft, applicable visual sketch, and architecture need user approval before production implementation. The constitution's 0.2.0 amendment remains pending; this feature's motion rules are proposed here directly.

## Clarifications

### Session 2026-09-28

- Q: Remove offline and VoiceOver requirements/checks while keeping local-file reading and standard accessibility? → A: “remove the requirement/checks”. R08, R09 and SC-005 are narrowed accordingly; security, file integrity, keyboard and accessible names remain required.
