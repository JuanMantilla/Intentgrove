# Focused designer review addendum

Status: **NATIVE_VALIDATION_BLOCKED**. Route: **REVIEW_ONLY**. Scope exclusively DR-001–DR-005. No current-native UI captured or inspected. Original provisional review and PARTIAL_CAPTURE unchanged. This is an evidence-gap reassessment, not visual confirmation, a redesign or implementation approval.

| Finding | Verdict | Priority | Confidence | New evidence |
|---|---|---|---|---|
| DR-001 | BLOCKED | Deferred; current severity unassessed | Low for current applicability | No NV evidence; P-01 / B-01 |
| DR-002 | BLOCKED | Deferred; current severity unassessed | Low for current applicability | No NV evidence; P-01 / B-01 |
| DR-003 | BLOCKED | Deferred; current severity unassessed | Low for current applicability | No NV evidence; P-01 / B-01 |
| DR-004 | BLOCKED | Deferred; current severity unassessed | Low for current applicability | No NV evidence; P-01 / B-01 |
| DR-005 | BLOCKED | Deferred; current severity unassessed | Low for current applicability | No NV evidence; P-01 / B-01 |

P-01/B-01 are runtime provenance/blocker records in [/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-205333/validation.md](/Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-validation-20261010-205333/validation.md), not screenshots or behavioral evidence. Prior Medium ratings remain historical hypotheses; no current severity is assigned without the required observations. Confidence in the recorded provenance blocker is high; confidence in current defect applicability is low. BLOCKED does not imply NOT_REPRODUCED.

## DR-001 — Search controls/context

**BLOCKED:** no current native baseline, settled matching results or scrolled result sequence. Original C075/C077 concern and wide C078 disconfirmation remain reported historical evidence; no new visual comparison. Current query visibility/result space untested. Leave current implementation unchanged pending CR-01. Conditional future criteria: baseline completed search shows query/scope, summary and a complete result together; query remains identifiable after scrolling; EN/ES options and footer remain reachable at supported bounds. Preserve the Projects correction.

## DR-002 — Long filename header

**BLOCKED:** same-layout short/long current native pair and header measurements missing. Historical wrapping in C044/C058 does not establish current excessive growth. Intentional full-name wrapping versus usability cost remains unresolved. Leave unchanged pending CR-02. Conditional criteria for a future approved compact treatment: at most two identity lines at baseline, full filename/path through explicit disclosure, aligned actions and no content overlap. This criterion is a proposal, not an approved requirement or a measured need.

## DR-003 — Narrow Spanish reader visibility

**BLOCKED:** C090 remains browser-only evidence. Configured native minimum 640×480 is not proof of observed support, viewport equivalence or a defect. Actual native dimensions, scale, open document and open/closed Projects pair missing. Do not proceed with a native fix from browser evidence. Conditional criteria: Spanish supported minimum has visible Projects dismissal; dismissal reveals unclipped document/essential toolbar; search input/actions/results reachable. Record actual bounds and scaling. A NEEDS_DECISION verdict would require an evidenced current trade-off; none was observed here.

## DR-004 — Save versus Keep draft

**BLOCKED:** no current native confirmation dialog and no verified Save/Keep draft action semantics. Historical C063/C064 copy cannot justify promises about persistence/reopening or current dialog wording. Recovery-directory source inspection concerns isolation only and is not behavioral proof of either action. Leave copy unchanged pending CR-04 and separate behavior evidence. Conditional criteria: explain actual file-write versus draft-preservation effects and whether reading/closing continues; EN/ES copy/control fit, distinct Cancel/Discard, neutral comprehension validation. Do not promise unverified local persistence.

## DR-005 — Similar tree identities

**BLOCKED:** no current native shared-prefix pair, width comparison or reachable disclosure check. Historical browser C013/C093 truncation and C020 disclosure workaround remain unconfirmed natively. No evidence establishes inability to identify files. Leave unchanged pending CR-01 plus targeted second-width/disclosure evidence. Conditional criteria if change is justified: alpha/beta ending distinguishable at baseline without hover; complete identity accessible through explicit disclosure; preserve ordinary names/selection and corrected Projects header.

## Recommendation boundary

No application changes justified by this session. No new evidenced design decision can be assigned. All five should wait for current-native evidence; historical recommendations are conditional and not implementation-ready. No unrelated observations or extra findings added. Original images were not independently re-inspected in this blocked pass; no apparent screenshots were treated as current-native validation.

Critical second pass: lack of evidence applies equally to claiming fixed/not reproduced and to confirming defects. Keep priorities deferred, separate behavior from appearance, and avoid unverified draft promises. Next step is approval of isolated runtime preparation, then CR-01 first; stop for user review now.
