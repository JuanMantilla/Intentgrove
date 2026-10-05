# Feature Specification: Windows desktop port (F007W)

**Feature directory**: `specs/013-windows-desktop` (Git branch remains `main`)
**Created**: 2026-10-05
**Status**: Draft — ready for approval; production implementation not authorized yet
**Input**: “$os-senior-expert please start working on a windows version of the md-reader app”

## User Scenarios & Testing

### User Story 1 - Read a local workspace on Windows (Priority: P1)

A Windows user opens a folder or individual Markdown file and uses the existing document-focused interface, tabs, local links, outline, Find and folder search.

**Why this priority**: A usable, safe reader is the first port milestone.
**Independent Test**: Open a disposable repository and an explicitly selected outside file; read, search and close without changing any input file.

**Acceptance Scenarios**:

1. **Given** a local folder with spaced and non-ASCII names, **When** the user selects it, **Then** Markdown renders and tabs/search work in English and Spanish (FR-001, FR-002).
2. **Given** an individually selected file, **When** its Markdown links to an unselected sibling, **Then** access remains blocked until explicit selection (FR-003).
3. **Given** a junction, symbolic link, network location, unhydrated cloud file or replaced root, **When** opening or traversing it, **Then** the app refuses unsafe access with a clear error and does not read content outside its grant (FR-003, FR-004).
4. **Given** a read-only milestone build, **When** viewing Markdown or images, **Then** unavailable editing/image capabilities are explained and no action falsely reports success (FR-010).

### User Story 2 - Preserve edits and local continuity (Priority: P2)

Once the filesystem and persistence boundaries pass Windows verification, users edit, save, restore sessions and recover drafts with the existing data-protection rules.

**Why this priority**: Writing must follow demonstrated Windows data safety.
**Independent Test**: Edit a disposable UTF-8/BOM/CRLF document, restart and recover, then inject save failures and a competing writer.

**Acceptance Scenarios**:

1. **Given** an edited section, **When** Save succeeds, **Then** unchanged bytes, BOM and line endings are preserved and saved content is verified (FR-005).
2. **Given** denial, a sharing violation or a competing writer, **When** saving, **Then** recoverable work remains available and no detected newer version is silently overwritten; post-commit uncertainty is reported truthfully (FR-005, FR-006).
3. **Given** clean and dirty tabs, **When** an external writer replaces a file, **Then** clean tabs reconcile and dirty buffers remain intact with conflict feedback (FR-007).
4. **Given** local session/recovery data, **When** restarting or clearing it, **Then** the existing confirmation rules apply and original files are not modified (FR-006).

### User Story 3 - Use a Windows desktop build (Priority: P3)

A normal Windows user launches the private build, uses familiar keyboard/window behavior and, after packaging validation, a per-user installer.

**Why this priority**: Runtime and distribution evidence must follow native implementation.
**Independent Test**: Launch as a standard user, open through dialogs/drop, exercise shortcuts and scaling, cancel close with dirty work, then approve close and confirm process termination.

**Acceptance Scenarios**:

1. **Given** the Windows app, **When** using Ctrl-based commands, Alt+F4 or the window close button, **Then** commands work and dirty-work confirmation precedes exit (FR-008).
2. **Given** 100%, 150% and 200% display scaling, **When** resizing to supported window bounds, **Then** core controls and keyboard focus remain usable (FR-002).
3. **Given** a packaged build with its required runtime present, **When** launching as a standard user, **Then** it runs without developer tools and without elevation (FR-009).
4. **Given** an unavailable image decoder, **When** viewing an image, **Then** the app explains the limitation without exposing raw untrusted image data through a weaker decoding path (FR-010).

### Edge Cases

Drive-relative paths, UNC/device paths, alternate data streams, reserved names, trailing dots/spaces, long paths, invalid Unicode names, case-sensitive directories, hard links, changing parent directories, reparse points, cloud recall attributes, read-only/locked files, abrupt shutdown, second app instance, stale persisted identities and decoder crashes/timeouts. Unsupported cases must fail clearly; their rejection is part of acceptance.

