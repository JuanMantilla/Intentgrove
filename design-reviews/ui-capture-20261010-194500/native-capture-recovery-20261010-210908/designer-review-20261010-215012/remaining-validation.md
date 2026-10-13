# Remaining native validation

Status: NOT PERFORMED IN THIS REVIEW. Targeted future checks, using disposable fixtures and a provenance-linked native runtime. No launch, resize, capture or persistence action is authorized by this document itself. Preserve all existing evidence.

| Finding | Required follow-up | Observable acceptance evidence |
|---|---|---|
| DR-001 | Same query/fixtures,1280×820, EN/dark and ES/light; settled first result, later result via keyboard and wheel; change query/scope; empty/error/loading; expand options | Query/scope, settled summary and complete snippet together; later result retains query/scope context; controls/status/footer reachable; focus stays visible |
| DR-002 | Controlled identical-content short/long pair after approved change; native header/reader measurements; full-name/path disclosure by keyboard; another suffix and unbroken name | Long header matches short within 2px at baseline; distinguishable suffix; complete identity reachable; toolbar/outline remain usable |
| DR-003 | Restore supported native resize capability; establish minimum achievable native bounds and independently record WebView viewport; ES Projects/search open and closed | Visible dismissal; closing exposes reader/essential toolbar; input/actions/result reachable when open; operation record and native captures |
| DR-004 | Native EN modal; separate disposable Save and Keep runs for return-to-reading; checkpoint failure/conflict; Cancel/focus return; test other close triggers separately | Save file bytes reflect edit; Keep leaves file bytes unchanged and intended draft/reading state available; honest trigger-specific copy; observed neutral comprehension |
| DR-005 | Alpha/beta at normal and second supported sidebar widths, including indentation; keyboard/pointer full identity for unopened row; Open documents operation; optional hover | Distinct endings without hover; complete names/paths accessible; short labels and selection preserved |

## Explicit unresolved boundaries

- DR-003 is BLOCKED, not NOT_REPRODUCED. Coordinate resize was unavailable (`noWindowsAvailable`). Config 640×480 and historical browser screenshots establish neither native layout nor usable minimum viewport.
- DR-005 at a second width remains unverified. Normal-width ambiguity and full-name disclosure for already-open documents are established visually. Hover and assistive-technology disclosure remain untested.
- Save/Keep were not executed. Source establishes intended transaction/retention branches; screenshots do not establish persistence. Recovery reports only Cancel and unchanged fixture bytes. Restart/recovery durability requires a distinct safe functional sequence before any persistence promise.
- Keyboard-scrolled search images show result reachability in recorded states; wheel scrolling, complete result traversal and focus behavior remain unverified. Last tree row/footer was not captured, and must not be claimed validated by the top-of-tree frames.
- No contrast, semantic accessibility, complete keyboard behavior, text scaling, Retina or full theme/locale matrix acceptance. Test only the relevant changed surfaces first; broaden if a defect warrants it.
- P-01 is the bounded native development wrapper with task source/Vite provenance, not the installed production build. Release acceptance must use its own recorded identity and relevant regression evidence. Settings and helper-complete image/diagram/HTML operation are outside this focused review.

## Decisions retained

Keep current Projects header dismissal, document-column toolbar, storage footer, reading rhythm, outline, safe draft emphasis and Open documents full identity. No narrow fix is proposed before evidence. No generic redesign or helper investigation is needed for these findings.

## Handoff discipline

Record exact runtime/binary/source identity, actual native bounds and each screenshot identifier for future tests. Separate PASS/FAIL/BLOCKED/NOT TESTED operations from still-image observations. Do not use rejected captures or substituted browser states as positive native evidence. Follow applicable project QA completion requirements if a later implementation enters acceptance; this design review is not DONE_ACCEPTED and enqueues no cleanup.
