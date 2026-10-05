# Approval record

Confirmed source: the user's numbered answers establish the product requirements
and approval boundary recorded in `docs/product-brief.md`. They do not approve a
formal feature specification, visual mockup or technical plan that did not yet exist.

| Gate | Artifact | Status | Approval evidence |
|---|---|---|---|
| Product requirements | product-brief.md: confirmed section | CONFIRMED INPUT | User's numbered answers in this conversation |
| Proposed refinements | product-brief.md: proposed section | PENDING | None |
| Project principles | .specify/memory/constitution.md | APPROVED | User reply on 2026-09-25; hashes below |
| F001 specification | specs/001-workspace-reader/spec.md | APPROVED | User reply on 2026-09-25; hash below |
| Applicable visual design | specs/001-workspace-reader/design.md + design/window.svg | APPROVED | User reply on 2026-09-25; hashes below |
| Architecture | specs/001-workspace-reader/plan.md + relevant decisions | APPROVED | User reply on 2026-09-25; hash below |
| F003D specification | specs/005-external-change-refresh/spec.md | APPROVED | User reply on 2026-09-26; hash below |
| F003D visual design | specs/005-external-change-refresh/design.md + design/refresh-states.svg | APPROVED | User reply on 2026-09-26; hashes below |
| F003D architecture | specs/005-external-change-refresh/plan.md | APPROVED | User reply on 2026-09-26; hash below |
| F004 specification | specs/002-section-editing-recovery/spec.md | APPROVED | User reply on 2026-09-26; hash below |
| F004 visual design | specs/002-section-editing-recovery/design.md + design/section-editing-states.svg | APPROVED | User reply on 2026-09-26; hashes below |
| F004 architecture | specs/002-section-editing-recovery/plan.md | APPROVED | User reply on 2026-09-26; hash below |
| F002A dark-theme specification | specs/007-dark-theme/spec.md | APPROVED | User reply on 2026-09-28; hashes below |
| F002A dark-theme visual design | specs/007-dark-theme/design.md + design/theme-states.svg | APPROVED | User reply on 2026-09-28; hashes below |
| F002A dark-theme architecture | specs/007-dark-theme/plan.md | APPROVED | User reply on 2026-09-28; hashes below |
| Publishing | release artifacts/destination | NOT AUTHORIZED | Separate approval required |
| F003C/F003S/F006 review sets | [exact artifacts and hashes](continuity-search-image-review-2026-09-29.md) | APPROVED | User reply on 2026-09-29; exact statement below |
| F004 recovery amendment | [exact revised artifacts and hashes](../specs/002-section-editing-recovery/recovery-amendment-review-2026-09-29.md) | APPROVED | User reply on 2026-09-29; original baseline approval remains historical |
| F002R/F003F/F003R/F003L/F005 review sets | [exact artifacts and hashes](remaining-roadmap-review-2026-09-29.md) | APPROVED | User reply on 2026-09-29; exact statement below |
| Subtle shell motion addendum | [motion proposal](animation-opportunities.md) | APPROVED | User reply “please add them” on 2026-09-29; exact hash below |
| F006 toolchain correction | [exact amendment](../specs/006-view-local-images/toolchain-amendment-review-2026-09-29.md) | APPROVED | User selected “Approve Rust 1.88 correction” on 2026-09-29; hashes below |

## Approved review set — 2026-09-25

User reply to the review question: “Approve all four drafts and implement F001”.
The spec and plan were restored to the exact hashes presented before approval.
Any material edit requires a new hash and review of the affected gate.

| Gate | Artifact | SHA-256 | Status |
|---|---|---|---|
| Principles | `.specify/memory/constitution.md` | approved draft `9cf5464492805ab84193a3005ccb89e8840b91948f7693e56ac53f60035bc45d`; ratified metadata `c0b292acf66f4a85563b22acbcb7a16fb58a6770227ac8ed8a1a41aa2fd74949` | APPROVED |
| F001 behavior | `specs/001-workspace-reader/spec.md` | `2728704ca8056e825e70b465dfd7aeb04bfecde49a4e91b5257b40ec0efe2cc9` | APPROVED |
| F001 visual | `specs/001-workspace-reader/design.md` and `design/window.svg` | `928df9d54629e11a425fb8d728eda8092c441e6b85ec7a9ea9a50f6c546cdd87`, `5cb1dd4cdcd91ddcef28189afaed5b4602a868e2505f6f813ea852f4d86a31c9` | APPROVED |
| F001 architecture | `specs/001-workspace-reader/plan.md` | `759f6e8d0f96f720a7ef3a051de916386719736e7d6eaa0e98681f5307d0a3c9` | APPROVED |

