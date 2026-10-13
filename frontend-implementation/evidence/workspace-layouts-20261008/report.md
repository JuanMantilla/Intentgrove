# Workspace layouts implementation handoff — 2026-10-08

IMPLEMENTATION: PARTIAL overall; independent frontend layout/settings/state wiring implemented. Native durable preference contract is absent and explicitly outside this role. FUNCTIONAL_CHECKS: PASS for the named mocked suites below. VISUAL_REVIEW: PARTIAL, real frontend with synthetic native data. INTEGRATION: MOCKED_ONLY for new layouts; no packaged restart claim. USER_ACCEPTANCE: PENDING.

Authority: current explicit user selection of **all three layouts**, Margin default. [Separate authorization](authorization.md), [design hashes](design-source.sha256), [scoped plan](plan.md). Historical REVIEW.md/revision JSON/designer artifacts and superseded historical results were not rewritten. Direct rendered editing references govern every layout; F004 source/live-preview remains superseded; CRLF Save DEFERRED.

## Delivered frontend

- Margin retains explorer/document/right section outline. Missing frontend preference defaults to Margin; legacy restored profiles receive the visible wide outline. Wide panel toggles remain available.
- Folio centers a bounded page with generous padding; explorer becomes a drawer even at wide widths. Its trigger, keyboard folder search and Reveal in Explorer reopen the same tree/search instance. Reading/document/Settings actions remain visible at wide widths.
- Atlas composes the existing real explorer/project menu and storage tools into a bounded horizontal shelf above the tabs and reading desk. Outline moves left. This adapts the illustrative mockup to actual capabilities: open documents remain the existing tabs/menu; folder search uses existing Projects/menu/shortcut. No duplicate navigation widgets, account/ecosystem actions or sample document content enter product code. Shelf width never overwrites the saved explorer width.
- Narrow windows collapse explorer and outline; existing labeled document menus retain actions. Drawer/search state stays mounted. Atlas shelf collapses with the explorer. Existing tokens, Roboto, themes and reader/editor components are reused; images/HTML retain their existing viewing and isolation paths.
- Separate Settings window now has native radio choices Margin/Folio/Atlas and concise EN/ES descriptions. Existing preference request/revision/owner/checkpoint/retry mechanism is reused. Optional frontend wire fields are prepared for the proposed native contract; they do not change native schema. Current native hosts expose no field, so all choices are visibly disabled with an explanation. Unsupported fields are stripped before publication/comparison, preventing strict native rejection and repeated publish loops. No alternate localStorage key or fake persistence acknowledgment.
- Switching applies a presentation attribute to **one mounted App/document/editor/search tree**, captures the reading anchor before reflow and restores it through the existing layout effect. Tabs, active document, source/history, selection and unsaved rich editor remain owned by their existing components. Layout handler never calls Save, discard, reload or document-open APIs. Supported future intents update the layout ref before the session checkpoint. Existing Save/Save As, dirty/conflict guards, recovery, opaque Mermaid/YAML/HTML/unknown source safeguards and Undo/Redo remain shared.

## Verification and evidence

All commands ran in `/Users/juanmantilla/projects/personal/md-reader`; no dependencies installed. Exact final hashes: [source manifest](source-manifest.json). Build scripts inspected first: only TypeScript/Vite local build and worker checks used; no native package/install/sign/publish.

