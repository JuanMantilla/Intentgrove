# Implementation Plan: Rich Reading Completion

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

**Feature:** F002R | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring approval

## Summary and context

Extend the current React/Tauri Markdown renderer with bounded block results, inert Mermaid diagrams, YAML metadata, local syntax tokens, shared heading outline and bundled fonts/typography. MacOS 14.0 arm64 is the currently configured minimum/host target; no new Rust dependency is planned. Candidate JS dependencies are a pinned audited Mermaid 11.x, remark-frontmatter 5, a bounded YAML parser and local token highlighter. Exact versions, licenses and lockfile changes are implementation gates, not yet installed. App-owned settings storage is shared with F003C. The 1 MiB/1 s and 10 MiB/3 s goals are targets, not measured.

## Constitution check

Approved 0.1.0 principles apply with retired disconnected-network and VoiceOver-specific checks. The proposal preserves local files, no-write, untrusted-content isolation and EN/ES keyboard behavior. Mermaid isolation and performance are **unproven gates**: do not enable a privileged renderer or claim R02/R09 PASS if the spike fails. Pending constitution 0.2.0 is not approved.

## Architecture and delivery order

1. **Render budget:** Refactor worker/renderer around versioned block outputs and per-block fallback. Retain existing source bytes and parse cancellation; avoid whole-document synchronous painting of 10 MiB. Profile mixed and hostile fixtures before adjusting caps. A render generation invalidates old results after refresh/tab close.
2. **Mermaid isolation spike:** Verify a separately sandboxed opaque-origin script context has no Tauri IPC or filesystem privilege, denies network/subresources under a reviewed CSP exception to the current `frame-src 'none'`, and communicates through a nonce/source/generation-checked bounded message. Lock Mermaid security config, reject diagram directives/config frontmatter, limit kinds/size/depth/time, and accept only validated inert raster pixels. If packaged WebKit cannot prove this boundary and timeout, pause Mermaid enablement and return a revised plan for approval; do not weaken CSP silently. Version 11.16.1 or later within 11.x is a candidate only after advisory/compatibility audit.
3. **Metadata/code:** Recognize frontmatter consistently in worker and React, parse bounded YAML with failsafe schema and plain-text fallback. Render locally generated syntax tokens as React text spans using fixed CSS classes; no raw HTML or inline style. Unknown/over-budget code is plain. Copy reads original source bytes.
4. **Outline/typography:** Derive h1–h6 IDs and source offsets from the same versioned heading sequence used to render links; deduplicate slugs deterministically. Add optional responsive outline and anchor-preserving font/width changes. Bundle Roboto and Roboto Mono with OFL notices and bounded preference values in native app data; F003C persists/restores them.
5. **Verify:** Test CSP/network attempts, hostile block failures, no-write, EN/ES/focus, packaged macOS width/theme/Reduce Motion, 1/10 MiB timings and restart after F003C. A single block failure must leave other blocks usable.

## Source map and validation

| Area | Planned work |
|---|---|
| `src/reader/MarkdownView.tsx`, `markdownBudget.worker.ts` | Versioned blocks, metadata/code/diagram boundaries and shared headings |
| `src/app/App.tsx`, `i18n.ts`, `src/styles/app.css` | Outline, reading settings, responsive states and localization |
| `src-tauri/`, bundled assets/build config | Private bounded preferences, fonts/licenses and verified isolation packaging |
| `tests/ui/`, feature `verification.md` | AS-001–009 and SC-001–004 fixture/packaged evidence |

R01/R02 map to diagram/failure/security fixtures; R03/R04 to YAML/code fixtures; R05–R07 to outline/fonts/restart; R08–R10 to EN/ES, hostile blocks, no-write/network and timing. Follow [quickstart.md](quickstart.md); record PASS/FAIL/BLOCKED/NOT TESTED. [Research](research.md), [data model](data-model.md), [contract](contracts/reading.md) and [design](design.md) retain the same boundary. No production implementation before spec, visual and architecture approval.
