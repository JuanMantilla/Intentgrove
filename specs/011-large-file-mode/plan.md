# Implementation Plan: Bounded Large-File Source Mode

**Feature:** F003L | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring approval

## Summary and context

Keep the 10 MiB rich-document ceiling. After explicit consent, open >10 to 50 MiB Markdown as a private verified snapshot and serve small UTF-8-aligned windows to a virtualized read-only source view. Reject >50 MiB before full read. Existing Rust/Tauri/React stack can implement bounded windows without a new editor dependency; F003S remains rich-document Find. Proposed extra steady-memory budget is 128 MiB for one tab and copy limit is 1 MiB. Both need packaged measurement.

## Constitution check

Approved 0.1.0 local/no-write/scoped-access/accessibility/evidence principles: PASS for proposal. Temporary snapshots stay in private app data/OS temp with private permissions, are never repository writes, and are removed on close/refresh/age. Retired disconnected-network and VoiceOver-specific checks remain retired.

## Architecture

Native inspect command validates grant/type/size before full read. Explicit opt-in starts a <=50 MiB streaming snapshot through the scoped handle with 0700 private parent/0600 file, byte and version checks, cancellation and sparse line offsets. Verify identity/version before marking complete; a mixed version is uncertain/error, never current. Inactive large tabs retain identity but unload windows. A renderer virtualizes line windows and paints a bounded long-line segment; it cannot hold a whole 50 MiB CodeMirror document. Go to Line uses sparse index; literal Find scans snapshot in cancellable chunks and streams positions. Copy accepts <=1 MiB and reports a clear limit otherwise. Refresh invalidates snapshot/generation and loads a new stable version or marks stale.

The in-tab choice/source/status layout follows [design](design.md). Native read response contains only bounded windows and line metadata, not a path. No diagram/highlighting/edit pipeline runs. Window close/tab switch cancels old requests. A background cleanup removes orphaned snapshots without touching source documents.

## Source and validation map

`src-tauri/src/document.rs`, `scope.rs`, new `large_source.rs`, `lib.rs` own snapshot/IPC; `src/app/App.tsx`, new source view, `api.ts`, `i18n.ts`, CSS own UI. R01–R04 map to boundary/version fixtures; R05/R06 to Find/copy/reload; R07/R08 to responsiveness/memory; R09/R10 to EN/ES/no-write/request. Follow [quickstart](quickstart.md), [model](data-model.md) and [contract](contracts/large-source-ipc.md); status every criterion PASS/FAIL/BLOCKED/NOT TESTED. Approval of spec, visual direction and architecture is required before production edits.
