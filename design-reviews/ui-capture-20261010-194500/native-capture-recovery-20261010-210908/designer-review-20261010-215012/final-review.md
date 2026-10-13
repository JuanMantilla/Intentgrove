# Focused native design review

Status: REVIEW_COMPLETE — PROPOSED, AWAITING USER APPROVAL. Design route: REVIEW_ONLY. No implementation or QA acceptance implied.

## Result and priority

Four bounded issues are confirmed in the supplied current-source native development runtime. None demonstrates a blocked core task or warrants High priority. Search visibility and header growth are the strongest fixes; dialog copy and tree identity need smaller refinements. DR-003 remains blocked. Historical criticisms were reevaluated against the new originals rather than carried forward automatically.

| Finding | Verdict | Priority | Confidence | Accepted native evidence |
|---|---|---|---|---|
| DR-001 — Search visibility/context | CONFIRMED_CURRENT | Medium | High | NV-002, NV-004, NV-005, NV-006, NV-007 |
| DR-002 — Filename header growth | CONFIRMED_CURRENT | Medium | High | NV-008, NV-009 |
| DR-003 — Narrow native layout | BLOCKED | Deferred | Low | None at narrow bounds; NV-001/NV-008 establish normal width only |
| DR-004 — Save/draft distinction | CONFIRMED_CURRENT | Medium | Medium | NV-011 |
| DR-005 — Tree filename ambiguity | CONFIRMED_CURRENT | Low | High | NV-001, NV-008, NV-010 |

CONFIRMED_CURRENT describes a visual or copy issue in P-01, not production release acceptance or tested persistence. Confidence concerns each stated finding; consequences described as risks have not been demonstrated in user research.

## Evidence and provenance

All 12 accepted original PNGs were opened using original-resolution image inspection: two smoke frames and ten targeted frames, each 1280×820. Independently checked their identifiers, acceptance flags, PNG signatures/dimensions and SHA256 against the index; all match. All accepted records identify P-01, wrapper PID9232, main window29685, bundle identifier `com.juanmantilla.intentgrove.nativevalidation.r20261010210040`, main native bounds 1280×820 points and display scale 1. No separate WebView viewport measurement exists.

