Mac build performance profiler

From the md-reader directory:
  python3 scripts/profile-mac-build.py 3 --parallel 4

The first argument is the number of build rounds. --parallel counts task groups,
including one exact ./build-mac.sh invocation per round. Default: four groups.

  --parallel 1   main macOS build only
  --parallel 3   main build + frontend tests + repeated frontend builds
  --parallel 4   main build + two frontend test suites + repeated frontend builds

Companions repeat complete cycles while the main build runs. Incomplete final
cycles are stopped and marked interrupted, not passed or failed. Completed
failures are retained and produce a nonzero session exit status; they are not
retried. A failed main build stops subsequent rounds. These are representative
local coding workloads, not separate full native application builds.

Each companion uses a snapshot of current frontend source/config/fixtures and
an isolated copy of the existing dependencies shared only between companions.
The main build runs in the real repository. Its normal effects include npm ci,
release compilation, local signing, and replacement of generated app/DMG outputs.
Rust caches are retained: this is a warm-build benchmark, not a clean rebuild.

Logs default to ../diagnostics/mac-parallel-TIMESTAMP/ outside the repository:
  report.txt        readable method, limitations and results
  summary.json      per-round CPU/memory/swap/thermal summary; task failures
  timeline.csv      timestamped CPU, VM pages, compression, pressure, swap,
                    load average, free disk and thermal-state measurements
  samples.jsonl     full VM/swap/pressure/thermal/battery and process samples
  events.jsonl      timestamped task starts, ends, interruptions and failures
  top.log           host CPU, physical memory, process CPU/memory, disk/network
  iostat.log        disk throughput; first report covers time since boot
  run-*.log         per-task console output and /usr/bin/time resource results
  metadata.json     hardware, OS, runtime, power settings and telemetry availability

CPU/VM sampling defaults to two seconds; short peaks may be missed. System CPU
includes the monitor and all your other apps. ps %CPU is a lifetime average;
RSS totals can double-count shared pages and omit compressed storage. VM fields
are pages unless labeled bytes; the VM categories are not all additive.

Thermals: logs Foundation thermal pressure (nominal/fair/serious/critical) and
pmset warnings. Actual temperatures, CPU frequency and detailed SoC power are
not collected: powermetrics needs administrator access. No sudo is attempted.
Battery and power settings are recorded. UI input latency is not measured.

Useful options:
  --output /absolute/path/to/new-folder   folder must not already exist
  --interval 3                           sample every three seconds
  --baseline 20 --cooldown 30             baseline/recovery seconds
  --timeout 1800                         maximum seconds per task cycle
  --keep-snapshots                        retain companion source/dependencies
  --project /path/to/md-reader            project containing build-mac.sh

Snapshots use about 300 MB here plus source and build output. The runner requires
at least 3 GiB of free disk before starting and stops below 2 GiB. Three successive
critical memory/thermal-pressure samples stop the session. Default recovery is
15 seconds; it is a fixed pause, not a guarantee of cooling back to baseline.

Ctrl+C or SIGTERM stops only process groups created by this runner and exports
available evidence. Exit codes: 0 = all requested main runs and completed
companion cycles passed; 1 = task/sampling failure; 2 = incomplete/stopped session.
Snapshots are removed afterward unless --keep-snapshots is set. Logs are retained.