## F003D approved review set — 2026-09-26

User reply after the current artifacts were linked for review: “I approve the F003D spec, design and visual skecth and architecture plan at their current versions. Proceed with implementatino”. This approves F003D behavior, visual direction, and architecture at the hashes below. It does not approve F004 editing, constitution 0.2.0, tool installation, publishing, or unrelated features.

| Gate | Artifact | SHA-256 | Status |
|---|---|---|---|
| F003D behavior | `specs/005-external-change-refresh/spec.md` | `98541b888cba50c6143fc5745e2210a0c50fe2ecc222401438bf8359f978a597` | APPROVED |
| F003D visual | `specs/005-external-change-refresh/design.md` | `0fce348517b1dabb972a7fa43ffc5af409b6577bd18340bade680b0800ac61a2` | APPROVED |
| F003D visual sketch | `specs/005-external-change-refresh/design/refresh-states.svg` | `a94667c6ea3a0bc65859f026eda25d3409a4e2bb575921d24735aa274b38350c` | APPROVED |
| F003D architecture | `specs/005-external-change-refresh/plan.md` | `73be77c6405d26b9eeb4b926f5567636fc27ffb7b8d06c8188b9351c5341d993` | APPROVED |

## F004 approved review set — 2026-09-26

The user said “I approve F004 design and sketch, continue with the implementation” and, when asked about the remaining gates, answered “Yes, approve both current versions” for the F004 specification and architecture plan. Approval applies to the exact artifacts and hashes below; it does not approve F003C, publishing, or any later material revision.

| Gate | Artifact | SHA-256 | Status |
|---|---|---|---|
| F004 behavior | `specs/002-section-editing-recovery/spec.md` | `eda26077fc5c5ce5a8cc1e25d9de49ec3f06aab2c01da93bf08c868e3dbb04d4` | APPROVED |
| F004 visual | `specs/002-section-editing-recovery/design.md` | `bfc144a08193b739c629b350b9a640489cfc0f0ace9006f38babacd218a67189` | APPROVED |
| F004 sketch | `specs/002-section-editing-recovery/design/section-editing-states.svg` | `54c93eb73ebb1fe2b144167b93035abc7eb62ddf9ebf65953beee4197429301e` | APPROVED |
| F004 architecture | `specs/002-section-editing-recovery/plan.md` | `ddcfda8d7fd2390af25616caba75e6aef0aeb8e7416f4401ed521c56cb02b02f` | APPROVED |

## Platform-priority change — 2026-09-25
User instruction: “now the priority is mac and I'm using mac to create the app as well”.
Confirmed: macOS is the first release and development host; Windows/Ubuntu deferred.
This supersedes the earlier Windows-first requirement. It does not approve a
framework, new visual mockup, generated spec, minimum OS, Intel/universal support,
certificate purchase, notarization upload or publication. Reopen only affected
approvals in an existing implementation; preserve unchanged approvals/evidence.

## F002A dark-theme approved review set — 2026-09-28

The user answered “Approve all four dark-theme artifacts and implement” to the question naming the F002A specification, design, sketch, and architecture plan at the current versions listed here. Verified content hashes match the review set. Approval covers F002A implementation; other draft features and publishing remain outside this approval.

| Artifact | SHA-256 | Status |
|---|---|---|
| specs/007-dark-theme/spec.md | bf5bd7b5d53e8b3331ef460c551d082ada713f1dbabf6385ba6343a9431c08c3 | APPROVED |
| specs/007-dark-theme/design.md | e95826853b1434c8dd9019b8f74c3f0391e8b89d06f3f106af510acb060e64b9 | APPROVED |
| specs/007-dark-theme/design/theme-states.svg | fc9bba6fc65e61d2538818738f07f595cd7fa0159463561900d4cd64b0686303 | APPROVED |
| specs/007-dark-theme/plan.md | 96343f2cdef09176775c71493199b059d8e7827fff404dd189acf933add39b98 | APPROVED |

