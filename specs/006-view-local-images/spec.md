# Feature Specification: View Local Images

**Feature ID:** F006  
**Feature directory:** specs/006-view-local-images  
**Created:** 2026-09-26  
**Status:** Draft for user approval  
**Input:** “add the feature to view images in the most common formats (jpg, svg, png, etc)”

## User outcome and boundaries

A person browsing a local Markdown workspace can open an image file in a read-only tab and see local images referenced by Markdown. The first release covers JPEG (.jpg, .jpeg), PNG, GIF, WebP, SVG, BMP, TIFF (.tif, .tiff), and HEIC/HEIF (.heic, .heif), subject to a safe, bounded display path. The app never executes content supplied by an image.

This feature does not edit, annotate, export, convert, batch browse, or write image files. It does not make remote images available. Existing Markdown section editing remains separate. Image tabs participate in the current workspace tab and reload behavior; exact reopen of tabs after app restart belongs to F003C.

## User Scenarios & Testing

### User Story 1 — Open an image from the workspace (P1)

The reader selects a supported image in the folder tree or through Open File and gets a clear, read-only image tab without leaving the app.

**Independent test:** With a disposable folder containing one sample of each listed format, open each file from the tree and through Open File, then verify image content, filename, tab switching, and source-file hashes.

**Acceptance scenarios**

- **F006-AS-001:** Given a selected folder with a valid supported image, when the user opens it from the tree, then one image tab displays the image and identifies its filename and format.
- **F006-AS-002:** Given no folder, when the user explicitly selects a supported image in Open File, then its image tab opens without granting access to sibling files.
- **F006-AS-003:** Given the same image opened twice, when the second open completes, then the existing tab is selected instead of creating a duplicate.
- **F006-AS-004:** Given a supported image tab, when the user switches tabs or closes it, then no image file is changed and no image editing control appears.

### User Story 2 — Inspect an image comfortably (P1)

The reader can see a large or small image without clipping and can inspect detail while keeping the interface quiet.

**Independent test:** Open a small image and a large image at the minimum and typical window sizes, use keyboard controls, and verify visible dimensions and focus.

**Acceptance scenarios**

- **F006-AS-005:** Given a new image tab, when it finishes loading, then the whole image fits within the available viewer area without distortion; a smaller image is not enlarged past its natural pixel size by default.
- **F006-AS-006:** Given a large image, when the user selects Actual Size or changes zoom, then the image scales around a stable viewport point and the user can scroll to inspect all edges; Fit restores the full-image view.
- **F006-AS-007:** Given a keyboard-only user, when they enter the image tab, then the image has an accessible name, its dimensions and zoom are available as text, and Fit/Actual Size/zoom controls are reachable with visible focus.

### User Story 3 — View safe images in Markdown (P1)

A Markdown document can show its local relative images, including SVG, without gaining access outside the selected workspace or loading remote content.

**Independent test:** Render a disposable Markdown file containing valid local, missing, remote, out-of-scope, malformed, and active-content SVG references.

**Acceptance scenarios**

- **F006-AS-008:** Given Markdown with an in-scope relative image in a supported format, when the page renders, then the image appears inline with its alt text retained for assistive technology.
- **F006-AS-009:** Given a relative link to a supported image, when the user follows it, then the image opens in a read-only tab.
- **F006-AS-010:** Given remote, out-of-scope, malformed, or unsafe image content, when the page renders, then a localized explanatory placeholder appears; no network request, script, external resource, or privileged action occurs.

### User Story 4 — See current file changes and failures (P2)

The reader sees a new image after another app changes the file and can manually reload it. A failed read remains understandable and recoverable.

**Independent test:** Replace an open image using a second process; trigger automatic and manual reload; then test deletion, permission loss, invalid bytes, and over-limit files.

**Acceptance scenarios**

- **F006-AS-011:** Given an open image tab, when a confirmed external change arrives or the user chooses Reload, then the new image is displayed in that tab without resetting the folder tree or active tab; the viewer returns to Fit if the image dimensions change.
- **F006-AS-012:** Given an unavailable, corrupt, mismatched, or over-limit image, when opening or reloading it, then the tab shows a specific localized error and Retry or Reload; it never silently shows old pixels as current.
- **F006-AS-013:** Given an image changed while its bytes are being read, when the app cannot confirm one stable version, then it displays an uncertain status and retries or offers Reload rather than presenting a mixed image as current.

### Edge cases

