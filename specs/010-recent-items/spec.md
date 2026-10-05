# Feature Specification: Recent Local Items

**Feature ID:** F003R | **Status:** Draft for approval | **Date:** 2026-09-29

## Outcome and boundary

Offer a small recent folders/documents list for fast return to local work. The list stores only items the user explicitly selected or opened under a selected root, in private app data. A remembered path is a suggestion, not new filesystem authority. F003C owns the currently restored session; this feature owns recents and clearing them.

## Stories and acceptance scenarios

1. **Return to an item (P1).** **AS-001** (R01/R02): After opening several documents/folders, a recent list shows them in latest-use order with name and enough parent context to distinguish duplicates. Choosing an available item opens it using verified scope or asks for native reselection. **AS-002** (R03): A moved, missing, replaced or denied item shows a specific recoverable state; it never silently opens a different item at the same path.
2. **Control history (P1).** **AS-003** (R04): Removing one recent entry removes only that app-data entry and never its source file. **AS-004** (R04/R05): Clear Recents shows a confirmation and removes recent history, while the current open workspace and F004 drafts remain. Clearing the separate F003C session follows that feature's draft-aware confirmation. **AS-005** (R06): No prior history produces a useful empty state; a corrupt local list falls back safely without blocking the app.
3. **Use it privately (P1).** **AS-006** (R07/R08): In EN/ES, keyboard users can open, reselect, remove and clear recents with visible focus; fixture hashes stay unchanged, no list is written into the repository and no app-requested network fetch occurs.

## Requirements

- **F003R-R01:** Keep a bounded latest-use list of explicitly selected folders and opened local Markdown documents, with name, distinguishing parent context and latest-use order.
- **F003R-R02:** Selecting a recent item must revalidate previously granted scope or use explicit native reselection; list text alone must never confer file/folder access.
- **F003R-R03:** Missing, moved, replaced and denied entries must show a recoverable state, without silently substituting a path match.
- **F003R-R04:** Remove One and Clear Recents must affect only private recent-list data and never source documents or F004 drafts; Clear Recents needs explicit confirmation.
- **F003R-R05:** Recents and F003C session clearing must have distinct copy and effects so a user understands whether the current workspace/drafts remain.
- **F003R-R06:** Corrupt/oversized recent data must fail safely to an empty/recoverable list; an empty list must explain how to add items through normal opening.
- **F003R-R07:** The list and all states/actions must be localized EN/ES, keyboard operable and understandable with standard assistive technology.
- **F003R-R08:** Recent-list operations must not write to selected repositories, fetch remote content or reveal items outside the local app UI.

## Success criteria

- **SC-001:** In 10 disposable open/restart/reselect trials, order and identity match the action log; missing/replaced entries require recovery rather than opening a different item.
- **SC-002:** In 10 remove/clear trials, only intended recent metadata changes and all source/draft hashes remain unchanged.
- **SC-003:** EN/ES keyboard journeys for empty/open/reselect/remove/clear succeed in a packaged Mac app at 640/900 points.

## Assumptions

Proposed cap: 20 folders and 50 documents, deduplicated by native selection identity. The exact retention cap is a draft default for user approval. Do not persist document contents, credentials or repository file lists in Recents.
