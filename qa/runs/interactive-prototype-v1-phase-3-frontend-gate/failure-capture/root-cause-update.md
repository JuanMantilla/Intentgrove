# Phase 3 frontend gate — failed-state capture and diagnostic outcome

Finalized 2026-10-12T06:12:34.333812+00:00. **A real failed state was captured. Causal owner and root cause remain unresolved. No repair was made.** Phase 3 remains **PARTIAL / QA_FAILED / BLOCKED**, without acceptance. The latest, separately frozen current frontend passes **713/713**. Passing reruns do not explain the preserved failure.

## Failing-state captured

**YES.** The original workspace-handoff lookup failed naturally in `reveals collapsed branches only after explicit request`. Minimal-recorder full suite: **711/712**, one failure. Exact command, original awaits/assertions/timeouts, default ordering, and mocked IPC are preserved. First raw capture: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/captures/1791782635664-37782/`.

## Observer effect

Minimal recorder: **one failure (711/712), one pass (712/712)**. The separate CPU/event-loop profiling run passed **712/712**, so its failure-only policy produced no CPU profile or failed histogram. The minimal recorder did not eliminate reproduction; observer neutrality is not demonstrated. Conditional reduction after consistently passing minimal runs was not triggered.

Provenance qualification: three fields were added to the diagnostic App failure getter during the first run's startup, after its App had apparently been transformed. The capture lacks those fields and matches the preserved earlier getter. No application behavior, test control flow, milestone calls, assertion, or deadline changed. Both forms/hashes and timing are retained in `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/recorder-source-timing-note.json`. The frozen follow-up passed. Do not claim immutable whole-run source for the first recorder attempt, or use that limitation to erase the actual snapshot.

## Last successful milestone

**SECTIONS_RESOLVED — 29498.784167 ms**, for `a.md`, disk version `v1`, cancelled=false.

Query began **27981.132917 ms** and failed **29574.193334 ms**: **1593.060417 ms** elapsed. Descriptor callback occurred **517.651250 ms after the nominal 1000 ms query deadline**, and **75.409167 ms before rejection**. No ring entries were dropped. The generic ring generation slot on SECTIONS_RESOLVED is its cancellation boolean; actual workspace generation is 1.

## State at failure

Correct sole active tab/document `a.md`, identity `a.md`, Markdown content `# One\nalpha\n# Two\nbeta\n`, version `v1`, workspace `/tmp/fixture`, generation 1, navigation 1. App active ID and ref agree. Markdown kind is implicit in the tab descriptor; MarkdownView and the DOM establish the view.

Document load complete; session ready; busy=false; no document/selection pending, queued selection, edit, recovery, or entering section. Selection adapter belongs to a.md. Native read and descriptor mocks are fulfilled; the descriptor reply contains both correct sections and is not cancelled. Latest App render still has empty sectionsByTab and sectionLayoutVersions. Markdown inline rendering/selection readiness is true, all 4 blocks are painted, but **layoutPending=true** and no sections/map have reached that render.

Focused DOM contains plain One/Two headings and alpha/beta, with **no edit buttons**. No beginSectionEdit call, editor mount, or editor unmount was reached. This excludes an existing editor/button missed by accessible-name lookup for this capture. Nine listeners belong to the still-mounted mock App; their presence does not establish a leak.

## Failure category

**READINESS_RESOLVED_RENDER_MISSING**, specifically: descriptor acquisition callback completed, but section-map/layout publication had not committed before lookup rejection. Selection readiness itself was already true. This classifies the observed state, not a proven application invariant violation.

Broader classification remains **OTHER — nondeterministic frontend verification failure, cause unresolved**. No Phase 3 regression, state leak, timing bug, or concurrent-change regression is established.

## Causal owner

**UNRESOLVED.** The observed boundary is the listEditSections callback/state publication in `/Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx` to the section map/heading render in `/Users/juanmantilla/projects/personal/md-reader/src/reader/MarkdownView.tsx`. Those locations identify the next investigative boundary, not a blamed owner.

## Concurrent selection-readiness correlation

Two uninstrumented full runs per exact reconstructed entry-time variant:

| Variant | Run 1 | Run 2 | Workspace-handoff |
|---|---:|---:|---|
| A: historical candidate | 711/711 | 711/711 | 24/24 both |
| B: historical + App patch | 711/711 | 711/711 | 24/24 both |
| C: historical + added test | 710/712 | 711/712 | 24/24 both |
| D: historical + both | 712/712 | 712/712 | 24/24 both |

