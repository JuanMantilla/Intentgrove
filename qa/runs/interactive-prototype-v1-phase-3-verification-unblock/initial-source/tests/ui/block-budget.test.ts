import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root } from "mdast";
import { boundedBlocks } from "../../src/reader/block-budget";

describe("bounded rich blocks", () => {
  it("retains readable siblings and exact hostile source around an over-depth block", () => {
    const source = "# Before\n\n" + "> ".repeat(140) + "<script>hostile</script>\n\n# After";
    const blocks = boundedBlocks(unified().use(remarkParse).parse(source) as Root, source);
    expect(blocks.map(block => block.fallback)).toEqual([false, true, false]);
    expect(blocks[1].source).toContain("<script>hostile</script>");
    expect(blocks[1].tree.children).toEqual([]);
    expect(blocks[2].tree.children[0].type).toBe("heading");
  });
  it("bounds aggregate rich nodes without dropping remaining source", () => {
    const source = Array.from({ length: 3000 }, (_, i) => `# Heading ${i}\n\n`).join("");
    const blocks = boundedBlocks(unified().use(remarkParse).parse(source) as Root, source);
    expect(blocks).toHaveLength(2049);
    expect(blocks.at(-1)?.fallback).toBe(true);
    expect(blocks.at(-1)?.source).toContain("Heading 2999");
  });
});
