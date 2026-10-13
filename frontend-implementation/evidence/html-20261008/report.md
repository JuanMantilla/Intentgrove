# HTML frontend continuation evidence — 2026-10-08

IMPLEMENTATION: PARTIAL. HTML rendering is NOT IMPLEMENTED. INTEGRATION: MOCKED_ONLY for frontend checks; real HTML native integration NOT TESTED. VISUAL_REVIEW: NOT TESTED. USER_ACCEPTANCE: PENDING.

Authorization: current user IMPLEMENT instruction plus `docs/approvals.md` “Remaining scope authorized — 2026-10-06”; no existing design reapproval required. Read senior-frontend-developer skill and handoff/implementation/security-performance/desktop-document-apps/accessibility/verification references. Read project AGENTS, both states and authoritative handoff/IR-02/03/security/approval sections. Used CodeGraph before code searches/reads; changed-on-disk files were read narrowly. Installed `.specify/scripts/bash/check-prerequisites.sh --json --paths-only` observed feature013; selection unchanged. No subagents.

## Implemented scope and limits

- HTML/HTM filenames received as `other` are visible with Documents and images only. They invoke the real existing `read_document` contract; native classification/picker/search are unchanged. Current native reads reject HTML.
- A pending HTML attempt retains a tab/name/path with Opening HTML status. Native unsupported response becomes explicit “HTML viewing is unavailable in this build”; missing, denied and reselection failures keep their actual error. Retry rechecks the existing command, explicitly does not claim to enable viewing. Close uses existing tab lifecycle and invalidates pending request ownership; stale replies cannot resurrect it.
- EN/ES copy uses the existing locale catalog, status/alert semantics, existing tab/Document path controls and shared styles. No design mockup content is embedded in product UI.
- HTML response names are rejected at Markdown read/confirmed-refresh/search boundaries; App also refuses unexpected HTML before editor/recovery calls. This is a refusal test, not proof of an isolated HTML engine. HTML CSS and resources are not rendered/fetched.
- A native unsupported outcome for a local HTML link gets a specific notice while retaining the Markdown source/tab/history. Shared navigation, Markdown/image rendering, editing/recovery and Settings are preserved by existing regressions, subject to exact test results below.

No raw HTML DOM insertion, iframe/srcdoc, invented native command, native/backend implementation, dependency/config/CSP/security/privilege change, install, commit, push or publish. `tests/diagnostics/html-view` is a browser-only test of the real App fallback with a synthetic native bridge; it contains no mock HTML renderer and is not a product entry point. It was prepared but NOT TESTED interactively.

## Requirements traceability

| Handoff criterion | Result in this pass | Concrete remaining dependency |
|---|---|---|
| 1 Entry points/types/restore | PARTIAL: filtered tree exposes HTML names and truthful failure tab | Native picker/accept/recents/classifier/search/restore + typed isolated-view descriptor |
| 2 Authored CSS/local resources | NOT TESTED / not implemented | Isolated native WebView + grant-checked HTML/CSS/font/image broker |
| 3 Script/network/IPC denial | PASS for refusing returned HTML at frontend Markdown boundary only; native engine NOT TESTED | Separate unprivileged engine, zero-network/IPC/process proof and malicious corpus |
| 4–5 Fragments/cross-type/history/zoom | NOT TESTED for HTML; unsupported Markdown→HTML attempt retains source (mocked) | Native deliberate-link/location adapter and IR-03 details routing |
| 6 Access/denial/failure | PASS mocked native missing/denied/reselection distinctions and Retry/Close; resource access NOT TESTED | Resource issues + deliberate file/folder selection contracts |
| 7 Menus/focus/lifecycle | PARTIAL: existing controls reused; pending close/stale reply regression PASS | Real native child surface focus/menu/access flow lifecycle |
| 8 Find/search/narrow/locales | EN/ES fallback component PASS; HTML find/outline/narrow/200% NOT TESTED | Native visible-text/heading/geometry contract, real rendered verification |

Full HTML completion requires [the actionable native handoff](../../html-native-handoff-20261008.md). Its commands/types and budgets are explicitly proposed implementation contracts; none are represented as available API. Native owner must reconcile owning canonical feature artifacts through installed Spec Kit. This is an implementation dependency, not approval debt.

## Commands actually run (project working directory)

