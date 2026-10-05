// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(),
  selectFile: vi.fn(),
  listEntries: vi.fn(),
  cancelListing: vi.fn(),
  readDocument: vi.fn(),
  openImage: vi.fn(),
  resolveLink: vi.fn(),
  readImage: vi.fn()
}));

vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture" });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.listEntries.mockImplementation(async (_rootId: string, segments: string[]) => ({
    entries: segments.length
      ? [{ name: "README.md", kind: "markdown" }]
      : [{ name: "README.md", kind: "markdown" }, { name: "docs", kind: "directory" }],
    nextOffset: null
  }));
  mocks.readDocument.mockImplementation(async (request: { segments?: string[] }) => {
    const nested = request.segments?.length === 2;
    return {
      fileId: nested ? "nested" : "top",
      identityKey: nested ? "1:2" : "1:1",
      name: "README.md",
      displayPath: nested ? "/tmp/fixture/docs/README.md" : "/tmp/fixture/README.md",
      content: nested ? "# Nested" : "# Top"
    };
  });
});

afterEach(cleanup);

describe("workspace shell", () => {
  it("opens a local image from the supported-files tree in one read-only tab", async () => {
    mocks.listEntries.mockResolvedValue({ entries: [{ name: "diagram.svg", kind: "image" }], nextOffset: null });
    mocks.openImage.mockResolvedValue({ fileId: "image-1", name: "diagram.svg",
      displayPath: "/tmp/fixture/diagram.svg", identityKey: "1:9", diskVersion: "v1",
      format: "svg", mime: "image/png", width: 24, height: 16, still: false,
      bytes: [137, 80, 78, 71] });
    const create = vi.fn(() => "blob:decoded-pixels");
    vi.stubGlobal("URL", { ...URL, createObjectURL: create, revokeObjectURL: vi.fn() });
    try {
      render(<App />);
      fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
      const treeImage = await screen.findByTitle("diagram.svg");
      fireEvent.click(treeImage);
      expect(await screen.findByRole("img", { name: "diagram.svg" })).toBeTruthy();
      expect(screen.getByText("Dimensions: 24 × 16")).toBeTruthy();
      expect(screen.getAllByRole("tab", { name: "diagram.svg" })).toHaveLength(1);
      fireEvent.click(treeImage);
      await waitFor(() => expect(screen.getAllByRole("tab", { name: "diagram.svg" })).toHaveLength(1));
      expect(mocks.readDocument).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });

  it("opens a picker-selected image as a scoped explicit-file tab", async () => {
    mocks.selectFile.mockResolvedValue({ id: "explicit-image", name: "Photo.PNG",
      displayPath: "/private/tmp/fixture/Photo.PNG", generation: 3 });
    mocks.openImage.mockResolvedValue({ fileId: "explicit-image", name: "Photo.PNG",
      displayPath: "/private/tmp/fixture/Photo.PNG", identityKey: "1:12", diskVersion: "v1",
      format: "png", mime: "image/png", width: 20, height: 10, still: false,
      bytes: [137, 80, 78, 71] });
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:explicit-image"),
      revokeObjectURL: vi.fn() });
    try {
      render(<App />);
      fireEvent.keyDown(window, { key: "o", metaKey: true });
      expect(await screen.findByRole("img", { name: "Photo.PNG" })).toBeTruthy();
      expect(mocks.selectFile).toHaveBeenCalledOnce();
      expect(mocks.openImage).toHaveBeenCalledWith({ fileId: "explicit-image", explicitFile: true });
      expect(mocks.readDocument).not.toHaveBeenCalled();
      expect(screen.getAllByRole("tab", { name: "Photo.PNG" })).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });

  it("does not resurrect an image tab after it closes during decoding", async () => {
    mocks.listEntries.mockResolvedValue({ entries: [{ name: "delayed.png", kind: "image" }], nextOffset: null });
    let finish!: (image: import("../../src/app/api").ImageResponse) => void;
    mocks.openImage.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("delayed.png"));
    fireEvent.click(await screen.findByRole("button", { name: "Close tab: delayed.png" }));
    await act(async () => finish({ fileId: "late", name: "delayed.png", displayPath: "/tmp/delayed.png",
      identityKey: "1:10", diskVersion: "v1", format: "png", mime: "image/png",
      width: 1, height: 1, still: false, bytes: [137, 80, 78, 71] }));
    expect(screen.queryByRole("tab", { name: "delayed.png" })).toBeNull();
  });

  it("opens a scoped Markdown image link in a read-only image tab", async () => {
    mocks.readDocument.mockResolvedValue({ fileId: "doc", identityKey: "1:1", name: "README.md",
      displayPath: "/tmp/fixture/README.md", content: "[View figure](figure.png)", diskVersion: "v1" });
    mocks.resolveLink.mockResolvedValue({ kind: "image", fileId: "image-1", anchor: null, reason: null });
    mocks.openImage.mockResolvedValue({ fileId: "image-1", name: "figure.png",
      displayPath: "/tmp/fixture/figure.png", identityKey: "1:2", diskVersion: "v1",
      format: "png", mime: "image/png", width: 24, height: 16, still: false,
      bytes: [137, 80, 78, 71] });
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:figure"), revokeObjectURL: vi.fn() });
    try {
      render(<App />);
      fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
      fireEvent.click(await screen.findByTitle("README.md"));
      fireEvent.click(await screen.findByRole("button", { name: "View figure" }));
      expect(await screen.findByRole("img", { name: "figure.png" })).toBeTruthy();
      expect(mocks.resolveLink).toHaveBeenCalledWith("doc", "figure.png");
      expect(mocks.openImage).toHaveBeenCalledWith({ fileId: "image-1" });
    } finally { vi.unstubAllGlobals(); }
  });

  it("keeps rapidly toggled panels out of the accessibility tree while closed", async () => {
    render(<App />);
    const toolbar = within(screen.getByRole("banner"));
    const sidebarButton = toolbar.getByRole("button", { name: "Toggle sidebar" });
    const sidebar = screen.getByRole("complementary", { name: "Explorer" });
    fireEvent.click(sidebarButton);
    expect(screen.queryByRole("complementary", { name: "Explorer" })).toBeNull();
    expect(sidebar.hasAttribute("inert")).toBe(true);
    expect(sidebar.style.width).toBe("0px");
    fireEvent.click(sidebarButton);
    expect(screen.getByRole("complementary", { name: "Explorer" })).toBe(sidebar);
    expect(sidebar.hasAttribute("inert")).toBe(false);

    fireEvent.click(toolbar.getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    await screen.findByRole("heading", { name: "Top" });
    const outlineButton = screen.getByRole("button", { name: "Outline" });
    fireEvent.click(outlineButton);
    const outline = screen.getByRole("complementary", { name: "Outline" });
    fireEvent.click(outlineButton);
    expect(screen.queryByRole("complementary", { name: "Outline" })).toBeNull();
    expect(outline.hasAttribute("inert")).toBe(true);
    fireEvent.click(outlineButton);
    expect(screen.getByRole("complementary", { name: "Outline" })).toBe(outline);
  });

  it("returns reading settings focus on close and cancels a pending exit on reopen", async () => {
    render(<App />);
    const trigger = within(screen.getByRole("banner")).getByRole("button", { name: "Reading settings" });
    fireEvent.click(trigger);
    const panel = document.getElementById("reading-settings-panel");
    expect(panel).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close reading settings" }));
    expect(document.activeElement).toBe(trigger);
    expect(panel?.getAttribute("aria-hidden")).toBe("true");
    expect(panel?.hasAttribute("inert")).toBe(true);
    fireEvent.click(trigger);
    expect(document.getElementById("reading-settings-panel")).toBe(panel);
    expect(panel?.getAttribute("aria-hidden")).toBe("false");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 120)); });
    expect(document.getElementById("reading-settings-panel")).toBe(panel);
  });

  it("removes the settings panel immediately when Reduce Motion is enabled", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(), removeEventListener: vi.fn()
    }));
    try {
      render(<App />);
      const trigger = within(screen.getByRole("banner")).getByRole("button", { name: "Reading settings" });
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("button", { name: "Close reading settings" }));
      expect(document.getElementById("reading-settings-panel")).toBeNull();
      expect(document.activeElement).toBe(trigger);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("navigates duplicate headings from the outline", async () => {
    mocks.readDocument.mockResolvedValue({
      fileId: "top", identityKey: "1:1", name: "README.md", displayPath: "/tmp/fixture/README.md",
      content: "# Repeat\n\n## Repeat\n\n###### Tail"
    });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    await screen.findByRole("heading", { name: "Tail" });
    fireEvent.click(screen.getByRole("button", { name: "Outline" }));
    const outline = screen.getByRole("complementary", { name: "Outline" });
    const repeated = within(outline).getAllByRole("button", { name: "Repeat" });
    expect(repeated).toHaveLength(2);
    expect(document.getElementById("repeat")).toBeTruthy();
    expect(document.getElementById("repeat-1")).toBeTruthy();
    fireEvent.click(repeated[1]);
    expect(scrollIntoView.mock.calls.filter(([options]) => options?.block === "start")).toHaveLength(1);
    expect(repeated[1].getAttribute("aria-current")).toBe("location");
    fireEvent.click(within(outline).getByRole("button", { name: "Tail" }));
    expect(scrollIntoView.mock.calls.filter(([options]) => options?.block === "start")).toHaveLength(2);
  });

  it("follows an anchor within the active document", async () => {
    mocks.readDocument.mockResolvedValue({
      fileId: "top", identityKey: "1:1", name: "README.md", displayPath: "/tmp/fixture/README.md",
      content: "# Target\n\n[Jump](#target)"
    });
    mocks.resolveLink.mockResolvedValue({ kind: "anchor", fileId: null, anchor: "target", reason: null });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    fireEvent.click(await screen.findByRole("button", { name: "Jump" }));
    await waitFor(() => expect(scrollIntoView.mock.calls.filter(([options]) => options?.block === "start")).toHaveLength(1));
    expect(mocks.resolveLink).toHaveBeenCalledWith("top", "#target");
  });

  it("opens a linked document and scrolls to its heading", async () => {
    mocks.readDocument.mockImplementation(async (request: { fileId?: string }) => request.fileId === "linked"
      ? { fileId: "linked", identityKey: "1:2", name: "guide.md", displayPath: "/tmp/fixture/guide.md", content: "# Destination" }
      : { fileId: "top", identityKey: "1:1", name: "README.md", displayPath: "/tmp/fixture/README.md", content: "[Go](guide.md#destination)" });
    mocks.resolveLink.mockResolvedValue({ kind: "document", fileId: "linked", anchor: "destination", reason: null });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    fireEvent.click(await screen.findByRole("button", { name: "Go" }));
    expect(await screen.findByRole("heading", { name: "Destination" })).toBeTruthy();
    await waitFor(() => expect(scrollIntoView.mock.calls.filter(([options]) => options?.block === "start")).toHaveLength(1));
  });
  it("moves keyboard focus through tree rows and tabs", async () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    const first = await screen.findByTitle("README.md");
    const folder = screen.getByTitle("docs");
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(document.activeElement).toBe(folder);
    fireEvent.keyDown(folder, { key: "ArrowRight" });
    const nested = await screen.findByTitle("docs/README.md");
    expect(nested).toBeTruthy();
    nested.focus();
    fireEvent.keyDown(nested, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(folder);
    fireEvent.click(first);
    await screen.findByRole("heading", { name: "Top" });
    fireEvent.click(nested);
    await screen.findByRole("heading", { name: "Nested" });
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(document.activeElement).toBe(tabs[1]);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(window, { key: "w", metaKey: true });
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(1));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab")));
  });
  it("keeps same-name files in distinct tabs and localizes the shell", async () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    expect(await screen.findByRole("heading", { name: "Top" })).toBeTruthy();

    fireEvent.click(screen.getByTitle("docs"));
    fireEvent.click(await screen.findByTitle("docs/README.md"));
    expect(await screen.findByRole("heading", { name: "Nested" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "README.mdfixture", "README.mddocs"
    ]);

    fireEvent.click(screen.getByTitle("README.md"));
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(2));
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    fireEvent.click(screen.getByRole("button", { name: "Proyectos" }));
    expect(screen.getByRole("menuitem", { name: "Abrir carpeta" })).toBeTruthy();
    expect(document.documentElement.lang).toBe("es");
  });

  it("replaces a failed tab when retry succeeds", async () => {
    mocks.readDocument.mockRejectedValueOnce({ code: "missing", message: "No such file" });
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    expect(await screen.findByRole("heading", { name: "This file is missing" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("This file is missing");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    expect(screen.getByRole("heading", { name: "Falta este archivo" })).toBeTruthy();
    expect(screen.queryByText("No such file")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { name: "Top" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(1);
  });

  it("opens the explicit file picker with the keyboard shortcut", async () => {
    mocks.selectFile.mockResolvedValue(null);
    render(<App />);
    fireEvent.keyDown(window, { key: "o", metaKey: true });
    await waitFor(() => expect(mocks.selectFile).toHaveBeenCalledOnce());
  });

  it("offers cancellation while a directory page is pending", async () => {
    mocks.listEntries.mockImplementation(() => new Promise(() => {}));
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    expect((await screen.findByRole("status")).textContent).toContain("Loading");
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(mocks.cancelListing).toHaveBeenCalledOnce());
  });

  it("allows choosing another folder while the first listing is pending", async () => {
    let finishFirst!: (value: { entries: { name: string; kind: "markdown" }[]; nextOffset: null }) => void;
    mocks.selectRoot.mockResolvedValueOnce({ id: "first", name: "first", displayPath: "/tmp/first" })
      .mockResolvedValueOnce({ id: "second", name: "second", displayPath: "/tmp/second" });
    mocks.listEntries.mockImplementation((_rootId: string) => _rootId === "first"
      ? new Promise((resolve) => { finishFirst = resolve; })
      : Promise.resolve({ entries: [{ name: "guide.md", kind: "markdown" }], nextOffset: null }));
    render(<App />);
    const openFolder = within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" });
    fireEvent.click(openFolder);
    await screen.findByRole("button", { name: "Cancel" });
    const projects = screen.getByRole("button", { name: "Projects" });
    await waitFor(() => expect(projects.hasAttribute("disabled")).toBe(false));
    fireEvent.click(projects);
    fireEvent.click(screen.getByRole("menuitem", { name: "Open folder" }));
    expect(await screen.findByTitle("guide.md")).toBeTruthy();
    await waitFor(() => expect(mocks.cancelListing).toHaveBeenCalledOnce());
    await act(async () => finishFirst({ entries: [{ name: "stale.md", kind: "markdown" }], nextOffset: null }));
    expect(screen.queryByTitle("stale.md")).toBeNull();
  });

  it("restores each tab's scroll position during the running session", async () => {
    const { container } = render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("README.md"));
    await screen.findByRole("heading", { name: "Top" });
    const scroll = container.querySelector(".reader-scroll") as HTMLDivElement;
    scroll.scrollTop = 420;
    fireEvent.scroll(scroll);

    fireEvent.click(screen.getByTitle("docs"));
    fireEvent.click(await screen.findByTitle("docs/README.md"));
    await screen.findByRole("heading", { name: "Nested" });
    scroll.scrollTop = 120;
    fireEvent.scroll(scroll);

    fireEvent.click(screen.getAllByRole("tab")[0]);
    expect(scroll.scrollTop).toBe(420);
    fireEvent.click(screen.getAllByRole("tab")[1]);
    expect(scroll.scrollTop).toBe(120);
  });

  it("shows a useful empty state when the Markdown filter hides all files", async () => {
    mocks.listEntries.mockResolvedValue({
      entries: [{ name: "notes.txt", kind: "other" }], nextOffset: null
    });
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    expect(await screen.findByText("No Markdown files here")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose another folder" })).toBeTruthy();
  });
});