The recorded native executable hash is `0f76efdbd3fa1270bb7024d8d1fd0acbd85266471c406de3c3a5af4a6d241ff1`; both retained executable files still match it. HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` alone does not identify dirty source. All 130 captured source/input fingerprints also match current disk at review. Before/after records report no drift during acquisition. The native WebKit runtime served current frontend source through task Vite at localhost:5173; production dist was unused. This is a provenance-linked native development wrapper, not the installed release. Runtime/profile and main incognito restrictions exclude Settings and auxiliary/helper completeness. Process, AX, cancellation and disk-state observations below are reported by the recovery pass, not rerun here.

Rejected NR-001-unbundled-smoke, NR-002-unbundled-settled and NV-003-search-keyboard-scroll-en-dark are excluded from positive evidence. Their hashes/dispositions were reconciled, but they were not used to diagnose an app defect. No old screenshot was needed for a direct comparison: the previous review and requests establish historical claims, while the new pair/state captures resolve this focused review. No browser image is treated as native evidence.

Primary inputs:

- [/Users/juanmantilla/projects/personal/md-reader/AGENTS.md](/Users/juanmantilla/projects/personal/md-reader/AGENTS.md)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/designer-review-20261010-201851/review.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/designer-review-20261010-201851/review.md)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/designer-review-20261010-201851/capture-requests.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/designer-review-20261010-201851/capture-requests.md)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/recovery.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/recovery.md)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/index.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/index.json)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/before.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/before.json)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/after.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/after.json)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/wrapper.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/wrapper.json)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/provenance.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/provenance.md)
- [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-before.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-210040/source-before.json)

## DR-001 — Controls hide settled results; scrolling loses query context

Verdict: CONFIRMED_CURRENT. Priority: Medium. Confidence: High. Classification: observed hierarchy/usability issue.

**Visual observations:** NV-002 shows English query and scope, two rows of search modes and actions; no complete result or readable completion summary fits above the storage footer. NV-006 shows Spanish modes across three rows and a two-line coverage explanation; even the lower options/actions are outside the visible region. This is localization-driven height pressure, not incorrect Spanish translation. NV-004 exposes the first alpha snippet, NV-005 a later beta snippet; NV-007 exposes the Spanish beta snippet and 24-result summary. Their visible filename endings distinguish the results. Query, scope and Back to explorer are outside these scrolled views. Typography remains readable and controls align consistently; the problem is allocation of space and shared scrolling, not font size or arbitrary ornament.

**Behavioral evidence:** Recovery reports settled AX counts 24 scanned/24 results/0 skipped and keyboard navigation causing rendered scrolling. The stills corroborate distinct visible states. They do not prove wheel scrolling, all-results reachability or complete keyboard operation. Current evidence disconfirms a claim that results are permanently inaccessible.

**User impact:** Users may need to move between query controls and matches to verify context; Spanish requires more travel. No measured task failure is asserted.

**Recommended action:** Keep a compact query/scope context visible during results browsing, reserve space for results, and make secondary search options compactly expandable if needed. Preserve mode labels, checkmark selection, readable result snippets, all options, status information and the footer. Treat control density and context loss as one issue; do not add a separate result-heading redesign.

**Acceptance criteria:** At1280×820 native bounds with the same fixture and query, both EN and ES show query/scope, settled summary and at least one complete result snippet together. Navigating to the beta/later result keeps submitted query/scope identifiable. All search options remain reachable and operable with keyboard and pointer; footer and Projects dismissal remain visible. Do not meet this by shrinking readable type or removing options.

**Remaining validation:** Native before/after comparison, actual wheel and keyboard paths, no-results/error/loading states, changed query/scope, translated option expansion and supported minimum bounds. Second width remains pending.

## DR-002 — Long identity expands header and reduces reading space

Verdict: CONFIRMED_CURRENT. Priority: Medium. Confidence: High. Classification: observed layout issue.

**Visual observations:** Controlled NV-008/NV-009 share ES/light, window bounds, Projects and outline, and identical document bytes. Short header runs approximately y151–231 (80px); long header y151–351 (200px). The name occupies six lines, and the otherwise single-row toolbar is vertically displaced within the tall header. Reader region to y789 decreases from approximately 558px to 438px: 120px less, about22% of the short-name region. The document heading moves down by the same amount. These are approximate image boundaries, not measured DOM dimensions. Tab count changes 1→2, but the tab band stays at the same height and header top stays y151. That difference does not explain the extra 120px. The incidental Edit section affordance in NV-009 is not part of header measurement.

**User impact:** A filename alone consumes substantially more reading height and pushes content lower. The name is legible and the document remains usable; this is not content loss.

**Recommended action:** Bound filename presentation to a compact single line with a distinguishing suffix, using the existing tab identity approach where appropriate. Keep ordinary short-name geometry and document-column toolbar ownership. Preserve explicit full-name/path disclosure; do not add an identity overlay system.

**Acceptance criteria:** With the same paired fixtures at 1280×820, long-name header height is no greater than the short-name header, apart from a 2px measurement tolerance. Toolbar stays in the document column, filename ending alpha.md remains identifiable, and full name/path can be accessed through an explicit keyboard-operable disclosure. Short name, outline and reader spacing remain intact.

**Remaining validation:** Native geometry and disclosure operation after any change; another filename suffix and name without convenient word breaks; EN/ES and supported narrower bounds. Existing Document → Show path is source-supported but was not captured or operated in this review.

## DR-003 — Supported narrow native behavior remains unknown

Verdict: BLOCKED. Priority: Deferred. Confidence: Low for native behavior. Classification: evidence gap.

**Visual observations:** None at narrow native bounds. Normal-width NV-001/NV-008 and smoke frames cannot establish adaptive behavior. Earlier640×480 browser criticism is not native proof. Configured minimum 640×480 is a source/config boundary, not an observed supported native viewport.

**Behavioral evidence:** Recovery reports coordinate resizing unavailable (`noWindowsAvailable`); no native narrow acquisition exists.

**User impact:** Potential reader/control obstruction at smaller sizes remains unknown.

**Recommended action:** Preserve current adaptive behavior until a supported native minimum is observed. Obtain targeted native validation; no speculative responsive redesign.

**Acceptance criteria:** Record actual minimum achievable native bounds and WebView viewport. At those bounds with Spanish labels, Projects dismissal is visible; dismissing it exposes the document and essential toolbar. With Projects open, search input/actions and one settled result are reachable. Record open/closed states and operations separately.

**Remaining validation:** Working authorized native resize control, bounds verification and CR-03 sequence. Browser results cannot resolve this blocker.

## DR-004 — Preservation choices are partly clear; consequence remains implicit

Verdict: CONFIRMED_CURRENT. Priority: Medium. Confidence: Medium. Classification: copy/comprehension concern, not a saving defect.

**Visual observations:** NV-011 clearly states changes are not saved to the Markdown file. Cancelar, Descartar, Guardar and Conservar borrador are readable, aligned and unclipped; draft preservation has a primary treatment on a second row. The surrounding editor says Guardar archivo and Guardar vuelve a la lectura, useful supporting context. Preserve those strengths and the safe preservation emphasis. Inside the modal, Guardar names no destination, and Conservar borrador does not explain whether the file changes or reading resumes. The title favors retaining the edit, but actual user misunderstanding was not tested. The second button row alone is not a defect.

**Source-based conclusion:** Read-only inspection of resolveClose and saveEdit confirms intended semantics for the captured return-to-reading trigger: Save invokes the native save transaction and removes editing state on success; Keep requires a saved checkpoint and pauses the retained edit when returning to reading, without that Save transaction. Native source stages/replaces/verifies file bytes in the Save path. This does not certify successful runtime persistence, durability or recovery after restart. Other close intents have different continuations and must not inherit return-to-reading copy blindly.

**Behavioral evidence:** Recovery reports Cancel restored editing and fixture disk bytes remained unchanged. Save, Keep, Discard and relaunch were not exercised. No persistence was tested by this review.

**User impact:** Users may hesitate or assume both preservation options update the file. The risk is narrower than the earlier review implied because the existing body already distinguishes unsaved changes from the Markdown file.

**Recommended action:** Clarify the in-dialog Save destination and the Keep consequence with brief trigger-appropriate copy. Proposed labels: Save to file / Guardar archivo; retain Keep draft / Conservar borrador. For return-to-reading, explain that keeping retains the edit as a draft and returns to reading without updating the Markdown file. Avoid restart or durability promises until tested. Preserve Cancel, Discard, primary draft emphasis and existing safety/error handling.

**Acceptance criteria:** EN/ES modal text explicitly distinguishes updating the Markdown file from keeping an edit without updating it; the continuation matches the actual trigger. Labels/body fit without clipping and Cancel/Discard remain distinct. In a neutral comprehension check, users can identify which choice changes the file and which keeps a draft, without coaching. Save and Keep operations on disposable fixtures separately satisfy their intended outcomes before acceptance.

**Remaining validation:** English native modal, safe Save/Keep outcomes, checkpoint failure/conflict cases, focus return and other close triggers. Restart durability remains unverified; do not describe it as established.

## DR-005 — Shared-prefix tree labels collide, with a useful existing disclosure

Verdict: CONFIRMED_CURRENT for baseline visible ambiguity. Priority: Low. Confidence: High for that bounded observation. Classification: usability refinement.

**Visual observations:** NV-001/NV-008 show alpha/beta rows with identical visible shared prefixes at the normal sidebar width. Selection styling distinguishes the active row, not each filename's identity. NV-010 shows complete alpha/beta filenames and paths in Documentos abiertos, with readable wrapping and a clear current-document marker. Tabs preserve more of the ending. The evidence therefore refutes an absolute claim that full names are unavailable. The modal covers already-open documents, so it does not solve identifying an unopened tree row before choosing it. Only one long-header fixture is present; do not claim a controlled long-file pair was tested.

**Source-based conclusion:** Tree rendering supplies complete entry names and a title path, while tree-name CSS uses end ellipsis. This supports the rendering explanation; it does not prove native tooltip behavior or screen-reader usability.

**User impact:** Selecting a similarly named unopened file may require extra inspection. Existing Open documents disclosure lowers severity for open files; no wrong-file selection was observed.

**Recommended action:** Preserve full-name/path modal and ordinary short rows. Apply a compact suffix-preserving display for colliding long names using the established tab pattern, retaining the full underlying name for disclosure/accessibility. Share filename presentation decisions with DR-002 rather than create a second identity system. No wider sidebar or new modal is proposed.

**Acceptance criteria:** At the existing normal width, alpha.md and beta.md are distinguishable in their tree rows without hover; ordinary short filenames, row height and selected styling stay intact. Complete name/path remains available explicitly and accessible to keyboard users. Repeat at a second supported tree width before considering width-dependent acceptance complete.

**Remaining validation:** Second width remains unverified because native resizing was unavailable. Check hover separately, accessible names, keyboard disclosure for unopened files and deeper indentation. Existing Open documents disclosure is visually established, not complete assistive-technology certification.

## Preserve and stop

Preserve Projects close placement in its header, tabs above the workspace, toolbar within the document column, stable storage footer, readable document hierarchy and outline, non-color selection cues, explicit full-name/path list, and safe draft option. NR-003/NR-004 support open/closed welcome appearances; recovery reports reversible close/reopen. They do not validate reader dismissal at narrow bounds.

No contrast ratios, target hit areas, accessibility conformance, complete keyboard flow, usability outcomes or production runtime acceptance were measured. No new captures, app launch/build, prototypes, mockups, source edits, agents, commit, push, deployment or cleanup occurred. Proposed work stops at design handoff and requires user approval before implementation.

## Accepted original inspection ledger

Short IDs in findings map to exact indexed identifiers below. Every file was viewed at original resolution and hash/dimensions matched. Earlier originals and rejected acquisitions supplied no positive finding evidence.

| Exact screenshot ID | Original | Review use |
|---|---|---|
| NR-003-wrapper-smoke-before | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NR-003-wrapper-smoke-before.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NR-003-wrapper-smoke-before.png) | Smoke/P-01 |
| NR-004-wrapper-smoke-projects-closed | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NR-004-wrapper-smoke-projects-closed.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NR-004-wrapper-smoke-projects-closed.png) | Smoke/control |
| NV-001-projects-baseline-en-dark | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-001-projects-baseline-en-dark.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-001-projects-baseline-en-dark.png) | DR-001/DR-005 |
| NV-002-search-settled-en-dark | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-002-search-settled-en-dark.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-002-search-settled-en-dark.png) | DR-001 |
| NV-004-search-result-focused-en-dark | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-004-search-result-focused-en-dark.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-004-search-result-focused-en-dark.png) | DR-001 |
| NV-005-search-later-result-en-dark | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-005-search-later-result-en-dark.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-005-search-later-result-en-dark.png) | DR-001 |
| NV-006-search-settled-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-006-search-settled-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-006-search-settled-es-light.png) | DR-001 |
| NV-007-search-later-result-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-007-search-later-result-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-007-search-later-result-es-light.png) | DR-001 |
| NV-008-short-header-tree-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-008-short-header-tree-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-008-short-header-tree-es-light.png) | DR-002/DR-005 |
| NV-009-long-header-tree-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-009-long-header-tree-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-009-long-header-tree-es-light.png) | DR-002 |
| NV-010-full-name-disclosure-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-010-full-name-disclosure-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-010-full-name-disclosure-es-light.png) | DR-005 |
| NV-011-unsaved-dialog-es-light | [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-011-unsaved-dialog-es-light.png](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/originals/NV-011-unsaved-dialog-es-light.png) | DR-004 |
