# F006 toolchain amendment for review — 2026-09-29

**Status: proposed; no approval recorded.** Approved F006 architecture is `plan.md`, SHA-256 `5088bdeb934e52e6d025ed2cfaed1f301a449d1e1003d668d5429d7933b14306`. Behavior, visual direction, XPC decoder isolation, 8 MiB encoded/40 MP decoded caps and the resvg/usvg 0.48.1 choice are unchanged.

## Evidence and exact change

The approved plan states that adding resvg/usvg 0.48.1 raises the native minimum Rust toolchain to **1.85**. [resvg's published manifest](https://docs.rs/crate/resvg/0.48.1/source/Cargo.toml.orig) declares Rust 1.85.0. The current app lockfile already includes **25 packages** declaring a minimum greater than 1.85; the highest declared minimum is **1.88** (including `time` 0.3.55, `plist` 1.10.1, `darling` 0.24.1, `icu_provider` 2.3.1 and `serde_with` 3.23.0). This was measured from `cargo metadata --manifest-path src-tauri/Cargo.toml --locked --offline --format-version 1` on macOS 26.2 arm64, before adding resvg. The current app still declares `rust-version = "1.77.2"`, which is already inaccurate for this locked graph. Local builds use rustc 1.98.1.

**Proposed architecture amendment:** In the F006 `plan.md`, replace only the sentence “Approval of this plan includes raising the native minimum Rust toolchain to 1.85 for F006 and updating build/CI pins” with “Approval of this plan includes raising the native minimum Rust toolchain to 1.88 for F006 and updating build/CI pins.” Update the opening summary's native minimum accordingly if stated there. Then set `src-tauri/Cargo.toml` to `rust-version = "1.88"`, audit the new resvg/usvg transitive graph and prove an actual Rust 1.88 offline/release build. If new dependencies require more than 1.88, return with a new review; do not increase the minimum silently.

Alternative implementation work would be to downgrade the existing 25 packages and their dependents until the lockfile genuinely builds on Rust 1.85. That is a broader dependency change with its own regression risk and has not been proven. The 1.88 amendment is the smaller stated change for the current graph. No F006 production decoder dependency was installed or helper enabled while this architecture gate is open.

Approval, if given, should name this amendment and the 1.88 minimum. Approval of earlier F006 artifacts does not automatically cover this changed toolchain requirement.