## 2026-09-29 approval of all remaining review sets

After receiving the three exact review-set links for F003C/F003S/F006, the F004 recovery amendment, and F002R/F003F/F003R/F003L/F005, the user replied: **“I aprove everything, complete it.”** This is explicit approval of the current specification, visual direction (including sketches), and architecture for all nine feature/amendment sets in the linked review documents above. Immediately before recording it, SHA-256 of all **36** gate artifacts was checked against those documents: **36 matched, 0 mismatches**. The paths and individual hashes in those review documents are the approval record by reference. This approval authorizes scoped implementation, tests and local builds under `AGENTS.md`. It does not authorize commit/push, publication, paid signing/notarization, changing OS security settings, or destructive cleanup of existing user app data.

Material changes after these hashes reopen only the affected gate. Evidence and tasks can change without rewriting the approved behavior/design/architecture.

## Subtle shell motion addendum — 2026-09-29

After receiving `docs/animation-opportunities.md`, the user replied **“please add them”**. This approves the proposal's settings and custom-menu entry/exit, selected-tab feedback, sidebar and outline toggles, and light Find/notice feedback, including its focus, responsive and Reduce Motion boundaries. The proposal's SHA-256 at approval was `5518bcfe43f46f2290032dd219bbb75593d02e768377e719a6a2b51f13a5ac93`. The user explicitly included the sidebar and outline candidates that the proposal recommended reviewing separately. This is a scoped visual interaction addendum to the existing approved shell; it adds no dependency, native interface or document behavior. Packaged macOS appearance remains subject to verification.

## F006 Rust minimum correction — 2026-09-29

After being shown the exact proposal in `specs/006-view-local-images/toolchain-amendment-review-2026-09-29.md`, the user selected **“Approve Rust 1.88 correction”**. Proposal SHA-256: `bbd6ebbd72056b6a10a4c90ad076043db48576161915b77ac031748478a6933a`. The only approved architecture change is replacing F006's stated native minimum Rust 1.85 with 1.88 and updating the manifest/build pins. The revised `specs/006-view-local-images/plan.md` SHA-256 is `b51332d53c2f620c74e47c28aa94a765d242c93e7f31fe5575391d2f4e726c44`. The original F006 plan hash remains historical; the behavior, visual design and decoder isolation gates are unchanged.

## Recording an approval

Record the user's actual approval statement, date, paths, artifact content hashes
or Git commit, and approved scope. An agent may record approval; it cannot grant it.
Do not put fake signatures, assumed consent, or PASS labels in this table.

Example user message after reviewing real artifacts:

> I approve the F001 specification, the visual proposal shown, and the technical
> plan at their current versions. Implement the first task batch only. Do not push
> or publish anything.

Use separate gates if the user approves only one item. Later features need a spec
approval; reuse approved architecture/design where unchanged. Material changes
invalidate only the affected approvals. Tests/checklists are not user approval.

## User-authorized requirements removal — 2026-09-28

The user asked to remove offline and VoiceOver features, then clarified “remove
the requirement/checks” while preserving local-file behavior and standard
accessibility. This supersedes only offline/disconnected-operation requirements
and VoiceOver-specific acceptance in the prior review sets. Original hashes above
remain historical; modified documents must not be described as matching them.

The [scope decision and before/after hashes](requirement-retirement-2026-09-28.md)
record this bounded requirements change. No new runtime architecture or visual
behavior was introduced. Unrelated draft approvals remain pending, and remaining
security, integrity, keyboard, layout and native acceptance checks remain open.

## F002A test architecture amendment A1 — pending, 2026-09-28

User requested a concrete amendment and exact changes for approval, not its
implementation. [Review set and hashes](../specs/007-dark-theme/architecture-amendment-review.md)
identify the revised plan, appearance contract, two new test contracts and decision
record. Status: **PENDING APPROVAL**. Original hashes above remain historical;
the revised plan must not be represented as that approved revision.

