# Actual heading failure captured

Raw capture: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/captures/1791782635664-37782/`.

The original heading query naturally rejected in `approved workspace handoff > reveals collapsed branches only after explicit request`. No forced failure, retry, deadline change, query replacement, or ordering override was used. This is a different case from the historical first test's 5619.9 ms runner signature. The first capture is valuable evidence of the current failure family, not a retrospective trace of that earlier case.

## State

- Active ID, active ID ref, sole tab, and rendered tabpanel all identify `a.md`; root is `root`, path `/tmp/fixture`, generation 1, navigation sequence 1. Markdown tab kind is implicit (`kind` is absent in the real descriptor); MarkdownView and the DOM establish the active view.
- Document content is exactly `# One\nalpha\n# Two\nbeta\n`, disk version `v1`, freshness current. Session ready; busy false; document/selection pending null; no loads remain.
- The section promise's callback ran with matching `v1` and cancelled=false. Both native mock descriptors are fulfilled and correct. At failure the latest App render still has empty sectionsByTab and sectionLayoutVersions. It has not rendered the queued descriptor publication.
- Markdown has no Worker, inline renderReady=true, selectionReady=true, painted 24 for 4 blocks, layoutPending=true, connected selection root, no retained old document, no source fallback, and no selection request. App's current selection adapter owns a.md; queued selection/acquisition are null.
- No active edit, entering section, recovery, or beginSectionEdit call. No editor mount or unmount was reached. The focused DOM contains plain One/Two h1 elements and alpha/beta paragraphs with no section-edit buttons. Query-name/accessibility mismatch is not the explanation for this capture: the button is physically absent.
- The five inspected IPC mocks all have settled responses when called. Nine registered harness listeners are present on the still-mounted App; this is not evidence of leaked subscriptions.

## Timeline (performance.now milliseconds)

| Milestone | Timestamp |
|---|---:|
| TEST_START | 26694.851750 |
| DOCUMENT_OPEN_REQUESTED | 26924.440542 |
| HEADING_LOOKUP_BEGIN | 27981.132917 |
| DOCUMENT_OPEN_RESOLVED | 28233.109334 |
| MARKDOWN_PAINTED | 28646.810417 |
| SELECTION_ADAPTER_PUBLISHED | 28647.149917 |
| ACTIVE_DOCUMENT_CHANGED | 28647.174209 |
| SECTIONS_REQUESTED | 28648.206334 |
| SECTIONS_RESOLVED | 29498.784167 |
| HEADING_LOOKUP_FAILED | 29574.193334 |

The original DOM Testing Library default asyncUtilTimeout is 1000 ms; the suite/config does not override it. Its existing interval is 50 ms. The query rejected after 1593.060417 ms. The section result callback ran 517.651250 ms after the nominal query deadline and 75.409167 ms before rejection. Document request-to-callback spans 1308.668792 ms, and descriptor request-to-callback spans 850.577833 ms, despite immediate mock implementations. These intervals include scheduling and intervening synchronous work; they are not measured native latency.

Last successful milestone: SECTIONS_RESOLVED. The ring's generic `generation` slot for that particular event carries the existing cancellation boolean (false), not the numeric workspace generation. Actual workspace generation is 1 in the failure state. No ring entries were dropped.

## Decision branch and limits

Observed category: **READINESS_RESOLVED_RENDER_MISSING** — section acquisition completed, but the matching React/Markdown section-layout publication had not committed at rejection. This is a state-at-failure classification, not a demonstrated application invariant violation.

Wrong document/view, stale/cancelled descriptor response, pending native descriptor producer, editor unmount, and query semantics are excluded for this captured instant. Render starvation, expensive query/error processing, synchronous rendering, process descheduling, and GC remain possible. There is no multi-second interval with no progress in this trace: progress continues during the query, but late relative to its deadline. There is no evidence whether the editor would mount after failure because ordinary failure cleanup proceeds; no grace period was added.

The renderer cannot expose the editable heading before the section map arrives. The trace alone does not identify why callbacks and the subsequent render were late. Do not turn the elapsed intervals into a timing-bug, Phase 3 regression, state-leak, or concurrent-change attribution. Root cause and causal owner remain unresolved; no repair is justified yet.

## Provenance qualification

The first run overlapped a diagnostic-only App getter edit during runner startup: three additional failure-state fields were added 9.8 seconds after the run began. The actual capture lacks those fields and matches the reconstructed earlier getter. Application behavior, assertions, and event recording were unchanged. Both source forms and their hashes are preserved in recorder-source-timing-note.json and recorder-v1-App.tsx. Do not claim this whole first run had immutable source. Later isolated candidates and reruns are frozen before launch to remove that provenance limitation. The first raw capture remains unchanged.
