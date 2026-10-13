# Narrow Phase 1 correction found through real SVG inventories

The documented `TargetRecord` contract stores tagged ancestry separately from
untagged structural visibility flags. Phase 1's local-state reveal check inspected
only the flags. A tagged root with authored display:none could therefore hide a
state group without `HiddenState` being raised. The new direct model reproduction
failed with an empty diagnostic list before the fix; see model-defect-before.log.

The first SVG producer also incorrectly put tagged ancestors in the untagged
flags. A CLOSE_OVERLAY control inside a tagged state group with authored display:none
and initialVisible:true then failed `OverlayCloseRequired`, contrary to V1's
explicit initialVisible override. See inventory-defect-before.log.

Correction: SVG facts reserve those flags for untagged ancestors, as documented;
the canonical model's existing local-state reveal check additionally reads tagged
ancestor display/visibility records. Existing overlay logic already handles tagged
state overrides. Two model regression tests and one compiler-to-validator test
cover both paths. No wire type, schema, ID/action/transition/version rule or V1
feature was added. The original 84 tests continue to run alongside two new tests.

This is a justified Phase 1 defect correction, authorized by the user's explicit
Phase 2 exception. It does not reinterpret the accepted normative contracts.

The existing authoring-path predicate was also exposed publicly without changing
its grammar. The compiler had mistakenly applied ASCII archive-member naming to
authoring filenames, rejecting a Unicode/space-containing visual path accepted by
the canonical source validator. source-path-before.log records the direct failure;
the new compiler regression proves canonical source validation and secure file
hashing now agree. The filesystem resolver reuses the model predicate instead of
maintaining a parallel authoring path validator. Archive paths remain ASCII.
