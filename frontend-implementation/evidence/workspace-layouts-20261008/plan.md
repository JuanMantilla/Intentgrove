# Scoped implementation plan

1. Add one optional frontend layout value and localized Settings radio choices; never send unsupported fields to the old strict native bridge. Disable choices with an explanation on old native hosts.
2. Keep one App/document/editor/search tree. Change only layout attributes and CSS: Margin explorer/document/outline; Folio centered page and navigation drawer; Atlas horizontal real explorer shelf and left outline/desk. Preserve state owners and capture/restore reading anchor.
3. Wire future native intents/session restore/checkpoint using optional field, without modifying native schema. Document exact minimal native request.
4. Add focused Settings/default/state-continuity tests. Run regressions/build/worker and inspect rendered application through permitted computer-use. Retain failures and unavailable matrix explicitly.
5. Update scoped report and compact current state. Stop at frontend implementation handoff; persistence remains pending native contract.

Frontend steps completed;47focused/487full/build/worker/diffPASS. Browser captures and representative review completed, limits explicit in report. Native integration/persistence intentionally remains requested, not implemented. Separate authorization and final source identities recorded. Stop at implementation handoff.