- File extensions are case-insensitive; bytes that do not match the claimed format are rejected.
- Very large encoded files, oversized decoded pixel surfaces, decompression bombs, malformed SVG, broken symlinks, cloud placeholders, and unavailable folders fail with a visible reason while other tabs continue working.
- Animated formats display their first frame as a still image; the UI labels this behavior. Animation playback is outside this feature.
- An SVG containing scripts, links, event handlers, foreign content, external references, or embedded network data is never treated as active application content.
- An explicitly selected image outside the folder grants that image only; relative references inside that image are never followed.
- A window resize or sidebar resize recalculates Fit without changing the image's aspect ratio; Actual Size and manual zoom remain under user control.

## Requirements

### Functional requirements

- **F006-R01:** The app MUST open the listed supported local image files from the folder tree and explicit Open File picker as read-only tabs.
- **F006-R02:** The folder's default supported-files view MUST include Markdown and supported images. A separate all-files view MAY show unsupported file names without opening them. The filter label MUST accurately describe what it shows.
- **F006-R03:** Each image tab MUST show the image name, format, intrinsic pixel dimensions when available, and loading/error state; reopening the same file MUST focus its existing tab.
- **F006-R04:** The viewer MUST provide Fit, Actual Size, Zoom In, and Zoom Out, preserve aspect ratio, allow navigation of overflow, and keep controls keyboard accessible.
- **F006-R05:** Local relative image references in Markdown MUST use the same explicit file scope and supported-format rules as standalone images; supported relative image links MUST open image tabs.
- **F006-R06:** Image content MUST remain inert: it MUST NOT execute scripts, make network requests, load external resources, navigate, or gain file/native authority. Unsafe content MUST produce a visible placeholder or error.
- **F006-R07:** The app MUST validate actual image content, bound encoded bytes and decoded pixel work, and report unsupported, mismatched, corrupt, unavailable, and over-limit files without a partial display or application crash.
- **F006-R08:** Image tabs MUST update after confirmed external file changes and support the existing manual Reload action, retaining tab and tree context. Stale or uncertain content MUST be labeled as such.
- **F006-R09:** Opening, zooming, reloading, and closing images MUST NOT write to source images or nearby workspace files.
- **F006-R10:** All new text and errors MUST be available in English and Spanish; loading and status feedback MUST be perceivable without color or motion; nonessential UI motion MUST respect Reduce Motion.
- **F006-R11:** The feature MUST reject remote image URLs without initiating an app network fetch.

### Key entities

- **Image file:** A user-selected or selected-folder-scoped local file with a supported format, file identity, dimensions, and current disk version.
- **Image tab:** A read-only view of one image file with Fit/Actual Size/zoom state and loading/freshness/error status.
- **Inline image:** A Markdown reference resolved within the source document's granted folder scope; it carries alt text and a blocked/loading/display state.

## Success criteria

### Measurable outcomes

- **F006-SC-001:** In a disposable fixture, all eight listed format families can be opened as standalone images and inline Markdown images where applicable; unsafe or malformed samples show a visible error instead of active content.
- **F006-SC-002:** In 19 of 20 local trials with images up to 8 MiB encoded and 40 million pixels, a supported image reaches a complete view or a specific error within 2 seconds on the target Mac; all 20 finish within 5 seconds.
- **F006-SC-003:** At 640-point and 1440-point window widths, users can reach every edge of a large image at Actual Size and can return to a whole-image Fit view without distortion.
- **F006-SC-004:** Disposable fixture hashes of opened images and neighboring files remain identical before and after open, zoom, reload, and close scenarios.
- **F006-SC-005:** All scripted EN/ES keyboard journeys for open, Fit, Actual Size, zoom, Reload, error Retry, and close can complete without a pointer; Reduce Motion remains a manual acceptance check.

## Assumptions and dependencies

- “View images” includes both opening image files in tabs and displaying local relative images embedded in Markdown; the latter already exists for four raster formats and is extended here.
- The listed formats define “most common” for this draft. TIFF and HEIC/HEIF are included because the app is macOS-first. Every format is display-only; animated files show one still frame.
- The 8 MiB encoded / 40 million pixel acceptance envelope is a proposed safety and performance target, not a measured claim. Files outside safe limits receive an explicit error.
- The existing local folder/file grants, automatic refresh, manual Reload, and tab shell are reused. F003C owns restoration after restart; F004 owns Markdown editing and recovery.
- This specification is proposed for approval. No image-viewing production change is authorized until its specification, visual direction, and architecture are approved and recorded.


## Authorized HTML native reconciliation — 2026-10-08

**F006-H01**: HTML embedded PNG/JPEG/GIF/WebP pass a bounded native container/header preflight, then decode in the separate document engine process. Privileged host ImageIO is not used. External SVG is refused. Existing standalone/Markdown image XPC behavior is unchanged; HTML is not an image-decoder feature.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.
