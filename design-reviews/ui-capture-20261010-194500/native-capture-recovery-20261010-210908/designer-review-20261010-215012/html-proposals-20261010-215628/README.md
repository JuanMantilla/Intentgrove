# Current revision — 20261010-220535

Canonical index.html now contains the revised professional mockup set: ten complete rendered PNG images, each visually inspected at original resolution. Critique, design handoff, standalone HTML and verification ledger are in /Users/juanmantilla/projects/personal/md-reader/design-reviews/ui-capture-20261010-194500/native-capture-recovery-20261010-210908/designer-review-20261010-215012/html-proposals-20261010-215628/revision-20261010-220535. All remain proposed, awaiting user approval. Previous HTML is preserved as index.previous-20261010-220535.html; old SVG assets remain unchanged. Browser HTML layout and control tests are still blocked/not tested. No app source changes.

---

## Historical first-draft record (superseded)

# UI proposal showcase

PROPOSED — READY FOR DESIGN REVIEW. Six comparisons; before images are unchanged accepted P-01 native captures, after images are static SVG design mockups on screenshot context. New browser exports, if present, capture the mockups only. Product controls are inert; Enlarge, Close, Escape and section navigation operate the review. No native app build, launch, capture or implementation.

Each SVG is self-contained with its screenshot background embedded. The HTML uses relative assets and opens without a server. Keep the assets directory with index.html. Native narrow behavior, second tree width and persistence remain unverified.

## Verification

PASS: six SVG proposal assets parse as XML; every HTML image/enlargement asset exists; all seven copied before/disclosure PNGs match an accepted original SHA256; script syntax checked with Node. All external app controls are raster/static illustration.

BLOCKED: browser render, wide/narrow visual inspection and enlargement interaction tests. Browser security policy rejected the file:// URL because only http/https protocols are allowed and prohibited indirect workarounds. No local server or alternate browser route was used. No rendered proposal screenshot PNGs are claimed; the after images are SVG design mockups with screenshot context. User can open index.html locally to inspect them.

The header mockup uses the identical-content short-file capture for reader geometry plus the long-file tab band. Typography in drawn regions approximates the current app; exact native font metrics and behavior require implementation validation. The search-options disclosure is pictured collapsed; all three existing modes, ignored-file toggle and Markdown coverage information must remain available when implemented. This review does not implement that disclosure.
