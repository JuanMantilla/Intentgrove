# Windows validation guide — F007W

Status: proposed validation steps; no Windows build or runtime has executed.

Prerequisites on a separately authorized Windows 11 x64 runner: Rust 1.88 MSVC target, compatible Node for the locked frontend toolchain, Microsoft C++ build tools/SDK and WebView2. Provisioning/installing these tools is separate authorization, not a side effect of a test command. Record `winver` details, CPU, NTFS volume, versions and standard-user status.

After approval and native implementation:

1. Run the existing frontend tests with `npm test`, then `npm run build`.
2. Run `cargo +1.88.0 test --manifest-path src-tauri/Cargo.toml --locked` natively on Windows. Unix fixture operations must be target-scoped rather than skipped wholesale.
3. Run `npm run tauri -- build --no-bundle` after the Windows platform configuration exists. Inspect build hooks first; no signing or publishing.
4. Launch only a test configuration with disposable per-user app data; do not run the production identifier against real user data for smoke tests.
5. Exercise stories in `spec.md`: spaced/Unicode paths, blocked traversal/reparse/streams/cloud/network, changed identities, open/drop/cancel, refresh, Find/search, scaling and close. Hash all input files before/after reading.
6. Before enabling edits, test BOM/CRLF, locked/denied destination, second instance, competing writer, stage interruption, uncertain commit and restart recovery. Verify retained bytes and safety records.
7. Build an unsigned per-user NSIS package only after configuration review. Installation/uninstallation requires explicitly authorized disposable Windows environment; record runtime and retained user-data behavior.
8. Run affected macOS regression tests on macOS. Cross-compilation, WSL and browser mocks do not count as Windows desktop execution.

Missing Windows runner or tools: NOT TESTED, with the exact missing prerequisite recorded. Do not change registry policy, elevate, hydrate cloud fixtures or weaken CSP to make tests pass.
