# Partial design approval — 2026-10-04

**APPROVED DESIGN — EXCLUDING FILE NAVIGATION**

User statement: **“I approve everything except the file navigation”**.

This records approval of the current recommended design and interaction proposals outside the file-navigation exception. It does not authorize application implementation or approve a new canonical feature specification/architecture. Original design files and SVGs are preserved byte-for-byte at the reviewed hashes below; their earlier PROPOSED labels describe their state when presented. This approval record takes precedence for current approval status. Gallery/state changes only annotate that status.

## Approved scope

Workspace decluttering and tab behavior; Projects/tree-menu action placement; neutral Already current treatment; contextual menus/shortcuts/dismissal/focus; direct rich Markdown content editing and save/recovery model; scoped folder search/results; separate Settings and corrected select chevrons; local read-only HTML/CSS viewing with document JavaScript off and authored-style preservation; associated responsive/color/accessibility design requirements. Direction A is the approved recommendation; direction B remains an undeveloped comparison.

## File navigation remains unapproved

The exception is interpreted as the latest [file-navigation addendum](file-navigation-handoff.md): generalized file-link routing/access, universal Back/Forward/visited-file history/Go commands and other-file File details/default-app-launch flows. This is the agent’s recorded interpretation of “file navigation,” not extra quoted user wording.

- Mixed workspace/HTML/edit/search/narrow screens retain approved non-navigation content; their Back/Forward controls, reserved header placement and related routing/history behavior are **not approved**.
- `file-navigation-handoff.md` and SVGs 10–13 are excluded navigation proposals.
- Core existing tabs/tree/Open/search routes remain within the approved workspace design; the new navigation extension is excluded.
- A link requirement previously requested is not an approval of its latest proposed implementation model. No navigation implementation may inherit approval from a mixed screen.

## Exact reviewed artifacts

The following hashes identify the design content at approval. [Structured approval record](approval-record.json) includes scope, gate exclusions and the reviewed manifest hash. Tests, color measurements and static mockups do not establish application behavior.

| Artifact | SHA-256 at review | Approval scope |
|---|---|---|
| [audit-and-directions.md](audit-and-directions.md) | `eab2a86db0e62ba9cd6e9628cacb38ca31708d0190fde236e18ecfe64798bae3` | APPROVED DESIGN SCOPE |
| [frontend-handoff.md](frontend-handoff.md) | `234253e63c9ed40f6bd6d61afcc36360b230ec49de95b5364d97d7db934c05b4` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [interaction-spec.md](interaction-spec.md) | `9f1f9a3230ce76b819833405c0b3d238256720b7a245c6a78b9ea5f4d839225f` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [contrast-measurements.md](contrast-measurements.md) | `047630acc74c65525f5d6747797da049599a84e2a181f89c3bf095879fdf847a` | DESIGN SUPPORTING EVIDENCE |
| [html-view-handoff.md](html-view-handoff.md) | `c24056737f1b6d9851c988c51f558ccd16faa5ab456b366e5de5701805ad6475` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [file-navigation-handoff.md](file-navigation-handoff.md) | `47c49fcb7c8e12fc4cfae13dd0d17d01fa9314f4a0cfb20112de5b52d9922200` | NOT APPROVED — FILE NAVIGATION |
| [mockups/01-reading-workspace.svg](mockups/01-reading-workspace.svg) | `a3c837b0bdd9460941686941f905c6b4d95799361f485c9b5eb65e2c026cf06c` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/02-in-place-editing.svg](mockups/02-in-place-editing.svg) | `28e9e3a7a86aeceb4b4b707326cbd77d5f44434ffbdfdecf616a23ee9309ec6b` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/03-workspace-menus.svg](mockups/03-workspace-menus.svg) | `2e18f27f53fd7631e17118eb1400c51b74e9a449cd38895c18d81285f92c0efd` | APPROVED DESIGN SCOPE |
| [mockups/04-document-menus.svg](mockups/04-document-menus.svg) | `f5c826c07a7ecbcfcfa1394cdfd9b4bdd71050da57e05edd159448eef32e14fc` | APPROVED DESIGN SCOPE |
| [mockups/05-search-open.svg](mockups/05-search-open.svg) | `11ccb7d18e82dfb51265b5030ec5eff2bfbd9e6d8ea4229c31e29f8c0e71c3a6` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/06-search-results.svg](mockups/06-search-results.svg) | `84d9d585771ca6ec3deaac5967e96d28b1515eb9b9464c55539026efce43b211` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/07-narrow-workspace.svg](mockups/07-narrow-workspace.svg) | `6950f0d6a2dc70b1d029ae5e296781474e50c804eb65008d8abfbe8f2f2e7fbb` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/08-settings-window.svg](mockups/08-settings-window.svg) | `b8848a60f35eb10da469a7a1bc89d1b7f4caeaf7b486acca4eb732e45297b16a` | APPROVED DESIGN SCOPE |
| [mockups/09-html-view.svg](mockups/09-html-view.svg) | `b76575fced59b975690810e9ce051deee297df62be78e60284e8f0e06866024e` | APPROVED DESIGN EXCEPT EMBEDDED FILE NAVIGATION |
| [mockups/10-html-links.svg](mockups/10-html-links.svg) | `c67f9ada97655846ebb9d6b6d6c744cd2a18c5aeb99116e9f76101f9ad8bc6d1` | NOT APPROVED — FILE NAVIGATION |
| [mockups/11-html-link-access.svg](mockups/11-html-link-access.svg) | `bf25c4829413fdaf36a21a60918d1864214d04561564efce6181d913376e60e3` | NOT APPROVED — FILE NAVIGATION |
| [mockups/12-universal-history.svg](mockups/12-universal-history.svg) | `93b0ee7ef033e870ada3f077ca02e02238f11447fdb008d858828cb85d5f9a50` | NOT APPROVED — FILE NAVIGATION |
| [mockups/13-file-details-and-history.svg](mockups/13-file-details-and-history.svg) | `044ec0902918700fb9c85a56ac09ad2af47dd6d8c655b1103a491e9dfe2053f9` | NOT APPROVED — FILE NAVIGATION |

Unresolved rich Markdown fidelity, recovery, subtree search, filter persistence and HTML isolation questions remain technical handoff gaps; they do not negate the user’s non-navigation design approval. No editor/renderer architecture has been selected. Material design changes require affected-scope review. Stop at this handoff; do not begin application implementation from this approval alone.

## Historical baseline retained after critique

The user subsequently requested a critique and updates to all proposals. The original 19 approved/reviewed artifacts above are now preserved at [archive/before-critique-2026-10-04/](archive/before-critique-2026-10-04/approval-record.md), with the same reviewed hashes. References in the table describe those original versions; current same-name files may have revisions. The structured approval record is unchanged and remains historical. [Revision inventory](revision-record.json) maps baseline/current hashes and new artifacts; [critique](critique-and-revisions.md) identifies material changes. Those changes are proposed for review, with no new approval recorded. The original non-navigation approval and navigation exclusion remain historical; current revisions must not inherit approval simply by keeping a filename.
