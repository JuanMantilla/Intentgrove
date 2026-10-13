# Intentgrove visual review

Status: **PROVISIONAL_REVIEW_COMPLETE**. Route: **REVIEW_ONLY**. Original capture: **PARTIAL_CAPTURE**, unchanged. Recommendations are proposed, awaiting user review; no implementation approval or QA acceptance is implied.

## Executive summary

The available images support a useful provisional review. All **93 preserved original screenshot files** were opened at original resolution: 80 accepted originals and 13 retained rejected originals. Ten contact sheets were used only for navigation. One additional rejected acquisition record points to an accepted file after a reported overwrite; its lost original was not inspected.

The clearest priorities are folder-search density/context, long filename header growth, and file identity in truncated tree rows. The Spanish 640×480 browser frame raises an important adaptive-layout question, but does not establish a native defect. The older native unsaved-edit dialog would benefit from explaining the distinction between saving and keeping a draft. No supported finding warrants High priority on this evidence alone.

The recent Projects correction looks visually coherent in the current-renderer browser frames: close control in the Projects header, sidebar directly below tabs, and toolbar inside the document column. Preserve those boundaries. Current native acceptance remains unanswered. There is no basis here to certify close/reopen behavior, keyboard operation, focus management, resize behavior, accessibility compliance, or exhaustive coverage.

## Evidence quality and reconciliation

Independently checked: the manifest contains 133 inventory rows, with 81 captured, 28 blocked, 17 not attempted, and 7 not applicable; 94 acquisition records, 80 accepted (55 native / 25 browser) and 14 rejected. All 93 distinct referenced files exist, have bytes, were visually opened, and their SHA256 matches the recorded value. All originals have JPEG signatures; `file` also identifies JPEG data. No original was converted, retouched, replaced, or resized for this review. JPEG remains lossy if converted to PNG. These images support hierarchy, layout and copy observations; softness, halos, fine antialiasing and apparent font weight are not treated as rendering defects. No contrast ratios were measured.

**81 items versus 80 images:** 80 accepted images have 76 distinct primary inventory IDs. UI-004, UI-005, UI-082 and UI-083 each have two accepted runtime variants, so images exceed primary IDs by four. Five additional inventory IDs share visible evidence: 76 + 5 = 81; equivalently 80 − 4 + 5 = 81. Captured inventory rows contain 85 image references, not 85 unique images.

| Shared image | Additional item | What is actually visible |
|---|---|---|
| UI-008-C014 | UI-117 | A visible focus outline on Projects close; supports button focus appearance, not keyboard behavior. |
| UI-028-C082 | UI-110 | Light Folio Projects overlay and dimmed background; supports this overlay only, not all major overlays. |
| UI-029-C086 | UI-044 | Populated outline with Second document / Secondary heading; valid visible mapping. |
| UI-054-C063 | UI-114 | Spanish unsaved-edit dialog; supports this dialog, not every Spanish dialog. |
| UI-100-C088 | UI-118 | Selected Documents and images only checkbox and Comfortable preset. **No radio controls are visible here.** UI-118 reproduction metadata refers to C079–C081, which show radio alternatives, but its screenshot list does not include them. Record partial evidence for this compound item; do not silently repair the original manifest. |

The unchanged status count describes the capture's bookkeeping, not independently validated completeness of every named state. In particular UI-118's radio portion is not evidenced by its assigned image. UI-011-C058 shows a footer and a long-tree context, but not the last row; opening document49 did not prove scrolling to the tree tail. UI-083-C077 shows an entered query and a clipped scan-summary line, not readable result rows. UI-031-C078 separately shows the completed result count and rows in a wider native frame. Do not count unseen results as visible in C077. UI-051-C062 shows an unsaved indicator and recovery-saved text, not proof that recovery persisted to disk. C063/C064 demonstrate similar dialog appearances reached by reported different triggers, not verified transition behavior.

**94 records / 93 files:** rejected UI-003-C004 references UI-003-C005's accepted Spanish image. The capture report discloses an overwritten early raw frame. Its hash match verifies the currently referenced C005 bytes, not recovery of C004. Rejected C003 is labeled dark in metadata/filename but visibly light; rejected runtime/theme labels are not universally reliable. No timestamp is used as build-freshness evidence.

## Runtime/build classification

