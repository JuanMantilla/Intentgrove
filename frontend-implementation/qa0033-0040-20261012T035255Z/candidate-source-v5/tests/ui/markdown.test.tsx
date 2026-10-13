import { boundedBlocks } from "../../src/reader/block-budget";
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import MarkdownView, { exceedsRenderBudget } from "../../src/reader/MarkdownView";
import { api } from "../../src/app/api";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("MarkdownView", () => {
  it("renders a worker parsed GFM tree through scoped React components", async () => {
    const processor = unified().use(remarkParse).use(remarkGfm);
    class FakeWorker {
      onmessage: ((event: MessageEvent<{ kind: string; tree: ReturnType<typeof processor.parse> }>) => void) | null = null;
      onerror: (() => void) | null = null;
      postMessage(request: { version: number; generation: number; source: string }) {
        const tree = processor.parse(request.source);
        queueMicrotask(() => this.onmessage?.({ data: { kind: "parsed", version: request.version, generation: request.generation, tree, blocks: boundedBlocks(tree, request.source) } } as MessageEvent));
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);
    render(<MarkdownView content={"# Worker heading\n\n| a | b |\n| - | - |\n| 1 | 2 |"} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Worker heading" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("terminates replaced workers and ignores stale and wrong-generation results", async () => {
    const processor = unified().use(remarkParse);
    const workers: DeferredWorker[] = [];
    class DeferredWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      request!: { source: string; version: number; generation: number };
      terminate = vi.fn();
      constructor() { workers.push(this); }
      postMessage(request: DeferredWorker["request"]) { this.request = request; }
      reply(generation = this.request.generation) {
        const tree = processor.parse(this.request.source);
        this.onmessage?.({ data: { kind: "parsed", version: 1, generation, tree,
          blocks: boundedBlocks(tree, this.request.source) } } as MessageEvent);
      }
    }
    vi.stubGlobal("Worker", DeferredWorker);
    const view = render(<MarkdownView content="# Old" fileId="fixture" locale="en" onNavigate={() => {}} />);
    view.rerender(<MarkdownView content="# New" fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(workers[0].terminate).toHaveBeenCalled();
    act(() => workers[0].reply());
    act(() => workers[1].reply(999));
    expect(screen.queryByRole("heading")).toBeNull();
    act(() => workers[1].reply());
    expect(await screen.findByRole("heading", { name: "New" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Old" })).toBeNull();
    view.unmount();
    expect(workers[1].terminate).toHaveBeenCalled();
  });

  it("preserves siblings and hostile source when one block exceeds the rich budget", () => {
    render(<MarkdownView content={"# Before\n\n" + "> ".repeat(140) + "<script>attack()</script>\n\n# After"}
      fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(screen.getByRole("heading", { name: "Before" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "After" })).toBeTruthy();
    expect(screen.getByText(/<script>attack/)).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });

  it("preserves document-wide reference links across bounded blocks", () => {
    const navigate = vi.fn();
    render(<MarkdownView content={"# References\n\n[Read guide][guide]\n\n[guide]: guide.md"}
      fileId="fixture" locale="en" onNavigate={navigate} />);
    fireEvent.click(screen.getByRole("button", { name: "Read guide" }));
    expect(navigate).toHaveBeenCalledWith("guide.md");
  });

  it("retains exact source without retrying failed worker work on the UI thread", async () => {
    class FailingWorker {
      onerror: (() => void) | null = null;
      postMessage() { queueMicrotask(() => this.onerror?.()); }
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingWorker);
    render(<MarkdownView content="# Broken" fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("# Broken");
    expect(screen.queryByRole("heading", { name: "Broken" })).toBeNull();
  });
  it("shows the bounded fallback for a large document when the worker fails", async () => {
    class FailingWorker {
      onerror: (() => void) | null = null;
      postMessage() { queueMicrotask(() => this.onerror?.()); }
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingWorker);
    render(<MarkdownView content={"# Large\n" + "ordinary text\n".repeat(20_000)} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("too complex");
  });
  it("shows a localized fallback for pathological parse shapes", async () => {
    expect(exceedsRenderBudget("# Ordinary\n\n| a | b |\n")).toBe(false);
    expect(exceedsRenderBudget(("# Section\n\n- " + "ordinary text ".repeat(7) + "\n").repeat(10_000))).toBe(false);
    expect(exceedsRenderBudget("x".repeat(65_537))).toBe(true);
    const { rerender } = render(<MarkdownView content={"|".repeat(513)} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("too complex");
    rerender(<MarkdownView content={"|".repeat(513)} fileId="fixture" locale="es" onNavigate={() => {}} />);
    expect((await screen.findByRole("alert")).textContent).toContain("demasiado complejo");
  });
  it("retains shared footnote targets, numbers and unique reference backlinks", () => {
    vi.stubGlobal("Worker", undefined);
    const navigate = vi.fn();
    render(<MarkdownView content={"First[^a].\n\nSecond[^b], again[^a].\n\n[^a]: alpha\n\n[^b]: beta"}
      fileId="fixture" locale="en" onNavigate={navigate} />);
    const references = screen.getAllByRole("button", { name: "1" });
    expect(references).toHaveLength(2);
    expect(screen.getByRole("button", { name: "2" })).toBeTruthy();
    expect(document.getElementById("fn-a")).toBeTruthy();
    expect(document.getElementById("fn-b")).toBeTruthy();
    expect(document.getElementById("fnref-a-1")).toBeTruthy();
    expect(document.getElementById("fnref-a-2")).toBeTruthy();
    fireEvent.click(references[0]); expect(navigate).toHaveBeenCalledWith("#fn-a");
  });
  it("renders basic GFM while keeping task controls read-only", () => {
    render(<MarkdownView
      content={"# Guide\n\n| Name | Value |\n| --- | --- |\n| A | B |\n\n- [x] Done"}
      fileId="fixture" locale="en" onNavigate={() => {}}
    />);
    expect(screen.getByRole("heading", { name: "Guide" }).id).toBe("guide");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("checkbox").hasAttribute("disabled")).toBe(true);
  });

  it("does not create executable HTML or remote image elements", () => {
    const { container } = render(<MarkdownView
      content={'<script>alert("run")</script>\n\n![remote](https://example.test/pixel.png)'}
      fileId="fixture" locale="en" onNavigate={() => {}}
    />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector('img[src^="https:"]')).toBeNull();
    expect(screen.getByText(/Image blocked or unsupported/)).toBeTruthy();
  });

  it("keeps remote image targets out of native IPC and preserves their alt labels", async () => {
    const readImage = vi.spyOn(api, "readImage").mockRejectedValue({ code: "blocked" });
    const { container } = render(<MarkdownView
      content={'![remote preview](https://example.test/pixel.png)\n\n![protocol relative](//example.test/pixel.png)'}
      fileId="fixture" locale="es" onNavigate={() => {}}
    />);
    expect(await screen.findByRole("img", { name: "remote preview" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "protocol relative" })).toBeTruthy();
    expect(readImage).not.toHaveBeenCalled();
    expect(container.querySelector('img[src^="http"]')).toBeNull();
    expect(screen.getAllByText(/Imagen bloqueada o no admitida/)).toHaveLength(2);
  });

  it("sends an escaping local target only to the scoped native validator", async () => {
    const readImage = vi.spyOn(api, "readImage").mockRejectedValue({ code: "blocked" });
    render(<MarkdownView content="![outside asset](../../outside.png)"
      fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(await screen.findByRole("img", { name: "outside asset" })).toBeTruthy();
    expect(readImage).toHaveBeenCalledWith("fixture", "../../outside.png");
  });

  it("loads local raster bytes through the scoped command", async () => {
    const readImage = vi.spyOn(api, "readImage").mockResolvedValue({ fileId: "diagram", name: "diagram.png",
      displayPath: "images/diagram.png", identityKey: "fixture:diagram", diskVersion: "v1",
      format: "png", mime: "image/png", width: 1, height: 1, still: true,
      bytes: [137, 80, 78, 71] });
    const create = vi.fn(() => "blob:local-image");
    vi.stubGlobal("URL", { ...URL, createObjectURL: create, revokeObjectURL: vi.fn() });
    const { unmount } = render(<MarkdownView content="![diagram](images/diagram.png)" fileId="fixture" locale="en" onNavigate={() => {}} />);
    const image = await screen.findByRole("img", { name: "diagram" });
    expect(image.getAttribute("src")).toBe("blob:local-image");
    expect(readImage).toHaveBeenCalledWith("fixture", "images/diagram.png");
    unmount();
    vi.unstubAllGlobals();
  });

  it("routes local SVG through the scoped decoder and keeps blocked alt text", async () => {
    const readImage = vi.spyOn(api, "readImage").mockRejectedValue({ code: "unsafe_image" });
    render(<MarkdownView content="![architecture sketch](images/architecture.svg)"
      fileId="fixture" locale="en" onNavigate={() => {} } />);
    const blocked = await screen.findByRole("img", { name: "architecture sketch" });
    expect(blocked.textContent).toContain("architecture sketch");
    expect(readImage).toHaveBeenCalledWith("fixture", "images/architecture.svg");
  });

  it("passes link targets to scoped navigation without a live external href", () => {
    const navigate = vi.fn();
    const { container } = render(<MarkdownView
      content={"[Local guide](../guide.md)"} fileId="fixture" locale="en" onNavigate={navigate}
    />);
    fireEvent.click(screen.getByRole("button", { name: "Local guide" }));
    expect(navigate).toHaveBeenCalledWith("../guide.md");
    expect(container.querySelector('a[href^="http"]')).toBeNull();
  });
});

it("encoded footnote fragments match the native resolver's single decoding", () => {
  vi.stubGlobal("Worker", undefined);
  const targets: string[] = [];
  render(<MarkdownView content={"First[^a%20b].\n\n[^a%20b]: note"} fileId="fixture" locale="en"
    onNavigate={target => { const id = decodeURIComponent(target.slice(1)); expect(document.getElementById(id)).toBeTruthy(); targets.push(id); }} />);
  fireEvent.click(screen.getByRole("button", { name: "1" }));
  fireEvent.click(screen.getByRole("button", { name: "↩" }));
  expect(targets).toEqual(["fn-a%20b", "fnref-a%20b-1"]);
});
