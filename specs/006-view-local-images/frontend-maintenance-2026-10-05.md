# Approved shared-shell frontend reconciliation — 2026-10-05

Authority: current user IMPLEMENT request, with existing design approval in `../../design-reviews/03-10-27-01/proposals/approval-all-2026-10-05.json`. This is a bounded client maintenance pass under the installed Spec Kit task workflow; it does not ratify unseen editor/native architecture. Global active feature F007W remains unchanged; F006 selected only for this command's duration with supported NO_PERSIST override.

| Canonical boundary | Approved target | Reconciliation / evidence |
|---|---|---|
| F006-R08/R09/R10; shared image/Markdown shell | Neutral reload feedback, contextual navigation, guarded batch close and keyboard behavior | Native image pipeline, grants, byte-only isolation, session schema and dependencies unchanged. Existing scoped reload/close operations are reused. `../../frontend-implementation/plan.md` and `report.md` map implementation/evidence. |
| F003F existing root search | Stop pending/scanning work; reject obsolete cancellation/open results | Existing root job contract unchanged. Subtree requests still require IR-05; action remains disabled with reason. |
| F004 source editor/checkpoint architecture | Direct rich section editing and lossless transaction/recovery model | Current CodeMirror/source checkpoint architecture conflicts with the approved rich design. IR-01 identifies the exact amendment/migration needed. Existing source/draft safety preserved; no new serializer/checkpoint introduced in this pass. |
| F001/F003C preference/session ownership | Separate nonmodal Settings; remembered tree filter | IR-04 defines missing window/capability and acknowledgment/persistence scope. Current controls preserved; no fake Settings window or session schema migration. |
| Current native Markdown/image type restrictions | Isolated HTML/resources and other-file details/handler launch | IR-02/03 define missing routing/resources/isolation/metadata/launch capabilities. No native acceptance or file privileges expanded. |
| Existing native menu commands | OS Go routes matching client history | IR-05 defines missing event IDs/state contract. Existing client Go/D/history preserved and reverified. |

No change to approved original `spec.md`, `design.md`, or architecture `plan.md`. Their historical approval hashes remain tied to those versions. This supplementary mapping and T039–T042 trace the new maintenance work. Remaining material architecture/native decisions must be reconciled in their owning feature through Spec Kit before their implementation; completed client work does not imply those capabilities exist.

New gap found during verification: platform-level focus/IME/physical trackpad and actual grant/save/restart acceptance are still NOT TESTED for this pass. Existing native acceptance tasks remain unchecked; browser/WKWebView evidence does not satisfy them.
