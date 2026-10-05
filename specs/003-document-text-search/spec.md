# Feature Specification: Find Text in a Document

**Feature directory**: `specs/003-document-text-search`  
**Created**: 2026-09-25  
**Status**: Draft for user approval  
**Input**: User request for text search with Command+F on macOS and Control+F on Windows/Linux; existing document and folder search goals in `docs/product-brief.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Find text in the current document (Priority: P1)

A developer reading a Markdown document presses the familiar Find shortcut, enters text, and sees where it occurs in the active document without leaving the reading view.

**Why this priority**: The shortcut and immediate location of text are the requested outcome.

**Independent Test**: Open a disposable Markdown file on macOS, press Command+F, type a known phrase, and locate its highlighted occurrence without using a mouse.

**Acceptance Scenarios**:

1. **AS-001** (F003S-R01, R03): Given an active Markdown tab on macOS, when the user presses Command+F, a document Find control opens with its input focused. Typing a phrase shows matching text in that tab.
2. **AS-002** (F003S-R02): Given a supported Windows or Linux build in a later release, when the user presses Control+F, the same document Find control opens with its input focused.
3. **AS-003** (F003S-R04, R05): Given several occurrences of a phrase, including some offscreen, when the user searches, the count includes every match in the searchable document text, onscreen matches are indicated, and the active match and its position are distinct.
4. **AS-004** (F003S-R03, R06): Given an empty query, the Find control invites entry without reporting a false match. Given a query absent from the document, it reports zero matches without changing the document.

---

### User Story 2 — Move through results without losing reading context (Priority: P1)

The developer moves forward and backward through occurrences, sees each in context, and returns to the document when finished.

**Why this priority**: Finding text is useful only when the user can inspect each occurrence and keep reading.

**Independent Test**: Search a disposable file with matches before and after the current scroll position, navigate in both directions, wrap at each end, then close Find and continue reading.

**Acceptance Scenarios**:

1. **AS-005** (F003S-R05): Given multiple matches, when the user presses Enter or Shift+Enter in Find, the active result moves forward or backward, wraps at the end, and scrolls into view without altering the file.
2. **AS-006** (F003S-R03, R05, R09): Given an active result, when the user presses Escape, Find closes, focus returns to the document, and the current result remains in view for reading.
3. **AS-007** (F003S-R03, R10): Given a Find query in one tab, when the user switches tabs, Find closes and results from the previous tab disappear; returning to the first tab does not reopen Find or change its file.
4. **AS-008** (F003S-R07, R10): Given a document that refreshes after an external edit, or an active unsaved section draft, when its displayed text changes, stale matches are removed and Find reflects the current displayed text without saving or discarding a draft.

---

### User Story 3 — Use Find safely and accessibly (Priority: P2)

The developer can find text in English or Spanish UI, including with keyboard and assistive technology, while repository documents remain unchanged.

**Why this priority**: Search must preserve the app's reading, privacy, and accessibility rules.

**Independent Test**: Use a packaged macOS build with a disposable repository, perform the Find journey with keyboard and assistive technology, then compare file hashes and observe app-requested resources.

**Acceptance Scenarios**:

1. **AS-009** (F003S-R07, R09): Given a local document, when the user searches it, the app makes no search-triggered network request and the document's bytes remain unchanged.
2. **AS-010** (F003S-R09): Given English or Spanish UI, when the user opens Find with the keyboard, its input, result count, active match, empty state, and close action have equivalent accessible labels and visible focus.
3. **AS-011** (F003S-R08): Given an unreadable, missing, unsupported, or over-limit document, when the user opens Find, the app explains why searching that document is unavailable and leaves other tabs usable.

### Edge Cases

- A document may contain the same phrase in headings, lists, tables, code blocks, links, and repeated text. Matches are based on text presented to the reader, not Markdown punctuation hidden by rendering.
- Search is literal and case-insensitive by default. Distinct accents remain distinct; a query with no match reports zero. This default can be revisited in a later search-options feature.
- While a section editor is active, Find targets that section's visible CodeMirror source draft. Its live preview and the unchanged surrounding document are not counted a second time.
- Collapsed or otherwise hidden content is not reported as an available match until it is shown. Search does not reveal protected or out-of-scope content.
- A query may contain spaces, punctuation, or non-English characters. Empty and whitespace-only queries do not highlight matches.
- Switching tabs, closing a tab, or closing Find must stop work for results no longer visible. A document that changes during a search must not leave stale highlights or crash the reader.
- Remote or executable content embedded in Markdown remains inert. Find does not follow links, traverse folders, write document files, or make network requests.

## Requirements *(mandatory)*

### Functional Requirements

- **F003S-R01**: In the macOS app, Command+F MUST open Find for the active Markdown document from any document view and focus its query input.
- **F003S-R02**: When Windows and Linux builds are separately supported, Control+F MUST open the same document Find action on those platforms. This requirement does not make Windows or Linux a v1 release target.
- **F003S-R03**: Find MUST search only the active document tab and show a compact control that does not obscure the active match. Switching tabs MUST close Find and clear its highlights. Escape MUST close Find and return focus to the document; when an active match exists, it MUST remain in view.
- **F003S-R04**: Find MUST match literal text case-insensitively in the document's searchable displayed text and distinguish accented and unaccented characters. The total count and current position MUST include all matches in that text, including offscreen matches; onscreen matches and the active match MUST be indicated. Hidden Markdown syntax MUST NOT be reported as rendered-text matches.
- **F003S-R05**: Enter and Shift+Enter in Find MUST move to the next and previous match, wrap at either end, and bring the active match into view without editing the document.
- **F003S-R06**: Empty or whitespace-only queries MUST show an entry state without highlights; queries with no match MUST show a clear zero-results state. Find MUST remain usable after either state.
- **F003S-R07**: Find MUST work on already-open local content, make no network request, and never write to or modify the searched document or an unsaved draft.
- **F003S-R08**: If the active document is unavailable, unreadable, unsupported, or larger than the existing 10 MiB rich-document limit, Find MUST show a recoverable unavailable state rather than a partial result presented as complete.
- **F003S-R09**: Find, its result indicators, and all actions MUST be keyboard operable and understandable with assistive technology in English and Spanish. Highlighting MUST remain perceivable without color alone, and motion MUST not be required to locate a result.
- **F003S-R10**: Find MUST search the current displayed version of the active document, including an unsaved section draft when one is visible. After an external refresh, active draft change, or tab switch, results and counts MUST update or clear so they never claim to describe a different document version.

### Key Entities

- **Find session**: The current tab, query, open or closed state, and active result position.
- **Searchable document version**: The text currently shown in the active tab, including any visible unsaved draft, with its read-only or unavailable state.
- **Match**: A location in the displayed document text, with an order among results and an active or inactive state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a packaged macOS build, at least 9 of 10 first-time users can press Command+F, find a named phrase in the active document, move to the next result, and return to reading within 30 seconds without a mouse.
- **SC-002**: In 10 warm trials on the recorded reference Mac, a 1 MiB ordinary mixed Markdown document shows the first result and count within 250 ms of completing a query in at least 9 trials. This is a target, not a measured result.
- **SC-003**: Across 20 disposable documents with repeated, absent, accented, and whitespace-only queries, 20 of 20 show the expected result count and navigation order; all searched file hashes and unsaved drafts remain unchanged.
- **SC-004**: The Find journey and its empty, zero-results, and unavailable states are fully keyboard operable in both English and Spanish, with result status perceivable using assistive technology.
- **SC-005**: Once Windows and Linux builds are separately specified and supported, the same shortcut journey succeeds with Control+F on each tested platform. Until then, those platform checks are NOT TESTED rather than claimed as v1 support.

## Assumptions

- This is the document-Find part of the F003 search goal in `docs/roadmap.md`. Folder-wide search, ignored-file controls, recent documents, session restoration, and large-file source-mode search remain separate F003 work and are not implied by Command+F.
- Command+F and Control+F search the current document, not all tabs or a folder. The current tab must already be open; Find does not grant access to other files.
- macOS is the first release target. The user-specified Control+F parity is a requirement for future Windows and Linux builds, which still need separate specification and verification before being described as supported.
- Search covers text currently presented in rendered reading mode; if a source or section editor is later active, it covers the displayed source text and draft. It does not inspect collapsed metadata or content that has not been shown.
- The Find control's visual treatment follows the project's simple reading UI and applicable visual design approval. The draft constitution's proposed motion guidance does not itself approve a design or change an existing approved visual artifact.
