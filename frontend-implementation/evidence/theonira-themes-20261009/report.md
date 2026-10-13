# Theonira theme correction — 2026-10-09

**IMPLEMENTED:** the shared Theonira shell, paired light/dark palette and distinct Margin, Folio and Atlas compositions. **Verification: partial, bounded below. User acceptance: pending.** The previous delivery interpreted the approved visual scope too narrowly. This correction supersedes that exclusion; it does not erase the historical evidence.

[Self-contained comparison](design-comparison.html) · [plan](plan.md) · [authorization](authorization.md) · [candidate](candidate.json) · [task source diff](task-source.diff) · [preservation](preservation.json).

## Reference and approval

The latest user instruction explicitly selects `design-review/intentgroove/theonira-directions-20261008/index.html`. Its complete relevant HTML/CSS and icon source were read; bundled light/dark marks were visually inspected. The browser rejected direct `file:` navigation and expressly prohibited alternate rendering routes. **Rendered designer-page inspection is unavailable, not PASS.** No localhost copy, injected study markup or substitute reference screenshot was produced. The comparison identifies the designer reference as a source-derived contract, not a rendered reference. Pixel-level reference acceptance remains unavailable.

October 5's approved package and option-D history controls remain applicable. Later layout approval and this explicit theme selection override historical PROPOSED labels. No further approval is required for these implemented themes. No designer artifact, original screenshot or approval record was changed.

## What changed

| Area | Implementation and verification |
| --- | --- |
| Shared workspace | 72px branded header, 56px workspace toolbar, 48px full-width tabs, 32px status footer. Actual Open file/folder, Find, appearance, language and Settings routes. Native titlebar remains OS-owned. Header/toolbar/tabs measured at intended sizes in wide renderer. |
| Theme and typography | Neutral light `#F7F8F9/#FFFFFF`, text `#15191C`, cyan `#087F8C`; dark `#101416/#151A1D`, text `#EEF3F4`, cyan `#35B8C7`. Roboto UI, bundled Theonira marks, Lucide icon paths/strokes, 6px controls, quieter section actions. All six native layout/theme combinations captured. |
| Margin | Continuous explorer/document/right-outline composition; 196px outline, 40×48 article padding, 36px title. Existing saved explorer width respected. |
| Folio | Functional 64px utility rail, existing navigation drawer, flat centered reading page, generous 48×80 padding at wide sizes, 48px title, 180px airy outline. |
| Atlas | 176px three-column shelf for actual projects, open documents and folder search; 224px left outline; reading desk. 132px editing shelf and narrow Projects disclosure. Open documents reuse the original tab selection/HTML-hide sequence. |
| Navigation / DC-06 | D arrows retain 32px sizing and 8px gap. Actual tab paths, close actions, destination labels, history and open-document overflow remain. Native second-file/tab traversal exercised; renderer Atlas shelf switching retained a dirty section. |
| Document identity / DC-02 | Real filename/location and bounded Document menu retained. No decorative filenames, fake breadcrumbs or presentation annotations. Existing native HTML overlay boundary preserved. |
| Settings / DC-03 / VG-03 | Existing native Settings owner, Margin default and all three options retained. Previously fixed fields, chevrons, helper text, validation and grouping inherit the new palette. Native option changes and persistence observed; browser light/dark settings captured. |
| Search / DC-04–05 | Existing input, mode controls, wrapping results, bounded scroll and honest skipped/finished copy retained. Shelf/explorer search-looking controls are real buttons that launch the existing search form. Native query `local`: 4 entries scanned, 1 skipped, 5 results. |
| Direct editing / VG-01 | Existing rendered section editor retained; native Save, Save As and Return controls use existing handlers. Native Purpose→XPurpose edit survived theme change, Save returned to reading, disk bytes changed only by that one X, and restart reopened saved content. No duplicate editor or backend implementation. |
| Save/recovery/status | Footer reports actual transient reload status or current-on-disk only when current/clean/error-free. Existing conflict, recovery, discard and checkpoint owners remain. Dirty-return Cancel retained draft in renderer; 491 regression tests include existing failure/recovery cases. |
| HTML / VG-02 | Actual native authored CSS visible; fixture script did not run. **Native positioning still fails:** child covers metadata/Zoom and leaves a bottom gap, as in the prior candidate. Exact owner/contract in [native boundary request](../design-alignment-20261009/native-boundary-request.md). No guessed frontend titlebar offset or fake HTML capability. |
| Images | Real 205×65 PNG decoded through existing bundled XPC helper; dimensions/Fit/zoom controls present. Captured after decoding completed. |
| Responsive / localization | 12 matched before/after renderer states: 3 layouts × 2 themes × 2 sizes, English at1280×968, Spanish at640×480; all lack document-level horizontal overflow. Six wide editor states;390×844 Spanish Folio editing also checked without horizontal overflow. Actual native EN and ES plus six final native ES theme/layout captures at1280×820. |
| Native theme switching | Verification found active-tab background/underline retaining an earlier interpolated color in WKWebView. Removed that tab color/shadow transition. Rebuilt and visually retested the final app: active tabs now change atomically and stay readable. |

