# Approved frontend handoff addendum

Implementation authorization recorded 2026-10-03. The user requested **Mode: IMPLEMENT** and said:

> I approve implementation of the selected design and scope recorded in frontend-implementation/plan.md.

This approves the selected “Clear context, quiet workspace” direction, UX-01–UX-10 and the accepted frontend-only adaptations at [the implementation plan](../../frontend-implementation/plan.md), whose SHA-256 before the implementation status update was `447e04078a47d6200c11469ee1eae5e3aeaaa71512dc8b7c8531e30e3ce4bbdb`.

This is an additive accepted behavior/design/implementation delta to the existing canonical features below. Their existing specifications and architectures continue to govern document integrity, grants, native operations and resource bounds. Their historical review hashes remain historical; this addendum does not claim the redesign was covered by them or alter the Spec Kit active feature (the installed read-only query still resolves F006).

| Canonical feature | Accepted frontend delta / acceptance |
|---|---|
| [Workspace reader](../specs/001-workspace-reader/spec.md) | UX-01/05/08/10: readable collision-aware tabs, full-identity open-document list in tab order, independent current-file marker, filename/full-path context, explicit scoped explorer reveal, accessible toolbar grouping and content-driven overflow. Ordinary tab switching does not expand/scroll the tree. |
| [Section editing and recovery](../specs/002-section-editing-recovery/spec.md) | UX-02/06: persistent heading edit entry uses existing native section boundaries; separate dirty-source/recovery acknowledgement; explicit ordinary discard confirmation; preserve source-save return to reading, focus and existing loss/conflict guards. Source is temporarily read-only during submitted source save so the removed native session cannot lose a newly typed revision. Failure retains input. |
| [Session restoration](../specs/004-restore-workspace-session/spec.md) | UX-03/09: management disclosure wraps existing cleanup commands; session deletion still removes recovery and closes workspace; draft deletion still ends active edits. Confirm exact scope, preserve preferences and numeric reading width. No persistence migration. |
| [Dark theme](../specs/007-dark-theme/spec.md) | UX-04: reuse current light/dark/system roles, readable utility text, visible focus/current-state distinction, existing Reduce Motion. Retain native chrome and bundled fonts. |
| [Rich reading](../specs/008-rich-reading/spec.md) | UX-06/09: preserve headings/Find/outline and original document language; apply saved width to prose independently of wide code/tables/images; numeric width with Comfortable/Wide shortcuts, no reset of existing choices. |
| [Folder search](../specs/009-folder-search/spec.md) | UX-07: bordered named entry to existing search panel; real names/content/both scope, query focus/retention, clear/back/Escape and actual result counts. Preserve streamed/cancel/stale-job behavior. |
| [Recent items](../specs/010-recent-items/spec.md) | UX-03: management row continues to clear references using the existing confirmation/command, without changing current files or other categories. |
| [Local image viewing](../specs/006-view-local-images/spec.md) | UX-05/08/10: shared identity and wrapping controls; retain actual image pixels, metadata, Fit/Actual Size/zoom/scrolling and native decoder/XPC boundary. Explain unavailable Markdown outline. |

Deferred: full Save As destination disclosure and individual unresolved-backup inspection. Existing Save As remains a copy and leaves original dirty; use confirmed filename and native picker outcome, never an inferred path. Backup inventory/counts are real but not a record-review capability. No native contract, permissions, dependency, platform, backend or deployment changes.

The user's current offline/privacy instruction applies: keep bundled local assets and no-fetch/content restrictions. Preserve source bytes/encoding/line endings, user edits and explorer/tabs/content. Frontend regression, real renderer evidence and real native integration must be reported separately in [report.md](../../frontend-implementation/report.md). Approval of implementation is not user acceptance of its result.