| Category | Accepted originals | All preserved originals | Basis and limits |
|---|---:|---:|---|
| Current/target native build | 0 | 0 | No capture establishes this category. |
| Older native build | 55 | 67 | Per-record native limitation and shared acquisition metadata attribute these to the older Links Test bundle, version 0.1.0. This is metadata attribution, not a proof that each frame used identical executable bytes. |
| Browser preview | 25 | 26 | Recorded test renderer with mocked native APIs; contemporary dirty source at capture, not a release/native acceptance build. |
| Unknown version/runtime | 0 | 0 | No file lacks runtime attribution; **exact source/build identity remains unknown for native frames**. |

Every file's classification, dimensions and acceptance disposition is listed in the review STATE. Native metadata records bundle identifier `com.juanmantilla.markdownworkspace.links-smoke` and executable SHA256 `eb4499b6d0b1b4d9bca4cacbb0ab5b080ffe5bfdf93bc6f909609a856c445866`, but no per-frame executable verification or embedded commit. Recorded source HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` had many dirty files and cannot bind the older bundle to current source. Browser exact Chrome version and native exact WebKit build are unrecorded. Shared metadata does not justify assuming every native image has the same build provenance.

Window points, image pixels and browser viewport dimensions are different quantities. Baseline native bounds and settings bounds are reported in separate window-metadata snapshots; historical wide bounds and some transport scaling remain ambiguous. No Retina, supported native minimum-size, zoom or complete theme/language/size matrix is established. Pickers and About are their own native windows, with no parent context. Inactive grey traffic lights are not reported as disabled app controls.

Reported missing helpers, separate native popup/menu surfaces, pointer/resize failures and HTML child capture problems are acquisition/runtime limitations. C045/C047/C048's blank HTML bodies and C085's clipped backing frame are excluded as app-defect evidence. C046 visibly has HTML body plus a warning; it does not show the intended unsupported-file details. An unavailable diagram helper is not proof of a product rendering failure.

Only comparable states are compared: C079/C080 settings share runtime, language, layout and content; C013/C093 browser shell/content can support light/dark and EN/ES layout observations with the locale changing, not controlled contrast judgments. C074/C078 illustrate older native normal/wide layout with the same saved document, without deriving native window points. C084 is Folio and C074 is Margin, so they are not used as a simple theme-only comparison. User document text remains English in Spanish shells; that is intentional, not a localization failure. Any UI depicted inside document imagery belongs to that content: this review critiques only Intentgrove's outer live shell and its presentation of the document.

## Prioritized, deduplicated findings

## DR-001 — Search controls crowd out results and lose query context

Classification: **observed visual issue**. Priority: **Medium**. Confidence: **High for visible layout; current-native persistence unverified**.

Affected surface/state: Projects / folder search, baseline and scrolled results

Runtime/build applicability: Older native baseline/wide and current-renderer browser; these are separate examples, not identical-build comparisons.

