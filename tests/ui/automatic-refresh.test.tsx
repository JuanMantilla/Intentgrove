import { projectAction, projectsMenu } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";
import { unified } from "unified";
import remarkParse from "remark-parse";
import { boundedBlocks } from "../../src/reader/block-budget";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(),
  selectFile: vi.fn(),
  listEntries: vi.fn(),
  cancelListing: vi.fn(),
  readDocument: vi.fn(),
  getConfirmedDocument: vi.fn(),
  resolveLink: vi.fn(),
  readImage: vi.fn(),
  listEditSections: undefined as undefined | ReturnType<typeof vi.fn>,
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));

vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));

function emit(name: string, payload: unknown) {
  const listener = mocks.listeners[name];
  expect(listener, `missing ${name} listener`).toBeTypeOf("function");
  return act(async () => listener({ payload }));
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const value of Object.values(mocks)) if (vi.isMockFunction(value)) value.mockReset();
  mocks.listEditSections = undefined;
  localStorage.clear();
  for (const key of Object.keys(mocks.listeners)) delete mocks.listeners[key];
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture" });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.listEntries.mockResolvedValue({
    entries: [{ name: "a.md", kind: "markdown" }, { name: "b.md", kind: "markdown" }, { name: "docs", kind: "directory" }],
    nextOffset: null,
    snapshotId: "initial"
  });
  mocks.readDocument.mockImplementation(async (request: { segments?: string[] }) => {
    const name = request.segments?.at(-1) ?? "a.md";
    return {
      fileId: name, identityKey: `1:${name}`, name, displayPath: `/tmp/fixture/${name}`,
      content: `# ${name}\n\nOriginal passage`, diskVersion: `${name}-v1`
    };
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("automatic refresh", () => {
  it("does not accumulate native scroll rounding across successive heading restorations", async () => {
    const original = "# First\n\nBefore\n\n## Middle\n\nOriginal marker\n\n## End";
    const doc = (content: string, diskVersion: string) => ({ fileId: "a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      identityKey: "1:a.md", content, diskVersion });
    mocks.readDocument.mockResolvedValue(doc(original, "v1"));
    mocks.getConfirmedDocument.mockResolvedValueOnce(doc(original.replace("Original marker", "Second marker"), "v2"))
      .mockResolvedValueOnce(doc(original.replace("Original marker", "Third marker"), "v3"));
    const { container } = render(<App />);
    const reader = container.querySelector(".reader-scroll") as HTMLDivElement;
    let scroll = 0, middleTop = 400.390625;
    Object.defineProperty(reader, "scrollTop", { configurable: true, get: () => scroll,
      set: (value: number) => { scroll = Math.floor(value); } });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      const top = this.id === "middle" ? middleTop - reader.scrollTop
        : this.id === "end" ? middleTop + 600 - reader.scrollTop
        : this.matches("h1,h2") ? -reader.scrollTop : 0;
      return { top, bottom: top + 20, left: 0, right: 600, width: 600, height: 20, x: 0, y: top, toJSON() {} };
    });
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByRole("heading", { name: "End" });
    reader.scrollTop = 376;
    fireEvent.scroll(reader);
    middleTop = 800.296875;
    await emit("refresh:file_changed", { generation: 1, fileId: "a.md", diskVersion: "v2",
      identityKey: "1:a.md", checkedAt: Date.now() });
    await screen.findByText("Second marker");
    expect(reader.scrollTop).toBe(776);
    fireEvent.scroll(reader);
    middleTop = 1200.203125;
    await emit("refresh:file_changed", { generation: 1, fileId: "a.md", diskVersion: "v3",
      identityKey: "1:a.md", checkedAt: Date.now() });
    await screen.findByText("Third marker");
    expect(reader.scrollTop).toBe(1176);
  });
  it("restores after delayed native editing controls change heading geometry", async () => {
    const original = "# First\n\nBefore\n\n## Middle\n\nMiddle body\n\n## End\n\nEnd body";
    const replacement = original.replace("## Middle", "Inserted\n\n## Middle");
    const sections = (source: string) => Array.from(source.matchAll(/^#{1,6} (.+)$/gm)).map((m, index, all) => ({
      id: m[1], kind: "heading", ordinal: index, level: index ? 2 : 1, label: m[1],
      startByte: m.index!, endByte: all[index + 1]?.index ?? source.length, sourceHash: m[1]
    }));
    let finishSections!: (value: unknown) => void;
    mocks.listEditSections = vi.fn().mockResolvedValueOnce({ diskVersion: "v1", sections: sections(original) })
      .mockImplementationOnce(() => new Promise(resolve => { finishSections = resolve; }));
    mocks.readDocument.mockResolvedValue({ fileId: "a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      identityKey: "1:a.md", content: original, diskVersion: "v1" });
    mocks.getConfirmedDocument.mockResolvedValue({ fileId: "a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      identityKey: "1:a.md", content: replacement, diskVersion: "v2" });
    const { container } = render(<App />);
    const reader = container.querySelector(".reader-scroll") as HTMLDivElement;
    let middleTop = 400;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      const top = this.id === "middle" ? middleTop - reader.scrollTop
        : this.id === "end" ? middleTop + 600 - reader.scrollTop
        : this.matches("h1,h2") ? -reader.scrollTop : 0;
      return { top, bottom: top + 20, left: 0, right: 600, width: 600, height: 20, x: 0, y: top, toJSON() {} };
    });
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByRole("button", { name: "Edit section “Middle”" });
    reader.scrollTop = 375.75;
    fireEvent.scroll(reader);
    middleTop = 778;
    await emit("refresh:file_changed", { generation: 1, fileId: "a.md", diskVersion: "v2",
      identityKey: "1:a.md", checkedAt: Date.now() });
    await waitFor(() => expect(mocks.listEditSections).toHaveBeenCalledTimes(2));
    fireEvent.scroll(reader);
    middleTop = 800;
    await act(async () => finishSections({ diskVersion: "v2", sections: sections(replacement) }));
    await screen.findByRole("button", { name: "Edit section “Middle”" });
    expect(reader.scrollTop).toBe(775.75);
  });
  it.each([0, 24.25])("retains the heading anchor at margin %s through staged replacement", async (margin) => {
    const processor = unified().use(remarkParse);
    const workers: DeferredWorker[] = [];
    class DeferredWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      request!: { source: string; version: number; generation: number };
      constructor() { workers.push(this); }
      terminate() {}
      postMessage(request: DeferredWorker["request"]) { this.request = request; }
      reply() {
        const tree = processor.parse(this.request.source);
        this.onmessage?.({ data: { kind: "parsed", ...this.request, tree,
          blocks: boundedBlocks(tree, this.request.source) } } as MessageEvent);
      }
    }
    vi.stubGlobal("Worker", DeferredWorker);
    const original = "# First\n\n" + "Before paragraph\n\n".repeat(60)
      + "## Middle\n\n" + "After paragraph\n\n".repeat(60) + "## End";
    const replacement = original.replace("## Middle", "Inserted paragraph\n\n".repeat(15) + "## Middle");
    mocks.readDocument.mockResolvedValue({ fileId: "a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      identityKey: "1:a.md", content: original, diskVersion: "v1" });
    mocks.getConfirmedDocument.mockResolvedValue({ fileId: "a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      identityKey: "1:a.md", content: replacement, diskVersion: "v2" });
    const { container } = render(<App />);
    const reader = container.querySelector(".reader-scroll") as HTMLDivElement;
    let middleTop = 400;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      const top = this.id === "middle" ? middleTop - reader.scrollTop
        : this.id === "end" ? middleTop + 600 - reader.scrollTop
        : this.matches("h1,h2") ? -reader.scrollTop : 0;
      return { top, bottom: top + 20, left: 0, right: 600, width: 600, height: 20, x: 0, y: top, toJSON() {} };
    });
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await waitFor(() => expect(workers).toHaveLength(1));
    act(() => workers.at(-1)!.reply());
    await screen.findByRole("heading", { name: "End" });
    reader.scrollTop = 400 - margin;
    fireEvent.scroll(reader);
    await emit("refresh:file_changed", { generation: 1, fileId: "a.md", diskVersion: "v2",
      identityKey: "1:a.md", checkedAt: Date.now() });
    await waitFor(() => expect(workers).toHaveLength(2));
    middleTop = 800;
    act(() => workers.at(-1)!.reply());
    // The first painted region exists, but the retained heading is not painted yet.
    expect(reader.querySelector(".markdown-body")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Middle" })).toBeNull();
    reader.scrollTop = 0;
    fireEvent.scroll(reader);
    await screen.findByRole("heading", { name: "End" });
    await waitFor(() => expect(reader.scrollTop).toBe(800 - margin));
  });
  it("updates an inactive clean tab without taking focus or losing the active passage", async () => {
    mocks.getConfirmedDocument.mockResolvedValue({
      fileId: "a.md", identityKey: "1:a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      content: "# a.md\n\nUpdated passage", diskVersion: "a-v2"
    });
    const { container } = render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByText("Original passage");
    const scroll = container.querySelector(".reader-scroll") as HTMLDivElement;
    scroll.scrollTop = 180;
    fireEvent.scroll(scroll);
    fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("heading", { name: "b.md" });
    scroll.scrollTop = 320;
    fireEvent.scroll(scroll);

    await emit("refresh:file_changed", {
      generation: 1, fileId: "a.md", diskVersion: "a-v2", identityKey: "1:a.md", checkedAt: Date.now()
    });
    await waitFor(() => expect(mocks.getConfirmedDocument).toHaveBeenCalledWith("a.md", "a-v2", 1));
    expect(screen.getByRole("tab", { name: /b\.md/ }).getAttribute("aria-selected")).toBe("true");
    expect(scroll.scrollTop).toBe(320);
    fireEvent.click(screen.getByRole("tab", { name: /a\.md/ }));
    expect(await screen.findByText("Updated passage")).toBeTruthy();
    expect(scroll.scrollTop).toBe(180);
  });

  it("refreshes a changed expanded branch without collapsing it or shifting the reader", async () => {
    let docsVersion = 1;
    mocks.listEntries.mockImplementation(async (_rootId: string, segments: string[]) => ({
      entries: segments.length
        ? docsVersion === 1
          ? [{ name: "one.md", kind: "markdown" }]
          : [{ name: "one.md", kind: "markdown" }, { name: "two.md", kind: "markdown" }]
        : [{ name: "a.md", kind: "markdown" }, { name: "docs", kind: "directory" }],
      nextOffset: null,
      snapshotId: segments.length ? "docs-v2" : "root-v1"
    }));
    const { container } = render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    fireEvent.click(screen.getByTitle("docs"));
    await screen.findByTitle("docs/one.md");
    const reader = container.querySelector(".reader-scroll") as HTMLDivElement;
    reader.scrollTop = 275;
    fireEvent.scroll(reader);
    const treeScroll = container.querySelector(".tree-scroll") as HTMLDivElement;
    treeScroll.scrollTop = 75;
    fireEvent.scroll(treeScroll);
    mocks.listEntries.mockClear();
    docsVersion = 2;

    await emit("refresh:directory_changed", { generation: 1, rootId: "root", segments: ["docs"], snapshotId: "docs-v2" });
    expect(await screen.findByTitle("docs/two.md")).toBeTruthy();
    expect(screen.getByTitle("docs/one.md")).toBeTruthy();
    expect(reader.scrollTop).toBe(275);
    expect(treeScroll.scrollTop).toBe(75);
    expect(screen.getByRole("tab", { name: /a\.md/ }).getAttribute("aria-selected")).toBe("true");
  });

  it("ignores events from an older workspace generation", async () => {
    mocks.getConfirmedDocument.mockResolvedValue({
      fileId: "a.md", identityKey: "1:a.md", name: "a.md", displayPath: "/tmp/fixture/a.md",
      content: "# a.md\n\nNew", diskVersion: "a-v2"
    });
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("a.md"));
    await screen.findByText("Original passage");
    mocks.selectRoot.mockResolvedValueOnce({ id: "next", name: "next", displayPath: "/tmp/next" });
    fireEvent.click(projectsMenu());
    fireEvent.click(screen.getByRole("menuitem", { name: "Open folder" }));
    await waitFor(() => expect(screen.queryByRole("tab", { name: /a\.md/ })).toBeNull());
    await emit("refresh:file_changed", {
      generation: 1, fileId: "a.md", diskVersion: "a-v2", identityKey: "1:a.md", checkedAt: Date.now()
    });
    expect(mocks.getConfirmedDocument).not.toHaveBeenCalled();
  });
});
