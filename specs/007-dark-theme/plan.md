# Implementation Plan: Dark Theme

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Feature:** F002A, specs/007-dark-theme  
**Date:** 2026-09-28  
**Status:** Existing production architecture retained; test architecture amendment A1 PENDING APPROVAL  
**Spec:** [spec.md](spec.md) | **Visual:** [design.md](design.md) and [sketch](design/theme-states.svg)

## Summary

Add one appearance preference and resolve it into semantic CSS colors. Initialize the preference before rendering React content, persist it in existing app-owned WebView storage, follow native appearance when System is selected, and synchronize native appearance through the existing Tauri window API. Reconfigure only the CodeMirror appearance facet so section editing state survives changes.

## Technical Context

| Item | Choice |
|---|---|
| Language/versions | Existing TypeScript 7.0.2, React 19.3.0, Rust 2021 |
| Dependencies | Existing Tauri JS API 2.11.1 / Rust host, CodeMirror state 6.7.6 and view 6.43.13; no new packages or UI kit |
| Storage | One versioned, enum-only preference in app-owned localStorage; no documents, paths, or workspace state in this record |
| Target | Observed macOS 26.2 arm64. Older macOS compatibility remains unverified |
| Tests | Vitest for state transitions and editor preservation; packaged macOS startup/system-appearance and visual checks |
| Goals | F002A-SC-001–SC-005: live appearance within one second, no light document startup frame, retained editing state, no-write behavior |
| Constraints | Current CSP and file scope, EN/ES, reduced motion, current minimum 640-point window |
| Scale | One preference across the app, current single-window workspace. Native macOS theme overrides are app-wide |

## Constitution Check

- **I — PASS for proposal:** existing local assets/APIs; no runtime download or service.
- **II — PASS for proposal:** theme does not write documents or recreate the editor; preference has separate local storage.
- **III — PASS for proposal:** enum-only preference; content does not set theme or gain IPC/file authority. Only a native appearance permission is proposed.
- **IV — PASS for proposal:** reuse approved shell; one selector, explicit contrast targets, EN/ES, focus and reduced motion. The 0.2.0 amendment is pending; feature motion rules are explicitly proposed in the spec.
- **V — PASS for proposal:** requirement traceability and acceptance below; spec, palette/sketch, and this architecture require approval. Actual theme behavior is NOT TESTED.

## Project Structure

Feature artifacts: spec.md, design.md, design/theme-states.svg, plan.md, research.md, data-model.md, contracts/appearance.md, quickstart.md, checklists/requirements.md. tasks.md is generated in the next implementation-preparation stage.

Proposed source changes:

- src/app/appearance.ts — preference validation, synchronous initialization, resolution, persistence errors, and subscriptions.
- src/main.tsx — initialize appearance before createRoot renders content.
- src/app/App.tsx and i18n.ts — localized selector and persistence/native-sync notices.
- src/styles/app.css — replace existing hardcoded app colors with semantic variables and add the dark palette.
- src/reader/SectionEditor.tsx — compartment for the existing editor's darkTheme facet, without rebuilding editor state.
- src-tauri/capabilities/main.json — scoped core:window:allow-set-theme permission for the main window.
- tests/ui/appearance.test.tsx and relevant edit-flow regression — meaningful preference/system/storage/edit-preservation checks.

## Architecture

### Preference and startup

Store schema version 1 and mode System/Light/Dark under a new app-owned key. Validate values and size (maximum 256 characters) before parsing; invalid or absent data falls back to System. Catch storage exceptions. Bootstrap reads the preference synchronously, resolves System against the platform media query, and sets documentElement's data-theme and color-scheme before React content mounts. CSS supplies a system-dark fallback before JavaScript loads. Startup has no transition.

React consumes a single appearance controller and renders the selector. User changes update the root colors immediately and attempt to persist the enum. A failed save retains the current session choice and publishes one localized warning. Treat storage events from another window/process as validated preference updates; they never overwrite document state.

