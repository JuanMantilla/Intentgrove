# Implementation Plan: View Local Images

**Feature:** F006 | **Date:** 2026-09-29 | **Spec:** [spec.md](spec.md) | **Status:** Proposal requiring user approval

## Summary and technical context

Extend the current scoped local-image path into read-only image tabs and a single safe inline pipeline. Main-process Rust validates grant, file identity, regular-file status, extension and stable encoded bytes (at most 8 MiB). A bundled macOS decoder helper receives bytes, never a path, and returns bounded raster surfaces/metadata. It isolates malformed ImageIO/SVG work from the app process. The renderer receives only inert PNG/blob data and renders Fit/Actual Size/zoom using the existing tab shell. Current React/TypeScript/Tauri and CSP remain; new native helper, ImageIO bridge and pinned SVG rasterizer require approval. Plan targets macOS arm64 first; other builds require separate delivery decisions.

The proposed SVG stack is resvg/usvg 0.48.1, whose [manifest requires Rust 1.85](https://docs.rs/crate/resvg/latest/source/Cargo.toml.orig). The app currently declares Rust 1.77.2. Approval of this plan includes raising the native minimum Rust toolchain to 1.88 for F006 and updating build/CI pins. Before dependency installation, verify the locked transitive graph, license and actual build. If that check fails, revise this plan for approval rather than silently switching libraries.

## Constitution check

Approved 0.1.0 principles apply with retired disconnected-network and VoiceOver-specific checks. Proposed PASS: explicit local scope, no source writes, inert output, EN/ES keyboard states and measurable fixture evidence. Added helper and toolchain are necessary to meet R06/R07 crash isolation; their packaging and signing need F005 verification. No new network or renderer filesystem permission is proposed. Pending constitution 0.2.0 is not approved.

## Architecture

### Scope and stable read

Reuse current native root/explicit-file grants. Tree default shows supported Markdown and image extensions; Open File selection grants one image only. Resolve root-relative paths with existing no-follow rules; reject escapes, symlinks and non-regular files. Read at most 8 MiB and compare identity/version before and after; uncertain reads yield a retry state. Check extension against **decoded** type, including case-insensitive aliases. Root-relative atomic replacement may refresh under the intact root; explicit-file identity replacement requires reselect, matching document policy. Never send filesystem paths to the helper or renderer.

### Decoder isolation and memory

Bundle a minimally privileged macOS XPC decoder service. Its narrow request contains a bounded byte buffer, claimed format, output dimensions/thumbnail intent and generation; response contains actual format, intrinsic dimensions, first-frame status and bounded PNG pixels or a typed failure. XPC service has no workspace grant, file path or network entitlement. A crash, timeout or invalid response closes that request and surfaces a recoverable error while the app stays open. Main process enforces byte, response-size, time, concurrency and cache limits; the service validates dimensions before raster allocation and caps decoded pixels at 40 million. A 40 MP RGBA surface is about 160 MB, so retain at most one full-size surface at a time and use scaled previews/tiles for inline and Fit; prevent an unbounded tab cache. Full-resolution inspection uses lazy bounded tiles if a single transport exceeds the response cap. No partial pixels are presented as current.

Raster formats use macOS ImageIO after runtime support discovery, actual type check and predecode dimension inspection. Decode first frame only. SVG uses a pinned resvg/usvg rasterizer inside the helper. A bounded XML preflight rejects DTD/entities, excessive nodes/depth, scripts, links, foreign content, event handlers, external or data references, `@import` and nonfragment `url()`. Permit local `url(#id)` paint references. Override **both** usvg image resolvers to deny all referenced images, including local files and data URLs; use only bundled fonts. Bound SVG render time and output size. The service returns raster pixels only. Keep existing `img-src 'self' blob:` CSP and never use the Tauri asset protocol for workspace files.

### UI and lifecycle

Model image tabs separately from Markdown tabs but reuse tab identity/order/close/reload. A tab shows filename, actual format, dimensions and still-preview label for animated files. Fit uses a whole-image scale capped at 100%; Actual Size means one intrinsic image pixel per CSS pixel, with display-scale behavior verified on Retina. Zoom preserves viewport center and keeps every edge scrollable. Resize recalculates Fit only. Freshness states mirror F003D; a changed image never displays old pixels as current. Inline images reuse the same decoder and alt text, with an explanatory placeholder for blocked/unsafe references. Relative image links open tabs, never browser or remote navigation. Generation IDs cancel stale responses after tab close, new selection or file change.

## Source and artifact map

| Area | Planned work |
|---|---|
| `src-tauri/src/assets.rs`, `selection.rs`, `state.rs`, `lib.rs` | Scope/stable-read, image IPC and helper lifecycle |
| New bundled macOS XPC service and SVG rasterizer, `src-tauri/tauri.conf.json`, build scripts | Byte-only decoder protocol, isolation, packaging and signing |
| `src/app/App.tsx`, `api.ts`, `i18n.ts`, `src/reader/MarkdownView.tsx`, CSS | Image tabs, inline pipeline, viewer controls and localized states |
| Rust/helper/UI tests and feature `verification.md` | Formats, adversarial fixtures, memory bounds, reload, keyboard and packaged checks |

## Requirement-to-validation map

| Requirements | Checks |
|---|---|
| R01–R05; AS-001–009; SC-001/003 | Format matrix, tree/picker scope, duplicate tabs, Fit/zoom and inline/link fixtures |
| R06/R07/R11; AS-010/012/013; SC-001/002 | Malformed/active SVG, decoder crash/timeout, type mismatch, limits, app-request observation and timing |
| R08; AS-011–013 | External writer, stable version, root vs explicit replacement and reload |
| R09/R10; AS-004/007/010; SC-004/005 | Hashes, EN/ES keyboard/focus, status, Reduce Motion and narrow layout |

## Validation and post-design check

Use [quickstart.md](quickstart.md) and disposable fixtures; record PASS/FAIL/BLOCKED/NOT TESTED. A local build is not packaged XPC/signing proof. The current sandbox has no verified display or production request observer. [Research](research.md), [data model](data-model.md), [decoder contract](contracts/image-decoder.md) and [design](design.md) preserve scope and inert output. User approval of current spec, visual direction and this architecture, including XPC/toolchain change, is required before production edits.