Only the QA architecture/capture boundary requires renewed approval. Production
behavior, spec/design and acceptance criteria remain unchanged. Complete T021
production request-attempt evidence remains blocked; approval of supplemental QA
inspection does not waive it. No approval statement has yet been received for A1.

## F002A A1 approved — 2026-09-28

The user said: “Approve A1 and implement the QA harness and startup recorder”.
Approval applies to the five verified artifacts below, including isolated synthetic-display
capture. Implementation batch: QA harness and startup recorder; T021 diagnostics
and production observer closure are not part of this batch. No acceptance completion
is implied. The pending labels in the immutable review artifacts are historical.

| Artifact | SHA-256 | Status |
|---|---|---|
| specs/007-dark-theme/plan.md | `fb5bb0264ee83421e3d19d3200ab2f0d1ccd54da58c3c9ed81711cc51c737c4b` | APPROVED |
| specs/007-dark-theme/contracts/appearance.md | `d347a70234c457b07f3b0d75a1d22c9aa60b8b5385d0cd77a8840150675653bf` | APPROVED |
| specs/007-dark-theme/contracts/acceptance-harness.md | `25c7c1e17f7008e4047976602bbbf926d577b203f49d4d15978b72650c42f077` | APPROVED |
| specs/007-dark-theme/contracts/capture-evidence.md | `fcca19ab29df738563f4ff3e3d75e101bd288e40f36a93aeff180e47bedb8081` | APPROVED |
| specs/007-dark-theme/instrumentation-decision.md | `68dfc4fb76ad3dc52cd49d7d986d5e9368604d81a55fb9cd7925c4b19b3db3f7` | APPROVED |

## Frontend handoff implementation approval — 2026-10-03

User instruction: “Mode: IMPLEMENT. I approve implementation of the selected design and scope recorded in frontend-implementation/plan.md.” Approved plan SHA-256 before its execution-status update: `447e04078a47d6200c11469ee1eae5e3aeaaa71512dc8b7c8531e30e3ce4bbdb`. The user previously approved all recommended options, including frontend-only scope.

The accepted cross-feature delta is [approved-frontend-handoff.md](approved-frontend-handoff.md), SHA-256 `def99344dfdc65193d7a795272a10cb159c5c389ee928af69c4f33d5c8443a93`. It maps the existing canonical features and records preservation/deferred boundaries; no original gate artifacts or Spec Kit state are rewritten. Local frontend edits, focused tests, existing checks and non-publishing builds are authorized. No dependencies, native contract/permission changes, commit/push or deployment are authorized. Runtime verification and user acceptance remain separate.

## Cross-feature design review — partial approval, 2026-10-04

The user stated **“I approve everything except the file navigation”** after reviewing `design-reviews/03-10-27-01/proposals/`. This approves the current recommended non-navigation design/interaction scope: workspace decluttering, contextual menus/shortcuts, direct rich Markdown editing, neutral status, scoped search, Settings and local HTML/CSS viewing with JavaScript off. The latest file-navigation addendum (generalized file-link/access routing, universal Back/Forward/history and File details/default-app launch) remains **NOT APPROVED**, including its controls in mixed workspace mockups. Core existing workspace tab/tree/Open/search routes remain within the approved design scope.

[Exact scope and per-artifact reviewed hashes](../design-reviews/03-10-27-01/proposals/approval-record.md), [structured record](../design-reviews/03-10-27-01/proposals/approval-record.json). Design source documents/SVGs were not changed when recording approval. This is a design-only approval; it neither authorizes application implementation nor supplies approval of new canonical feature specifications/architecture. Historical gates and implementation evidence remain unchanged. Runtime checks remain NOT TESTED for this revision.

## Cross-feature critique revisions — 2026-10-04

The user requested critique and updates to all proposals in `design-reviews/03-10-27-01`. That authorizes this design-artifact revision work; it is not a new approval of the resulting decisions or application implementation. The exact 19 baseline hashes were verified and original files preserved in [the baseline archive](../design-reviews/03-10-27-01/proposals/archive/before-critique-2026-10-04/approval-record.md). The prior non-navigation approval remains historical and navigation remains excluded.

