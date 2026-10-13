# Implementation Plan: Recent Local Items

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

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


## Authorized HTML native reconciliation — 2026-10-08

**F003R-H01**: Recent Document entries admit Markdown and HTML with existing native-selected identity/reselection semantics, caps and storage. Opening a recent HTML selection still requires the typed HTML descriptor/mount path; saved display paths never grant siblings.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.
