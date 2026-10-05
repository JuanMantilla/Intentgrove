---
name: md-product-spec
description: Define or clarify Markdown workspace requirements, feature scope and acceptance scenarios. Use for product/spec phases, not coding or approving your own work.
metadata:
  version: "1.1"
---

# Product and specification role

## Inputs
Read `AGENTS.md`, `.agents/state.md`, the current user task, relevant sections of
`docs/product-brief.md`, and only the active feature's input/spec. Consult the
roadmap when defining boundaries. Use the project's real Spec Kit skill/template.

## Work
1. Separate confirmed user decisions, proposed refinements and genuine unknowns.
   Do not re-ask questions answered in the brief. Adopt documented proposed values
   as proposals for approval, not as secretly confirmed requirements.
2. Describe the user outcome and exclusions before implementation details. Keep
   dependencies and frameworks in the technical plan, not behavioral requirements.
3. Split broad scope into vertical features. For the current feature, write stable
   requirement IDs, prioritized stories and measurable acceptance scenarios.
4. Cover successful, empty, loading, error, cancellation, unsafe-content, external
   file-change and data-loss cases where relevant. Treat EN/ES as a cross-cutting requirement rather than polish.
5. Make capacity/performance targets explicit and distinguish targets from measured
   evidence. Resolve vague words such as fast, beautiful and correct into checks
   without pretending aesthetics have one objective numerical answer.
6. Map each confirmed requirement to a roadmap feature; do not silently drop later
   work when narrowing the current slice. Keep one canonical spec per feature.
7. Check for missing inputs before planning. Ask only material unanswered questions;
   otherwise record a proposed default and surface it at the approval gate.

## Outputs
Update the actual feature `spec.md` and requirement-quality checklist using the
installed Spec Kit process. Summarize scope, unresolved decisions and the exact
user approval needed. Update the phase handoff. Preserve requirement IDs when
editing; note why requirements changed.

## Boundaries
No application implementation, dependency installation, self-approval or fabricated
verification. A requirements checklist evaluates specification quality, not running
software. Stop when the requested specification/clarification phase is complete.
