# QA cleanup operations and reference

For explicitly isolated tests, follow [the testing reference](qa-cleanup-testing.md). It adds no production completion/deletion authority. Doctor now separates parser/configuration acceptance from sandbox probes and unexecuted live checks. Both read-only passes enforce explicit approval_policy="never", approvals_reviewer="user", and disabled guardian_approval through the shared supported argument builder.

Detailed reference for operating the cleanup integration. QA follows the shorter `qa-cleanup-integration.md` contract; consult this reference when configuring, troubleshooting or operating the worker. Preserve the QA skill's existing verdict/report/evidence contract. This integration adds no acceptance or release authority. A passing QA run alone is not task completion. The user's setup-only request does not authorize cleaning real artifacts.

## Establish the tested snapshot before running QA

Use local specification, task, approval and QA evidence by default. Read the target's applicable instructions and completion/approval requirements. Record those exact requirements and their sources. If an authority, required check or external completion state is unavailable or unclear, use BLOCKED or AWAITING_ACCEPTANCE. Never infer acceptance from chat text, elapsed time, an unchecked task list or a completed subtask.

Create a JSON array of exact tested code, configuration and input paths relative to the canonical worktree root. Include all files relevant to the tested scope, including modified/untracked implementation files. Capture the baseline before checks; if the scope/code changes, capture a new baseline and rerun affected checks. A scoped snapshot explicitly does not certify every file in a repository. Record the scope limitations in the final report.

```sh
python3 -B "/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py" snapshot --root "/absolute/task/worktree" --paths "/absolute/task/worktree/qa/runs/RUN/tested-paths.json" --out "/absolute/task/worktree/qa/runs/RUN/tested-snapshot.json"
```

The helper hashes bytes and filesystem identity locally, captures HEAD and repository/common-Git-dir/worktree identity, and rejects symlinks, hardlinks, unreadable or unsupported inputs. Non-Git workspace identity uses canonical root/device/inode. Exact worktree roots inside this workspace are required.

## Finalize and record

Finalize the report, coverage ledger, evidence index and actual evidence first. Preserve final QA evidence, authoritative reports, accepted designs and materials required to reproduce results. List task-related artifacts explicitly; discovery is limited to those exact paths. Do not put all repository files in this list. Reference checks may search more broadly.

Prepare completion.json following `qa-completion.example.json`. Replace every placeholder with an observation. The helper validates check outcomes and evidence existence/hashes; it cannot establish whether a human statement is truthful or grant authority. QA must trace the complete set of existing requirements to the instruction/specification sources and authentic acceptance evidence. Required checks need actual results, reasons, evidence paths and timezone-aware finish times after the baseline. NOT_APPLICABLE requires an existing authorized waiver with evidence. Missing/malformed data is rejected, never supplied by the helper.

- `qa_result`: QA_FAILED, QA_BLOCKED or QA_PASSED.
- `task_state`: ACTIVE, BLOCKED, AWAITING_ACCEPTANCE or DONE_ACCEPTED.
- DONE_ACCEPTED requires passing/authorized-waived required checks, zero blockers and all existing completion/approval requirements satisfied by the actual authorized party. If none were explicit, record the existing governing task's completion criteria and evidence; do not invent a new approver. QA may attest test facts within its role, but cannot approve releases.
- Use a fresh unique acceptance_version for each new acceptance, correction, superseding state or revocation. Repeating the identical latest record is idempotent; reusing a version with changed facts or replaying an older version is rejected.
- Record repository/worktree identity through the helper, task ID, exact tested snapshot, final report and evidence, retention paths, artifact paths, requirements sources, requirements and their evidence.

**Exact standalone completion command that QA must call:**

```sh
python3 -B "/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/qa_completion.py" --root "/absolute/task/worktree" --input "/absolute/task/worktree/qa/runs/RUN/completion.json"
```

Use this command without `cd`, chained commands, environment assignments, pipes, redirects, wrappers or shell expansions. Absolute root and input paths are required. Call through a shell tool observed as canonical `Bash`, including exec_command. The successful helper durably saves the record, emits a unique `QA_COMPLETION_RECEIPT=...` line and exits zero. Failure emits no receipt and exits nonzero. Failed/blocked/awaiting records remain auditable and revoke older acceptance but never enqueue cleanup. Changing code/evidence/policy after acceptance requires new validation and a new acceptance version.

## Hook and trust

Project `.codex/hooks.json` adds only synchronous PostToolUse, matcher `^Bash$`:

```sh
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/post_tool_use.py'
```

