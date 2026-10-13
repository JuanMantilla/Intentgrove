// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import { boundedBlocks } from "../../src/reader/block-budget";
import MarkdownView from "../../src/reader/MarkdownView";
import { parseFrontmatter } from "../../src/reader/frontmatter";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("YAML frontmatter as inert data", () => {
  it("accepts bounded string pairs and rejects nested, duplicate, alias and tagged values", () => {
    expect(parseFrontmatter("title: Guide\nauthor: Ana")).toEqual({ status: "valid",
      entries: [{ key: "title", value: "Guide" }, { key: "author", value: "Ana" }],
      source: "title: Guide\nauthor: Ana" });
    for (const source of ["title: A\ntitle: B", "nested: [a, b]",
      "key: &x text\ncopy: *x", "unsafe: !!js/function x", "x".repeat(65_537)]) {
      expect(parseFrontmatter(source).status).toBe("invalid");
    }
  });

  it("shows a disclosure and source without applying metadata to app settings", async () => {
    const processor = unified().use(remarkParse).use(remarkFrontmatter);
    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage(request: { source: string; version: number; generation: number }) {
        const tree = processor.parse(request.source);
        const first = tree.children[0] as { type?: string; value?: string };
        queueMicrotask(() => this.onmessage?.({ data: { kind: "parsed", version: request.version, generation: request.generation, tree, blocks: boundedBlocks(tree, request.source),
          metadata: first?.type === "yaml" ? parseFrontmatter(first.value ?? "") : null } } as MessageEvent));
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);
    localStorage.clear();
    render(<MarkdownView content={"---\ntitle: Guide\n---\n# Heading"}
      fileId="fixture" locale="es" onNavigate={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Heading" })).toBeTruthy();
    fireEvent.click(screen.getByText("Metadatos"));
    expect(screen.getByText("title")).toBeTruthy();
    expect(screen.getByText("Guide")).toBeTruthy();
    fireEvent.click(screen.getByText("Ver código fuente de los metadatos"));
    expect(screen.getByText("title: Guide")).toBeTruthy();
    expect(localStorage.length).toBe(0);
  });

  it("keeps metadata visible when the worker is unavailable", () => {
    vi.stubGlobal("Worker", undefined);
    render(<MarkdownView content={"---\ntitle: Guide\n---\n# Heading"}
      fileId="fixture" locale="en" onNavigate={() => {}} />);
    fireEvent.click(screen.getByText("Metadata"));
    expect(screen.getByText("Guide")).toBeTruthy();
  });
});
