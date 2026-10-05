Read AGENTS.md and .agents/state.md if present. This is a scoped platform-priority
change, not permission to restart the project or implement a new feature.

Confirmed user change: macOS is now the first release target and the development
host. Windows and Ubuntu are deferred. Preserve all other product requirements,
private/local-only scope, role workflow and approval boundaries.

1. Inspect the current repo, git status, existing specs/plan/tasks and actual
   installed Specify version/integration. Do not stash, reset, overwrite unrelated
   work, reinitialize the repo or alter remotes. Do not recreate Spec Kit blindly.
2. Update only affected canonical artifacts: AGENTS.md, product brief, constitution,
   architecture/design proposals, roadmap, skills, active spec/plan/tasks, release
   prompt and handoff. Preserve stable requirement IDs and prior evidence. Record
   this user instruction as approval of platform priority, not of unseen designs.
3. Replace Windows-only development/release assumptions with Mac host verification,
   shell setup, .app/.dmg proposals, native menus/Cmd shortcuts, Finder open/drop,
   close/quit/Dock reopen, system WebKit and real macOS verification. Do not assume
   CPU, minimum OS or universal support. Keep Roboto local and all security rules.
4. Inspect whether .specify/scripts/bash and installed skill references are usable.
   When an old PowerShell-only integration needs migration, use the installed
   version's documented method after preserving custom files. Do not hand-invent
   generated templates or run force/upgrade commands blindly. Record a precise
   blocker/proposed command when an infrastructure mutation needs approval.
5. Read current official Tauri test guidance; do not assume direct tauri-driver
   supports macOS or that Mac automation is impossible. Any embedded automation
   driver must be test-only, not part of the shipped app. Browser-only tests do
   not establish native behavior. Leave unexecuted checks NOT TESTED.
6. Separate personal local/ad-hoc builds from signed/notarized distribution. No
   paid account, security bypass, publication or notarization upload is authorized.
7. Reopen only approvals materially affected by the change. Run consistency checks
   available without installing software; flag stale references and task dependencies.

Do not install system-wide tools, change app code, commit, push or publish. Update
.agents/state.md. Return changed files, retained requirements, approvals to revisit,
remaining blockers and the exact next prompt in at most 250 words. Stop after this
migration/review phase.