C's added readiness test fails twice without the App behavior it tests. C's first run also has the separate new-Markdown alert lookup failure. **No workspace-handoff correlation with the entry-time App/test patch was observed in these eight runs.** Two observations per cell cannot establish absence of an effect or causation. Exact patches, hashes, copies, cache states and failures are retained in `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/variant-matrix.md`, `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/variant-provenance.json`, and `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/run-matrix.csv`.

Later external concurrent work changed the live selection dispatch from requestAnimationFrame to a cancellable microtask and added another test at 05:45–05:46 UTC. These edits postdate the 05:23:55 UTC capture and were not made or removed by this task. The original matrix stays frozen at 712 tests. A new pre-check snapshot and independent current-late copy preserve the later source: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/late-concurrent.patch`, `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/late-concurrent-provenance.json`, `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/tested-snapshot-current-late.json`. Its full result is **713/713**, without attributing the pass to that concurrent patch.

## Test-order correlation

Passing D-seeded-1 and failing recorder-seeded-1 have the **same complete 70-file order**, beginning close-edit → workspace-handoff. Actual reporter startTime order is retained for each run.

Explicit replay matches that failing order exactly on untouched entry-time D source: **workspace-handoff 24/24 passes**, but the overall replay is **711/712**, with the independent new-Markdown alert lookup failure. **file order alone is insufficient for the workspace-handoff heading failure**. Do not call the whole replay a pass. No permanent ordering change was made.

Entry-time D passes **712/712** with the saved initial cache, its own warm cache, and a fresh private cache. Default fresh-cache ordering is a separate observed variable; this is not a cold OS-cache experiment. Only run-owned caches were renamed, and all before/after files were preserved. See `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/file-order-comparison.md`.

## Deadline and resource assessment

The captured case progresses during the query; it does not show a multi-second interval with no application milestones. Read request-to-callback is 1308.668792 ms; descriptor request-to-callback is 850.577833 ms despite immediate mock implementations. Those intervals include scheduling and synchronous work, not native service latency. Descriptors resolved late and their render had not committed at rejection. There is no evidence of an editor mounting afterward because ordinary failure cleanup proceeds without a grace period.

The historical first case's **5619.9 ms runner/deadline signature was not recaptured**. Its earlier cause remains uncharacterized. The new trace exposes the existing query deadline instead.

Other Vitest processes were observed during this investigation and left untouched. No at-failure CPU/GC/blocking stack was obtained: the dedicated profiled run passed. External process overlap, synchronous query/render work, GC, and scheduler delay remain unproven possibilities. **No actual blocking operation is attributed.** Evidence/limits: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/deadline-analysis.json`, `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/first-capture-analysis.md`, and the resource-follow-up section of `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/diagnostic-design.md`.

## Root cause

**NOT YET ESTABLISHED.** The first real failed-state trace narrows the decision tree to late section acquisition/publication and the missing render at rejection. It does not prove which operation consumed or delayed that time.

## Repair

**NONE — insufficient causal evidence.** No application/test repair or regression assertion added. No longer timeout, retry, arbitrary wait, assertion weakening, reset, skipped test, fixed production order, or production telemetry. Temporary instrumentation exists only in retained diagnostic copies.

## Current full frontend

**PASS — 713/713**, latest live-source-equivalent isolated copy, after preserving the later concurrent changes. Entry-time source separately passed 712/712 in three ordinary cache runs; its failing diagnostic and unrelated full-order replay failure remain retained. All **14 full-suite attempts** are recorded individually; no passing rerun replaces a failed attempt.

## Phase 3 QA

**PARTIAL / QA_FAILED / BLOCKED — unresolved frontend verification gate; acceptance absent.** Existing strict Clippy/native/prototype gate results remain preserved; this continuation did not rerun native gates. Final late baseline verifies all 398 scoped canonical bytes/identities unchanged since that baseline. The two differences from entry are the explicitly recorded external App/test updates. Later run input manifests also match their frozen copies. No Phase 4, playback, .igproto change, VectorCraft change, commit, push, deployment, cleanup worker, or deletion.

## Recommendation

**CONTINUE ROOT-CAUSE INVESTIGATION.** Use the saved real failing state to capture the actual blocking operation on a frozen recurrence. No targeted repair or Phase 3 acceptance is justified yet. QA_TRIAGE handoff and bounded continuation/retest prompts: `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/department-handoff.md`.
