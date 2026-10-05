# Local HTML viewing addendum

**CURRENT DESIGN APPROVAL — 2026-10-04:** the user approved the revised design package and selected arrow option D. [Approval and reviewed hashes](approval-option-D.md) and [selected handoff](selected-design-handoff.md) govern current scope. Back/Forward sit fixed before the scrollable tab lane; previous header placement is superseded. Runtime remains NOT TESTED.

**APPROVED DESIGN — OPTION D SELECTED** · 2026-10-04 · Design only
**Historical critique revision — before the option-D approval:** changes were **PROPOSED — READY FOR DESIGN REVIEW**. The earlier non-navigation approval remains historical at the [archived baseline](archive/before-critique-2026-10-04/approval-record.md); it does not approve new material decisions. File navigation was excluded at that earlier review. See [critique and revision decisions](critique-and-revisions.md) and [exact revision inventory](revision-record.json).


Add local `.html` / `.htm` viewing to the recommended horizontal workspace. Render authored HTML with CSS in the reading surface; keep the app shell, tree, tabs and Settings consistent with the existing proposal. Links inside the rendered HTML can open any local file through type-aware routing, without running document JavaScript. Shared Back/Forward navigation applies across every file view; see [file navigation handoff](file-navigation-handoff.md). This is a viewer proposal, with no HTML authoring, source pane, remote browsing surface or editor-library choice.

## Evidence and assumptions

- **USER-REQUESTED:** HTML and CSS viewing, no JavaScript support. **Clarified:** HTML was an example; a link can lead to HTML, Markdown, an image or another file. Back/Forward is required for every file, not just HTML. Retain SVG-only visual deliverables and the design-only boundary.
- **OBSERVED:** `src/app/App.tsx:43` defines existing tab kinds as Markdown/image; `src-tauri/src/scope.rs` classifies Markdown/images/other. These observations identify handoff gaps; they do not demonstrate HTML support or working local HTML links.
- **ASSUMED / PROPOSED:** Read-only viewing and target opening in an existing/adjacent tab remain proposed choices; type-aware file links and universal Back/Forward are user requirements. Existing Markdown rich editing remains separate. Local HTML assets use existing file-access grants; remote embedded resources remain restricted, following the product brief's untrusted-content network boundary. External browser/mail launching is outside this clarified addendum; it adds no new external launch capability or remote viewing policy. The earlier HTML/CSS viewing design has recorded non-navigation design approval; implementation is not established, and routing/history plus current revisions remain proposed.
- **VALIDATED:** three SVGs parse; static primitive previews inspected for layout/text fit, consistency and legibility. Selected foreground/background contrast pairs recorded in [color measurements](contrast-measurements.md). Link activation, CSS fidelity, script isolation, keyboard operation and native integration **NOT TESTED**.

## Visual direction and artifacts

| Artifact | Shows |
|---|---|
| [09 — HTML workspace](mockups/09-html-view.svg) | Mixed Markdown/HTML tabs; HTML selected in the tree; a light authored page inside the existing dark app shell. Same restrained controls and separate Settings route. |
| [10 — Links and menus](mockups/10-html-links.svg) | Links within an HTML document to HTML/Markdown/image/another file, optional generic menu and appropriate viewer/File details routing. |
| [11 — Linked-file access](mockups/11-html-link-access.svg) | Narrow window with collapsed tree; focused file-access dialog retains the original page and anchor. |

The cream page, table and within-page contents list in screen 09 represent **illustrative authored HTML/CSS**, not a new app theme, mandatory document template or automatic contents sidebar. Dark authored HTML stays dark. A page with no stylesheet uses a legible baseline reading style (Roboto/current reading preferences, semantic heading sizes, underlined links, sensible margins); explicit author rules win. Do not force a dark conversion, replace authored fonts, cap authored grids to Markdown prose width or silently normalize the file. Reading font preferences control the unstyled fallback and Markdown, not explicit authored CSS. A future override mode is outside this proposal.

## Placement and viewing behavior