The hook reads JSON stdin: `hook_event_name`, `tool_name`, `tool_input.command`, `tool_response`, `tool_use_id`, `session_id`. Codex 0.162.1 sends raw unified-exec stdout without exit metadata. For this format the handler requires a matching completed CommandExecution in the selected home's session store, with explicit integer exit zero, identical tool/session identity, exact `/bin/zsh -lc` command and exact output. The event's transcript_path never chooses a file. Missing/not-yet-flushed host records fail closed; retry the same helper through a real trusted tool call. Structured completed exec output and completed Bash text with explicit exit zero remain supported. Receipts are matched against committed completion/hash/nonce, exact input, current acceptance, repository, snapshot, evidence and policy. Queue persistence precedes ENQUEUED; existing requests in any state are retained as DUPLICATE. Hook stdout and fixed-state hook-outcomes report ENQUEUED, DUPLICATE, SKIPPED, REJECTED or ERROR with reasons and correlation. Hook exit zero alone is not enqueue success. Truncated, failed, running, unrelated and cleanup events never queue.

The hook only validates and writes the queue. It calls no models, removes nothing and starts no worker or detached process. Existing hooks remain intact. In Codex, review/trust the project layer and the exact new hook via `/hooks`; changes require renewed trust. Never use `--dangerously-bypass-hook-trust`. This workspace's layer currently is not in the inspected trusted-project list. Live trusted hook payload verification remains pending; fixture payloads are not a live hook test.

## Foreground worker and approval

```sh
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' doctor
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' test
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' status
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' watch --review-only
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' apply --run RUN_ID --dry-run
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' apply --run RUN_ID --confirm RUN_ID
python3 -B '/Users/juanmantilla/projects/personal/.agents/skills/cleanup-completed-files/scripts/cleanup.py' restore --run RUN_ID
```

Do not launch watch during setup. It runs in the foreground; no service is installed. One worker/executor lock protects sequential jobs, with durable QUEUED/RUNNING/RETRY/FAILED/READY_FOR_APPROVAL state and bounded attempts. Idle polling invokes no model. SIGINT/SIGTERM terminates the current process group, preserves outputs and marks retry. A hard crash leaves RUNNING; restart uses a new attempt/output directory. If a durable discovery checkpoint still matches acceptance, policy, skill/runner hashes and every scoped artifact snapshot, reuse its manifest and perform a new independent review. Changed or tampered inputs force discovery again. No review result or conversation is reused. Every attempted run is retained; failed attempts cannot apply without a ready seal.

For each accepted task, discovery uses the existing cleanup skill in discovery mode and saves candidates.json, candidates.md and handoff.md. A separate new Codex exec performs read-only independent review and saves review.json and proposed-deletions.md. No resume, fork, conversation history, session ID or discovery event stream goes to pass 2. The full cleanup skill, semantic policy, manifest judgments and task/QA evidence go to the reviewer. Installation pins and machine identity metadata stay in runner-owned records; the runner attaches original snapshots and identities to validated compact model output. Generic report-format and deletion-operation references are not injected into read-only model prompts; the strict schema and integration contract define reporting, and only the executor performs filesystem operations. The runner validates strict output schemas, exact paths/IDs/coverage and original locally captured snapshots, and seals manifest/review/policy hashes. The review-only worker stops at READY_FOR_APPROVAL. The separately configured launchd worker can use explicit standing policy authorization through the same guarded executor; see /Users/juanmantilla/projects/personal/.agents/qa-cleanup-automatic.md. Automatic execution defaults to disabled.

Both subprocesses use a fresh private shell HOME and a dedicated private authentication CODEX_HOME, outside-project cwd, ignore user config/rules, no daemon, read-only sandbox, approvals never, disabled hooks/plugins/apps/browser/computer-use/multi-agent/memories/skill dependency installation and no host skill discovery. No normal global config is changed. There is no custom outer sandbox-exec wrapper on model children. Native Codex read-only sandboxing is requested; the parent captures stdout and saves artifacts. Requested network restrictions and disabled integrations must be distinguished from observed enforcement. Managed config/preferences or unsupported CLI/platform/isolation probes cause refusal before a model call. The installed version is pinned until formats and isolation are revalidated. No Linux/Windows fallback silently weakens isolation.

`.agents/cleanup-state/` stores completion records, latest acceptance pointers, requests, attempts, immutable candidate/review artifacts, seals, approval records, receipts and recovery copies. This area is outside the AI subprocess's writable allowlist. It is protected permanently. It is not a security boundary against the ordinary trusted user or a concurrently running write-capable agent; quiesce the worktree before apply. No path/hash checks eliminate malicious concurrent filesystem races.

## Removal and recovery

