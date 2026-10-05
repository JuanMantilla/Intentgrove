# Implementation Plan: Recent Local Items

**Feature:** F003R | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring approval

## Summary and context

Add a bounded latest-use list in private native app data, separate from F003C current session and F004 drafts. Reuse existing Tauri/React stack, native selection grants and no new dependency. Proposed cap is 20 folders/50 documents. No repository file or remote service stores history.

## Constitution check

Approved 0.1.0 local/no-write/scoped-access/accessibility/evidence principles: PASS for proposal. Historical path text never grants access. Retired disconnected-network and VoiceOver-specific checks are not reinstated. Packaged behavior remains unverified.

## Architecture

Native recents service records only successful native selections and document opens, with item kind, identity, validated location and latest-use sequence. Store schema/checksum/size-bounded record through temp-sync-rename and prior-valid fallback in private app data. Do not persist process-local grant IDs, document bytes or whole folder listings. Deduplicate by native identity. On recent selection, verify original device/inode/type with no-follow; issue fresh root/file grant only on match. A replaced/moved/denied item requires native picker and displays a recoverable row. This intentionally applies stricter identity to historical recents than live root-relative tab refresh.

Expose list/open/reselect/remove/clear native commands as in [contract](contracts/recents-ipc.md). Remove/Clear affect only recents; F003C's Clear Session and F004 drafts are separate. Renderer places a recent section on the start view and native File menu, with [design](design.md) EN/ES states and confirmation. A new open updates order after success, never after a failed request.

## Source and validation map

New `src-tauri/src/recents.rs`, `state.rs`, `selection.rs`, `lib.rs` own durable identity/IPC; `src/app/App.tsx`, `api.ts`, `i18n.ts`, CSS own UI. Rust/UI tests and feature `verification.md` cover R01–R08/AS-001–006/SC-001–003. Follow [quickstart](quickstart.md); record PASS/FAIL/BLOCKED/NOT TESTED. [Research](research.md) and [model](data-model.md) preserve scope. Approval of spec, visual direction and architecture is required before production edits.
