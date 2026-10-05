// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
      postMessage(content: string) {
        queueMicrotask(() => this.onmessage?.({ data: { kind: "parsed", tree: processor.parse(content) } } as MessageEvent));
      }
      terminate() {}
    }
    vi.stubGlobal("Worker", FakeWorker);
    render(<MarkdownView content={"# Worker heading\n\n| a | b |\n| - | - |\n| 1 | 2 |"} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Worker heading" })).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
  });

  it("renders a small document when the worker fails", async () => {
    class FailingWorker {
      onerror: (() => void) | null = null;
      postMessage() { queueMicrotask(() => this.onerror?.()); }
      terminate() {}
    }
    vi.stubGlobal("Worker", FailingWorker);
    render(<MarkdownView content="# Broken" fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Broken" })).toBeTruthy();
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
  it("shows a localized fallback for pathological parse shapes", () => {
    expect(exceedsRenderBudget("# Ordinary\n\n| a | b |\n")).toBe(false);
    expect(exceedsRenderBudget(("# Section\n\n- " + "ordinary text ".repeat(7) + "\n").repeat(10_000))).toBe(false);
    expect(exceedsRenderBudget("x".repeat(65_537))).toBe(true);
    const { rerender } = render(<MarkdownView content={"|".repeat(513)} fileId="fixture" locale="en" onNavigate={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("too complex");
    rerender(<MarkdownView content={"|".repeat(513)} fileId="fixture" locale="es" onNavigate={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("demasiado complejo");
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
