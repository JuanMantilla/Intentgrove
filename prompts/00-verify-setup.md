Read AGENTS.md and .agents/state.md. This is a setup verification, not implementation.

Confirm the working directory and repository root. Inspect only the relevant local
setup: run `specify version`, inspect installed Spec Kit integration metadata and
skill directories, and check `.specify/scripts/bash/` and installed skill script references. Do not initialize or
upgrade anything, install dependencies, change global config, or touch other repos.

Verify the six `.agents/skills/md-*/SKILL.md` files exist and their frontmatter names
match their directories. Check the installed Spec Kit skills for constitution,
specify, clarify, plan, tasks, analyze, implement and converge. Distinguish skills
actually exposed to this agent from files merely present on disk. Do not infer
successful skill registration from file existence alone.

Record `sw_vers`, `uname -m`, `xcode-select -p` and available Git/Node/Rust versions
without installing anything. On Apple Silicon, distinguish native tools from a
translated shell before proposing the target. A missing compiler is not a blocker
to drafting specs. Do not infer OS version from the browser user agent.

Confirm that the product brief and feature brief exist and that implementation
approvals remain pending. Update .agents/state.md with verified facts only.

Return at most 200 words: tool versions, verified skill names, missing/broken items,
and the exact next prompt file. Do not generate an application or claim the macOS
runtime has been tested.
