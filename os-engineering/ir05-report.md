# IR-05 native delivery — 2026-10-06

IMPLEMENT complete in the requested native scope. The optional subtree contract and native Go routes are implemented; API types and existing client history routing are connected. Folder-action/search-panel scope UI remains a precise frontend handoff, not claimed complete. No dependencies, shortcuts, grants, session schema, installation, release or commit were added. Preexisting changes and IR-04 evidence were preserved.

## Implemented boundaries

macOS Go contains Back/Forward/Visited/Clear with no accelerators and EN/ES labels. Optional enabled-state fields default false for older callers. Existing `native:menu` dispatch targets the main window, suppresses Go while Settings is focused, and reuses committed client history/guards. Windows preserves the approved client Go path and unsupported native-menu response.

Search accepts optional root-relative `scopeSegments`, confirms the directory through native no-follow adapters, and acknowledges the confirmed segments. Each job retains directory identity/handle, root generation and one existing AppState reference for generation checks. Traversal and result opens are anchored to the scope handle. Segment prefix and total depth are checked; replaced scope/root invalidates scan/emission/open. Stable document confirmation reuses the existing implementation through an internal file-handle seam, followed by scope/job checks before returning. Native scope invalidation reports `partial/scope_changed`; already invalid hits cannot be opened. Stop preserves valid collected hits; supersession expires old/in-flight opens separately from cancellation.

Root omitted/empty behavior, Markdown-only coverage, inherited/local ignore ordering and ancestor pruning, includeIgnored, query/result/entry/byte bounds, opaque hit IDs, changed-match relocation, cancellation and client sequence ownership are retained. No new index or general filesystem command was introduced.

## Verification

Host: native Windows x64, OS build 10.0.26300.0, local NTFS; installed Rust/Cargo 1.88.0, MSVC, Tauri 2.11.6. Native tests use the existing opt-in common-controls test manifest and offline dependency cache. These results do not prove macOS runtime behavior.

- PASS: library regressions, 85 passed / 5 existing opt-in tests ignored, `evidence/ir05/native-library-final.txt`. Final scope/open checks also exercised by the focused final search run. Disposable fixtures cover root compatibility, ancestor/local ignore and whitelist, includeIgnored, invalid/deep/file/missing scopes, internal/external NTFS junction refusal, forged sibling hits, changed content, root generation replacement, scope identity replacement before open and during streaming, Stop-open compatibility, replacement-job expiration and late cancellation.
- PASS: frontend focused navigation/search, 22 tests, `evidence/ir05/frontend-focused.txt`; all frontend tests, 301 across 43 files, `frontend-final.txt`. Native-event mocks exercise the real App history functions and enabled state; they do not prove native macOS click/focus behavior.
- PASS: TypeScript/Vite build, `frontend-build-final.txt`; bounded production worker check, `worker-bundle.txt`; Windows default all-target check, `default-check-final.txt`. Existing compiler warnings and Vite chunk-size warning remain visible.
- PASS: Spec Kit F007W global selection and F003F non-persisting override, `spec-kit.txt`; source diff whitespace check. Supplemental reconciliation lives in `specs/009-folder-search/ir05-native-amendment.md` and shared workspace tasks. Original approval snapshots are unchanged.
- NOT TESTED: macOS build/menu/runtime, packaged subtree/EN–ES/keyboard/minimum-window journeys, frontend scope selection/races, and packaged 25k cancellation measurements. Existing feature acceptance tasks remain open. Linux remains unsupported.

Initial failures are retained: malformed test CLI invocation, restricted-runner native NTFS access denial, test callback typing failure, and streaming fixture rename while a Windows file handle was held. The CLI/type errors were corrected. Authorized unrestricted disposable execution resolved the runner restriction. Windows correctly refused moving a directory during a held-file result flush; the streaming fixture now replaces it at the between-file progress flush and verifies immediate partial termination and expired opens. No permission/ACL/system-security change was used to obtain a pass. Failure evidence is in `native-search.txt`, `native-library-stream-fixture-failure.txt` and `frontend-build.txt`.

## Integration and review

See [exact frontend handoff](ir05-frontend-handoff.md) for IPC fields, state guards, errors, ownership, scope-switch sequencing and acceptance. See [implementation plan](ir05-plan.md). Next: frontend implements folder action/panel scope selection and localized scope recovery; QA runs actual native menu and scoped-search journeys on macOS and Windows with disposable fixtures. This delivery is code completion and scoped verification, not release or user acceptance.
