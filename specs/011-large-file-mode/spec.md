# Feature Specification: Bounded Large-File Source Mode

**Feature ID:** F003L | **Status:** Draft for approval | **Date:** 2026-09-29

## Outcome and boundary

Read local Markdown larger than the 10 MiB rich-document limit without freezing the app or silently truncating content. Files above 10 MiB through 50 MiB may be opened only after explicit user choice in a bounded, read-only source view. Files above 50 MiB show a clear limit before a full read. Rendering, diagrams, syntax highlighting and section editing are disabled in this mode.

## Stories and acceptance scenarios

1. **Open with control (P1).** **AS-001** (R01/R02): Opening a 12 MiB Markdown file shows size and a choice to open read-only source or cancel; source view loads incrementally, labels mode and permits scrolling to the end without a truncated-complete claim. **AS-002** (R01/R03): Opening a 51 MiB file explains the v1 limit before a full read and offers Cancel/choose another file; it does not automatically launch another program. **AS-003** (R04): Unsupported encoding or file changing during read shows a recoverable state rather than guessed text.
2. **Navigate safely (P1).** **AS-004** (R05): Large source supports bounded text Find, line location and copy of selected text with progress; cancellation and a tab switch stop obsolete work. **AS-005** (R06): External change or Reload invalidates old chunks and shows current stable content or an uncertain/error state; original bytes remain unchanged.
3. **Keep app responsive (P1).** **AS-006** (R07/R08): At 25/50 MiB and long-line fixtures, unrelated tabs remain interactive, memory stays within the proposed budget, and source can be read to the end. **AS-007** (R09): EN/ES keyboard users can choose mode, navigate, Find, Reload and close at 640 points with visible focus.

## Requirements

- **F003L-R01:** At >10 MiB through 50 MiB, require explicit opt-in to read-only large-file source mode; at >50 MiB reject before full read with a clear limit. No silent truncation or partial editable buffer.
- **F003L-R02:** Read permitted files incrementally with bounded memory and visible loading progress; the view must allow access to beginning and end and identify when complete.
- **F003L-R03:** Only supported `.md`/`.markdown` local UTF-8 files in granted scope are eligible; unsupported/missing/changed files need recoverable states.
- **F003L-R04:** A changing file must not combine chunks from different disk versions as if current; invalidate and reload or show uncertain status.
- **F003L-R05:** Provide bounded literal source Find, line location and selection/copy without loading or painting the entire source at once; cancellation must invalidate stale results. Copying a selection larger than 1 MiB MUST require narrowing the selection or a separately specified export feature rather than allocating the entire file on the clipboard.
- **F003L-R06:** Reload/external refresh must preserve tab identity and avoid stale content claims, with F003D conflict rules where relevant.
- **F003L-R07:** Disable expensive rich rendering, diagrams, highlighting and editing in this mode; unrelated tabs and the window remain responsive.
- **F003L-R08:** Proposed memory budget is 128 MiB additional app memory for a single 50 MiB source tab on the reference Mac, measured at steady state after full navigation. Avoid unbounded per-tab retention.
- **F003L-R09:** All choices, progress, errors and controls must be localized EN/ES, keyboard accessible and non-color-only.
- **F003L-R10:** Reading/searching/copying must not write source or nearby files, follow out-of-scope links or initiate network requests.

## Success criteria

- **SC-001:** Twenty disposable boundary fixtures at 10 MiB, 10 MiB+1, 50 MiB and 50 MiB+1 show the specified opt-in/limit and complete or explicit error, with unchanged hashes.
- **SC-002:** In ten 25/50 MiB and pathological long-line trials on a recorded Mac, app remains interactive, all verified bytes can be reached and additional steady memory is <=128 MiB for one tab in at least 9/10 runs. This is an unmeasured proposed target.
- **SC-003:** EN/ES packaged keyboard journeys for opt-in, Find, line navigation, Reload and cancel pass at 640/900 points.

## Assumptions

One large file can be active at a time under the proposed memory target; multiple such tabs may retain identity but unload inactive chunks. F003S rich-document Find remains separate. The 128 MiB memory and 1 MiB selection-copy budgets are proposed refinements requiring approval and measurement.
