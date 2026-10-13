# Intentgrove designer handoff — PARTIAL_CAPTURE

Entry point: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/index.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/index.md). Coverage: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/coverage.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/coverage.md). Source of truth: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/manifest.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/manifest.json).

This package is CAPTURE AND DOCUMENTATION ONLY. No designer was invoked and no design conclusions are supplied. It contains 81 inventory states with accepted evidence, 55 native and 25 supplemental browser images, plus explicit failed/unattempted inventory.

## Later reviewer and scope

Use the existing **uiux-marketing-designer** skill at [/Users/juanmantilla/projects/personal/.agents/skills/uiux-marketing-design/SKILL.md](/Users/juanmantilla/projects/personal/.agents/skills/uiux-marketing-design/SKILL.md). The repository also has the project role **md-ux-designer** at [/Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-ux-designer/SKILL.md](/Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-ux-designer/SKILL.md); this is a reference to the existing role, not a newly invented replacement. The capture skill was **app-screenshots** at [/Users/juanmantilla/.codex/skills/app-screenshots/SKILL.md](/Users/juanmantilla/.codex/skills/app-screenshots/SKILL.md).

Any later invocation must be **REVIEW_ONLY**: critique existing evidence; no implementation or redesign yet. Inspect original image files before judging details. Cite inventory IDs and capture IDs. Separate directly observed conditions from hypotheses and from capture/runtime limitations. Do not treat screenshots as functional or accessibility certification.

Review topics: hierarchy, spacing, alignment, consistency, typography, contrast, discoverability, density, and layout adaptation. Evaluate these independently; no prewritten conclusions are included.

## Navigation

Use labeled contact sheets to locate an area, then open the corresponding original from the index or manifest. The contact sheets are PNG navigation aids made from resized thumbnails; they are not single application states and are not lossless original acquisitions. `originals` contains untouched JPEG tool outputs with corrected file extensions. `details` is intentionally empty. IDs are stable per discovered state; numbered capture attempts preserve multiple triggers/variants. Shared originals and exact-byte duplicates are explicit in the manifest.

For each capture, consult theme/language, runtime, fixture, reproduction steps, decoder-measured pixel dimensions, timestamp, observations and limitations. The original acquisition filenames are kept as provenance in metadata. Independent native window/display measurements are in [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/window-metadata.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/window-metadata.json) and [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/window-metadata-final.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/window-metadata-final.json); do not derive window points from image size.

## Reproduction boundary

Native app: [/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove Links Test.app](/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove Links Test.app), bundle identifier `com.juanmantilla.markdownworkspace.links-smoke`, version0.1.0. Current source HEAD: `7e00d3316ce46563cafb46ba928498fcb0d82880`, with many pre-existing dirty files recorded verbatim in shared environment metadata. No embedded commit binds the existing bundle to that source state. Real app/profile were not used.

Fixtures: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/fixtures](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/fixtures); open `project` as the native folder. `01-visual-reference.md` covers frontmatter, GFM, tables, code, local image, Mermaid and25 sections. Other fixtures cover empty/no-heading documents, long names, deeply nested folders,50 tree entries, HTML, invalid UTF8, unsupported extension, corrupt image and12MiB source. Fixture02 now contains the saved garden edit. None contains credentials or private content.

Browser supplement used existing `tests/fixtures/redesign-preview.html?layout=margin&theme=dark&locale=en&longTree=1&search=1&editor=1` on task-local Vite port5187. It mounts the real current renderer but mocks native APIs and uses synthetic in-memory paths; do not open those `/fixture` paths as real files. The `theme-states.svg` tab represents embedded document content, not the live shell. Server has stopped and temporary viewport was reset. To resume, start the same existing Vite executable with installed dependencies and revisit the documented route; do not install or rebuild automatically.

## Limits and further investigation

Every original is lossy JPEG because both native and browser screenshot APIs returned JPEG. PNG/full-resolution acquisition remains outstanding. Native menus are separate surfaces and unavailable through app screenshots; pickers/About captures show their own window and exclude the parent. Native HTML child capture was unreliable; image/diagram helper services were missing from this isolated bundle. Inactive grey native window controls in some images reflect capture focus state. These conditions require separate verification before assigning app defects.

Projects priority: current-source header close normal/focus and closed/reopened are in UI-006/UI-008/UI-004/UI-005 browser originals; native close behavior for latest Margin header is unverified. Hover, sidebar drag resizing, and tree-bottom scroll are incomplete. UI-011 shows long tree and footer but does not show the final row. UI-031 is a zoomed native layout; UI-116 is a640×480 browser viewport, not a native supported-size claim. Relevant shell boundaries are visible; do not modify them to make a capture look correct.

See the generated coverage table for every blocker and the17 unattempted items, particularly recovery/session restoration, external conflicts, editor context/selection, folder-scoped search and full scroll tails. No final designer review or QA acceptance has occurred. Keep all evidence and do not enqueue cleanup.