## Deliberate adaptations

- Stronger input boundaries and light focus color preserve existing contrast expectations: control border `#7A8C94` light / `#74848C` dark; light focus `#087F8C`. Subtle decorative edges retain study values. The nine initial contrast failures were corrected in tokens; no tests were weakened. This is not a full accessibility-conformance claim.
- Saved reading font, text size, line height, page width and explorer width remain authoritative. Existing native defaults include line height1.6 and explorer264px, versus the illustrative study's1.75/224px. Existing preferences were not silently reset or native defaults/contracts changed.
- Study “Apps” ecosystem control has no existing authorized working destination, so no simulated button was shipped. Product can provide a destination/contract independently; it does not block the implemented themes.
- Authored document text, title, callouts and diagrams come only from actual documents. Study sample prose is not shipped. Task fixtures live only in evidence.

## Exact candidates and evidence provenance

Original supplied installed captures show older functionality. Current installed bundle still matches prior production provenance: main SHA256 `b7b0f872414fe5cf0e2f6205ef0bd5a234878fa5d5873a2bffe0ccf0162eb053`. There was no capture-time binary hash, so attribution is corroborated, not retroactively proven. No installation occurred.

Final local app: `src-tauri/target/release/bundle/macos/Intentgrove Themes 20261009.app`, ID `com.juanmantilla.intentgrove.themes20261009`, version0.1.0, HEAD `7e00d3316ce46563cafb46ba928498fcb0d82880` plus dirty source manifest. **Final executable SHA256 `3c32fe8f775f7ab5177423203c21b6b756dd2a7eb65e464dabd2ab12b6a78d16`.** Full bundle/source hashes are in candidate receipts. It uses a separate disposable profile, with existing compiled image/diagram helpers assembled into the local bundle and ad hoc signing verified.

- `before-*`: frozen source at the start of this correction, not the older installed application. Same renderer fixtures, dimensions, theme and locale as `after-*`.
- `after-*`, `editor-*`, `settings-*`, renderer measurements: actual production React components in the existing disposable harness; native APIs mocked. Captured before the final transition-only deletion; static appearance/geometry unaffected by that deletion. No native save claim rests on mocks.
- `native-*`: pre-transition-fix candidate main `1bb392dd9852436e953d4ba90fa3c94ec25befa991f57d196b2fbf5c71aafbe6`; actual save, retry, search, image, HTML and restart observations apply to this revision. `native-tab-transition-defect.png` records the discovered defect. `native-atlas-es.png` caught the language menu; use `native-restart-es.png` for the settled localized shell.
- `final-native-*`: final executable above; all three layouts in both themes, persisted saved content and actual native theme transition retested. Final candidate differs only by removing the tab transition. Detailed functional smoke was not exhaustively repeated after that CSS-only change.
- Native captures1280×820 include32px OS titlebar. Renderer wide captures1280×968 correspond to1000px study boards after removing32px OS chrome; they are not mixed as matched native pairs. Attempted final native narrow resize was unavailable (`noWindowsAvailable`); narrow evidence is renderer-only for this correction.

## Checks and limits

PASS: `npm test` —491 tests/61 files; `npm run build`; `npm run test:bundle-worker`; local offline Tauri build. Final transition-only rebuild also passed:

`CARGO_NET_OFFLINE=true npm run tauri build -- --bundles app --config frontend-implementation/evidence/theonira-themes-20261009/local-candidate.json`

`codesign --verify --deep --strict --verbose=2` passed on final bundle. Existing Rust warnings remain. Initial test run failed10 cases (9 contrast,1 duplicate error text); implementation corrected and complete suite then passed. No dependencies or test weakening. Source diff and preservation receipts distinguish this correction from the pre-existing dirty worktree.

Native freshness temporarily reported “Unable to confirm latest version” after saving and switching documents. Retry cleared it, and disk contents/restart were correct. The UI exposed the failure honestly; no content loss observed. Broader file-watcher/root-cause investigation was not performed. This is recorded, not reclassified as a theme defect or silently hidden.

NOT RUN: rendered designer-page comparison/pixel diff, exhaustive native error injection and editing encodings/IME, every locale×size native combination, OS-System appearance switching, VoiceOver/full keyboard audit,200% text, cross-platform validation, large-image matrix and full HTML navigation/resource/scale matrix. Existing CRLF Save deferral remains. Native HTML geometry is still a known failing dependency, not fixed by the theme work. User acceptance remains pending.

Only task-owned disposable document bytes were edited. Native source/configuration, grants/contracts, package manifests and lockfiles are unchanged from the correction baseline; designer hashes match. Existing application integration/history/reading-anchor/draft ownership retained. No commit, push, install or deployment.
