<!--
Sync Impact Report
- Version: 0.1.0 -> 0.2.0 draft (material expansion of UI guidance).
- Modified principles: IV. Readable and Accessible by Default ->
  IV. Simple, Readable, and Accessible by Default.
- Added sections: none.
- User scope correction (2026-09-28): retire offline-operation and VoiceOver-specific requirements/checks; retain local assets, document security and standard accessibility.
- Removed sections: none.
- Follow-up TODOs: review the draft amendment and its effect on applicable visual designs;
  the prior 0.1.0 approval does not automatically approve this changed text.
-->
# Markdown Workspace Constitution

## Core Principles

### I. Local Desktop Operation
The released macOS application MUST read and edit local documents without an account,
browser tab, hosted backend, telemetry, CDN, runtime download, or AI API.
Required assets MUST be bundled. This keeps private repositories local.

### II. Preserve User Documents
Reading MUST NOT write to opened repositories. Editing MUST be explicit and MUST
preserve supported encoding and line-ending conventions. Dirty buffers, disk
conflicts, save failures, and recovery MUST have specified, tested behavior that
does not silently discard or overwrite user work.

### III. Treat Documents as Untrusted Data
Markdown, metadata, links, images, diagrams, code fences, and repository contents
MUST NOT execute code or grant native authority. File and IPC access MUST be scoped
to explicit user selections and validated at the native boundary. Rendered content
MUST NOT initiate network requests.

### IV. Simple, Readable, and Accessible by Default
The document MUST remain the primary visual focus. The UI MUST present a clear path
to the current reading or editing task and MUST NOT add decoration or controls
without a specified user outcome. Controls that are not needed for the current task
SHOULD remain contextual or collapsible to keep the workspace uncluttered.
Animations SHOULD clarify state changes when useful, stay within 250 ms, and avoid
moving document content or controls more than 8 px. Motion MUST NOT delay input or
be the only way to understand a state change; nonessential motion MUST be removed
when the system's Reduce Motion setting is enabled. Shipped interaction states MUST
support keyboard use and clear feedback; the interface MUST provide English and
Spanish. Typography and controls MUST remain usable at supported window sizes and
display scaling. IDE-style features require a specified user outcome. These rules
keep attention on the document while making interactions understandable and calm.

### V. Traceable, Evidence-Based Delivery
Each feature MUST have approved behavior, applicable visual design, and architecture
before production implementation. Requirement IDs MUST connect acceptance scenarios,
tasks, tests, and recorded results. A build, checked task, generated report, or
agent assertion MUST NOT be reported as verified macOS behavior without execution
evidence on the stated platform.

## Delivery Constraints

macOS is the first release target. Windows and Ubuntu remain deferred until separately
specified and verified. Implement bounded vertical features; avoid speculative
platform work. Pin chosen dependencies with lockfiles, retain required notices,
protect secrets, and keep user documents out of source control and test artifacts.
No production runtime may depend on developer-installed Node, Rust, Python, or Spec Kit.

## Workflow and Evidence

Use the installed Spec Kit feature directory as the canonical spec, design, plan,
tasks, and evidence home. Record test command, result, fixture, OS, architecture,
and limitations; mark unrun checks NOT TESTED. Use disposable fixtures for file tests.
Approved local implementation and repair may proceed autonomously. Obtain separate
authorization for destructive work outside fixtures, overwriting user work,
security-setting changes, commits or pushes, publication, spending, and system-wide
tool installation. Never bypass sandbox or operating-system controls.

## Governance

The user approves this constitution and any material amendment. Propose changes
with affected principle, rationale, migration impact, and updated artifacts; record
the user's actual approval in `docs/approvals.md`. Use semantic versions: major for
incompatible rule changes, minor for new or materially expanded rules, and patch
for clarifications. Review every feature plan and verification record against the
current approved principles. `AGENTS.md` supplies operational guidance; it cannot
waive these rules or higher-priority runtime instructions.

**Version**: 0.2.0 | **Ratified**: 2026-09-25 | **Last Amended**: 2026-09-28
**Amendment Status**: The unrelated 0.2.0 UI amendment remains pending. The user-authorized 2026-09-28 scope removal applies to Principle I and acceptance checks; it does not approve the remaining draft. See `docs/requirement-retirement-2026-09-28.md`.
