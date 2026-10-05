# Feature Specification: Rich Reading Completion

**Feature ID:** F002R | **Status:** Draft for approval | **Date:** 2026-09-29

## Outcome and boundary

Complete the remaining F002 reading experience: safe Mermaid diagrams, visible YAML frontmatter, language-aware code highlighting, table of contents, bundled Roboto and adjustable reading typography. Reuse approved F001 shell and F002A themes. Markdown remains local data; this slice adds no editing, remote asset fetch, executable code, theme replacement or general IDE features.

## Stories and acceptance scenarios

1. **Read technical content (P1).** **AS-001** (R01/R02): A supported Mermaid fence renders a noninteractive diagram with readable text; malformed or over-budget diagrams show a localized error and retain source access without blanking the rest of the document. **AS-002** (R03): YAML frontmatter appears in a collapsed metadata region with expand/collapse and source access; invalid YAML is shown as untrusted text with an error, never applied as app settings. **AS-003** (R04): Known code languages receive local syntax highlighting; unknown languages stay legible as plain code and a copy action preserves exact source.
2. **Navigate and tune reading (P1).** **AS-004** (R05): A document outline reflects headings in order and level, navigates to an anchor and updates active position without changing content. **AS-005** (R06/R07): Roboto is bundled and selected initially; the user can select bundled/system serif, sans and monospace choices and adjust size, line height and reading width. Values survive app restart through F003C, retain readable limits and do not alter document bytes. **AS-006** (R05/R07): With a long, renamed or repeated heading, the outline keeps an unambiguous accessible label and an anchor fallback after refresh.
3. **Keep content safe and usable (P1).** **AS-007** (R01–R04/R08): Malicious Mermaid/YAML/code fences, HTML, SVG links and remote references execute no script or document command and cause no app-requested network fetch; blocked content has a specific placeholder. **AS-008** (R08/R09): In EN/ES, at 640/900/1440-point widths and Reduce Motion, all controls are keyboard reachable, focus visible, diagrams have textual alternatives, and content remains readable. **AS-009** (R10): A 1 MiB and 10 MiB mixed fixture either becomes usable within the proposed timing target or clearly degrades individual expensive blocks without freezing tabs; other tabs remain usable.

## Requirements

- **F002R-R01:** Render supported Mermaid diagrams locally and inertly with accessible text/source fallback. A malformed, unsupported or over-budget diagram must fail in its own block, not the whole document.
- **F002R-R02:** Mermaid content must never execute scripts, load remote/local subresources outside granted content, or gain file/native authority.
- **F002R-R03:** Show YAML frontmatter as collapsible metadata, with invalid content recoverable as source text. It must not configure the app or receive code execution privileges.
- **F002R-R04:** Highlight supported code languages with bundled grammars; unknown languages remain plain and readable. Copy preserves exact source, without executing a code fence.
- **F002R-R05:** Provide a heading outline with level/order, active position and navigation, including repeated headings and document refresh.
- **F002R-R06:** Bundle Roboto and a readable code font with no runtime font request; offer Roboto and system serif/sans/monospace choices.
- **F002R-R07:** Let users adjust and persist bounded font size, line height and reading width; the chosen values must work in existing light/dark/system themes and not write to repository files.
- **F002R-R08:** All new reading states and controls must be localized in EN/ES, keyboard operable and understandable with standard assistive technology; meaning cannot depend only on color/motion.
- **F002R-R09:** Large or hostile blocks must have bounded work and an explicit per-block fallback; remote assets, raw HTML/MDX and executable code stay blocked under existing reader policy.
- **F002R-R10:** The proposed performance targets are 1 MiB ordinary mixed Markdown usable within 1 second after read and 10 MiB non-adversarial content within 3 seconds on a recorded reference Mac; failures remain visible and recoverable.

## Success criteria

- **SC-001:** Across 20 disposable documents containing valid, invalid and hostile diagrams/metadata/code, every block has expected content or explicit fallback, with zero source-file changes and zero observed app-requested network attempts during the measured interval.
- **SC-002:** In 10 packaged EN/ES keyboard journeys, outline, metadata, typography and source fallback are usable at 640/900/1440 points with visible focus and no essential motion.
- **SC-003:** In 10 warm trials per size on a recorded Mac, at least 9/10 ordinary 1 MiB documents meet 1 second and 9/10 non-adversarial 10 MiB documents meet 3 seconds after file read. Record raw measurements; these are unmeasured targets.
- **SC-004:** In 10 normal restarts after F003C integration, 10/10 restore the selected typography values without repository writes.

## Assumptions

F002A already owns themes. F003C owns restoration storage. This feature owns remaining rich reading only; F003 large-file source mode is separate. Mermaid and font license/dependency details belong in the architecture plan and require review.
