# F003F research decisions

**Date:** 2026-09-29. Current `listing.rs` builds directory snapshots and fixed exclusions; it does not apply `.gitignore`. `scope.rs::open_relative` already provides scoped no-follow descriptor traversal.

| Decision | Rationale/alternative |
|---|---|
| Traverse through native root descriptors, never a path-based walker. | A path-based ignore walker could read a symlinked `.gitignore` outside the selected root. Open bounded ignore files through `open_relative`; apply hierarchical rules to scoped relative paths. |
| Use an ignore matcher only for rules. | [`ignore::GitignoreBuilder`](https://docs.rs/ignore/latest/ignore/gitignore/struct.GitignoreBuilder.html) can handle semantics, but [current ignore needs Rust 1.88](https://docs.rs/crate/ignore/latest/source/Cargo.toml.orig), above the declared 1.77.2. Candidate exact 0.4.22 must pass locked transitive MSRV/license review; otherwise revise toolchain plan. |
| Search bounded batches and generations. | Native stream returns progress, skipped counts and verified metadata, with cancellation checked between files/chunks. New root/query invalidates old batches. Reopen result through current grant and reverify content. |
| Literal content matching. | Pinned [regex 1.12.2](https://docs.rs/crate/regex/1.12.2/source/Cargo.toml.orig) supports [case-insensitive builder](https://docs.rs/regex/latest/regex/struct.RegexBuilder.html), escaped literal text and original byte offsets at Rust 1.65. Bound match count/context and text bytes. |

Unknowns needing packaged proof: 25,000-entry traversal/250 ms cancellation, `.gitignore` parity and native observer coverage.
