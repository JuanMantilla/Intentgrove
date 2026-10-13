# Repository policy inspection

Resolution: MAINTENANCE CLEANUP. No approved native strict-Clippy baseline-exception mechanism found.

Sources inspected:
- /Users/juanmantilla/projects/personal/md-reader/AGENTS.md — approval gates permit scoped repairs and tests; prohibit weakening requirements; actual user approval owns acceptance.
- /Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-software-engineer/SKILL.md — bounded implementation/repair with relevant checks and preserved user work.
- /Users/juanmantilla/projects/personal/md-reader/.agents/skills/md-qa-engineer/SKILL.md — evidence-based verification; no self-approval or release PASS with missing evidence.
- /Users/juanmantilla/projects/personal/md-reader/.specify/memory/constitution.md — traceable delivery; approved repair proceeds autonomously, scope changes require authorization.
- /Users/juanmantilla/projects/personal/.agents/qa-cleanup-integration.md — passing QA alone is not acceptance; only existing authorized waivers may use NOT_APPLICABLE; record through qa_completion.py.
- /Users/juanmantilla/projects/personal/md-reader/docs/approvals.md — no native lint waiver.
- /Users/juanmantilla/projects/personal/md-reader/specs/014-interactive-prototype-v1/{spec,plan,tasks,verification}.md — Phase 3 gate/acceptance stays separate; no native unchanged-baseline rule.
- /Users/juanmantilla/projects/personal/md-reader/qa/runs/interactive-prototype-v1-phase-3/completion.json — required native-clippy-v7 check is FAIL; explicit unwaived baseline blocker and unsatisfied actual user acceptance.
- /Users/juanmantilla/projects/personal/md-reader/package.json and /Users/juanmantilla/projects/personal/md-reader/scripts/verify-macos.sh — no baseline mechanism. No .github CI directory or repository Cargo configuration was found.
- /Users/juanmantilla/projects/personal/.agents/plans/interactive-prototype-v1/compiler.md — enumerated prototype compiler warning policy applies to compiler output, not Rust/Clippy; it does not authorize this exception.

Searches covered repository role instructions, active specifications/plans, approvals, QA STATE, prior QA reports and completion records, scripts, and known-baseline/waiver/no-new-warning terms. Raw prior-report search results are in policy-search.txt. Earlier failed reports acknowledge debt; they do not approve it.

The current request expressly authorizes semantically neutral maintenance when no existing waiver exists. This is sufficient for path B under AGENTS.md; no new permanent policy, lint allowance, CI change or user acceptance is created.
