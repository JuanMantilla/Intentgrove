# Intentgrove — section context-menu repair, 2026-10-10

F002 scoped repair explicitly authorized by user; implementation complete, acceptance pending. Changed MarkdownView.tsx and menu-only app.css; added section-context-menu.test.tsx. Body portal removes CSS zoom inheritance, uses viewport client coordinates and measured edge clamping; document capture handles outside clicks/Escape with cleanup. PASS: frontend542/63files, build, diff check. Rendered geometry/physical pinch/native WebKit NOT TESTED: preview server bind EPERM. Report: frontend-implementation/section-context-menu-20261010-report.md; gap recorded in F002 verification. Spec Kit nonpersistent F002 override confirmed; global013 unchanged. Next: permitted renderer/native menu verification. Prior native-open handoff remains applicable below.

# Intentgrove — automatic native file opening, 2026-10-10

Active F005 IMPLEMENT handoff. User explicitly chose new/focused tabs preserving workspace/drafts and all supported files including drops; authority and scope in specs/012-macos-delivery/automatic-native-open-20261010/authority.json and amendment.md. Spec Kit F005 override used; global013 unchanged. Prior state/source snapshots preserved under evidence/before; original default-Markdown reviewed hashes rechecked unchanged.

T-N01/T-N02 complete. App.tsx serially consumes native files after restoration/hydration/recovery and blocking operations, rejects stale queue snapshots, deduplicates through existing openers and retains scoped errors/folder confirmation. api.ts/native_entry.rs add file-only acceptance guard before root grants and reuse existing supported-image predicate. Tests cover actual rendered unsaved draft/workspace retention, restore readiness, cold/warm/FIFO/duplicates/errors and real filesystem type/race validation.

PASS: frontend534/62files (mocked Tauri), native library123/5ignored, build/worker/script/final arm64 package/deep strict ad-hoc signature. T-N03 actual Finder/drop GUI remains NOT TESTED; full Rust integration harness limitation remains unrelated. Report/ledger: automatic-native-open-20261010/report.md and evidence/verification.json.

Next: user quits Intentgrove and manually replaces /Applications/Intentgrove.app with src-tauri/target/release/bundle/macos/Intentgrove.app, then tests disposable cold/warm files and drafts. No actual defaults, production profile/data, installation/dependencies/privileges/release/commit/push changed by verification.