Default allowed_cleanup_roots is empty: discovery works, removal is denied. Preserve any existing safe roots; only deliberately allow narrow disposable artifact folders after review. The policy is data controlled by the user, never model/file/MCP content. Policy changes invalidate old runs. No cleanup infrastructure, code, scripts, config, dependencies, runtime assets, fixtures, active work, current docs, accepted designs, final QA evidence, audit/recovery or staged/modified files may be removed. Untracked alone never proves disposability.

Manual apply requires the exact sealed manifest/review and explicit matching run confirmation. Automatic execution instead requires an enabled standing policy, exact task root, policy timestamp, independent successful sessions and unchanged sealed implementation/session evidence; it writes automatic-authorization.json, never a fabricated approval.json. Every row receives a reason/outcome (kept, changed, already_absent, failed, not_attempted or deleted). Before each removal and again immediately before unlink, recheck acceptance, repository, tested snapshot, evidence, policy, scope, protected paths, Git status, file identity and hashes. Replacements must be retained/frozen and outside the deletion set. Unknown purpose, unreadable content, missing completion/obsolescence evidence or uncertain references means keep. Reject traversal, symlinks, hardlinks, directories, nested repos and special files. The reused file_guard creates and verifies a recovery copy and a durable receipt before exact unlink; its optional final callback adds acceptance revalidation without changing existing commands. No wildcards, broad cleaning or recovery purging. Standing policy permits only eligible exact files after independent review and deterministic guards.

Restore uses only verified recovery receipts for the original repository, creates the exact destination exclusively and verifies bytes. Existing paths are never overwritten. Keep recovery copies indefinitely; no automatic expiry. A partial failed restore preserves its created path and reports failure rather than overwriting it on retry.

## Optional GitLab completion evidence

Normal gitlab-ormuco launcher uses modify mode and read-only=false. Never inherit or invoke it for cleanup. Inspected gitlab-mcp 1.6.1 ToolPolicyEngine rejects write/delete/admin capabilities on listing and each invocation. Optional project adapter pins the installed JS implementation and only allows verified dedicated read tools: gitlab_get_issue, gitlab_list_issues, gitlab_list_issue_discussions, gitlab_get_work_item, gitlab_list_work_items and gitlab_get_file_contents. No mixed-action tool is enabled. Set gitlab_evidence=true only after the pending isolated server/tool tests. Supply GITLAB_PERSONAL_ACCESS_TOKEN to the worker process if needed; it is never written into arguments/audit/config and is not inherited by model shell tools. The adapter forces readonly=true, permission_mode=readonly, disabled write/delete/admin capabilities, and the exact server-side allowlist. It does not change the global launcher/configuration or perform remote writes. Without access, use authentic retained local exports; if required external evidence is unavailable or stale, retain files.

## Pending integration tests

1. Setup is installed and unit/isolation-probe checks passed. Inspect the merged instructions/hook, then explicitly trust the project and hook through Codex.
2. Capture actual trusted CLI and desktop PostToolUse events using disposable completion fixtures. Confirm raw/structured responses, failure/yield rejection and deduplication. No ordinary Stop trigger.
3. Run both real isolated Codex passes against disposable artifacts. Verify supported config, schema/final-response events, no inherited hooks/plugins/MCP/browser tools, and denied project/audit writes and shell network access. Do not grant wider permissions if any isolation test fails.
4. Verify MDM/cloud/requirements inheritance and the installed version's effective tools. Doctor only inspects known local managed sources; real effective-tool inspection is required before deployment in a managed environment.
5. Test optional GitLab adapter's tools/list and rejected write/mixed-action calls without performing remote writes. Missing credentials must preserve evidence-dependent candidates.
6. Exercise interruption/restart/approval/recovery end to end with disposable files. Unit tests do not constitute live model or hook testing.

Sources: installed `codex --version`, `codex exec --help`, `codex features list`; [official hook format/trust documentation](https://learn.chatgpt.com/docs/hooks); inspected project/user skills and local gitlab-mcp policy/tool implementation. Global skill/configuration and application code remain unchanged.

## Token efficiency and usage evidence

Both passes preserve the full cleanup skill and independent evidence inspection. The runner removes installation fingerprints and duplicate file metadata from model input, attaches canonical identity fields to compact outputs, and revalidates complete records before approval/removal. No model/reasoning downgrade, evidence truncation or automatic approval is used. Duplicate hook deliveries validate successfully without repeating model-visible queue messages.

Each model invocation saves `<pass>-usage.json`: prompt/schema character counts, raw CLI `turn.completed.usage` values and totals for input, cached input, cache-write input, output and reasoning-output tokens when reported. Missing usage remains null/unknown. Interrupted invocations preserve available event/usage data. Token subcategories must not be added to their parent totals. These are observed CLI counts, not tokenizer estimates or proof of reduced reasoning/tool tokens. Live model measurements remain pending.
