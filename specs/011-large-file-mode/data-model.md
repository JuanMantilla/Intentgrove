# F003L data model

Large-file tab: scoped grant, confirmed identity/version, size, opt-in, generation and status. Snapshot: private bounded temporary bytes (<=50 MiB), source version, checksum, sparse line index and cleanup state; never in repository. Window: UTF-8-aligned byte/line range with bounded text. Find job: literal query, generation, ordered positions, progress and cancellation. An incomplete snapshot/result cannot be labeled complete; stale source makes snapshot explicitly stale.