### Native and system appearance

Use getCurrentWindow().setTheme(light/dark/null), with null for System. Tauri documents that this is app-wide on macOS. The existing one-window product scope aligns with one shared preference. Add only core:window:allow-set-theme; current default permissions already supply theme reads/events. Verify the generated ACL during implementation.

On System selection, release the native override, then resolve the effective theme from native theme()/onThemeChanged plus the media query. On explicit Light/Dark, ignore system events for resolution. Sequence native requests so an older promise cannot overwrite a newer preference. Remove listeners on disposal. A native-sync failure leaves app-owned colors usable and shows a single warning; platform dialogs retain their native behavior.

The WebView may receive media-query changes caused by the app override. Therefore System resolution must be refreshed after releasing the override, and explicit preferences must not feed those events back into stored preference. This interaction requires packaged acceptance; it is not proven by component mocks.

### Palette and editor

Replace each existing app-owned hardcoded color with a semantic variable from design.md, including status panels, menus, dialogs, table/code surfaces, focus, selection and the section-enter animation. Use explicit foreground/background pairs for native HTML controls and CSS color-scheme. No inversion/filter is applied to images or content.

Keep the SectionEditor instance keyed by its edit session. A Compartment updates EditorView.darkTheme.of(...) through an effect-only transaction. Static bundled CSS supplies editor surface, text, caret, gutters, focus, and selection colors through variables. Theme dispatch must not change the document, selection, or undo history and must not trigger recovery checkpoints for an appearance-only transaction. Restore neither the editor nor its draft from initial props during a theme change.

Use the existing CSP without widening it. Confirm editor styling in the packaged WebView; all feature color rules live in bundled CSS, so the feature needs no new runtime inline-style permission. Keep nonessential color transitions at 120 ms, disabled at startup and under Reduce Motion.

## Requirement-to-validation mapping

| Requirements | Planned validation |
|---|---|
| R01/R03 | AS-001, AS-004–AS-006, AS-009; enum, System event, explicit override and selector tests; packaged system-change trials |
| R02/R06/R08 | AS-002–AS-003, AS-009; palette pair checks, actual reader/editor/menu/dialog screenshots at EN/ES 640/1440, focus/Reduce Motion |
| R04 | AS-004, AS-006–AS-007; missing/corrupt/throwing storage, cold startup and restart |
| R05 | AS-001, AS-008; live editor undo/redo/selection/scroll/focus preservation, fixture hashes |
| R07/R09 | AS-002; original image pixels, packaged app journey, source inventories and network/resource observation |
| SC-001–SC-005 | Record ten system-change, edit-switch, and cold-dark trials; contrast/layout evidence; integrity journey |

## Validation and limits

Use disposable Markdown fixtures and current F001/F004 actions. Run UI tests, TypeScript/Vite, worker regression, native regression, and a signed local .app build. Native FSEvents tests need an execution environment that allows events; the 2026-09-28 suite passed outside the agent sandbox.

Packaged appearance acceptance requires a visible macOS session. The later qa-followup.md records working System Events automation; the earlier assistive-access denial is historical, not the current blocker. Do not change permissions automatically. Native observation is still required for startup frames and full state preservation. Compilation, a vector sketch, and sample numeric contrast checks are not macOS UX acceptance.

## Post-design Constitution Check

The model/contract/quickstart retain the same enum-only storage, local assets, native appearance permission, editor state, and file boundaries. No exception is proposed. All five principles remain PASS for proposal; user approval and runtime theme verification remain pending.

## Architecture amendment A1 — T018–T021 (2026-09-28)

Status: PENDING APPROVAL, planning only. Original approval and bounded requirements
retirement are recorded in docs/approvals.md; this revision does not match the
historical approved plan hash. Only the added test architecture gate reopens.
Earlier proposal/status wording above describes the original design phase; actual
implementation and partial QA evidence are in evidence.md and qa-followup.md.
Spec, design, production interfaces and acceptance criteria are unchanged.

