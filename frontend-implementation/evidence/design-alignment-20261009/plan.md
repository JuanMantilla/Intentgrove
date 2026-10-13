# Design alignment — implementation plan

USER-AUTHORIZED: current request, IMPLEMENT, approved October 5 snapshot plus selected D and October 8 three-layout authorization. No install, deployment, dependencies or native-contract changes. Existing dirty source preserved in baseline/ and baseline.diff. CodeGraph consulted first; stale entries required direct reads.

## Candidate and evidence

Original screenshots: installed /Applications/Intentgrove.app 0.1.0; no capture-time binary receipt. installed-now.json records the presently installed executable, not retroactive capture identity. Baseline source hashes in baseline-source.json identify the actual starting frontend. Existing direct editor, HTML child surface, settings owner and Margin/Folio/Atlas implementation retained. Browser fixture renders production components with synthetic native responses, explicitly separate from native verification. A fresh uniquely identified local native bundle will verify integration if available.

## Complete contract checklist

| ID | Authority / expected result | Implementation / verification |
|---|---|---|
| COMP-01 | Oct5 workspace01/03, D: quiet horizontal workspace, Projects, fixed arrows before tabs, Settings footer, no duplicate filter route | App shell remove redundant toolbar in native workspace; sidebar control beside arrows; native Settings footer; preserve empty/open routes. Wide/narrow captures. |
| COMP-02 / VG-03 | Oct8 layout authorization: Margin default, Folio centered/drawer, Atlas shelf/left outline | Retain state/native owner; align shelf/reading geometry; verify three layouts in Settings and document continuity. |
| COMP-03 | Oct5 shared hierarchy/palette, saved reading typography/width | Retain approved semantic tokens/offline fonts; bound readable column and tabs; no Theonira logo/ecosystem/global typography replacement. |
| COMP-04 | Tab/identity/outline contract | D targets 32px/8px gap, fixed lane, readable long identities, distinct tab close. Preserve outline, current document and full path. |
| DC-02 | Oct5 contextual Document actions and selectable path | Contained overlay; stable reader/header geometry; outside/Escape/focus; internal menu scrolling stays open. |
| DC-03 | Settings08/16 | Aligned 32px select anatomy/vector chevron, appearance radios, semantic accents, General/Reading/tree helpers, body scroll + fixed Done, 560px stacking; EN/ES. Preserve failure/retry and reset scope. |
| DC-04 | Search06 | Wrap filenames/snippets within saved sidebar, vertical scroll only; modes and counts truthful. |
| DC-05 | Oct5 critique | Completed skipped scan says Scan finished; partial/stopped/error/zero remain distinct and counts retained. |
| DC-06 | selected D | Enabled Go rows identify destination/path; busy/disabled reasons truthful and shared history source. |
| VG-01 / EDIT | Editing02/14/15 | Existing direct rendered editing, explicit Save/Save As, clean/dirty/conflict/recovery and guards retained; test direct input and failure states. CRLF deferral unchanged. |
| VG-02 / HTML | HTML09–11 | Existing authored native HTML/JS-off/grants/geometry retained; real native fixture verification required; no simulated browser HTML proof. |
| IMAGE | shared D/identity contracts | Actual image pixels/format/dimensions/zoom/Fit retained; helper dependency recorded. |
| STATES | narrow07/14, light/es16, shared tokens | Wide1280x820/narrow640x480, light/dark, EN/ES; Settings800x720. Keyboard focus and overflow checks. |
| PRESERVE | user/current specifications | No document mutation outside disposable test fixtures, no file grants/history/recovery/native privilege changes. Existing tests and bundle checks. |

AG-01 resolved scope: only layout compositions selected; Theonira logo, Apps routing, palette/type replacement and shared package adoption are not authorized. No essential approved work depends on those choices. AG-02: no exact welcome/metadata/Find/About/error references; apply shared contract, report limits. Browser URL policy rejected local HTML study; do not circumvent. Original rasterized October5 references inspected; Theonira study source inspected, rendered study review unavailable through current permitted surface.

Verification: baseline/after matched renderer screenshots, existing tests/typecheck/local build, real native smoke on disposable profile, final self-contained comparison with explicit evidence class and remaining gaps. No mocked integration claim.