- Existing File / Projects menu Open file… **⌘O** accepts HTML; folder/file menus follow the current proposal. No extra Open/Search buttons. `.html` / `.htm` appear under **Documents and images only**, alongside Markdown/images and directories. Settings helper copy becomes “Show Markdown, HTML and supported images; keep folders visible.” Workspace SVGs now share universal Back/Forward; Settings retains its reviewed layout. The revised Settings SVG now includes HTML in its helper copy; runtime inclusion still requires canonical implementation reconciliation.
- HTML tabs use the same active underline, close target, filename/path disambiguation, overflow list, external-change status, session restore and loss guards. HTML reading cannot become dirty through selection, typing or form controls. It never invokes the Markdown section editor or recovery writer.
- Header: universal Back/Forward; filename/path; **Outline** when headings exist; **Document…**. No Edit action on HTML. Outline is generated from visible document headings, preserves their authored IDs where present and is disabled with “No headings in this document” when empty. On a narrow window move Outline into Document… before reducing readable controls.
- Metadata row: **HTML + CSS · Local file · Read only** and **JavaScript off**. The mode is permanent neutral metadata, not an error banner, toggle or claim that a script was detected. Its explanation is accessible through Document… → View details. No “Enable JavaScript” action.
- Document… groups: Find in document **⌘F**; Outline; View details; Show path / Copy path / Show in Explorer; Reload **⌘R**; Close tab **⌘W**. Reuse existing shortcut routing and grant/refresh guards. Disabled entries give a reason; no conflicting new chords.
- View details lists the selectable full file path, HTML/CSS-only mode, “JavaScript does not run here. Script-driven widgets may not respond,” and available resource issue details. Do not invent script counts, comprehensive compatibility checks or a successful security status.
- Find searches visible rendered text in the active HTML document, not markup/style/script source. Existing folder contents search remains explicitly **Markdown contents** until HTML indexing is specified; folder filename search can list HTML. With mixed types, disclose “Names: supported files · Contents: Markdown” in the search scope/results summary; do not silently report HTML contents as searched.

## Type-aware links and universal history

The authoritative [file navigation handoff](file-navigation-handoff.md) supersedes the prior HTML-only link scope and document-only previous-location action. An authored href can lead to any local file; resolve from the source file and select HTML, Markdown, image or File details according to the target. Ordinary activation follows the link inside the app. Supported embedded images and linked image destinations are distinct behaviors. Arbitrary files do not gain an invented renderer: their File details tab offers a deliberate default-app action and stays in history.

Back/Forward remains visible in every file header. One window-wide visit sequence records links, tree/file opens, search hits, tab/overflow activation and meaningful passage jumps. Preserve source/target anchors, image view state, unsaved rich drafts and existing guards. Go-menu commands and browser-like forward branching are specified in the linked handoff. These behaviors are proposals, not proof of implementation.

Link menus use Open linked file, Copy link address, Copy link text and View destination details; same-page links use Go to section. Existing secondary-click/keyboard/dismiss/focus rules apply. General HTML content never offers Edit section here. No new external web/mail routing is introduced here.

## HTML/CSS boundary and fallback states