### Selected architecture

| Area | Decision | Authority / evidence boundary |
|---|---|---|
| T018/T019 deterministic states | Opt-in QA native feature and frontend entry, isolated identifier/storage, authenticated owner-only Unix socket, one-shot pre-operation gates and fixed fault adapters | New test-only architecture; real native validation and mutations remain intact |
| T020 first-frame capture | External Swift ScreenCaptureKit display stream started before normal production launch; isolated display, audio off, calibrated frame coverage | Production binary unchanged; approval includes only isolated synthetic-display capture |
| T021 diagnostics | QA-only WebKit Network + early CSP events, explicit worker/context coverage and calibration | Supplemental only; no complete production observer established |
| T021 production closure | Retain BLOCKED until a production-scoped observer demonstrates required coverage | No socket-only fallback, evidence substitution or weaker acceptance |

Normative interfaces: [acceptance-harness.md](contracts/acceptance-harness.md) and
[capture-evidence.md](contracts/capture-evidence.md). The production
[appearance contract](contracts/appearance.md) remains unchanged in behavior.
[instrumentation-decision.md](instrumentation-decision.md) is the review summary
and remaining-surface induction map; qa-followup.md is historical evidence.

Use existing locked Tauri Rust 2.11.6 / JS 2.11.1 dependencies. No new package,
WebDriver server or service. External helper uses installed Swift 6.1.2 and macOS
SDK 15.5; record toolchain/OS versions in every run. Only observed macOS 26.2 arm64
is targeted. SDK availability does not prove runtime capture accuracy.

### Proposed implementation locations and order after approval

1. Add isolated QA build/config/entry under tests/acceptance and a cfg-gated native
   harness module. Cargo feature/config guards and minimal native entry gates are
   the only proposed host integration. Production default code path stays intact.
   Review QA channel and renderer observation bridge; prove default-build exclusion.
2. Implement fixed fault adapters and bounded snapshots; execute T018/T019 matrix
   with native events plus separate noninjected production journeys. Pre-operation
   gating establishes pending-operation overlap, not physical disk-write overlap.
3. Implement external capture helper under tests/acceptance, calibrate temporal
   coverage, then collect ten complete production Dark launches for T020.
4. Implement QA diagnostic observer and separate report class. Record T021 partial
   image/inventory results; do not start purported complete production observation
   until a viable observer has a separately reviewed contract.
5. Extend evidence intake to validate new capture metadata and reject instrumented
   reports as production; retain raw evidence and obtain a fresh QA review.

No code, dependency, build flag or runtime setting is changed by this amendment.
Proposed modules are implementation targets, not already-existing tooling.
No T015/T018–T021 box is checked by planning or by successful metadata intake.

### Validation and review gates

Verify protocol rejection, timeout/disconnect save safety, preserved scope/version
checks, fixture-only failure injection, build mismatch rejection and production
hook/asset/ACL exclusion. Run appropriate UI/native regressions and both build
profiles after implementation, then sign/identify the final production package.
No CSP/navigation/file-scope relaxation, production inspector, altered signing
entitlement, OS security change or root collection is authorized.

T018 retains every R02 surface, both themes, EN/ES, 640/1440, actual text/control/
focus contrast, keyboard and Reduce Motion. T019 retains ten switches and the full
identity/draft/history/selection/focus/scroll/conflict/recovery/hash comparison.
T020 retains ten fully observed saved-Dark cold launches and zero light document
frames. T021 retains actual production request-attempt, image and inventory proof.
An uncovered context or launch interval stays BLOCKED, even if other layers pass.

User approval is required for A1's exact plan/contracts revision before adding
hooks or acquiring the expanded capture scope. A later change to observer authority,
production observability, dependencies or evidence equivalence reopens the affected
gate. Approval of A1 cannot itself close the production-observer feasibility gap.
