# QA-0031 scoped repair proposal

Status: USER-AUTHORIZED IMPLEMENT; COMPLETE_IN_SCOPE; acceptance PENDING. User instruction: “I aprove it, continue.” Final implementation/verification: /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0031-implementation-handoff.md. Proposal history below is preserved.

## Evidence and scope

Read the finding, native QA report, unavailable-tab-menu.txt, missing-dirty-menu.txt and source-review.txt under /Users/juanmantilla/projects/personal/md-reader/qa/runs/reveal-native-20261011T214754Z, plus /Users/juanmantilla/projects/personal/md-reader/qa/findings/QA-0031.md. CodeGraph was consulted first; it reported changed App source, which was then inspected on disk.

OBSERVED: /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx composes both explorer and tab context menus through the shared reloadMenu ActionMenu. Reveal currently checks platform, absolute local display path and non-folder target. Known unavailable state is recorded in tab freshness/reason and reload results. Dirty status is independent of availability. Opened tabs currently dispatch an explicit-file native grant; unopened explorer files dispatch rootId+segments. Existing revealLocalFile catches native failures and reports translated feedback.

## Proposed implementation

- In /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx, derive the clicked target's known unavailability from current tab and matching reload status, with root availability considered only for root-backed targets. Disable Reveal with existing localized unavailability/error copy in both menu entry points. Retain platform/path guards.
- Keep dirty/editing/conflict status separate from unavailability: a saved existing file with unsaved edits remains enabled. Never save, discard or alter drafts to enable Reveal.
- Preserve native grant-only payloads and graceful errors for changes occurring before availability is known or during an in-flight reveal. Preserve nearby actions and existing ActionMenu keyboard/focus behavior. If live disable exposes a focus defect, fix only that affected behavior and verify other consumers.
- Extend /Users/juanmantilla/projects/personal/md-reader/tests/ui/reveal-file.test.tsx with interface-level regressions for root/explicit unavailable targets, both menus, dirty-existing availability, live status changes during an open menu, stale-generation events and race failures. Use existing helpers and mock boundaries; native integration remains separately assessed.
- No native privilege/API changes, dependencies, installation, publishing, commits or unrelated QA-0032 repair.

## Planned verification after authorization

Capture a pre-check tested-path snapshot under the workspace QA integration contract. Run focused Reveal, reload, refresh, navigation and menu keyboard/focus checks, type checking and a local frontend build. Inspect EN/ES and light/dark rendered menus using disposable fixtures. Build an isolated, noninstalled macOS candidate after reviewing its build configuration and side effects; verify known missing root and explicit states, saved dirty availability and rename during an open menu where tools permit. Record every unavailable check honestly. Preserve original QA evidence and all prior user edits.

Deliver /Users/juanmantilla/projects/personal/md-reader/frontend-implementation/qa0031-implementation-handoff.md with exact changed paths, source manifest/digest, executable and build configuration hashes, commands/results, evidence and independent native QA RETEST instructions. QA-0031 stays OPEN pending independent retest and user acceptance. Do not publish DONE_ACCEPTED or start cleanup.

## Read-only baseline

Dirty HEAD: 7e00d3316ce46563cafb46ba928498fcb0d82880. Existing worktree has extensive modified/untracked work; preserve it. These hashes describe inspected inputs, not a repaired candidate:

| Absolute path | SHA256 |
| --- | --- |
| /Users/juanmantilla/projects/personal/md-reader/src/app/App.tsx | a838d236c0235e2eb2bad2a4048f01913ee630679a3cb2d927f8b349cde2bcea |
| /Users/juanmantilla/projects/personal/md-reader/tests/ui/reveal-file.test.tsx | fc0fcb7866ace4d573aaca86efca17c6ce3ff8eb4b0b8a289e74c39feaa6e011 |
| /Users/juanmantilla/projects/personal/md-reader/src/app/ActionMenu.tsx | cfd96503e7f1d83fa7d3edbc086d79f9b5b2d8ba7857edfeb90082da2ec6e36a |

No tests or builds run in this planning phase. No application code changed. No new candidate/build hash exists.

## Required instruction

User handoff: “Authorization: this QA handoff grants none; retain applicable design/implementation gates and obtain scoped user instruction before code repair.” The skill also requires recording actual authorization and never creating it. Request a scoped instruction to implement this QA-0031 proposal and perform local tests/builds with disposable data, preserving independent QA and acceptance gates.