## Requirements

### Functional Requirements

- **FR-001**: Provide folder/file selection, Markdown tabs, rendering, scoped local links, outline, Find and folder search with existing size limits: normal documents through 10 MiB, opt-in read-only large source through 50 MiB, refusal above 50 MiB.
- **FR-002**: Reuse the existing interface, themes, bundled resources and EN/ES catalog. Replace Mac-specific labels and keyboard hints only where needed for Windows. No visual redesign.
- **FR-003**: Native access must remain bound to explicit selections and current file identity; path normalization alone cannot authorize content. Reject traversal, alternate streams, device/drive-relative paths and reparse traversal. Explicit file grants never authorize siblings.
- **FR-004**: Initially support local NTFS workspaces. Reject network locations, all reparse points (including hydrated cloud-managed files retaining reparse tags) and cloud content requiring recall before content reads. Unknown locality or unsafe identity checks must fail closed. Do not change system policy to accept a location.
- **FR-005**: Editing requires verified Windows Save/Save As behavior, same-directory staging, conflict checks and preservation of unselected bytes/encoding. Separate pre-commit failure from post-commit uncertainty; never claim an original is unchanged after a confirmed replacement.
- **FR-006**: Recents, sessions, recovery drafts and safety copies live in private per-user app storage. Preserve existing record schemas where possible, validate restored selections and serialize concurrent writers. No migration of Mac data or repository-local metadata.
- **FR-007**: Keep watcher events as hints and reconcile against native identity/content. Preserve dirty buffers during refresh and cancellation.
- **FR-008**: Support Ctrl-based commands, native dialogs, drag/drop, guarded close and final-window process exit. Do not add global shortcuts, startup tasks or file associations in the first milestone.
- **FR-009**: Deliver a private Windows x64 build followed by a per-user installer after native verification. No signing, publication, automatic updates or machine-wide installation in this feature's initial approval.
- **FR-010**: Keep image decoding isolated and bounded. The first milestone may expose an explicit image-unavailable state; full format/zoom parity requires a separately reviewed Windows decoder design. Read-only milestones must visibly disable editing and its shortcuts while retaining truthfully reported unavailable native operations.
- **FR-011**: Preserve macOS behavior and existing security constraints. Report Windows build/runtime and macOS regression results separately.

### Key Entities

- **Selection grant**: Native-owned selected handle, opaque ID, location and verified filesystem identity.
- **Document version**: Identity, metadata and confirmed content digest used to detect changes.
- **Local record**: Versioned session/recents/recovery data with ownership, checksum and recovery rules.
- **Platform capability**: Actual supported reading, writing, decoding and lifecycle operations for the current build.

## Success Criteria

### Measurable Outcomes

- **SC-001**: On a recorded Windows 11 x64 standard-user runner, all Story 1 scenarios pass; hashes of all opened fixture files are unchanged.
- **SC-002**: All blocked-path/reparse/cloud/network fixture cases refuse content access; no outside-grant marker appears in returned content.
- **SC-003**: Before editing is enabled, all Story 2 save/conflict/recovery cases pass and every injected failure retains recoverable work.
- **SC-004**: All Story 3 desktop cases pass at the three specified scaling levels; final-window close leaves no app worker/process running.
- **SC-005**: Every affected native boundary has Windows evidence and a macOS regression result. Unexecuted items remain NOT TESTED and cannot establish platform support.

## Assumptions

Windows 11 x64 and local NTFS are proposed first targets, not observed supported environments. Windows 10, ARM64, Linux, network workspaces, file association registration and release signing are deferred. The existing interface is reused; recently approved future design integrations are not bundled into this port. Native Windows execution will require an available Windows runner; this session is macOS arm64. This request authorizes starting assessment/specification work, but does not constitute approval of these previously unseen artifacts.
