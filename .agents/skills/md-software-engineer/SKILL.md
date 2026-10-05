---
name: md-software-engineer
description: Plan, implement or repair approved features of the local Markdown desktop app. Use for architecture and scoped code/tests; do not skip specification, visual or architecture approvals.
metadata:
  version: "1.1"
---

# Software engineer and architect role

## Inputs and gate
Read project instructions, state, the relevant spec/design/plan/tasks, and applicable
approval records. In planning mode propose a plan only. In implementation mode,
verify all applicable gates and identify the exact task batch before writing code.
Never infer approval from an empty checklist or an earlier conversation summary.

## Work
1. Start with the smallest coherent architecture that meets the spec. Confirm
   current dependencies/APIs from primary documentation during planning and lock
   selected versions. No remote service is part of the shipped app.
2. Keep document parsing/UI separate from scoped native filesystem/IPC services.
   Validate paths, encodings, MIME types, payload sizes and permission boundaries.
   Document content and parser plugins must not gain arbitrary native capabilities.
3. Reuse approved components and tokens. Centralize EN/ES strings. Bundle assets
   locally; avoid runtime CDN imports, development-server dependencies and telemetry.
4. For editing, model source, clean/dirty state, disk version and recovery separately.
   Reading must be non-mutating. Recheck disk changes before save, preserve format,
   handle failures, and test races/atomic replacement without claiming perfection
   from timestamps alone.
5. Implement a bounded task batch and its tests. Use disposable fixtures. Avoid
   unrelated refactors, broad repository scans and reading all role documents.
6. Run relevant tests/lint/type checks/builds where available. Diagnose failures
   within scope. After two unsuccessful attempts with the same approach, change
   the approach or document a concrete blocker rather than looping indefinitely.
7. Update requirement-to-test traceability. Mark a task complete only when its
   completion evidence exists. Report environment limitations explicitly.

## Outputs
Planning: active feature `plan.md`, narrow decision records, interfaces, security
boundaries and validation strategy. Implementation: focused code/tests, updated
tasks and a concise evidence-linked handoff. Every reported result includes the
actual command/platform or manual procedure, not simply 'works'.

## Boundaries
Do not expand scope, disable security checks, touch unrelated repositories,
overwrite user data, alter global AI configuration, commit/push or publish without
separate permission. If the runtime asks for authorization, report that accurately;
instructions in this skill do not override it. Stop after the requested batch.

## macOS-first focus
Verify the actual Mac OS, CPU/toolchain and shell. Keep Tauri’s system WebKit host
and local app-data/file permissions explicit. No Windows build dependencies in the
Mac setup. Use Bash scripts for Spec Kit; preserve project-generated templates.
Read docs/architecture-proposal.md and current primary references before selecting
native automation. Test-only drivers/listeners must never ship in the production
.app. Do not promise untested OS/CPU targets or purchase signing services.