- UI-082-C075 / UI-082: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-082_C075_folder-search-empty_dark_en_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-082_C075_folder-search-empty_dark_en_NATIVE.jpg). Package-relative path: `originals/UI-082_C075_folder-search-empty_dark_en_NATIVE.jpg`.
- UI-083-C077 / UI-083: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-083_C077_folder-search-results_dark_en_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-083_C077_folder-search-results_dark_en_NATIVE.jpg). Package-relative path: `originals/UI-083_C077_folder-search-results_dark_en_NATIVE.jpg`.
- UI-083-C031 / UI-083: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-083_C031_folder-search-results_dark_en_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-083_C031_folder-search-results_dark_en_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-083_C031_folder-search-results_dark_en_BROWSER-PREVIEW.jpg`.
- UI-084-C032 / UI-084: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-084_C032_folder-search-no-results_dark_en_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-084_C032_folder-search-no-results_dark_en_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-084_C032_folder-search-no-results_dark_en_BROWSER-PREVIEW.jpg`.
- UI-115-C091 / UI-115: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-115_C091_Spanish-search_light_es_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-115_C091_Spanish-search_light_es_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-115_C091_Spanish-search_light_es_BROWSER-PREVIEW.jpg`.
- UI-031-C078 / UI-031: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-031_C078_wide-desktop-layout_dark_en_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-031_C078_wide-desktop-layout_dark_en_NATIVE.jpg). Package-relative path: `originals/UI-031_C078_wide-desktop-layout_dark_en_NATIVE.jpg`.

Visible evidence: In native baseline C075/C077, controls consume the available area above the footer; the summary runs into the lower edge and no result row is visible in C077. Browser C031 exposes only the beginning of a result snippet while the query and Back to explorer have scrolled out of view. Spanish C091 uses three rows for mode controls and the visible region ends before the remaining search options. The wide C078 has readable result rows, a useful disconfirming example: the issue depends on available space.

User consequence: Users may have to scroll past controls to see matches, then back to verify or change the query. The frames do not establish that any control or result is permanently unreachable.

Recommendation: Keep the query/scope identifiable while browsing results; reduce control-area repetition and reserve useful vertical space for results. Preserve the footer and clear mode labels.

Acceptance criteria: On the current native baseline, a completed nonempty search shows its query/scope, summary and at least one complete result snippet together. The query remains identifiable after scrolling results. All search options and footer actions remain reachable in EN and ES at supported sizes.

Additional evidence: CR-01: current native baseline/Spanish result capture, including scrolled result state, before implementing a desktop fix.

## DR-002 — Long filename expands the document header into a large block

Classification: **observed visual issue**. Priority: **Medium**. Confidence: **High for historical observation**.

Affected surface/state: Margin document identity / long filename

Runtime/build applicability: Older native only; current behavior unknown.

- UI-017-C044 / UI-017: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-017_C044_tab-overflow_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-017_C044_tab-overflow_light_es_NATIVE.jpg). Package-relative path: `originals/UI-017_C044_tab-overflow_light_es_NATIVE.jpg`.
- UI-011-C058 / UI-011: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-011_C058_Projects-long-tree-and-footer_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-011_C058_Projects-long-tree-and-footer_light_es_NATIVE.jpg). Package-relative path: `originals/UI-011_C058_Projects-long-tree-and-footer_light_es_NATIVE.jpg`.

Visible evidence: C044 wraps the long filename into six lines beside a single row of toolbar controls. The identity/toolbar region becomes markedly taller than C041 with a short filename. C058 repeats the pattern at three lines.

User consequence: Chrome consumes reading space and the document begins lower for a file whose name is long. The full name is preserved, so this is not an unreadable-content or task-blocking finding.

Recommendation: Bound visible filename identity to a compact one/two-line treatment, retain a meaningful distinguishing suffix and provide full identity through an explicit disclosure. Preserve document-column toolbar ownership.

Acceptance criteria: A long filename does not increase the identity region beyond two filename lines at the baseline supported native size. The complete filename/path remains available without relying solely on hover; actions stay aligned and content is not overlapped.

Additional evidence: CR-02: same long-file state on a provenance-verified current native candidate, before applying a historical fix.

## DR-003 — Narrow Spanish browser frame has no visible document

Classification: **needs validation**. Priority: **Medium**. Confidence: **High for frame; Low for native applicability**.

Affected surface/state: Margin / Projects open / folder search at 640×480 browser viewport

Runtime/build applicability: Browser preview only; native supported minimum size unrecorded.

- UI-116-C090 / UI-116: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-116_C090_Spanish-narrow-layout_light_es_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-116_C090_Spanish-narrow-layout_light_es_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-116_C090_Spanish-narrow-layout_light_es_BROWSER-PREVIEW.jpg`.

Visible evidence: Projects spans the content width. Its footer remains visible; only the search label is visible above it. The live document and document toolbar are absent from this frame, and another tab is cut off near the Go label.

User consequence: If this state occurs at a supported native size, navigating/searching may obscure the primary reading task. One still image does not establish whether closing Projects restores the reader or whether this viewport is supported.

Recommendation: First establish the supported native minimum. If this reproduces there, use the existing collapse/overlay pattern so users can dismiss navigation and reach the reader; do not redesign from this browser frame alone.

Acceptance criteria: At the supported native minimum with Spanish labels, open Projects has a visible dismissal control; after dismissal the document and essential toolbar actions are visible and unclipped. Search input/actions/results can be reached with navigation open. Record actual bounds and before/after states.

Additional evidence: CR-03: current native minimum-size pair. No native defect or fix approval until reproduced.

## DR-004 — Unsaved-edit choice does not explain Save versus Keep draft

Classification: **design judgment**. Priority: **Medium**. Confidence: **Medium**.

Affected surface/state: Return-to-reading / close-tab unsaved confirmation

Runtime/build applicability: Older native Spanish dialogs only.

- UI-054-C063 / UI-054: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-054_C063_return-reading-unsaved-dialog_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-054_C063_return-reading-unsaved-dialog_light_es_NATIVE.jpg). Package-relative path: `originals/UI-054_C063_return-reading-unsaved-dialog_light_es_NATIVE.jpg`.
- UI-055-C064 / UI-055: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-055_C064_close-tab-unsaved-dialog_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-055_C064_close-tab-unsaved-dialog_light_es_NATIVE.jpg). Package-relative path: `originals/UI-055_C064_close-tab-unsaved-dialog_light_es_NATIVE.jpg`.

