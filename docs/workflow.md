# How to use specs and role skills

## Four different things
A **specification** describes what the app must do and how we will know it works.
A **plan** describes how to build those behaviors. **Tasks** are small units of work
that implement/test the plan. A **role skill** is a reusable instruction file that
changes how a coding agent approaches one stage.

The **agent** is the running coding tool. One Codex session can use a product role,
another a designer role, and another an engineering/QA role. A SKILL.md file does
not create a background worker, new model or automatically independent expert.
No separate multi-agent framework is required for this starter.

Spec Kit supplies process skills and templates. The six md-* skills supply our
project-specific responsibilities and quality rules. Use both together. The
canonical spec/plan/tasks live in the real Spec Kit feature directory, not in chats.

Example: 'Automatically refresh the preview' is incomplete. A useful spec says
that a clean document refreshes after an external write, while a dirty document
keeps its buffer and shows a disk conflict. The engineering role chooses the
watcher/state implementation; QA creates an external writer and verifies both cases.

## macOS-first setup
The first release and development host are macOS. Windows and Ubuntu are later.
Keep the private GitHub repository, six roles, approval gates and all functionality.
Installing development tools and using GitHub/cloud coding agents can require
internet; these are not app runtime dependencies.

### Already initialized the older starter?
Do not recreate the repository or run the installer over edited files. Use
prompts/00-migrate-existing-to-macos.md in the existing repo’s coding session.
It updates affected specs/roles and checks the existing shell integration while
preserving code, history, requirement IDs and unchanged approvals. This package
has not connected to or changed your local Mac or GitHub repository.

### 1. Open Terminal and check existing tools
Open Terminal (or your usual Mac terminal). Run each command independently:

```bash
sw_vers
uname -m
xcode-select -p
git --version
codex --version
uv --version
```

Record actual results; missing tools are setup items, not failed app tests. Use
native architecture where possible and inspect translated shells/toolchains before
choosing a target. Do not infer the macOS version from a browser user-agent string.

For desktop-only Tauri development, Xcode Command Line Tools are sufficient in
place of full Xcode [T1]. When missing, run this and finish the OS installation UI:

```bash
xcode-select --install
```

Then run `xcode-select -p` and `git --version` again. Do not install Windows C++ tools,
PowerShell or WebView2 for the Mac target. Node and Rust can wait until the approved
implementation phase; see the build preparation section below.

For the Codex installer that placed your executable in ~/.local/bin, a current
terminal PATH repair is:

```bash
export PATH="$HOME/.local/bin:$PATH"
codex --version
```

This only changes the current shell; it does not reinstall Codex. Follow the
installer’s existing profile instructions for future terminals. If no executable
was actually installed there, use Codex’s official installation documentation.

