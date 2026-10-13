# Markdown default opt-in implementation — 2026-10-10

T-D01–T-D05 are implemented and locally verified. T-D06–T-D07 real macOS consent and native interaction acceptance remain open. [Approval](approval.json) records the user's instruction and all four matching reviewed hashes; reviewed spec/design/plan/sketch bytes remain unchanged. Spec Kit F005 owner resolved without changing global013 selection; requirements checklist has zero unchecked markers; no before/after implementation extensions exist. Prior state is retained in evidence.

The packaged app offers the approved native EN/ES Make Default / Not Now sheet after restoration, native-entry and dirty-work decisions settle. Return/default focus and Escape select Not Now. A separate private preference remembers the response, including a first already-default check; a process latch prevents repeated prompts if persistence fails. Only explicit native Make Default consent reaches Apple's asynchronous NSWorkspace setter, targeting the running production bundle and a specific Markdown type. Fresh per-extension queries determine success, partial or unverified results. Native errors and persistence limits remain visible. No broad text/HTML/image/URL defaults are requested.

The script validates/quotes its bundle and invokes `--request-default-markdown`, intercepted before Tauri/AppState/WebView/session/draft initialization. It supports a live workspace without initializing another one. Debug, QA, probe, contract-test, unbundled, other-identity and explicitly disabled candidates fail closed. Compile-time guards and native bundle checks own eligibility; the renderer provides readiness only. [Implementation notes](implementation-notes.md) explain reuse, state ownership and locking.

PASS: 121 native library tests (5 ignored), 523 frontend tests, fake native workspace/policy tests, disposable fake script contracts, strict clang compilation, frontend build, worker check, final packaged build, distinct Info.plist declarations, arm64 and strict ad-hoc signature. Package inspection exercised only the disabled CLI/script and extra-argument rejection. [Verification ledger](evidence/verification.json), [package identity/hash](evidence/package-inspection.json), [source hashes](evidence/source-manifest.json).

FAIL: the full Rust test command cannot compile existing refresh integration harnesses missing HTML/image imports. This unrelated failure is retained in `evidence/native-full-tests.log`; those harnesses were not changed.

NOT TESTED: actual macOS confirmation/denial and association writes, native keyboard/VoiceOver/EN/ES/light-dark interaction, Finder cold/warm delivery, actual live dirty-workspace script isolation, macOS14 and Intel. Read-only before/after Launch Services snapshots returned unknown/dynamic types and unknown handlers, so they do not prove OS default behavior. Fake adapter outcomes do not prove real consent. No real setter was invoked; actual Markdown defaults were not changed by automated verification. [Exact remaining isolated-account procedure](manual-verification.md).

No installation, dependencies, security/privilege changes, release credentials, notarization, publication, commit or push. Document/settings/session/draft formats and historical evidence are preserved. The generated app is a local ad-hoc build, not a release certification.

From the repository, request the change with this exact command; it still requires choosing Make Default and any macOS confirmation:

```sh
./scripts/set-default-markdown.sh "/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove.app"
```

Exit codes: 0=both defaults verified, 2=Not Now, 3=partial/error/unverified, 4=invalid/unavailable. With no path argument the script targets `/Applications/Intentgrove.app`, which must already contain this feature. No app was installed during this work.
