// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import MarkdownView from "../../src/reader/MarkdownView";
import { collectHeadings } from "../../src/reader/heading-model";

afterEach(cleanup);

describe("shared heading identity", () => {
  it("matches duplicate-aware rendered IDs and preserves full accessible labels", () => {
    const source = "# Repeated\n\n## Repeated\n\n### Long [linked](guide.md) heading\n\n###### Éxito";
    const tree = unified().use(remarkParse).parse(source);
    const headings = collectHeadings(tree);
    expect(headings.map(({ id, level }) => [id, level])).toEqual([
      ["repeated", 1], ["repeated-1", 2],
      ["long-linked-heading", 3], ["exito", 6]
    ]);
    render(<MarkdownView content={source} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(screen.getByRole("heading", { name: "Repeated", level: 1 }).id).toBe(headings[0].id);
    expect(screen.getByRole("heading", { name: "Repeated", level: 2 }).id).toBe(headings[1].id);
    expect(headings[2].label).toBe("Long linked heading");
    expect(screen.getByRole("heading", { name: "Éxito", level: 6 }).id).toBe(headings[3].id);
  });
});
