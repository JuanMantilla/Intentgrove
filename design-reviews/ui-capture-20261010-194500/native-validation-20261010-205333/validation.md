# Targeted native validation

Status: **NATIVE_VALIDATION_BLOCKED**. Validation + REVIEW_ONLY; stopped before CR-01 acquisition. Recorded 2026-10-10T20:53:33.733493-05:00.

## Runtime provenance — P-01

Machine-observed metadata and exact dirty-worktree snapshot: [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-205333/provenance.json](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-205333/provenance.json).

- Running native process: PID 5266, started 2026-10-10 20:12:13 local; executable `/Applications/Intentgrove.app/Contents/MacOS/md_reader`, bundle `/Applications/Intentgrove.app`.
- Installed bundle identifier `com.juanmantilla.markdownworkspace`; Info.plist version/build both `0.1.0`. Runtime classified as installed packaged native app, with no observed Vite/Tauri development process or listener on port 5173. No frontend-origin inspection was performed on its live WebView.
- Installed executable SHA256 `930cb87ad345f316bea94be542ad95d6b8d76a363ea7c546e919bff7f7bc9bdc`; differs from local debug and release binaries (exact hashes in provenance.json). Equality would not alone bind a build to source.
- Current source HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880`; worktree dirty, including application/frontend/native changes. Full observed status preserved in provenance.json. No embedded revision, reproducible build record or runtime source connection was verified for the installed process or existing debug/release outputs. Version and timestamps do not establish freshness.
- Configured development origin is `http://localhost:5173` in `/Users/juanmantilla/projects/personal/md-reader/src-tauri/tauri.conf.json`; it is configuration evidence, **not a verified loaded origin**. `npm run tauri dev` is documented in `/Users/juanmantilla/projects/personal/md-reader/docs/workflow.md`; package scripts/config confirm Vite beforeDevCommand. That command can compile native code. It was not run.
- Existing native minimum configuration is 640×480, baseline 1280×820, resizable. These are config values, not observed window/viewport dimensions. Display scale, actual native bounds and WebView dimensions remain unmeasured.

## Isolation and blocker — B-01

No UI interaction, application launch/quit, preferences/session mutation or screenshot was performed. The installed process's profile was not inspected or used. Old Links Test bundle was neither launched nor reused. Existing local binaries have no verified current-source provenance.

A fresh native development compile with a temporary separately identified runtime and verified isolated WebKit/application storage is needed before capture. A different app-data identifier alone is not asserted to isolate every WebKit store. Narrow source inspection found production recovery storage uses Tauri app_data_dir; the acceptance-harness build supplies a separately identified WebKit data store, but this does not prove that an arbitrary dev launch is safe. No production profile override was established.

**Required approval:** one scoped local native development compile using existing locked dependencies, an artifact-only temporary isolation configuration and disposable profile/fixtures, followed by provenance and isolation verification before launch/capture. No dependency installation, installed-app replacement, real-profile use, source edits or full packaging run. If cached tools/dependencies or safe isolation are unavailable, stop again. User instruction requires stopping for unauthorized runtime preparation; designer skill also prohibits builds. A separately authorized runtime-preparation phase is needed.

## Screenshot index

**0 accepted new native screenshots; 0 inspected.** `/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-205333/originals/` is intentionally empty. No NV IDs issued, images simulated, browser substitutes made, or JPEG converted. Theme/language/window/fixture/capture-format fields are unobserved rather than inferred. The 8–12 target could not begin.

## Reproduction queue

CR-01 remains first: Margin 1280×820 where supported, disposable tree/short document and alpha/beta names; EN/dark baseline → fixed-query settled results → later-result scroll → ES/light settled/scrolled equivalent → explorer actual last row/footer. Keep document/query/bounds constant. Observe existing Projects correction without redesign or broader testing.

CR-02: same ES/light baseline, outline + Projects open, short versus long name; measure header and reading area.

CR-03: establish supported actual native minimum and scale, short document/search in ES/light; normal/open versus narrow/open and narrow/closed; determine visibility/clipping and reachable results.

CR-04: disposable section edit → Return to reading dialog → cancel; verify Save/Keep draft separately through fixture actions or narrow source inspection before copy recommendations.

DR-005: shared-prefix/different-ending harmless files at normal/another relevant tree width; inspect reachable full-name disclosures. Add captures only to resolve an unanswered question.

## Actions and preservation

Read app-screenshots first, then actual uiux-marketing-designer skill and its workflow/critique references. Read applicable project/QA integration instructions, shared state, focused original review/request/state, original manifest environment/status, runtime config and documented launch material. CodeGraph consulted before code-location searches; stale source notices led to narrow direct reads. No full inventory or 93-image re-review; no historical originals reopened because acquisition was blocked before comparison.

Only this new evidence directory and a bounded shared-state note are written. No source/dependencies/config changed; no tests/build/install/commit/push/deploy/cleanup/paid model run or agent delegation. No QA acceptance or DONE_ACCEPTED record; no cleanup queue/worker. Original PARTIAL_CAPTURE remains unchanged. Protected original report/manifest hashes in provenance.json are rechecked after writing.
