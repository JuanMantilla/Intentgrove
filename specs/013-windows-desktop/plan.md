# Implementation Plan: Windows desktop port (F007W)

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Feature**: `013-windows-desktop` | **Git branch**: `main` (unchanged) | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)
**Status**: Proposed architecture — approval required before application edits.

## Summary

Port the existing Tauri 2 + React application through narrow native adapters. Preserve shared grants, document/version policy, section composition, search and refresh coordination. First extract and verify macOS mechanisms, then implement Windows reading and desktop behavior. Implement private storage and safe writing before enabling editing. Image decoding parity remains a later design gate. This is a feature plan, not a claim that the current crate compiles on Windows.

## Technical Context

**Language/Version**: Rust minimum 1.88; React 19.3.0 / TypeScript 7.0.2 from manifests. Host rustc 1.88.0; Node 20.19.6 observed, compatibility with declared Vite 8.3.1 must be checked before frontend builds.
**Primary Dependencies**: Existing Tauri 2.11.6, CLI 2.11.5, dialog 2.7.3, notify 8.2.0 and current locked rendering stack. Proposed Windows-only direct `windows-sys = 0.61.2` dependency (already transitive in Cargo.lock); not yet added. Requested approval covers this one native binding dependency only; feature flags must be scoped to required Foundation, filesystem, security and locking APIs. No upgrades.
**Storage**: Local NTFS documents; framework-resolved per-user local app data for Windows. No cross-platform record import or schema migration.
**Testing**: Existing Rust/Vitest tests plus actual Windows native fixtures; disposable app-data directory for desktop checks. No CI edits.
**Target Platform**: Proposed Windows 11 x64 / MSVC. Exact Windows build, SDK/MSVC/WebView2 versions, filesystem and privilege level must be recorded on runner. Current host macOS 26.2 (25C56), arm64.
**Project Type**: Private desktop application.
**Performance Goals**: Retain bounded reading/search/cancellation and 10/50 MiB limits. Existing Mac benchmark budgets are not Windows measurements.
**Constraints**: No expansion of native grants, CSP relaxation, elevation, automatic hydration, system policy changes or in-process untrusted image decoding.
**Scale/Scope**: One workspace root/window, explicit outside-file tabs, existing restore/draft schemas. Read-only Windows milestone then editing; images deferred explicitly.

## Constitution Check

Local operation, document integrity, untrusted-content restrictions and traceable native evidence apply unchanged. User has requested starting Windows work, satisfying the formerly deferred platform's initiation condition; specification and architecture approval are still pending. No constitution ratification or historical approval is inferred. Windows visual delta is limited to [design.md](design.md); approval is requested with this plan. Before and after planning: documentation work is permitted; production implementation gate is BLOCKED until actual approval. Runtime verification is independently NOT TESTED.

## Project Structure

### Documentation (this feature)

`spec.md`, `design.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/platform-boundaries.md`, `quickstart.md`, `checklists/requirements.md`, `evidence/assessment.md`, `review.md`. Generate bounded implementation tasks through installed Spec Kit after approval; do not introduce a second os-engineering requirement system.

### Source Code (proposed changes after approval)

- `src-tauri/src/platform/`: target-selected filesystem reads/identity/enumeration, private storage/locking and save mechanisms.
- `scope.rs`: keep validation, errors, exclusions and directory response policy; delegate actual OS operations.
- `document.rs`, `listing.rs`, `large_source.rs`: reuse bounded algorithms; delegate positional reads and metadata stamps.
- `editing.rs`: keep section/conflict policy; delegate staged commit and recovery ownership operations.
- `recovery.rs`, `session.rs`, `recents.rs`, `save_copies.rs`: preserve envelopes and shared validation; delegate private storage, locks and durable publication.
- `image.rs`: isolate current XPC calls behind the macOS decoder; Windows returns a visible unsupported capability until a reviewed isolated decoder exists.
- `lib.rs`, `native_entry.rs`, `build.rs`: Windows composition/lifecycle and platform-gated Cocoa/XPC references.
- `src-tauri/tauri.windows.conf.json`: proposed Windows bundle overrides after gate approval.
- `src/app/App.tsx`, `api.ts`, `i18n.ts`: platform command modifiers, accurate labels and capability-aware enablement only.
- `src-tauri/tests/`, `tests/ui/`: shared assertions and target-specific native fixtures.

