# Root-cause investigation — unresolved

## Classification
OTHER — original Save-to-file failure is not reproduced; a related current full-suite failure is reproduced but its cause remains unresolved. Across preserved attempts the behavior is nondeterministic; timing dependence is plausible but unproved. No demonstrated Phase 3 production regression, Phase 3 test-isolation regression, pre-existing leak, or concurrent-change attribution.

## Why did the test pass alone?
Observed: all 27 close-editor tests pass on the exact saved historical source. The normal setup completes its Markdown read, section-descriptor fetch, rendered section mapping, heading lookup, context-menu entry, and mocked editor mount. A causal explanation for the difference from the historical failed run remains UNKNOWN: the same source also passes two complete 711-test reruns.

## Why did it fail after another suite?
UNKNOWN. The historical order was workspace-handoff → refresh-conflict → close-edit. Replaying those three files in that exact order passes 56/56. The immediately preceding test inside close-edit is window: Discard. It also precedes window: Save to file in both full passes, isolated pass, and ordered replay. Thus neither recorded predecessor is a demonstrated contaminator. This is a negative reproduction result, not a minimal reproducer.

The default Vitest sequencer uses mutable cached results/durations, so identical CLI arguments alone do not guarantee historical file order. The diagnostic config explicitly replays the recorded prefix. No canonical test-order configuration was changed. Vitest's default isolate=true is retained; code inspection alone does not prove the absence of all external/resource effects.

## What state leaked? Which test/helper leaked it? Why was cleanup incomplete?
None has been demonstrated. Exact state, owner and incomplete cleanup mechanism remain UNKNOWN. It would be unsupported to name a leaked store, mock, listener, timer, or prototype controller.

## What does the missing editor error mean?
/Users/juanmantilla/projects/personal/md-reader/tests/ui/close-edit.test.tsx:71 actually waits for the Markdown heading's aria-label `Edit section: One`, before the context menu is opened and before `beginSectionEdit` is called. The Save action has not run. Calling this an absent section editor obscures the actual failed precondition.

Trace: setup renders a fresh App → mocked folder selection/listing → click a.md → App.openDocument awaits the Markdown reply and activates file → section-list effect awaits listEditSections → MarkdownView maps native section descriptors to parsed heading byte offsets → editable heading receives its label → setup opens Edit section → mocked SectionEditor mounts.

The fixture has fileId=file, identityKey=1:file, diskVersion=v1, source `# One\nalpha\n# Two\nbeta\n`, and heading boundaries 0/12. App sections are per-instance state. The list effect ignores obsolete replies through its cancelled flag and accepts only the active diskVersion. Which state or pending callback differed in the historical failure is UNKNOWN. Its saved DOM truncates in header/navigation before the reader; it cannot establish active tab/kind, section map, or reader DOM at failure. The enhanced diagnostic replay (DEBUG_PRINT_LIMIT=100000) passed, so it yielded no failing DOM. Historical error/stack preserved in /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/historical-failure-dom.txt.

## Inspected categories
| Category | Source evidence / limit |
|---|---|
| DOM/React roots | close-edit uses RTL render and afterEach cleanup; no manually created root or portal in its helper. No observed failed-run DOM beyond historical truncation. |
| Per-test mocks | beforeEach resetAllMocks, restores fixture responses and optional session functions; afterEach restoreAllMocks. Event mock unlisten deletes only its own current callback. No demonstrated stale listener. |
| Timers | setup uses real timers. The requestAnimationFrame spy occurs later in the file, after the historically failing case, and restoreAllMocks runs after each test. No proven timer leak. |
| Browser globals/storage | close-edit clears localStorage before each test. No platform/Worker/observer/global stubs in its setup. Other files execute with Vitest isolation; external effects not ruled out by that fact. |
| Async work/subscriptions | App subscription fulfillment transfers each cleanup handle independently or unlistens if already disposed. Section-list effect cancels obsolete publication. No failed-run promise ownership trace exists. |
| App/session | tabs, active document, section maps and session refs are per-App. close-edit API double has no loadWorkspaceSession, taking the ready-without-hydration path. No prototype package is opened by the fixture. |
| Phase 3 | document descriptors are types; PrototypeView is metadata-only without effects; PrototypeController sequence/closed/queue belong to each instance; App owns controllers in useRef maps and disposes on removal/unmount. Prototype integration tests use per-test mock reset and RTL cleanup. No identified shared mutable singleton causing the heading failure. |

## Why is the fix correct?
No fix was made. The original Save-to-file full-suite failure did not reproduce. The current full suite instead failed five workspace-handoff cases, while both current affected suites passed alone. No state leak or causal remedy was established. No timeout, retry, assertion removal, broad reset, serialization, or speculative production change is justified by this evidence. Existing diagnostic infrastructure at /Users/juanmantilla/projects/personal/md-reader/tests/diagnostics/reliability/ describes earlier, distinct five-second failures; its report also left their historical cause UNKNOWN. It cannot be used as proof of this failure's cause.

## Could this occur in production?
UNKNOWN. The observed failure is a jsdom test query with mocked native IPC. A real application initialization defect has not been established or ruled out. Production behavior changed: NO.

## Next discriminating evidence
Capture a recurrence with full reader DOM, active tab/kind/version, section descriptor result and map validity, native-double calls/settlement ownership, worker/timer availability, and monotonic phase/event-loop timing before the failed lookup. Then reduce the observed condition and add a direct invariant regression. Do not substitute unrelated lifecycle repairs or passing reruns for that causal evidence.


## Current-tree follow-up
The current 712-test full run failed five workspace-handoff cases: four setup lookups for `Edit section “One”`, and the first test with a runner stack-trace error at 5619.9 ms, consistent with its 5000 ms whole-test deadline. Full raw errors: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/current-failures.json. Close-edit passed all 27 in that full run. Current isolated close-edit passed 27/27 and workspace-handoff 24/24.

The exact current prefix close-edit → workspace-handoff was traced in a disposable candidate, without changing canonical source. It passed 51/51 standalone and 51/51 during controlled overlap with the same native IPC/Clippy commands used in the failed broad run. Both captures show zero editor DOM nodes and zero mock-native listeners after every cleanup, and zero editor nodes at each test start. These successful-run traces cannot prove what happened in a failing run. Trace state includes active document/tab, section responses, per-App section maps, Markdown map validity/worker/layout state, DOM heading labels, mock calls, listener ownership and event-loop delay. Observer instrumentation and generation script remain under /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/; production is unchanged.

The current failing prefix differs from the historical failing prefix. No smaller reproducing sequence exists yet. Controlled native overlap did not reproduce the failure; compiler overlap alone is not causal evidence. No state reset, deadline increase, retry, code patch or new regression assertion was applied. A final complete instrumented run also preserved the current failing run's full recorded file order and overlapped native IPC/Clippy. Its result and exact command are retained in diagnostic-full.json and diagnostic-full-command.json; its traced prefix again had no heading failure. Instrumented success cannot override uninstrumented failure because observation can perturb scheduling. The unresolved prerequisite is a failing trace identifying the absent heading's state/resource owner, not permission to make speculative repairs.

## Failure-capture continuation — 2026-10-12T06:12:01.218450+00:00

Actual failed reader state captured; causal owner unresolved. Latest later-source frontend 713/713; no repair or acceptance. Authoritative continuation and raw evidence: /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/root-cause-update.md and /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/evidence-index.md. Prior evidence above remains historical and unchanged.