| Check | Result | Evidence/boundary |
|---|---|---|
| `npm test -- --maxWorkers=1 tests/ui/workspace-layout.test.tsx tests/ui/session.test.tsx tests/ui/settings-owner-lifecycle.test.tsx tests/ui/settings-window.test.tsx` | PASS47,4files | `session-delivery.log`; actual App/DOM/source history, mocked native APIs. Saved layouts restore individually; unsupported session field omitted; Atlas width remains264 rather than shelf1440. |
| New continuity tests | PASS within above | Same editor/reader DOM identities, draft, selection endpoints, numeric scroll position, Undo/Redo, active tab, document Find query, folder search query and Folio keyboard search. No document Save/discard/read side effects during switching. Geometry-dependent passage preservation remains a native/visual acceptance item. |
| Settings tests | PASS within above | All names/descriptions, default/explicit selection, owner-mediated requests, EN/ES, unsupported-host disabling, no new storage key, existing failure/retry/ack rules. Mocked restoration is not durable storage. |
| Final `npm test -- --maxWorkers=1` | PASS487,61files | `full-handoff.log`; full mocked frontend regression scope includes Save/Save As/cancellation/conflicts/recovery/search/session/images/HTML/editor/security boundaries. |
| `npm run build` | PASS | `build-handoff.log`, TypeScript/Vite final source. Existing large-chunk warning retained. |
| `npm run test:bundle-worker` | PASS | `worker-handoff.log`, bounded local worker bundles. |
| `git diff --check` | PASS | `diff-check.log`; no whitespace errors. Not evidence of native behavior. |
| Browser capture/DOM geometry | PASS in captured scope | `visual-matrix.json`:24 combinations =3layouts ×2themes ×2locales ×2widths (1440/640 ×800), Chrome on macOS, synthetic native fixture; no page horizontal overflow. PNGs named by layout/theme/locale/width. |
| Visual inspection | PARTIAL | Individually inspected representative wide Margin lightEN/darkES, Folio lightEN/darkES, Atlas lightEN/darkES; narrow reading and editor screenshots. Actual direct editor entered in all3 layouts. 24captures are not24full workflow/visual acceptance runs. |
| Keyboard/focus | PARTIAL | Settings radio group Tab exits to Reading font, visible focus observed; editor focused after intentional entry. JSDOM selection/history/search/keyboard regressions pass. Full native traversal/accessibility not certified. |
| Enlarged text/200% | NOT TESTED | Browser zoom key attempt produced unchanged640×800/dpr1, so `settings-enlargement-attempt.png` is explicitly **not** a200% result. No success inferred. |
| Native switching/persistence/restart | NOT TESTED / missing contract | [Exact minimal native request](native-request.md). Existing disposable native app inspected before changes; it is not a candidate for this source. No native files/build/install changed. |
| Mockup rendered inspection | BLOCKED | File-URL policy rejection explicitly prohibited workarounds. No review server/alternate browser surface used. Written/CSS/markup studies consumed; product localhost fixture inspection is a separate application. |

Initial failures retained: `focused-initial.log` had1/14 failure from querying a search input as textbox (corrected to semantic searchbox); `full.log` had7fail/473pass, including changed default-outline assumptions, unnamed complementary queries now matching both explorer and outline, and a subsequent unconsumed one-shot mock after failure. Tests now assert the approved visible Margin outline and scope Explorer by name; no assertions/deadlines/retries were weakened. `full-final.log` retains481pass/1owner test failure from an intermediate run. Legacy preference normalization was corrected before equality comparison and the focused legacy-owner test passes. `regression-delivery.log`482PASS and `regression-final.log`483PASS are earlier snapshots, not substitutes for the final handoff run. Initial fixture native simulation lacked window metadata; browser logs exposed the fixture error, metadata was supplied and actual frontend rendering rechecked. Contact-sheet generation was unavailable (PIL absent); no dependency installed, representative PNGs inspected directly.

Historical in-place finish suite failures remain historical and unresolved for those original snapshots; this task's fresh results do not reinterpret them as passes.

## Remaining work and exact stop

Native owner must implement the bounded enum/preference/session additions in [native-request.md](native-request.md), then rebuild and exercise the exact candidate. Until then the shipping Settings choices intentionally remain disabled and real persistent switching is **not delivered**. No user reapproval of the already-selected visual layouts is requested.

Real packaged switching during dirty edits/search, filesystem grants/source hashes, restart/durable drafts/history, native HTML child geometry, physical keyboard/IME/clipboard, enlarged UI, system appearance notifications and full narrow-height/accessibility acceptance remain pending. The shared renderer/mocked suite does not prove these native paths. User acceptance remains pending. No native contract change, migration, dependency/configuration change, installation, privileges, commit/push/publish/deploy. Unrelated work and designer artifacts preserved; task-owned preview stopped at handoff.

Final handoff ledger: `full-handoff.log`487/61PASS on the source-manifest snapshot; `build-handoff.log`PASS, `worker-handoff.log`PASS. Source hashes verified unchanged after these runs. Browser viewport reset, task-owned tab closed and port5192 Vite process stopped. No unrelated processes stopped.


## Subsequent user acceptance — Settings options

User: “I accept the three of them as options in the settings”. Margin, Folio and Atlas are ACCEPTED as the three Workspace layout options. Margin remains the default from the original instruction. This records acceptance of the option set; it does not claim successful native switching, durable persistence or packaged acceptance. The native integration request remains outstanding; no additional application source or native/schema changes were performed in this acceptance-record update.
