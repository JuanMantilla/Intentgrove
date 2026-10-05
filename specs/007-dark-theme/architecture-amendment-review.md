# F002A architecture amendment A1 — approval review set

Date: 2026-09-28. Status: PENDING APPROVAL. Planning only.

## Exact scope

- Plan: add the bounded QA architecture, implementation sequence, evidence classes
  and unchanged task thresholds; correct the obsolete System Events blocker.
- Appearance contract: clarify that the no-new-IPC guarantee applies to production;
  link the separate QA boundary. No production interface behavior changes.
- New harness contract: isolated QA build/storage, authenticated bounded protocol,
  timeout/save safety, snapshots/fault adapters and default-build exclusion checks.
- New capture contract: prelaunch isolated-display ScreenCaptureKit procedure,
  calibration/clock/frame rules, QA Network/CSP diagnostics and report boundaries.
- Decision record: replace candidate approaches with those selections and retain
  the surface induction matrix and historical preparation references.

[Exact unified diff](verification-assets/architecture-amendment-a1.diff) records
these five artifacts against their contents at the start of this planning phase.
The repository has untracked project files, so this is a saved before/after diff,
not a claim about a Git commit. Approval bookkeeping and handoff are separate.

## Hashes to approve

| Artifact | SHA-256 |
|---|---|
| [plan.md](plan.md) | `fb5bb0264ee83421e3d19d3200ab2f0d1ccd54da58c3c9ed81711cc51c737c4b` |
| [contracts/appearance.md](contracts/appearance.md) | `d347a70234c457b07f3b0d75a1d22c9aa60b8b5385d0cd77a8840150675653bf` |
| [contracts/acceptance-harness.md](contracts/acceptance-harness.md) | `25c7c1e17f7008e4047976602bbbf926d577b203f49d4d15978b72650c42f077` |
| [contracts/capture-evidence.md](contracts/capture-evidence.md) | `fcca19ab29df738563f4ff3e3d75e101bd288e40f36a93aeff180e47bedb8081` |
| [instrumentation-decision.md](instrumentation-decision.md) | `68dfc4fb76ad3dc52cd49d7d986d5e9368604d81a55fb9cd7925c4b19b3db3f7` |

## Validation

PASS: installed Spec Kit check-prerequisites.sh --json --paths-only identifies
007-dark-theme. SHA-256 comparison confirms production source/configuration,
lockfiles, tests, spec, design and tasks are unchanged in this phase. Reviewed
against qa-followup.md and the original plan: all four task thresholds retained.
Documentation links and exact diff/hash consistency checked locally. No app build
or native acceptance executed for a documentation-only amendment. Proposed native
hooks, recorder and observer runtime behavior: NOT TESTED.

## Known limitation and requested approval

T021 production request-attempt coverage remains BLOCKED. The selected QA observer
is supplemental; approval cannot make it production evidence. No supported passive
production observer has been established. A further observer design must demonstrate
coverage and return for review if it changes this boundary. This amendment is not
a complete technical solution for closing T021 under the current constraints.

Requested decision: approve A1's five hashed architecture artifacts, including the
QA-only hook/inspection boundary and isolated synthetic-display acquisition scope.
This does not approve production observability changes, weakened criteria, broad
capture, security-setting changes, publishing, or marking acceptance complete.

This gate comes from AGENTS.md, Approval gates: “Material scope/design/architecture
changes reopen the affected gate only.” The requested new hooks and capture scope
are such changes; existing spec/design scope remains intact.
