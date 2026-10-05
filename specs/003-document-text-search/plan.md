# Implementation Plan: Find Text in a Document

**Feature:** F003S | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring user approval

## Summary and technical context

Add an in-flow Find band to the active Markdown tab. Index displayed reader text with reversible text-node offsets, or the current CodeMirror source draft while editing. Highlight/navigate without changing React-owned DOM or source files. The current React 19/TypeScript 7/Tauri 2 stack and system WebKit remain; macOS is first. No storage, native IPC or new file grants are needed. `@codemirror/search` is only a candidate dependency subject to locked-version review. SC-002's 1 MiB / 250 ms target needs packaged measurement.

## Constitution check

The approved 0.1.0 principles apply with retired disconnected-network and VoiceOver-specific checks. Proposal: PASS for local-only operation, document preservation, scoped access, accessibility design and mapped evidence. No new authority is proposed. Native checks remain open; pending constitution 0.2.0 is not approved.

## Architecture

`MarkdownView` exposes its rendered root and display generation. A Find index walks visible text nodes under `.markdown-body`, omitting controls, hidden nodes and placeholders. It stores normalized searchable text with reversible UTF-16 node offsets. Literal case-insensitive matching preserves accent distinctions and maps non-BMP characters correctly. Count every displayed match, including offscreen; if content is deferred, do not report a complete count before indexing it. Cache by display generation and cancel stale work after refresh, draft edits or tab changes.

On supported WebKit use CSS Custom Highlight to paint `Range`s without mutating React DOM. Verify packaged support; if absent, use noninteractive positioned range overlays. Bound painted ranges to visible and active results while retaining an exact total. Reveal the active range on navigation. Empty/whitespace input clears matches.

In section edit mode the same band searches only the live `EditorState.doc`, navigates through CodeMirror APIs and preserves selection, undo and dirty state. It does not count the preview or unchanged surrounding reader twice. `App.tsx` owns Command+F, Escape, focus return and tab-close invalidation; `i18n.ts` and CSS provide EN/ES statuses, focus and 640-point layout. Control+F is deferred with future Windows/Linux builds. Search never follows links or asks native code to read files.

## Source and artifact map

| Area | Planned work |
|---|---|
| `src/reader/MarkdownView.tsx`, new `src/reader/find-index.ts` | Root/version hook, visible-text indexing and ranges |
| `src/reader/SectionEditor.tsx` | CodeMirror draft adapter |
| `src/app/App.tsx`, `i18n.ts`, `src/styles/app.css` | Find band, shortcut/focus, EN/ES states and highlight styles |
| `tests/ui/`, feature `verification.md` | Fixture counts, refresh/draft races, keyboard and packaged evidence |

## Requirement-to-validation map

| Requirements | Checks |
|---|---|
| R01–R03/R05; AS-001/002/005–007; SC-001/005 | Shortcut, focus, wrap, close and tab journeys |
| R04/R06/R10; AS-003/004/008; SC-002/003 | Mixed Markdown, offscreen count, Unicode, draft, cancellation and timing |
| R07/R08; AS-009/011; SC-003 | Hashes, app-request observation and unavailable states |
| R09; AS-010; SC-004 | EN/ES accessible status, keyboard, non-color indication and narrow layout |

## Validation and post-design check

Use [quickstart.md](quickstart.md) with disposable fixtures. Record PASS, FAIL, BLOCKED or NOT TESTED separately for component and packaged checks. Current sandbox has no verified display or production request-attempt observer. [Research](research.md), [data model](data-model.md), [Find contract](contracts/find-session.md) and [design](design.md) retain no-write/scoped boundaries. User approval of spec, visual direction and architecture is required before production edits.
