# Failure-only Phase 3 frontend recorder

Scope: user-authorized VERIFICATION/DIAGNOSTIC continuation. No application repair, test repair, acceptance, or Phase 4 work. Native integration remains mocked in these jsdom tests. Existing native gate results are retained, not rerun by this investigation.

All paths below are rooted at `/Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3-frontend-gate/failure-capture/`.

## Input and isolation

`prepare.py` captures the canonical 398-path snapshot before checks, verifies historical-to-current frontend differences, creates independent A/B/C/D and recorder copies, and saves exact SHA-256 manifests and the App patch. The historical source is the preserved regression-candidate-final from the previous verification-unblock run. Its frontend differs from live only in App and the additional readiness test. Other historical native/spec input differences are outside this frontend experiment; no native equivalence is asserted.

Dependencies are read-only symlinks to the installed packages. Each candidate has a real node_modules directory and private `.vite` directory. Before/after cache files are archived per run. The starting seed is the canonical cache as observed at this investigation's entry, not an invented reconstruction of the earlier failing cache. No canonical cache is removed. Fresh-cache experiments rename only the run-owned candidate cache.

## Recording

Only copied workspace-handoff installs the recorder global. Other suites have no recorder enabled. A preallocated 512-slot ring records monotonic timestamps, numeric event codes, and at most three scalar ownership fields. No normal-execution console output, filesystem writes, DOM snapshots, new awaits, timers, polling, retries, or timeout/assertion changes. No observer or resource sampler is installed.

Instrumentation adds calls to existing transitions: folder activation, document IPC request/result/rejection, committed active ID, descriptor request/result/cancellation, selection adapter publication/clear, complete Markdown paint/layout, selection-request cancellation/wait/completion, section-entry request, and the existing RichSection mount/cleanup effect. Heading construction is recorded once per section per test and explicitly named EDITABLE_HEADING_RENDERED: it proves virtual render construction, not DOM availability. EDITABLE_HEADING_AVAILABLE is recorded only on the original successful query. APP_RENDER_BEGIN/READY bracket the original RTL render call, not every React render.

Failure-state getters replace a single closure per relevant component render. They do not materialize state or DOM snapshots until failure. This allocation and small event overhead remain a possible observer effect. Token symbols stay in application refs; failure serialization preserves their descriptions and surrounding real sequence/generation identity. No invented readiness state or generation is added.

## Failure boundary

The original `await screen.findByRole("button", { name: "Edit section “One”" })` is enclosed in a synchronous try/catch. On rejection, record HEADING_LOOKUP_FAILED, capture getters and focused DOM, write evidence, and rethrow the identical error. No extra promise chain/await or retry. RTL has already performed its own timeout/error formatting before this catch; the capture is immediate after promise rejection, not inside its polling loop.

The existing afterEach also records an already-failed test before its explicit cleanup, to retain ring history for whole-test runner deadlines. RTL's automatic cleanup may already have run before that hook; such captures must be labelled post-cleanup and cannot substitute for a lookup-failure snapshot. Capture is idempotent per test.

Failure-only native state uses existing Vitest mock call/result/settledResults records for selectRoot/listEntries/readDocument/listEditSections/beginSectionEdit and the harness listener registry. No new promise observers or global mock scan. These are mocked IPC calls, not native service measurements.

DOM includes shallow app-container structure, the document-page and current document-selection-root only, plus tab identities and editable-heading elements. It excludes the rest of the shell. No complete body serialization.

## Readiness distinctions

The editable heading is gated by `listEditSections`, disk-version agreement, `mapRenderedSections`, and Markdown rendering. It precedes `startEdit` and RichSection mounting. Cmd+A readiness is a separate adapter/queued-intent path. The adapter callback has no promise-rejection concept; absence, cancellation, current flags, and actual request ownership are recorded without inventing a SELECTION_READINESS_REJECTED operation. Descriptor request/rejection is independently observable. In jsdom without Worker, parsing is inline; Worker readiness is recorded as existing state if a Worker is present.

## Runs and interpretation

`run.py` uses the exact requested frontend command, changing only outputFile and the isolated cwd. It derives actual file execution order from reporter startTime (single worker) after completion; it adds no runtime reporter or scheduling observer. Two full runs per A/B/C/D variant are planned. C may fail its deliberately unaccompanied new test; that expected patch-dependency result must be distinguished from workspace-handoff failures. A replay of a naturally observed failing order is a separate disposable config experiment, not a permanent suite-order fix.

Uninstrumented baseline first, then recorder full suite. If two recorder runs pass, reduce to failure-only state getters and boundary events, preserving the first implementation and results. Passing observed runs never count as a fix. Event-loop/resource instrumentation is deferred until a real failure-state capture; unrelated host processes are not stopped.

## Resource follow-up after real capture

The first recorder full run failed naturally, so the conditional instrumentation-reduction step was not triggered. A separate frozen `candidate-profile` adds a local V8 inspector CPU sampler (2 ms interval), Node monitorEventLoopDelay (20 ms resolution), and synchronous boundaries around the original file click and initial findByRole call. It adds no awaits or query retries and does not alter application timers, polling, or deadlines. Profiler and delay-monitor overhead can affect reproduction; this is explicitly a second, more intrusive diagnostic stage, not the minimal recorder.

The profiler starts with the first workspace-handoff test and stops only on its first failure, writing only after that failure. Each test resets the event-loop histogram and records a CPU-usage baseline. A failure stores the actual histogram, process CPU/memory, and hrtime/performance clock pair. If the suite passes, no profile or normal-state dump is written. All sampling is local to the run-owned test worker; no debugger port is opened, and no unrelated process is attached or stopped.

`analyze-profile.py` slices the failure CPU samples by the recorded test/query/click timestamps. Sampling weights are wall-time approximations, not exact CPU self-time: a descheduled process can produce a long inter-sample delta. The per-test CPU total and event-loop delay must be considered alongside stacks before attributing a blocking operation. A passing profiled run or a hotspot in a successful interval does not prove the original failure's owner.
