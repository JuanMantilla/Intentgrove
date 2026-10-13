# Verification

## User-authorized context-menu repair — 2026-10-10

New scoped repair after the prior version closeout: viewport body portal, global outside-click/Escape dismissal, measured edge clamping, and listener cleanup. PASS: 542 frontend tests/63 files including eight focused menu regressions; frontend build and diff check. NOT TESTED: actual CSS-zoom geometry and physical trackpad/native WebKit interaction; local preview server denied with `listen EPERM`. Mocked edge measurements and synthetic pinch events do not establish rendered placement. Full scope, commands and remaining check: [repair report](../../frontend-implementation/section-context-menu-20261010-report.md).

> **Current version: APPROVED / DONE — 2026-10-10.** The user accepts Intentgrove as it stands. Planning, implementation, design and QA follow-up are closed for this version; no further work is required. This notice supersedes pending/open/blocked next steps below. Historical test results and platform exclusions remain unchanged. See [user acceptance and closeout](../../docs/current-version-acceptance-20261010.md).

## HTML read-only boundary — 2026-10-08

F002-H01: standalone HTML never enters Markdown section editing, dirty buffers or editing/recovery journals. Existing Markdown behavior is preserved. Session validation/checkpoint explicitly refuses HTML editing/recovery payloads; HTML routes through its own read-only provider. Canonical architecture: [F001 amendment](../001-workspace-reader/html-native-amendment-20261008.md); actual API and evidence: [native handoff](../../os-engineering/html-frontend-handoff.md) and [report](../../os-engineering/html-report-20261008.md). Native tests cover the rejection; frontend production routing remains receiving work. No HTML source editor is authorized.

## In-place finish evidence — 2026-10-08

F004-R01–06/R11–13 authoring implementation now uses rendered source transactions and unchanged schema1 CodeMirror source history. Final DOM/appearance/code61PASS; actual native save/source-boundary/Save As/conflict23PASS and recovery16PASS/1ignored. Broad regression460PASS/2FAIL at the frozen earlier checkpoint, isolated failing casesPASS; full PASS not claimed. Platform menu/physical IME/restart and full visual/a11y acceptance NOT TESTED. CRLF deferral unchanged. Exact checkpoints/commands/failures/source identities and limitations: ../../frontend-implementation/evidence/in-place-finish-20261008/report.md.

Final workspace file rerun:15PASS/7FAIL (`workspace-delivery.log`), unchanged edit-entry readiness deadlines and5s timeouts. Cause unresolved. Individual PASS does not establish suite-level regression acceptance; final editor61/build/worker remain PASS.
