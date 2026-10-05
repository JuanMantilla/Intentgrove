# Implementation Plan: Section Editing and Recovery

**Branch**: `002-section-editing-recovery` (Spec Kit feature identifier; Git branch remains `main`) | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Status**: Approved F004 baseline with a proposed moved-path/safety-copy amendment added 2026-09-29. The added architecture requires renewed approval before its production implementation.

## Summary

Add a deliberate section-only Markdown editor entered from the rendered document's context menu or keyboard equivalent. Native code owns source byte boundaries, scoped writes, conflict checks, and durable recovery. The React UI presents the selected section, CodeMirror source, live preview, and explicit Save/Save As/Discard controls. F003C workspace restoration is a separate prerequisite for the exact reopen journey; F003D refresh can consume F004 draft/conflict state after F004 is approved and implemented.

## Technical Context

**Language/Version**: TypeScript/React 19, Rust (repository minimum 1.77.2), Tauri 2, macOS-first desktop app.  
**Primary Dependencies**: Existing `remark-parse`/unified and `react-markdown`; planned CodeMirror 6 modular packages (`@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, optional `@codemirror/lang-markdown`) and pinned `pulldown-cmark` 0.13.4 for authoritative native source spans. Resolve and lock exact CodeMirror versions during implementation; no dependency is installed in this planning phase.  
**Storage**: Open Markdown files remain in granted locations. Versioned, bounded session and recovery records live in Tauri per-user app data, outside repositories.  
**Testing**: Existing Vitest and Cargo tests; disposable-file native integration tests; packaged macOS keyboard, quit, restart, race, and visual acceptance runs.  
**Target Platform**: macOS app, with Cmd+F and existing cross-platform reader behavior preserved.  
**Project Type**: Tauri desktop application.  
**Performance Goals**: A completed durable checkpoint and visible acknowledgment within 1 second of each accepted edit while running (F004-R13/SC-007); editing and preview remain responsive for eligible files.  
**Constraints**: Only granted `.md`/`.markdown`, UTF-8, at most 10 MiB; no source write without explicit Save; preserve bytes outside the selected span and original line-ending convention; no network; one pending draft per document.  
**Scale/Scope**: One editable section at a time per document, multiple document tabs; repository root, explicit file grants, and recovery records bounded by app policy.

## Constitution Check

The approved constitution is v0.1.0; v0.2.0 remains a draft. The user's direct direction for a clean, simple UI with subtle animation is reflected in [design.md](design.md).

| Principle/gate | Before research | After design |
|---|---|---|
| Private local workspace | PASS: local parser/editor and app-data recovery | PASS: no service or telemetry path proposed |
| Preserve source and user control | PASS: explicit Save and scoped write | PASS: byte-splice contract, recoverable failures, no automatic original-file writes |
| Treat document content as untrusted | PASS: same preview trust boundary | PASS: no Markdown execution, native grant validation, no raw client path authority |
| Readable, accessible interface | PASS: section label, keyboard and EN/ES required | PASS: [design.md](design.md) and [visual proposal](design/section-editing-states.svg) cover states; packaged verification pending |
| Traceable, independently verified work | PASS: F004 IDs and AS/SC defined | PASS: [quickstart.md](quickstart.md) maps evidence, with macOS quit and F003C gates explicit |

**Approval gate**: `spec.md`, `design.md` with SVG sketch, and this architecture plan require explicit user approval and content hashes in `docs/approvals.md` before production F004 implementation. A change to one artifact reopens its affected gate. F003C has its own separate approval gate.

## Architecture and delivery order

1. **Prove the native quit path first.** Rust `CloseRequested` can stop window close; a custom Cmd+Q Quit command can route through the same pending action. Dock/system Quit may bypass Tauri `ExitRequested` on macOS. Prototype an `NSApplicationDelegate.applicationShouldTerminate` bridge compatible with Tauri/Tao and verify in a packaged app. If this cannot intercept Dock Quit, keep F004-R08/AS-009 blocked and revise the architecture with user review before claiming completion. Abrupt termination uses recovery checkpoints and cannot show a prompt.
2. **Establish authoritative source sections.** Native `pulldown-cmark` offset iteration on confirmed bytes yields top-level heading spans, pre-heading span, and one heading-free span. Each section ends at the next heading of any level. IDs bind document identity, disk version, ordinal, and byte range. A rendered-document adapter maps remark headings to the native list; parity failure disables Edit section with an explanation. Strip the UTF-8 BOM before JS parsing and track its prefix separately. No slug/text-based relocation after changes.
3. **Add the UI and bounded edit state.** A single document draft owns selected original span, base snapshot/version, CodeMirror state/history, cursor, editor scroll, reader scroll, and lifecycle. CodeMirror is configured with the source line separator and persisted `historyField` JSON; restoration retains undo/redo and selection. The reading view remains navigable, and only the selected source is mounted in the editor. A preview renders the draft using the existing safe Markdown pipeline. Save, Save As, Discard, Keep draft, Cancel, tab switch, and second-section requests use explicit state transitions.
4. **Write safely in native code.** Rust revalidates grant and file identity, compares the edit baseline to the current `diskVersion`, composes bytes from the saved base snapshot plus the selected section replacement, stages a unique same-directory file, syncs it, retains a recoverable pre-save original, performs an immediate bounded read/hash and metadata check before atomic replacement, syncs the parent, then verifies the committed content. A known pre-commit conflict stops without replacing either version. Any observed post-commit mismatch is reported; retain draft, staged output, and captured disk versions, and disclose if an intervening version was not captured. This cannot eliminate the final tiny race with uncooperative writers; the UI discloses it. After successful replacement, refresh the file grant identity, tab baseline, and watcher token because the inode changes. Save As uses a native destination dialog, creates the complete edited copy, and requires explicit confirmation plus recheck before replacing an existing different destination.
5. **Checkpoint and restore.** Each accepted edit schedules a serialized, durable, checksum-protected app-data checkpoint that finishes within 1 second and is acknowledged only after write, file sync, atomic replace, and parent sync. Keep the prior valid checkpoint until the next is durable; surface storage/quota failure without a false protected indicator. A clean editor session is persisted at normal close. Dirty Keep draft flushes the latest state before completing the close. On reopen, compare disk version and original section boundary; changed content becomes conflict, and an unlocatable section is inspectable/Save As only. Save, Discard, and clear-session remove the relevant recovery record.
   - **Moved-path amendment:** Assign a native recovery owner ID and retain it across picker-approved reselection. Use a cross-process app-data lock for checkpoint/migrate/cleanup, bound reads before decode, validate legacy schema-1 records before adoption, and derive paths from native grants. Write/sync the complete record at the new key before acknowledging; remove an old key only if its owner still matches. Failure leaves the prior checkpoint and visible draft intact and blocks Keep/close at the new location. Save/Discard removes only owner-matching current/migrated records. Cover repeated moves, competitor records and post-ack process exit.
   - **Safety-copy amendment:** Retain unresolved/unverified Save-race copies until explicit resolution. Bound total retained safety copies to 1 GiB; fail a Save before changing the source when the budget cannot hold its required copy, preserving the draft. Inventory resolved copies through private app-data paths with ownership/no-symlink checks and offer an explicit confirmed cleanup separate from draft clearing. Keep directories 0700 and files 0600. Do not silently delete unresolved copies to free space.
6. **Integrate dependent features.** F003C must separately obtain approval and implement folder grant, tabs/order, active tab, panel layout, and scroll restoration before F004-R12/AS-009/SC-003 can pass. F004 contributes editor/draft state to that session contract. F003D T023 consumes the new dirty/conflict state and remains blocked until the F004 API exists. Do not treat either feature's draft as implicit approval.

## Interface and trust boundaries

The native/UI contract is [contracts/editing-ipc.md](contracts/editing-ipc.md); durable entities and state transitions are [data-model.md](data-model.md). The UI sends an opaque grant/document token and an edit-session token, never a trusted arbitrary path or authoritative byte range. Native code refuses unsupported, missing, replaced, out-of-scope, symlink, nonregular, over-limit, or invalid UTF-8 source. `document.rs` currently performs delayed confirmed reads; the final pre-commit check must be a new immediate verification after staging, not that delayed read. Recovery data is local untrusted input on load and must be schema, checksum, scope, and size validated before display; restoration never writes a document.

## Project Structure

### Documentation (this feature)

```text
specs/002-section-editing-recovery/
├── spec.md
├── design.md
├── design/section-editing-states.svg
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/editing-ipc.md
```

`tasks.md` exists for the approved baseline. Amendment tasks remain pending approval of this revised plan and specification/design changes.

### Expected source areas (after approval)

```text
src/
├── App.tsx                       # section actions, tab/quit lifecycle and F003C integration
├── components/MarkdownView.tsx   # rendered-section targeting
├── components/SectionEditor.tsx  # CodeMirror, preview, controls
├── lib/                          # section mapping, draft state, native API, i18n
└── styles/                       # focused editor and responsive states
src-tauri/src/
├── document.rs                   # scoped base snapshots and version checks
├── editing.rs                    # native section spans and Save/Save As
├── recovery.rs                   # durable local checkpoints/session records
├── state.rs                      # grant identity update after replacement
└── lib.rs                        # commands and native close/quit integration
```

**Structure Decision**: Extend the existing Tauri/React app and its grant model. Concrete module names may follow the established code layout during implementation, while the native/UI contract and requirements remain fixed.

## Key risks and verification gates

| Risk | Required proof |
|---|---|
| Dock/system Quit interception | Packaged macOS test for titlebar Close, Cmd+W, Cmd+Q, app-menu Quit, Dock Quit, Cancel, Save, Keep draft, and failed checkpoint; `ExitRequested` alone is insufficient. |
| Parser offset mismatch | Fixture matrix for BOM, LF/CRLF/CR, Unicode, setext/ATX, fenced/quoted/list headings, repeated/empty headings, and ambiguous render mapping; fail closed. |
| Source damage or overwrite | Native byte comparison outside span, staged-write failure injection, grant replacement, external write before final check, and post-commit observation; retain draft and recoverable versions. |
| Recovery timing/integrity | 100 edits with completed checkpoint acknowledgment under 1 second; injected crash after acknowledgment; corrupt/latest checkpoint fallback; bounded history and storage-error states. |
| Moved-path owner integrity | Disposable multi-move, legacy-adoption, competitor-record, failure and post-ack exit tests; no unrelated record deletion. |
| Safety-copy retention | Quota, resolved/unresolved cleanup, permission/symlink, failed cleanup and source-hash fixtures; EN/ES confirmation at narrow width. |
| Exact workspace restore | F003C approval and implementation plus ten packaged reopen trials; cannot be claimed from F004-only tests. |

## Complexity Tracking

No constitution violation is proposed. Native section parsing and a native quit bridge are warranted by source integrity and the macOS close requirement; they are not extra product surfaces.