**Structure Decision**: An adapter earns its complexity because actual platform mechanisms differ while consumers and preservation rules are shared. Avoid a generic OS service or duplicating the app. Keep current command names/result shapes; document any necessary capability response delta for review before changing a public bridge.

## Implementation sequence and acceptance gates

1. Characterize current identity/access/save/storage behavior with existing disposable tests. Extract macOS adapters without behavioral changes; pass Mac regressions. This slice can be verified on the current host.
2. Windows scoped filesystem adapter: Unicode metadata opens, reparse/locality/recall checks before data access, stable identity, enumeration and offset reads. Prove no escape during parent rename/replacement; never substitute canonical-path string checks for anchored traversal.
3. Windows storage: framework local app-data path, current-user private DACL/ownership checks, locks with deterministic release, flushed temp publication and recovery. Do not apply Unix mode or directory-fsync claims to Windows. Preserve record schemas; rejection beats ambiguous identity/schema conversion.
4. Windows build/read-only milestone: target-gate all Unix/XPC use, explicit unsupported writes/images, Ctrl shortcuts, dialogs/drop, close and worker cleanup. Whole-crate Windows check must include modules not exercised by reader UI. Record actual WebView2 origins and verify navigation/CSP restrictions without broadening access.
5. Safe editing: same-directory staging, existing/new destination distinctions, sharing policy, identity/version rechecks, metadata preservation and post-commit verification. Choose commit API only after Windows failure/race experiments; keep editing disabled until FR-005/006 evidence passes.
6. Private unsigned packaging proposal: platform-specific NSIS per-user override, no associations, require WebView2 already present for the initial package; do not enable an automatic network bootstrapper, runtime download on launch or updater. Installer construction may need bundler tooling/network access; record missing tools and request exact installation authorization when needed. Installing/uninstalling on a machine remains a separate explicitly authorized test.
7. Isolated Windows image worker: separate subsequent architecture review for decoder, IPC, restricted token/job limits, cancellation, formats and resource ceilings. Do not expose raw images directly to the webview as a shortcut.

## Data protection and rollback

No real user documents are used for verification. Existing app-data formats remain untouched until supported Windows behavior exists. Preserve stages/safety copies when commit outcome is uncertain; never erase evidence to report success. Reverting source changes is the rollback for this feature; no deployed migration or machine configuration change is planned.

## Risks and decision limits

Secure relative opens and recall avoidance need actual Windows proof. CreateFileW on a full path with OPEN_REPARSE_POINT protects the final component only; parent traversal requires an anchored mechanism or held ancestors with tested sharing restrictions. The selected prototype uses NtCreateFile RootDirectory-relative opens with OBJ_DONT_REPARSE; binding availability and actual race/recall behavior remain implementation experiment gates, not proven claims. Existing 64-bit identity fields can be reused for NTFS only after volume/file-ID uniqueness and serialization tests; other filesystems are rejected. ReplaceFileW is a candidate for verified destination replacement, not a compare-and-swap guarantee. Required changes to schema, privileges, capability contracts or dependency scope beyond this plan reopen the affected review gate.


## Authorized HTML native reconciliation — 2026-10-08

**F007W-H01**: Shared classification/grants/commands are extended for HTML. A standalone Wry/WebView2 adapter disables document scripts, web messages, host objects, external URI launches, frames, downloads and popups, and intercepts all request sources via ICoreWebView2_22. Rust Windows std target, Windows runner/WebView2 and Windows package verification are unavailable on this Mac; source is implemented but Windows build/runtime are NOT TESTED.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.
