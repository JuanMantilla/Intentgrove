# Critique and revised design direction

Status: PROPOSED — READY FOR USER DESIGN REVIEW. Route: PROTOTYPE, isolated static design showcase; no application integration. Supersedes the previous unvalidated visual proposal, not the evidence-backed findings or the user's approval authority.

## Critique of the earlier proposal

The earlier artifacts used SVG patches on screenshots. Their construction was inspected; the previous HTML was not rendered because browser security blocked its file URL. Do not present this critique as a visually verified browser audit of the old page.

1. **Inconsistent typography and control geometry.** Arial text and hand-sized overlays differed from the underlying native UI. Whole-frame typography and shared component dimensions are needed to avoid visible seams.
2. **Search presentation remained incomplete.** One result was shown beneath another control stack; expanded options were never specified. The proposal needed a stable query region, a dedicated results viewport, and a visible treatment for all existing modes/ignored-file settings.
3. **Filename treatment was too lossy.** The header kept the name in a narrow slot and truncated aggressively, despite having a wide document column available. Use that width for identity before deciding to truncate; retain meaningful endings when required.
4. **Dialog copy lacked a strong reading order.** A paragraph of consecutive consequences made scanning harder. Explain Save and Keep under separate labels, state Cancel/Discard consequences briefly, and keep all four actions in one aligned row at the reviewed width.
5. **Validation was inadequate.** Asset existence and syntax establish file integrity, not visual quality. The revised images were rendered and inspected at full resolution; the HTML page itself still lacks browser verification.

## Recommended replacement

Use one coherent visual system with existing app colors, the existing Theonira mark, registered local Roboto, matching line icons and repeated control geometry. Reconstruct each complete mockup; do not paint proposal patches over screenshots. Original native captures remain alongside the new designs for comparison.

### DR-001: compact query region and independent results

Query field and explicit Search action share a row. Folder scope and Clear remain visible. A compact mode menu shows the current choice; its expanded state includes Names and content, File names, Markdown contents, Include ignored files and Markdown coverage. These are existing options reorganized, not removed. Settled and later-result states show the same fixed controls and complete snippets below. The menu temporarily overlays results; closing it must restore focus to its trigger. Result scrolling must not move query/scope; the user can still change them without scrolling back.

Tradeoff: options require opening one menu. Show the selected mode on the closed trigger, support keyboard operation, and preserve ignored-state indication if enabled. The supplied mockups show the default unchecked ignored setting only. Total scanned/skipped detail needs a status disclosure/expanded treatment; no status data may be lost by replacing it with the compact Complete label. Empty/loading/error/ignored-on states remain handoff requirements, not completed design validation.

### DR-002 + DR-005: identity across the document column

Give filename its own full-width row above toolbar, retaining an80px header at the reviewed1280×820 composition. The full fixture name fits across this row in the inspected image; longer identities use measured middle truncation. Parent context remains alongside the toolbar, and full path remains under the existing Document menu. Tree labels use measured middle truncation at the original264px sidebar width, preserving alpha.md/beta.md endings. Keep existing full-name Open documents disclosure. This is one shared identity direction, not two unrelated fixes.

Tradeoff: toolbar moves to a second compact row even for short names; the total header height stays bounded. Exact native spacing/font rendering still requires implementation review. No narrow-layout acceptance is inferred. DR-003 remains blocked, and a second tree width remains unverified.

### DR-004: structured preservation copy

Use a neutral Return to reading? title for this trigger. Describe Save to file and Keep draft separately. Keep draft remains visually primary; Cancel and Discard remain separate. Plain secondary text explains that Discard removes the edit and Cancel leaves editing active. This copy is for the captured read trigger only. Other close intents must receive their actual continuation wording.

Source inspection supports intended Save/Keep distinctions; no successful persistence or relaunch flow was exercised. Revised copy avoids restart/durability promises. Actual safe Save/Keep tests, comprehension checks and error/conflict behavior remain required before acceptance.

## Designer disposition

Recommend this replacement for user design review. All ten new standalone PNG mockups were opened at full1280×820 resolution. A first render exposed baseline issues, corrected before the final image pass. Automated text-width checking reports zero unintentional overflows; middle truncation is deliberate. This is visual review of static design images, not approval, app behavior testing or independent QA. The browser blocked the local HTML file previously; no workaround or browser claim is made.

## Preserve

Projects dismissal belongs to its header; sidebar/footer widths and reader/outline ownership remain. Keep familiar reading rhythm, safe draft emphasis and complete-name disclosure. No native app, dependency, configuration, code, build, deployment or cleanup changes.
