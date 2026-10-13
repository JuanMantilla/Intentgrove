# F003S verification ledger

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

Approval: F003S spec/design/sketch/plan hashes in `docs/approvals.md`, approved 2026-09-29. All four files matched those hashes; active feature confirmed in `.specify/feature.json`.

| IDs | Status | Evidence / limit |
|---|---|---|
| AS-001/003–008/010/011 (component behavior) | PASS | `tests/ui/find.test.tsx` 6/6 and `tests/ui/find-index.test.ts` 4/4: shortcut, focus, rendered syntax, 200 offscreen matches, Unicode, navigation/wrap, Escape, tab switch, clean refresh, live CodeMirror draft, EN/ES, empty/zero/unavailable. |
| AS-001/003–011 (packaged host) | NOT TESTED | One bounded QA `.app` observation passed: native View → Find in Document opened Find and the query `Finder` showed `1 of 1` in `/private/tmp/md-reader-qa-fixture-f005/entry.md`; before/after source SHA-256 was `b8a1af99956798176dc86a6639f3956782acae7f7513edd664ae701c3b199f84`. Full WebKit highlight, assistive technology, app-request observation and scenario coverage remain open. |
| SC-001–004 | NOT TESTED | User/assistive trials, 20 document/hash fixtures and ten warm 1 MiB timings have not run in the packaged host. |
| AS-002, SC-005 | NOT TESTED | Windows/Linux are later platform releases. |

`npm run build` PASS and full Vitest 169/169 PASS after Find integration on 2026-09-29. Focused `npm test -- --run tests/ui/find-index.test.ts` PASS 5/5 after the bounded search regression test. `npm run tauri build -- --bundles app` PASS on macOS 26.2 arm64 with Node 20.19.6 and Rust 1.98.1; current arm64 Mach-O SHA-256 `3455301f4c7c2904ca6362c44134894ddeff8ba869818bdb6f8003396de143f4`. `codesign --verify --deep --strict` PASS for ad-hoc signed local `.app`. The build reports a nonfatal missing `libLLVM.dylib` warning from `rust-objcopy`; no runtime result follows from this. Bundle audit: Find uses the rendered DOM/CodeMirror draft and adds no native IPC command or remote asset. Packaged interactive tests remain NOT TESTED in T014. The earlier DMG predates Find and is stale.