[Critique and material decisions](../design-reviews/03-10-27-01/proposals/critique-and-revisions.md), [current revision hashes](../design-reviews/03-10-27-01/proposals/revision-record.json). Current material changes are **PROPOSED — READY FOR DESIGN REVIEW**: draft-table deletion/Undo, strict lossless original Save, narrow action row/dialog focus, history bounds/empty handling and resource/handler flows. No new approval or canonical specification/architecture change is recorded. Original gates and runtime evidence are preserved.

## Revised cross-feature design approved — option D, 2026-10-04

The user stated **“I like better option D, I approve everything”** after reviewing the revised package and four arrow treatments. This approves the current revised design package, including the previously excluded file-navigation/history/access/File details design, and selects **D — fixed outlined arrows before the scrollable tab lane**. D supersedes header-arrow placement in earlier mixed mockups; A/B/C arrow treatments remain unselected references. The overall scoped horizontal workspace direction is retained.

[Exact user statement, scope and all presented artifact hashes](../design-reviews/03-10-27-01/proposals/approval-option-D.json), [readable approval record](../design-reviews/03-10-27-01/proposals/approval-option-D.md), [selected handoff](../design-reviews/03-10-27-01/proposals/selected-design-handoff.md). Presented versions preserved byte-for-byte in the option-D approval snapshot. Earlier partial approval records remain historical; their navigation exclusion and later pending-design labels are superseded for this design package.

Design approval is not runtime verification and does not approve unseen canonical feature specifications or implementation architecture. This design phase performed no application implementation, build, commit or deployment. Reconcile affected canonical artifacts and architecture before production work; preserve existing grants/security/integrity constraints and outstanding runtime checks.

## All current cross-feature proposals approved — 2026-10-05

User statement: **“I approve everything on /Users/juanmantilla/projects/personal/md-reader/design-reviews/03-10-27-01/proposals, update the corresponding files”**. All current design proposals and critique refinements are approved, including navigation; option D remains selected. Pending design labels and the earlier navigation exclusion are superseded. [Approval and scope](../design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.md), [exact reviewed hashes](../design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.json). Prior records and approval-time snapshots remain preserved. This documentation update does not claim runtime verification or approve unseen canonical specifications/architecture.

## Windows work initiated — 2026-10-05

User instruction: **“$os-senior-expert please start working on a windows version of the md-reader app”**. Authorizes starting Windows assessment and review preparation; Windows is now an active separately scoped project. It does not approve previously unseen native mechanisms, dependencies or installers. [F007W review set](../specs/013-windows-desktop/review.md) proposes Windows 11 x64/local NTFS with the existing interface. Specification, applicable Windows experience delta and architecture remain **PENDING**. Existing macOS approvals and release priority are preserved. No source edits, dependency changes, CI edits, installation or publishing performed in this phase.

## Windows F007W review approved — 2026-10-05

User statement: **“I approve it. Give me a prompt for the os-senior-expert to work on it”**, responding to the linked Windows review package and approval question. Immediately before recording approval, all **7 artifact hashes matched, 0 mismatches**. [Exact approved scope and hashes](../specs/013-windows-desktop/review.json), [readable record](../specs/013-windows-desktop/review.md). Approval covers specification, Windows experience delta, architecture and supporting artifacts; Windows-only direct windows-sys 0.61.2 binding dependency; scoped local implementation/tests/builds and unsigned per-user NSIS package construction after native verification. Gate artifact text is preserved unchanged. No tool installation, installed-app testing, schema migration, CI/security/privilege change, associations, signing, commit/push or publication is authorized. Isolated Windows image-worker architecture remains a later review gate. Native Windows evidence remains NOT TESTED.
# Product name approved — 2026-10-05

User instruction: **“I like Intentgrove, add it to the corresponding files”**.
The selected product name is **Intentgrove**. This authorizes the display-name,
package metadata, build-output naming, and active documentation updates recorded
in [the brand decision](brand.md). The confirmed purpose is reading, organizing,
and refining documents exchanged with AI. Existing technical identifiers and
stored-data locations are preserved. Historical approval artifacts remain
unchanged; this decision does not add AI model integration or authorize publishing.
