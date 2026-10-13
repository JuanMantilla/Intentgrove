# Automatic native file opening — implementation report

User chose automatic focused tabs for all supported files, preserving workspace and existing drafts. F005-R05/R06 / AS-004/005 source changes implement those choices. [Authority](authority.json), [amendment](amendment.md), [evidence](evidence/).

## Result

Supported cold/warm Finder/macOS Opened entries and window drops automatically use the existing explicit-file grant and Markdown/HTML/image openers. Delivery is serial; successful entries disappear; matching loaded file identities focus existing tabs. The current workspace/root and other tabs remain. Rendered-editor tests retain an unsaved draft through an external open and return. Session loading, interrupted-session decisions, active restored-file hydration/recovery, saves, selection, section startup and destructive dialogs defer opening. Invalid entries keep localized error and keyboard-accessible dismissal; folders retain Open item and the existing dirty-workspace confirmation.

An optional fileOnly guard on the existing native acceptance command rejects a file that became a folder before any root grant. Later path changes remain subject to existing no-follow explicit-file registration. Native preview previously excluded images; it now composes the existing image-format predicate with Markdown/HTML support. No parent grant, extra capability, new dependency or association setter was introduced. Stale list replies are ignored, the subscription gap is refreshed, attempted IDs are retained only while pending, and acceptance failures do not retry automatically. Native queue capacity remains32.

## Verification

- PASS: complete frontend suite, 534 tests /62 files. Actual App, rendered editor and local-view adapter exercised with mocked Tauri transport. Includes cold/warm file queues, FIFO, duplicate identity, interrupted restore, delayed active restore/recovery, stale snapshots, unsupported dismissal, folder confirmation, failure without loops, HTML/image routing and dirty draft/workspace retention.
- PASS: native Rust library123 tests;5 existing ignored. Includes real disposable filesystem tests for the supported extension list and file-to-folder replacement. Image preview validation is distinct from actual decoding/pixels.
- PASS: TypeScript/Vite build and bundled-worker verification; disposable script check. Existing bundle-size/config-loader warnings remain.
- Package build and inspection: see verification.json and macos-build.log for final status/hash.
- NOT TESTED: actual macOS Finder/drop transport and rendered packaged UX for this amendment. No real user workspace, preferences, source documents or default applications were touched by automated app launches; no production workspace app was launched for these tests. Full Rust integration harness previously fails unrelated missing HTML/image module imports; this run uses the relevant library target and does not claim full integration coverage.

## Use the rebuilt application

Quit existing Intentgrove processes. The rebuilt bundle is `/Users/juanmantilla/projects/personal/md-reader/src-tauri/target/release/bundle/macos/Intentgrove.app`. Finder currently resolves the installed `/Applications/Intentgrove.app` according to the user's Terminal evidence; replacing that installed copy is a manual user step. No app was installed by the agent. Open a disposable Markdown file while cold, then another while warm; verify focused tabs and retaining a disposable dirty draft. Drop supported files and verify unsupported entries/folder confirmation. Keep automatic verification candidates on isolated identity/data with `INTENTGROVE_DISABLE_DEFAULT_MARKDOWN=1` (QA/probe compile gates also disable onboarding/default writes). Never use the user's production profile for automated acceptance.

The existing consent-only command remains:

```sh
"/Users/juanmantilla/projects/personal/md-reader/scripts/set-default-markdown.sh" "/Applications/Intentgrove.app"
```

This requests the default association change only after explicit consent, outside these automated checks. Actual macOS confirmation/default-setting effectiveness remains a separate acceptance item. Prior default-Markdown approved artifact hashes were rechecked and preserved; historical evidence and global Spec Kit013 selection remain intact. No installation, publication, commit/push, dependency change or privilege change performed.
