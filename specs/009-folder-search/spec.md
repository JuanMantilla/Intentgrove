# Feature Specification: Search the Selected Folder

**Feature ID:** F003F | **Status:** Draft for approval | **Date:** 2026-09-29

## Outcome and boundary

Find Markdown by filename or text within the selected local root, then open a result at its matching passage. Document Find is F003S. Search never grants access outside the root, follows a symlink, writes a file or fetches remote content. One active root is supported; explicit single-file tabs outside it are excluded from folder search.

## Stories and acceptance scenarios

1. **Find in a repository (P1).** **AS-001** (R01–R03): Search a 25,000-entry disposable root by name and content; show incremental results with file, line/context and progress, then open a match in a tab. **AS-002** (R04): Default search respects `.gitignore` and the project's visible default exclusions; a labeled include-ignored choice reruns the search and identifies ignored hits. **AS-003** (R05): Empty/whitespace query shows guidance; zero results show an explicit state. An unreadable, unsupported or over-limit file contributes a counted skip/error, not a false complete result.
2. **Control work (P1).** **AS-004** (R06): Changing query, closing Search or switching roots cancels obsolete work; no stale result appears under the new root/query. **AS-005** (R07): A user can stop a long search and still open already verified results, with an honest partial/cancelled label. **AS-006** (R08): A changed file between result and open is read fresh; the app navigates to a valid nearby location or says the match moved, without displaying old content as current.
3. **Use it safely (P1).** **AS-007** (R09/R10): Search in EN/ES is keyboard accessible and shows clear progress/errors at 640 points. File hashes stay unchanged and zero app-requested network attempts occur. **AS-008** (R11): Search of 25,000 entries acknowledges cancellation within 250 ms on a recorded reference Mac; record cold/warm timings and total/skip counts.

## Requirements

- **F003F-R01:** Search file names and text of supported `.md`/`.markdown` files within the currently selected root, case-insensitively, and show ordered incremental matches with path, line and context.
- **F003F-R02:** Opening a result must use current scoped file access, focus the appropriate tab and locate the current matching passage; a result cannot itself authorize an out-of-scope path.
- **F003F-R03:** Support 25,000 visible entries including 5,000 Markdown files with incremental listing, visible progress and bounded memory/work.
- **F003F-R04:** Respect `.gitignore` and visible default exclusions by default; an explicit include-ignored control may include ignored files while still enforcing scope and no-follow safety.
- **F003F-R05:** Show empty, zero, partial, unreadable, unsupported, over-limit and cancelled states accurately, including skipped counts; never present a partial scan as complete.
- **F003F-R06:** A new query/root or closed panel must cancel and invalidate old work; stale results cannot cross query or root generations.
- **F003F-R07:** Stop action must preserve only verified results and label them partial; search cancellation acknowledgment target is 250 ms on the reference Mac.
- **F003F-R08:** Result opening must verify the current file version and handle changed/missing content with a safe location fallback and explanation.
- **F003F-R09:** Search must not modify repository files, follow symlinks/aliases, search explicit single-file grants outside the root, or make app-initiated network requests.
- **F003F-R10:** All controls, progress and errors must be keyboard accessible and localized EN/ES with visible focus and non-color status.
- **F003F-R11:** The proposed 25,000-entry cancellation and responsiveness target requires packaged measurement; no result may freeze unrelated tabs.

## Success criteria

- **SC-001:** Across 20 disposable fixture queries, expected filename/content results, ignored toggles, skip counts and current-file navigation agree with a fixture manifest; all file hashes stay unchanged.
- **SC-002:** In 10 25,000-entry cancellation trials on a recorded Mac, at least 9/10 acknowledge Stop within 250 ms and no stale result is shown after a root/query change.
- **SC-003:** EN/ES keyboard journeys for start, result open, toggle, Stop, empty/error and close pass at 640/900/1440 points in a packaged app.

## Assumptions

Default exclusions follow the approved F001 tree policy where applicable and are disclosed in UI. Binary/non-Markdown files are skipped. The exact search indexing strategy belongs in a technical plan; persistent full-text indexing is not required by this draft.

## IR-05 native supplement � 2026-10-06

The authorized optional subtree and native Go extension is specified in [ir05-native-amendment.md](ir05-native-amendment.md). Original approved artifacts and packaged acceptance remain intact.


## Authorized HTML native reconciliation — 2026-10-08

**F003F-H01**: HTML/HTM names are included without reading or indexing HTML contents. Content search remains Markdown. open_local_search_hit validates the existing job/root/scope/hit and returns a typed LocalView; the original open_search_hit remains the Markdown consumer contract.

October6 remaining-scope authorization applies; no existing design reapproval. [Canonical native boundary](../001-workspace-reader/html-native-amendment-20261008.md), [provider handoff](../../os-engineering/html-frontend-handoff.md). Historical requirements and approval snapshots remain historical; this supplement does not claim runtime acceptance.
