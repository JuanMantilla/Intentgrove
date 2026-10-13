# Implementation Plan: Search the Selected Folder

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Feature:** F003F | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring approval

## Summary and context

Add scoped native filename/content search over the selected root, streaming bounded progress/results to a responsive EN/ES sidebar. Use existing Rust/Tauri/React stack and no persistent full-text index. Candidate `ignore` 0.4.22 for rule matching and `regex` 1.12.2 for escaped literal matching require exact lock, license and transitive MSRV validation before install; current `ignore` requires Rust 1.88 and is not silently substituted. Root traversal and `.gitignore` bytes are opened through existing fd-relative no-follow scope. Proposed 25,000-entry/250 ms cancellation target needs packaged measurement.

## Constitution check

Approved 0.1.0 local/no-write/scoped-access/accessibility/evidence principles: PASS for proposal. A path-based ignore walker would violate scope and is excluded. Retired disconnected-network and VoiceOver-specific checks are not reinstated. Package behavior remains NOT TESTED.

## Architecture

Create a native search worker owned by root grant/generation. Traverse directories via `open_relative` and bounded pages, honoring existing visible exclusions. Read bounded `.gitignore` from scoped descriptors at each hierarchy level; apply parsed rules only to validated relative segments. An include-ignored toggle changes matching/exclusions but never no-follow or root boundary. Match filenames and supported UTF-8 Markdown content in chunks, with bounded context and result count; mark unreadable/unsupported/over-limit as skipped. Stream batches with scanned/matched/skipped counts and `searching/partial/stopped/complete` status. Check cancellation between files and chunks; invalidate generation on root/query change and ignore late batches.

The renderer owns the in-flow Search sidebar in [design.md](design.md). A result is metadata, not a grant: on open, native code reopens through current root and confirms content/version, then gives current tab/location or a changed/missing explanation. No result path goes directly to a browser or native open command. Reuse F003S active-document highlighting only after current content is opened; do not cache full repository text in UI.

## Source and validation map

`src-tauri/src/scope.rs`, `listing.rs`, new `search.rs`, `lib.rs` handle native traversal/IPC; `src/app/App.tsx`, `api.ts`, `i18n.ts`, CSS handle sidebar; `tests/ui/`, Rust fixtures and feature `verification.md` hold evidence. R01–R05 map to result/ignore/skip fixture manifest; R06/R07/R11 to cancellation/25,000-entry timing; R08 to changed-result reopen; R09/R10 to no-write/request and EN/ES keyboard tests. Follow [quickstart](quickstart.md). [Research](research.md), [model](data-model.md) and [contract](contracts/search-ipc.md) retain scope. Approval of spec, visual direction and architecture is required before production edits.

## IR-05 native supplement � 2026-10-06

The authorized optional subtree and native Go extension is specified in [ir05-native-amendment.md](ir05-native-amendment.md). Original approved artifacts and packaged acceptance remain intact.


## Authorized HTML native reconciliation — 2026-10-08

**F003F-H01**: HTML/HTM names are included without reading or indexing HTML contents. Content search remains Markdown. open_local_search_hit validates the existing job/root/scope/hit and returns a typed LocalView; the original open_search_hit remains the Markdown consumer contract.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.