Visible evidence: The body says changes have not been saved to the Markdown file. It offers Cancelar, Descartar, Guardar and a visually primary Conservar borrador on a second line, without stating in that dialog where the draft is kept or what happens on leaving.

User consequence: Users may conflate retaining a local recovery draft with writing the document. This is a comprehension risk, not evidence of data loss or incorrect saving.

Recommendation: Retain the safe draft-preservation option and explain its consequence in plain language. Make Save to file and Keep local draft distinct; confirm actual product behavior before choosing final copy.

Acceptance criteria: The dialog explicitly distinguishes writing the Markdown file from retaining a local draft and states whether reading/closing continues. EN/ES copy fits without clipping; Cancel and Discard remain distinct. Validate comprehension with a neutral task, rather than inferring it from appearance.

Additional evidence: CR-04: current native equivalent dialog and verified action semantics (separate functional evidence) before altering this consequential copy.

## DR-005 — Similar tree filenames lose their distinguishing endings

Classification: **design judgment**. Priority: **Medium**. Confidence: **High for appearance; behavior untested**.

Affected surface/state: Projects / similarly named files

Runtime/build applicability: Current-renderer browser only.

- UI-006-C013 / UI-006: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-006_C013_Projects-header-close-normal-current-source_dark_en_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-006_C013_Projects-header-close-normal-current-source_dark_en_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-006_C013_Projects-header-close-normal-current-source_dark_en_BROWSER-PREVIEW.jpg`.
- UI-112-C093 / UI-112: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-112_C093_Spanish-reader_light_es_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-112_C093_Spanish-reader_light_es_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-112_C093_Spanish-reader_light_es_BROWSER-PREVIEW.jpg`.
- UI-018-C020 / UI-018: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-018_C020_open-documents-dialog_dark_en_BROWSER-PREVIEW.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-018_C020_open-documents-dialog_dark_en_BROWSER-PREVIEW.jpg). Package-relative path: `originals/UI-018_C020_open-documents-dialog_dark_en_BROWSER-PREVIEW.jpg`.

Visible evidence: The two close-review-similar-filename rows and the two disposable-long-project-file rows truncate to matching prefixes in the tree. Tabs preserve more distinguishing middle/suffix text, and C020 supplies a useful full-name/path Open documents workaround.

User consequence: Users may need additional disclosure to choose the correct file. The images do not prove absence of tooltips or keyboard access to full identity.

Recommendation: Preserve a distinguishing ending in tree labels where similar names collide, while retaining explicit full-path access. Reuse the existing document-list disclosure pattern.

Acceptance criteria: The fixture alpha/beta and long-project pair can be visually distinguished in the baseline sidebar without hovering. Complete identity remains available through an explicit accessible disclosure; ordinary short names and selected-state treatment remain unchanged.

Additional evidence: Include this pair in CR-01 current-native shell capture before treating it as a native issue; no separate full capture run needed.

## DR-006 — Save success uses warning-like presentation

Classification: **design judgment**. Priority: **Low**. Confidence: **Medium**.

Affected surface/state: Document notification banner / successful save

Runtime/build applicability: Older native only.

- UI-058-C067 / UI-058: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-058_C067_save-success-banner_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-058_C067_save-success-banner_light_es_NATIVE.jpg). Package-relative path: `originals/UI-058_C067_save-success-banner_light_es_NATIVE.jpg`.

Visible evidence: A successful Archivo guardado message with a long full path uses a brown-toned text/border strip. The retained C046 warning uses a related warm presentation, but is a failed acquisition and only corroborates the visible message styling; it does not establish current notification behavior.

User consequence: Success may feel like a caution, and the long path competes with the short outcome. No user confusion or measured contrast failure is demonstrated.

Recommendation: Lead with a concise saved outcome and file identity; use a consistent success cue in text/icon, with full path available through disclosure. Preserve the dismiss control.

Acceptance criteria: Save success and warning/error messages have distinct textual/icon semantics in light and dark; the filename is identifiable and full path accessible without overwhelming the outcome. No reliance on color alone.

Additional evidence: Confirm the success banner on a current candidate when naturally captured for CR-04; not a standalone high-priority recapture.

## DR-007 — Spanish settings window retains an English title