These are **behavior requirements for frontend/security handoff**, not a chosen rendering architecture. Document JavaScript must never run: inline/external/module scripts, event-handler attributes, executable links, script-bearing SVG/embedded documents, frames or redirects cannot bypass the boundary. App functionality may use its normal implementation mechanisms; the restriction applies to opened content. Document CSS must not style app chrome, intercept its controls or escape the document viewport. No document access to application/native APIs. CSS itself can reference resources, so “scripts off” alone is not sufficient to meet the local-resource boundary. Browser sandbox documentation distinguishes script, form and navigation permissions; this proposal selects no flags/container/library. [MDN sandbox reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#sandbox), [WebKit sandbox demonstration](https://webkit.org/demos/frames/sandboxing/).

| State | Proposed treatment |
|---|---|
| Opening | Retain header/path; short “Opening HTML…” status inside the document surface. Slow/failure states are honest; no invented progress percentage. |
| Local CSS/images/fonts available | Apply inline/style rules and granted local stylesheets, relative imports/assets and local fonts under supported limits. Maintain authored alt text, captions and content structure. No network fetch triggered by document HTML/CSS, imports, media or preload. |
| Stylesheet unavailable/blocked | Keep readable HTML. Compact warning above the page: “Some page styles couldn’t be loaded. The document is still readable.” View details identifies missing vs outside-grant vs remote resource. No auto-grant or arbitrary network Retry. With no declared CSS there is no warning. |
| Image unavailable | Keep alt text and reserved authored dimensions where feasible; “Image unavailable” plus resource detail access. Never imply successful loading. |
| Script-driven interface / forms | Scripts remain off. Native HTML links, selection, details/summary and CSS-only presentation can work. No form submission or app-side persistence from document controls. Identifiable submit controls show disabled state/reason; script-only links show blocked feedback. Do not promise to recognize every dead widget; neutral mode/details copy states the limitation. Never show success after an unsupported click. |
| Empty/malformed/over-budget file | Empty: “This HTML file has no visible content.” Recoverable markup renders best effort; no silent source rewrite. Rendering failure/limit: readable error with path, reason, Reload and Close; no automatic raw-source editor. |
| External file change | Follow existing refresh/stale/unavailable rules, preserving nearest reading anchor. Close/restore keeps HTML scroll and view state; no write-back or Save. |

## Responsive and accessibility handoff

Match shell breakpoints and saved panel choices from the main handoff. At ~960 reference width the sidebar can collapse; expose Sidebar and Documents. At ~640 width / enlarged UI text, wrap metadata and move Outline/details to Document…; make dialogs fit available width, wrap long paths and stack actions when needed. Bound all menus and app dialogs to the visible work area. The HTML viewport's available width drives its authored CSS media queries. Do not scale down the whole page until text is illegible. Preserve zoomed text; overflow for fixed-width authored tables/layout stays within the document viewport and never scrolls the app chrome sideways. Authored fixed layouts may not reflow; disclose limitations rather than claiming compliance. Retain anchor across window resize/theme change and page navigation; file links/history must preserve reading anchors and the source tab’s state.

App-owned controls aim for existing focus/contrast/target requirements (at least 24×24 CSS units where applicable). Native titlebar sizing remains system-managed. Page links are underlined in the illustrative example and have distinct focus rings; static assets cannot prove link semantics, keyboard sequence or authored-page accessibility. No compliance claim for arbitrary local HTML. Reading/document accessibility, visible focus, menu/dialog focus return, text at 200%, EN/ES expansion and no traps require implementation testing. Page content remains in its original language.

## Testable acceptance criteria — all runtime checks NOT TESTED

1. Disposable `.html`/`.htm` files appear under Documents and images only, open from File/Projects/tree and restore in tabs with correct type/path/scroll; no Markdown editing/save controls are presented for HTML.
2. An authored light and an authored dark page retain their local HTML/CSS layout as app theme changes. An unstyled file receives the baseline style. Local CSS imports/fonts/images resolve only within valid grants; missing CSS produces the specified readable fallback.
3. Script/event-handler/executable-URL/embedded-content test fixtures never execute document code or access native APIs; HTML/CSS do not initiate network calls, form submissions, downloads or app-top-level navigation. This needs native renderer/security tests, not SVG inspection.
4. Keyboard and mouse activate same-page anchors; missing anchors explain failure; Back restores source anchor/focus. Cross-format local file links follow routing/grants, deduplicate target tabs and preserve the source page; shared Back/Forward works in every viewer. An unrelated Markdown draft remains intact.
5. A mixed-file fixture (HTML, Markdown, image, other file) navigates through rendered links using click and Return. Back/Forward traverses every file type and retains destination-specific resource bases/view state. HTML navigation needs no JavaScript. Accessible targets need no picker; out-of-grant targets follow the explicit access flow.
6. Access denial, missing file, unsupported scheme and unsupported preview give distinct states. Other-file preview fallback remains a file visit, not a failed link. Native-picker cancellation restores the initiating link; explicit file selection does not grant its parent folder. Long destinations remain fully inspectable.
7. Menus have one-instance lifecycle, keyboard access, reasoned disabled states and predictable dismissal/focus restoration. Resizing, scrolling and document changes leave no orphaned controls.
8. Find in HTML searches visible text; folder search clearly discloses its supported content types. Narrow/200%/ES layouts keep app controls reachable, constrain authored overflow and retain reading context.

## Decisions/questions before implementation

- Preserve the previously approved read-only HTML/CSS and JavaScript-off viewing direction. Review the still-unapproved link/history model and revised access/default-app behavior separately; a requirement is not approval of its proposed interaction. Design authorization is not feature/architecture approval.
- Specify the renderer isolation strategy, handling of embedded documents/SVG/native HTML forms, local resources and imports, resource limits and test fixtures with the security/frontend owners; select no architecture in this phase.
- Resolve URL bases, percent encoding, absolute/root-relative paths, query strings, Unicode paths, symlinks and fragment IDs within existing grants. A user-selected standalone HTML file does not authorize its CSS/image siblings; define explicit resource-file selection or a deliberately chosen folder grant flow.
- Reconcile native file-type/recents/restore/refresh support, type-aware file links/universal history, visible-text find and Outline integration in the canonical feature artifacts. Existing inspected types/guards do not support assuming these work already.
- Confirm HTML filename inclusion in folder search, and whether/when HTML contents indexing joins it. Current Markdown-only contents must remain labeled.
- Decide storage/limits for window-wide visit history and per-visit anchor/image state and baseline unstyled typography, while preserving existing document anchors and Settings semantics. No editor library or source-authoring model is selected.

Stop at this design handoff. Implementation requires explicit approval of the concrete artifacts and affected feature/architecture gates.

## Critique clarification: resources and read-only controls

The app shell keeps preference/status UI outside authored CSS; screen 09 distinguishes the viewing direction from its embedded unapproved navigation controls. Arbitrary authored HTML accessibility and script isolation are not validated by this illustration.

Missing/outside-grant local resources use **View details → Resource issues**, naming declared local files and their reasons. Choosing a resource grants only that file; an alternative **Choose resource folder…** explains that the chosen folder supplies page assets and requires a deliberate native folder selection. It must not replace the workspace root or imply access to other folders. Native/security owners must reconcile this scoped resource capability before enabling it; if unsupported, show the existing readable fallback and reason. Remote resources do not get a fetch/enable action.

Read-only means no authored-file writes, not that every HTML control is inert: text entry, checkboxes and CSS-only disclosures may change temporary page presentation. Those transient values are not a Markdown draft or persisted form submission, are cleared on reload, and are not promised to restore. Submit/unsupported script actions remain disabled or produce honest feedback. Links retain the separately proposed routing rules.
