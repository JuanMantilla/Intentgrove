# Measured semantic color pairings

**PROPOSED — READY FOR DESIGN REVIEW**

Calculated from the actual light/dark tokens in `src/styles/app.css`, using linearized sRGB relative luminance. Numerical checks apply only to these opaque foreground/background pairs, not rendered fonts, disabled opacity, platform chrome or whole-app accessibility. Proposed targets: 4.5:1 ordinary text; 3:1 necessary control/focus indicators.

| Pair | Theme | Foreground / background | Ratio | Design target | Result |
|---|---|---|---|---|---|
| Primary document text | Dark | #E6EEEA / #202928 | 12.62:1 | 4.5:1 | MEETS PAIR TARGET |
| Secondary document text | Dark | #A8B9B1 / #202928 | 7.27:1 | 4.5:1 | MEETS PAIR TARGET |
| Neutral current-status text | Dark | #A8B9B1 / #1D2524 | 7.63:1 | 4.5:1 | MEETS PAIR TARGET |
| Sidebar utility text | Dark | #A8B9B1 / #18201F | 8.09:1 | 4.5:1 | MEETS PAIR TARGET |
| Accent / link text | Dark | #91C5D6 / #202928 | 7.92:1 | 4.5:1 | MEETS PAIR TARGET |
| Primary button text | Dark | #10272E / #91C5D6 | 8.26:1 | 4.5:1 | MEETS PAIR TARGET |
| Selected row text | Dark | #E6EEEA / #2D4547 | 8.66:1 | 4.5:1 | MEETS PAIR TARGET |
| Selected editing text | Dark | #E6EEEA / #365B66 | 6.25:1 | 4.5:1 | MEETS PAIR TARGET |
| Warning text | Dark | #EFC6A7 / #35271F | 9.11:1 | 4.5:1 | MEETS PAIR TARGET |
| Error text | Dark | #FFA997 / #202928 | 8.07:1 | 4.5:1 | MEETS PAIR TARGET |
| Focus indicator | Dark | #91C5D6 / #202928 | 7.92:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on document | Dark | #6B8078 / #202928 | 3.54:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on chrome | Dark | #6B8078 / #1D2524 | 3.71:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on sidebar | Dark | #6B8078 / #18201F | 3.94:1 | 3:1 | MEETS PAIR TARGET |
| Primary document text | Light | #202826 / #FFFFFF | 15.08:1 | 4.5:1 | MEETS PAIR TARGET |
| Secondary document text | Light | #52615C / #FFFFFF | 6.52:1 | 4.5:1 | MEETS PAIR TARGET |
| Neutral current-status text | Light | #52615C / #F8F9F7 | 6.17:1 | 4.5:1 | MEETS PAIR TARGET |
| Sidebar utility text | Light | #52615C / #EEF0EE | 5.69:1 | 4.5:1 | MEETS PAIR TARGET |
| Accent / link text | Light | #315F70 / #FFFFFF | 7.00:1 | 4.5:1 | MEETS PAIR TARGET |
| Primary button text | Light | #FFFFFF / #315F70 | 7.00:1 | 4.5:1 | MEETS PAIR TARGET |
| Selected row text | Light | #202826 / #DEE9E8 | 12.15:1 | 4.5:1 | MEETS PAIR TARGET |
| Selected editing text | Light | #202826 / #D9E9EE | 12.09:1 | 4.5:1 | MEETS PAIR TARGET |
| Warning text | Light | #6F3D2E / #F8EEE8 | 7.72:1 | 4.5:1 | MEETS PAIR TARGET |
| Error text | Light | #8C442F / #FFFFFF | 7.04:1 | 4.5:1 | MEETS PAIR TARGET |
| Focus indicator | Light | #2E6E87 / #FFFFFF | 5.68:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on document | Light | #7C8E85 / #FFFFFF | 3.46:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on chrome | Light | #7C8E85 / #F8F9F7 | 3.28:1 | 3:1 | MEETS PAIR TARGET |
| Control boundary on sidebar | Light | #7C8E85 / #EEF0EE | 3.02:1 | 3:1 | MEETS PAIR TARGET |

| Control outline on selected row | Dark | #6B8078 / #2D4547 | 2.43:1 | 3:1 | REQUIRES TREATMENT |
| Stronger existing muted outline on selected row | Dark | #A8B9B1 / #2D4547 | 4.99:1 | 3:1 | MEETS PAIR TARGET |
| Control outline on selected row | Light | #7C8E85 / #DEE9E8 | 2.79:1 | 3:1 | REQUIRES TREATMENT |
| Stronger existing muted outline on selected row | Light | #52615C / #DEE9E8 | 5.25:1 | 3:1 | MEETS PAIR TARGET |

## Boundary treatment

The selected-row background reduces contrast of `--control-border` below 3:1 in both themes. Where an outline is necessary to identify a control on that background, use the existing `--muted` token for the outline. Default unselected control/background combinations above meet the measured target. Keep decorative separators `--border`; they are not the sole control affordance. Recheck focused/hover/selected combinations and actual rasterized text after implementation.

**Verified in design:** the listed numerical pairings, non-color status labels and proposed focus treatment. **Requires implementation testing:** interaction, target sizes, semantic roles, keyboard, EN/ES, 200% text, native settings and motion. **Not assessable from screenshots:** current app accessibility behavior. No conformance claim.

## HTML-view illustrative pairs

Measured relative luminance only; these pairs do not certify arbitrary authored HTML/CSS or runtime accessibility.

| Role | Foreground | Background | Ratio | Design check |
|---|---|---|---|---|
| Authored page text | #202826 | #FFFDF9 | 14.84:1 | PASS for normal text; focus pair also ≥3:1 |
| Authored muted text | #52615C | #FFFDF9 | 6.41:1 | PASS for normal text; focus pair also ≥3:1 |
| Authored link / focus | #315F70 | #FFFDF9 | 6.89:1 | PASS for normal text; focus pair also ≥3:1 |
| App mode metadata | #A8B9B1 | #202928 | 7.27:1 | PASS for normal text; focus pair also ≥3:1 |
| Link menu text | #E6EEEA | #1D2524 | 13.25:1 | PASS for normal text; focus pair also ≥3:1 |
| Primary action label | #10272E | #91C5D6 | 8.26:1 | PASS for normal text; focus pair also ≥3:1 |

## Universal file navigation pairs

Measured illustrative dark-theme pairs only; native/other themes and authored-file accessibility require implementation checks. Disabled icons do not carry state alone: disabled semantics and reasons are required.

| Role | Foreground | Background | Ratio | Pair check |
|---|---|---|---|---|
| Enabled Back/Forward icon | #E6EEEA | #1D2524 | 13.25:1 | PASS ≥3:1 |
| History focus ring | #91C5D6 | #202928 | 7.92:1 | PASS ≥3:1 |
| History control boundary | #6B8078 | #1D2524 | 3.71:1 | PASS ≥3:1 |
| File details explanatory text | #A8B9B1 | #151B1B | 8.50:1 | PASS ≥4.5:1 |