Classification: **observed visual issue**. Priority: **Low**. Confidence: **High for historical observation**.

Affected surface/state: Native Settings window / Spanish locale

Runtime/build applicability: Older native only; OS dialogs use OS language and are excluded from this finding.

- UI-099-C010 / UI-099: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-099_C010_Spanish-settings_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-099_C010_Spanish-settings_light_es_NATIVE.jpg). Package-relative path: `originals/UI-099_C010_Spanish-settings_light_es_NATIVE.jpg`.
- UI-094-C011 / UI-094: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-094_C011_Reading-controls_light_es_NATIVE.jpg](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/originals/UI-094_C011_Reading-controls_light_es_NATIVE.jpg). Package-relative path: `originals/UI-094_C011_Reading-controls_light_es_NATIVE.jpg`.

Visible evidence: The app-owned titlebar reads Settings — Intentgrove while the window body uses Spanish headings and controls.

User consequence: A small localization inconsistency weakens continuity; it does not obstruct adjusting preferences.

Recommendation: Localize the app-owned settings title consistently with the selected interface language. Keep the product name.

Acceptance criteria: Spanish settings title is localized; English title remains English. Do not force app locale onto standard OS-owned picker labels.

Additional evidence: Current native confirmation needed before a fix; low-value standalone recapture, add only if settings is otherwise opened.

## Strengths to preserve

- Reading hierarchy is clear: large document headings, readable body rhythm, restrained panels and a coherent reading column (C035/C041/C074/C084). Wide Folio deliberately leaves surrounding space; do not stretch paragraphs across the window just to fill it.
- Current browser Projects correction is visually sound (C013/C014/C016/C093): close sits at the header's trailing side, header/control alignment is coherent, top edge meets tabs, document toolbar stays in its column, and footer is visible. C014 has a conspicuous focus outline. This is appearance evidence only. Native C082's close below its header is historical and does not reopen the already corrected browser design.
- Active tabs/tree entries use both accent and structural cues; selected reading presets/radios/checkboxes are visible (C014/C041/C079–C081/C088). No compliance claim follows.
- Find shows a count, differentiated matches, no-match text and disabled navigation states (C026–C029). Folder-search mode selection also includes a checkmark, not color alone.
- Dialogs distinguish intact original files from local drafts/session data, and the destructive confirmations contain concrete consequences (C065/C070–C073). Preserve this care; DR-004 asks for a clearer distinction between two preservation choices.
- Settings group appearance/layout/reading clearly, show a reading preview, keep Done visible while scrolled, and place a range validation message near the invalid value (C010–C012/C079–C081/C087/C088).
- Empty-outline explanation and diagram source fallback are informative (C042/C037). Their appearance is useful even though missing helpers prevent validating normal rich rendering.

## Coverage and unresolved questions

All 80 accepted originals and all 13 unique retained rejected originals were visually inspected at their original file resolution. Batches were 8 originals each for accepted files, then 7 and 6 retained rejected originals. Review STATE contains the complete per-file ledger. A file opened at original resolution is not proof that capture transport retained native pixel fidelity; JPEG and scaling limits remain.

Captured welcome, populated/empty reading, selected tabs/tree, menus, search, large-source controls, editing/draft status, confirmation overlays, storage, settings and layout variants have been reviewed. Unseen hover, menu popups, final tree/search rows, unsupported details, normal image/diagram rendering, conflicts, recovery/restore, native minimum-size, and Retina states remain unreviewed. C086 Atlas shelf cuts the lowest visible Projects row at its region boundary and has no obvious scrollbar in the frame; this is an unresolved affordance/scroll question, not a new obstruction finding without a settled scroll state. C043's blank empty document is coherent with an empty file and is not treated as failed loading.

No application source was inspected. Project instructions, state and design-direction documentation were read for context; design-direction contains proposals and stale branding language, not proof of current implementation or approval. No external research, contrast measurement, accessibility testing, usability testing or behavioral testing occurred. The critical second pass checked whether narrower space, longer labels, safe exits and file identity alter conclusions: wide search disconfirms a universal search failure; full-name document lists mitigate tree ambiguity; missing helpers and rejected frames prevent assigning rendering bugs; browser correction evidence limits historical close-placement criticism.

No new captures, mockups, prototypes, application changes, build/install, commit/push/deploy, deletion or cleanup occurred. Shared project state and original capture artifacts are preserved; phase progress is localized in this review STATE. This is not DONE_ACCEPTED QA evidence and does not enqueue cleanup. Stop for user review.
