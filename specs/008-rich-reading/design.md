# F002R rich reading — visual proposal

**Status:** Draft. [Sketch](design/reading-states.svg) is a diagram of proposed states, not a running-app screenshot. Reuse F001 shell and F002A semantic palettes; document remains dominant.

The optional right outline is 220 CSS pixels at wide widths, resizable and collapsible. At 900 points it starts collapsed; at 640 points its toggle opens an in-flow panel rather than squeezing the page. Heading hierarchy uses indentation and active text plus a left rule. A long heading truncates visually with full accessible label. Outline navigation preserves the current tab and scroll anchor.

Frontmatter begins as a compact `Metadata` / `Metadatos` disclosure above the first heading. Expanded keys/values use a readable definition list; invalid YAML shows an inline notice and a source block without applying values to preferences. Mermaid diagrams occupy a bounded figure with plain-text label/source disclosure. A failed diagram shows its own error, source and retry only if retry is safe. Code fences retain line breaks, copy exact source and use restrained local syntax colors; unknown languages use the same base code surface without false language claims.

Reading settings are a small popover from the toolbar: font choice (Roboto, system serif/sans/monospace), size, line height and width with current numeric values and Reset. Changes preview immediately and retain focus; content anchors are recomputed without losing the passage. No runtime font loading indicator or external font request is shown. At 640 points the popover becomes an in-flow sheet within the window.

| State | Treatment |
|---|---|
| Loading/expensive block | Existing document remains readable; the block carries text progress or bounded fallback. |
| Invalid diagram/metadata | Localized explanatory notice next to source, not a whole-page error. |
| Missing font/grammar | System fallback or plain code, with no broken glyphs or silent source loss. |
| EN/ES keyboard | Semantic buttons/disclosures, visible F002A focus ring, no color-only active state, diagram textual alternative. |

Use F002A light/dark tokens; never recolor authored image pixels. No essential transition; Reduce Motion removes decorative fades. Review packaged contrast, 200% zoom, 640/900/1440-point layouts, trackpad outline scrolling and long Spanish labels. These are NOT TESTED by the sketch.
