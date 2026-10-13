import { describe, expect, it } from "vitest";
import { parseBounded } from "../../src/reader/bounded-parser";

describe("whole-document bounded parsing", () => {
  it("localizes hostile shapes before parsing and keeps readable neighbors", () => {
    const hostile = "> ".repeat(140) + "hostile";
    const result = parseBounded(`# Before\n\n${hostile}\n\n# After`);
    expect(result.blocks.some(block => block.fallback && block.source.includes(hostile))).toBe(true);
    expect(result.tree.children.filter(node => node.type === "heading")).toHaveLength(2);
  });
  it("retains exact overlong input with bounded rich allocation", () => {
    const source = `# Before\n\n${"x".repeat(100_000)}\n\n# After`;
    const result = parseBounded(source);
    expect(result.blocks.find(block => block.fallback)?.source.trim()).toBe("x".repeat(100_000));
    expect(result.tree.children.filter(node => node.type === "heading")).toHaveLength(2);
  });
  it("resolves document reference definitions across parse regions", () => {
    const result = parseBounded("# Start\n\n[Read][guide]\n\n" + "ordinary words ".repeat(5000) + "\n\n[guide]: second.md\n");
    expect(JSON.stringify(result.blocks)).toContain('"linkReference"');
    expect(JSON.stringify(result.blocks)).toContain('"url":"second.md"');
  });
  it("gives footnotes document-wide numbers and unique shared targets", () => {
    const result = parseBounded("First[^a].\n\nSecond[^b] and again[^a].\n\n[^a]: alpha\n\n[^b]: beta");
    const json = JSON.stringify(result.tree);
    expect(json).toContain('"id":"fn-a"'); expect(json).toContain('"id":"fn-b"');
    expect(json).toContain('"value":"2"');
    expect(json).toContain('"url":"#fn-a"');
  });
  it("never replaces the capped remainder with only its first rejected region", () => {
    const source = Array.from({ length: 3000 }, (_, i) => `# Heading ${i}\n\n` + "plain words ".repeat(40) + "\n\n").join("");
    const result = parseBounded(source);
    expect(result.blocks.at(-1)?.source).toContain("Heading 2999");
    expect(result.blocks.filter(block => block.fallback).length).toBeLessThan(5);
  });
  it("retains metadata and fenced code containing blank lines", () => {
    const result = parseBounded("---\ntitle: Guide\n---\n\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\n# End");
    expect(result.metadata?.status).toBe("valid");
    expect(result.tree.children.find(node => node.type === "code")?.value).toContain("const b = 2;");
  });
});
