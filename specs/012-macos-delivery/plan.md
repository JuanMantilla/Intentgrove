# Implementation Plan: Private macOS Delivery

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Feature:** F005 | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring approval

## Summary and context

Complete native macOS entry/lifecycle and produce locally verifiable arm64 `.app`/`.dmg` bundles. Current Tauri config builds `.app` only with macOS 14.0 minimum; cached app is thin arm64/ad-hoc, has no Finder document association, and native events lack Opened/Reopen/DragDrop handling. Existing F004 dirty close flow and pending F003C final checkpoint must be coordinated before a packaged delivery claim. No account, upload, paid certificate, OS security change or publication is included.

## Constitution check

Approved 0.1.0 local/no-write/scoped-access/accessibility/evidence principles: PASS for proposal. Native OS paths are validated, not treated as grants; all source fixtures remain unchanged. Retired disconnected-network and VoiceOver-specific checks are not reinstated. Final packaged evidence remains open.

## Architecture

Add document types to Tauri's merged macOS Info.plist for `.md`/`.markdown` and only approved F006 image formats. Verify UTIs/extension fallback on the configured macOS minimum. Handle `RunEvent::Opened` cold/warm via bounded native event queue until UI ready; each selected file becomes one no-follow native file grant, not its parent. Handle `WindowEvent::DragDrop` with the same validation for file/folder and localized rejection. Native File/Edit/View/Window menus invoke existing app commands and expose conventional Command shortcuts, with stateful disablement.

Unify titlebar Close, Cmd+W, Cmd+Q, app-menu Quit and Dock/system Quit through F004 dirty choices plus F003C durable final session checkpoint. Cancel/failed Save/checkpoint prevents exit. Last-window close retains application lifecycle; `RunEvent::Reopen` recreates/shows a reachable window and restarts refresh-service ownership currently stopped on Destroyed. Reentrant OS events carry IDs/generation to avoid duplicate tabs or stale reopen. F006 image associations remain conditional on its approved implementation.

Build local `.app` and `.dmg` through approved Tauri config, include bundled fonts/helper services if approved, inspect plist, architecture, resources, codesign/Gatekeeper and checksums. Install from mounted DMG to Applications, eject and launch without dev tools using disposable fixtures. Distinguish ad-hoc local verification from Developer ID/notarized publication; do not imply the latter or upload/sign with paid services. Follow [quickstart](quickstart.md) and full v1 matrix.

## Source and validation map

`src-tauri/tauri.conf.json`, `Info.plist`, `lib.rs`, `state.rs`, bundle scripts and `src/app` event/menu UI carry changes. R01–R03 map to app/DMG/install/signing evidence; R04–R06 to native menus/Finder/drop scope; R07/R08 to all Quit/Close/Dock routes; R09/R10 to hashes/update and v1 matrix. [Research](research.md), [model](data-model.md), [contract](contracts/macos-entry.md) and [design](design.md) retain those gates. Approval of spec, visual direction and architecture is required before production edits; publishing requires separate approval.


## Authorized HTML native reconciliation — 2026-10-08

**F005-H01**: HTML/HTM file associations and native entries reuse the shared Tauri host. A standalone unprivileged WKWebView is linked into the native library; default builds exclude the html-native-probe executable and feature-only diagnostic APIs. Private package checks do not establish installed UX or supported-version coverage.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.


## Proposed Markdown default-app opt-in — 2026-10-10

New user-requested work; DRAFT FOR REVIEW, separate from accepted current-version closeout. Architecture: [concrete amendment](default-markdown-20261010/plan.md). No implementation or real association changes performed.

## Automatic native file consumer — 2026-10-10

Reuse the bounded native queue, reinspection, explicit-file grant and existing Markdown/HTML/image openers. Frontend serializes after restore/read/recovery readiness, ignores stale list replies and attempts each queued ID once. accept_native_entry accepts optional fileOnly (defaults false); automatic requests require document kind before grant insertion. Folder confirmation and dirty flow stay explicit. [Plan/authority](automatic-native-open-20261010/amendment.md).