- `npm test -- tests/ui/html-unavailable.test.tsx tests/ui/html-boundary.test.ts --maxWorkers=2`: initial FAIL (3/18); two test selectors omitted existing error text in tab accessible names; pending-close regression exposed a real late-reply defect, fixed. Original log `focused.log` retained.
- Same focused command after fix: FAIL (2 timeouts /18), `focused-final.log`; no deadlines changed. Cause not established.
- `npm test -- --maxWorkers=2`: FAIL, 380 PASS /2 FAIL,55files (`regression.log`). Both failures were existing Markdown anchor-refresh tests timing out. This run preceded the final additional failed-link test and corpus-based test correction. Do not classify them as pre-existing product defects or attribute causally to host load without evidence.
- `npm test -- tests/ui/html-unavailable.test.tsx tests/ui/html-boundary.test.ts tests/ui/automatic-refresh.test.tsx --maxWorkers=1`: first FAIL,24PASS/2FAIL (`focused-serial.log`), caused by new test fixture using an HTTP `import.meta.url` in jsdom and a link role differing from the current Markdown renderer's button semantics. Corrected the fixture path and queried the real existing button; no application behavior/deadline/assertion suppression.
- Final same focused serial command: PASS,26tests/3files (`focused-final-serial.log`). Includes all7 Markdown automatic-refresh cases,8 App fallback cases and11 API/classification boundary cases.
- `npm run build`: PASS, final types/frontend production build (`build-final.log`); existing large-chunk warning. Build does not establish HTML support.
- `npm run test:bundle-worker`: PASS (`worker-final.log`). Markdown/code worker boundary only.
- `git diff --check -- src/app/App.tsx src/app/api.ts src/app/i18n.ts`: PASS (no output).
- `node tests/fixtures/html-view/create-disposable.mjs`: PASS for fixture construction only, path in `disposable-fixtures.json`; no native acceptance case executed.

`npm test -- --maxWorkers=1`: PASS,383tests/55files, exit0,189.60s (`regression-final-serial.log`). This final run covers final application/test source, including Markdown/image/editing/recovery/Settings regressions and the new HTML fallback tests. Earlier failures remain retained; their timing cause is not established. No test deadlines/assertions changed. The task-owned Vite server was stopped after checks.

## Actual rendered interface attempt

Started task-owned Vite at127.0.0.1:5178. CUA Chrome browser provider returned “Browser is not available: chrome”; browser inventory was empty. Native Chrome binding worked, and a task-owned tab navigated to approved mockup09; AX reported the SVG image and exact local URL. Screenshot returned a uniform blank gray image, so visual inspection is NOT TESTED, not a fidelity PASS. Native actions repeatedly returned “The user changed '/Applications/Google Chrome.app'. Re-query the latest state…”; another active tab was repeatedly selected. Further competing input was stopped. References10/11 were read as SVG source; rendered visual review of them NOT TESTED. No screenshot retained as fake visual evidence.

Actual implemented fallback in browser/native package: NOT TESTED. Component DOM checks are mocked integration only. Narrow/200%/theme fidelity, keyboard/screen-reader and full resource-access dialog verification are NOT TESTED. No user documents or production app profile were used.

## Native acceptance corpus — NOT TESTED

Generated new disposable workspace contains authored light CSS, dark `.htm`, unstyled/empty/malformed pages; same/missing/percent-encoded fragments; Markdown/image/HTML/details/outside-grant/missing links; missing image alt/dimensions; nested CSS imports/local licensed font/PNG; hostile inline/external/module scripts/event handlers, JavaScript/data/file/remote links, base/meta redirects, preload, frames/srcdoc/object/embed/SVG/form/download paths and CSS remote/import/font/image/cursor references. Native grant/denial/resource loading, script execution/network/IPC, fragments, refresh, failed navigation and viewer zoom all NOT TESTED until native contracts exist. Merely generating these fixtures or refusing their bytes proves no HTML runtime behavior.

Baseline dirty-worktree receipt and pre-existing frontend diff are retained. `cumulative-frontend.diff` includes earlier user changes as well as this pass; compare against `pre-existing-frontend.diff`, never attribute the full cumulative diff to this task. `final-source-sha256.txt` identifies the final shared source/test inputs. Historical evidence, prior approvals and unrelated source/native changes remain. This pass stops at implementation handoff.

Optional next browser-only fallback inspection: `npm run dev -- --port 5178`, then open `/tests/diagnostics/html-view/index.html` and Open folder → page.html. The tab title explicitly says MOCK NATIVE. This exercises the actual App fallback only; native grants, persistence, renderer isolation and HTML support cannot be inferred.
