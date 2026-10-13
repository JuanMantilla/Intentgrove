# Five-second timeout investigation

Generated copies preserve all current canonical assertions; instrumentation adds monotonic phases, independent mock promise settlement, listener ownership, actual Node async resource types and CPU/RSS/event-loop observations. `generate.py` records source hashes. No retries or deadline changes. Callbacks/settled mocks are observed without replacing their results. The diagnostic registry intentionally retains pending fixture promises; those records alone are not evidence of an application memory leak or live OS work.

```sh
python3 tests/diagnostics/reliability/generate.py
python3 tests/diagnostics/reliability/run.py UNIQUE_LABEL --workers 2
python3 tests/diagnostics/reliability/run.py UNIQUE_LABEL --workers 8 --full
python3 tests/diagnostics/reliability/run.py UNIQUE_LABEL --workers 8 --full --compile
```

Output paths refuse overwrite. The compiler uses a new task-owned target directory, offline/locked library check and two jobs. Process samples include only descendants of the test/compiler roots. The runner records commands and exits. Do not call an overlapping unrelated build a controlled baseline.

`INTENTGROVE_HOLD_EDIT=1` is an explicit negative control: it withholds the mocked awaited beginSectionEdit reply and intentionally fails original assertions. A different failure signature from the historical global timeout is meaningful; no injected run is production evidence. Generated tests live outside canonical `.test` discovery; diagnostic configuration selects either them alone or substitutes both traced files in a complete suite, preserving all other tests. Filtered isolation runs are experiments, not full-suite PASS.

Cleanup phases: before unmount → after actual cleanup → after awaited React/microtask settlement. The trace's own interval is cleared and hooks disabled afterward. Node resource reports include test-runner/tracer resources; do not label every timer a product leak. Browser Worker availability and native bridge availability are recorded separately from actual Vitest worker PIDs/Node thread IDs. jsdom is not native WebKit or a native file dialog.