### 2. Install uv only when missing, then Spec Kit
Choose one uv installation method, not both. Official standalone method [U1]:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
uv --version
```

You can inspect the script before execution. An existing Homebrew setup can use
`brew install uv` instead [U1]; Homebrew is not otherwise needed for this starter.

Then install managed Python and Spec Kit through its supported PyPI route [S1]:

```bash
uv python install 3.12
uv tool install specify-cli --python 3.12
export PATH="$(uv tool dir --bin):$PATH"
specify version
specify init --help
```

Record the actual version and provenance. Do not automatically upgrade an existing
project or mix older CLI/integration syntax with new templates. To persist a missing
tool directory in PATH, use uv’s documented shell setup (`uv tool update-shell`)
and reopen Terminal; review any profile changes rather than duplicating them.

### 3. Initialize a NEW project with shell scripts
Only run this for a new project. The temporary repository name is not final branding.

```bash
mkdir -p "$HOME/projects/personal"
cd "$HOME/projects/personal"
specify init md-reader --integration codex --script sh
cd md-reader
if [ ! -e .git ]; then git init -b main; fi
```

Stop if the destination already contains important work; use the existing-project
migration path instead. `--script sh` selects Bash infrastructure for macOS, even
when your interactive terminal uses zsh [S1]. Codex uses `.agents/skills` and
`$speckit-<command>` in the current integration [S2]. Only use `--ignore-agent-tools`
when intentionally using a GUI/IDE agent without its CLI; it does not install one.

### 4. Add the starter files
In Finder, double-click md-reader-starter-macos.zip. Open the extracted
md-reader-starter-macos folder. It contains Install-Starter.sh, install_starter.py
and repo/. Review both scripts. In Terminal, from the initialized project, run:

```bash
bash "$HOME/Downloads/md-reader-starter-macos/Install-Starter.sh" "$PWD"
```

Use the actual extraction path. The helper uses the Python 3.12 runtime installed
above through uv, with network and Python downloads disabled for the helper run.
It requires .specify and a Git repo/worktree. It preflights conflicts, copies missing
files (including dot-directories), merges .gitignore and refuses differing-file or
symlink overwrites. It makes no git changes, installs no packages and changes no
system settings. Rerunning identical files is safe. I/O failures can still leave a
partial copy; inspect the error and rerun only after resolving it.

For manual copying, include hidden dot-directories such as .agents and merge
.gitignore instead of replacing existing contents. Never replace existing specs,
AGENTS.md or customized role files indiscriminately.

### 5. Create the PRIVATE GitHub repository
Skip creation if it already exists. On GitHub: + → New repository → md-reader →
Private. Leave README/.gitignore/license initialization unchecked. Create the repo
and copy its remote URL. These are user-run actions, not actions taken by this kit.

Review files and secrets before committing:

```bash
git status --short
git add .
git diff --cached --stat
git diff --cached
```

After inspection, create the commit and connect the exact new remote:

```bash
git commit -m "Initialize macOS-first spec-driven Markdown project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/md-reader.git
git push -u origin main
```

Replace the remote placeholder. Never put tokens in URLs/files. Inspect existing
remotes rather than replacing them. GitHub visibility stays private [G1].

### 6. Start Codex and verify roles
From the repository root, run `codex`. Inside its CHAT input, type `$md-` and
`$speckit-`, or use `/skills`. Verify actual visibility, not merely files on disk.
The local skills are under `.agents/skills`; restart Codex if needed [O1]. Paste
prompts/00-verify-setup.md. Then follow the individual prompts below.

For a host without automatic skill discovery, explicitly ask:

```text
Read AGENTS.md and .agents/skills/md-ux-designer/SKILL.md.
Apply them to the active feature design. Do not implement or assume approval.
```

This applies role instructions; it does not register a new independent agent.

## Run one phase at a time
Paste **the contents** of the prompt file, not its filename, into the coding chat.
Prompts beginning with `$speckit-...` are agent inputs, not Terminal commands.
The dollar sign would have a different meaning in your shell.

| Stage | Prompt | Review/stop condition |
|---|---|---|
| Verify local setup | 00-verify-setup.md | Correct repo, installed version, visible roles/process skills |
| Create project rules once | 01-constitution.md | User reviews/approves project principles |
| Specify one feature | 02-specify-first-feature.md | Draft spec and requirements-quality review |
| Clarify only where necessary | 03-clarify-feature.md | User approves concrete behavior/proposed defaults |
| Produce visual design | 04-design-feature.md | User sees and approves actual visual proposal |
| Plan implementation | 05-plan-feature.md | User approves architecture and validation strategy |
| Break down work | 06-generate-tasks.md | Small ordered tasks with acceptance coverage |
| Check consistency/security | 07-preimplementation-review.md | Fix blocking gaps before coding |
| Implement one batch | 08-implement-one-batch.md | Run tests and update evidence/handoff |
| Review that batch | 09-verify-batch.md | Separate session; evidence-backed findings |
| Check feature completeness | 10-converge-feature.md | All batches finished; gaps become scoped tasks |
| Start next feature | 12-next-feature-template.md | Repeat feature cycle without recreating project rules |
| Deliver macOS release | 11-release-macos.md | All v1 slices verified; publication still separate |

Requirements checklists check the **quality of the spec**, not whether the code
works. Spec Kit analysis checks artifact consistency. Convergence checks code vs
artifacts and identifies gaps; it still does not replace actual runtime evidence.

Approve the concrete artifact versions in the chat. The agent records the approval
in docs/approvals.md with paths and hashes/commit identifiers. Do not approve
unseen visuals or an architecture solely because a task list was generated.

Use a fresh chat for each major phase and for QA. Read the small .agents/state.md
handoff and relevant files instead of pasting the entire previous chat. Keep review
findings precise: requirement, expected behavior, actual behavior, repro and evidence.
After a defect, use one scoped engineering batch and retest; avoid endless role
conversation simulations.

## Before building the actual app
After architecture approval, the engineering role verifies Node LTS, npm and
Rust/rustup, along with the existing Xcode Command Line Tools [T1]. Inspect first:

```bash
node --version
npm --version
rustc --version
cargo --version
rustup show active-toolchain
xcode-select -p
```

Missing tool installation is a separate user-run setup action. Use an existing Node
version manager or the official Node LTS installer. Rust’s official rustup method:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
. "$HOME/.cargo/env"
```

Review the installer, choose the native toolchain, and verify versions. Do not
replace existing working tools blindly. There is no need to install an entire
application stack to draft and approve specs. This starter contains no app code,
package.json, Tauri config or build artifacts yet.

After scaffolding creates the actual package.json `tauri` script, commands such as
`npm run tauri dev` and `npm run tauri build -- --bundles dmg` become usable. They
are not runnable from this starter alone. The developer must record the real
commands, dependency versions, chosen architecture and output paths [T3, T4].

## macOS signing and evidence
For personal local builds, propose ad-hoc signing where needed. It is not Apple
notarization and does not promise warning-free installation after a browser download.
Developer ID/notarized distribution remains a separate, potentially paid and
networked release workflow requiring approval [T5]. Do not bypass Gatekeeper/SIP
or strip quarantine as a substitute for successful distribution verification.

Current Tauri docs include a macOS-capable embedded WebdriverIO service. Evaluate
that route; direct upstream tauri-driver alone has different platform support [T6].
Keep any embedded test driver/listener out of the production app. Browser-only
checks or mocked native calls do not prove actual filesystem/desktop behavior.

Missing scope/design/architecture approval blocks production implementation.
Missing native Mac evidence remains NOT TESTED. Missing runtime permission is an
actual blocker, not permission to bypass the tool. A finished feature/release needs
its requirement-to-test matrix and real behavior evidence, including packaged macOS use.

## Sources and validation
See docs/references.md for the primary documentation behind version-sensitive
commands. VALIDATION.md in the downloaded package records checks actually run in
the creation environment; no local Mac tests or signing are implied by that record.
