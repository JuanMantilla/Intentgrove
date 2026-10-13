# Separate strict-Clippy maintenance plan

Authorized by the current verification-unblock request, path B. No accepted native lint baseline waiver found in AGENTS.md, repository engineer/QA skills, constitution, approvals, scripts, package scripts, Phase 014 plan/tasks, or prior QA reports/completion records. Phase 3 completion lists strict native Clippy as a required failing check. Existing compiler warning policy concerns prototype compiler output, not Rust lint debt. No policy changes or exceptions proposed.

Before each batch preserve the initial bytes from the verification-unblock initial-source capture and restrict edits to diagnosed code. All source files already contain unrelated work. No broad formatting.

| Batch | Files (under src-tauri/src) | Lints/change | Risk | Regressions |
|---|---|---|---|---|
| 1 | assets.rs, refresh.rs, html_broker.rs, image.rs, search.rs, session.rs, editing.rs | redundant field/borrow, collapsible if, range contains, map_or, format args, Path borrow | Low: equivalent expressions; retain evaluation order | native library; refresh/reload; editing, search, session, asset/image/HTML tests |
| 2 | default_markdown.rs, assets.rs, html_tests.rs, platform/macos.rs, settings.rs | octal test modes, meaningful nonconstant assertion, move test module, initialize test preferences | Low: test-only changes | full native tests |
| 3 | scope.rs, platform/macos.rs, refresh.rs, state.rs | remove unused re-export; compile proven test-only helpers only for existing document-contract-tests/test configurations | Medium: preserve real consumers and production grant paths | production compilation and native integration tests with document-contract-tests |
| 4 | editing.rs, recovery.rs, search.rs, lib.rs; narrowly scoped command argument helper if needed | group section byte range; group command arguments while preserving the exact existing flat IPC fields, types, defaults and decoding errors; group recovery implementation inputs | Medium: IPC decoding and async ownership must remain unchanged | argument extraction contract tests, full native/frontend suites and editing/search/menu/recovery regressions |
| 5 | settings.rs | replace manual clamp while explicitly preserving old NaN fallback to upper bound | Low with finite, infinity, NaN boundary tests | settings unit tests |

Acceptance: exact original strict command exits zero, zero diagnostics; native production compilation; Phase 1/2 crate workspace tests and strict lint; full Phase 3 native and frontend tests; Markdown regressions; TypeScript/Vite; dependency boundary checks. Any failure remains visible. User acceptance remains separate. This maintenance is not Phase 3 lifecycle implementation.
