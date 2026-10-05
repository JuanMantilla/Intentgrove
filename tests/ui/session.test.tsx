// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import type { SessionRestore } from "../../src/app/api";
import { unified } from "unified";
import remarkParse from "remark-parse";

const mocks = vi.hoisted(() => ({
  loadWorkspaceSession: vi.fn(), checkpointWorkspaceSession: vi.fn(),
  finishWorkspaceSession: vi.fn(), clearWorkspaceSession: vi.fn(),
  finishEditingClose: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), loadSectionRecovery: vi.fn(),
  selectRoot: vi.fn(), selectFile: vi.fn(),
  reselectSessionRoot: vi.fn(), reselectSessionFile: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));

vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("../../src/reader/SectionEditor", () => ({
  default: ({ initialDraft, initialEditorJson }: { initialDraft: string; initialEditorJson: unknown }) =>
    <div data-testid="restored-editor">{initialDraft}<span>{String(Boolean(initialEditorJson))}</span></div>
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));

function saved(disposition: "normal" | "running" = "normal"): SessionRestore {
  const anchor = { headingId: null, offset: 0, scrollTop: 37,
    viewportWidth: 800, viewportHeight: 600, contentVersion: "v1" };
  return {
    sequence: 9, completedAtMs: 123456789, exitDisposition: disposition,
    root: { id: "root-new", name: "fixture", displayPath: "/tmp/fixture",
      generation: 1, errorCode: null },
    tabs: ["first", "second", "third"].map((key) => ({
      key, fileId: `grant-${key}`, name: `${key}.md`,
      displayPath: `/tmp/fixture/${key}.md`, rootSegments: [`${key}.md`],
      explicitFile: false, anchor: { ...anchor, scrollTop: key === "second" ? 77 : 37 },
      savedDiskVersion: "v1", errorCode: null, editingActive: false
    })),
    activeKey: "second", tree: { expanded: [], selected: ["second.md"], scrollTop: 0 },
    panel: { sidebarOpen: true, sidebarWidth: 260, outlineOpen: false,
      outlineWidth: 220, readingWidth: 760, readingFont: "roboto", readingSize: 16,
      readingLineHeight: 1.6 }, window: null
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners = {};
  localStorage.clear();
  mocks.loadWorkspaceSession.mockResolvedValue(saved());
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 10, completedAtMs: 123456790 });
  mocks.finishWorkspaceSession.mockResolvedValue({ sequence: 11, completedAtMs: 123456791 });
  mocks.clearWorkspaceSession.mockResolvedValue(undefined);
  mocks.finishEditingClose.mockResolvedValue(undefined);
  mocks.listEntries.mockResolvedValue({ entries: [], nextOffset: null });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.loadSectionRecovery.mockResolvedValue(null);
  mocks.reselectSessionRoot.mockResolvedValue(saved());
  mocks.reselectSessionFile.mockResolvedValue({ id: "new-file", name: "second.md",
    displayPath: "/tmp/fixture/second.md", generation: 1 });
  mocks.readDocument.mockImplementation(async ({ fileId }: { fileId: string }) => ({
    fileId, identityKey: fileId, name: `${fileId.slice(6)}.md`,
    displayPath: `/tmp/fixture/${fileId.slice(6)}.md`,
    diskVersion: "v1", content: `# ${fileId.slice(6)}`
  }));
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("workspace session", () => {
  it("waits for actual Markdown rendering before restoring a retained passage", async () => {
    const processor = unified().use(remarkParse);
    let worker!: DeferredWorker;
    class DeferredWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      content = "";
      constructor() { worker = this; }
      postMessage(content: string) { this.content = content; }
      terminate() {}
    }
    vi.stubGlobal("Worker", DeferredWorker);
    const remembered = saved();
    remembered.tabs[1].anchor.headingId = "second";
    remembered.tabs[1].anchor.offset = 12;
    mocks.loadWorkspaceSession.mockResolvedValue(remembered);
    const { container } = render(<App />);
    await waitFor(() => expect(worker?.content).toBe("# second"));
    expect(container.querySelector('.markdown-body')).toBeNull();
    expect(screen.queryByText(/The passage moved/)).toBeNull();
    await act(async () => worker.onmessage?.({ data: { kind: "parsed", tree: processor.parse(worker.content) } } as MessageEvent));
    await screen.findByRole("heading", { name: "second" });
    await waitFor(() => expect(container.querySelector('.reader-scroll')?.scrollTop).toBe(77));
    expect(screen.queryByText(/The passage moved/)).toBeNull();
  });
  it("restores bounded reading values and checkpoints changes", async () => {
    const remembered = saved();
    remembered.panel = { ...remembered.panel, readingFont: "serif", readingSize: 18,
      readingLineHeight: 1.8, readingWidth: 900 };
    mocks.loadWorkspaceSession.mockResolvedValue(remembered);
    const { container } = render(<App />);
    await screen.findByRole("heading", { name: "second" }, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Reading settings" }));
    const panel = screen.getByRole("region", { name: "Reading settings" });
    expect((within(panel).getByRole("combobox") as HTMLSelectElement).value).toBe("serif");
    expect((container.querySelector(".reading-area") as HTMLElement).style.getPropertyValue("--reading-size"))
      .toBe("18px");
    fireEvent.change(within(panel).getByRole("slider", { name: /Text size/ }),
      { target: { value: "20" } });
    await waitFor(() => expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].panel.readingSize)
      .toBe(20));
    fireEvent.click(within(panel).getByRole("button", { name: "Reset reading settings" }));
    expect((within(panel).getByRole("combobox") as HTMLSelectElement).value).toBe("roboto");
  });

  it("keeps tab order and loads the active tab before inactive tabs", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "second" })).toBeTruthy();
    expect(mocks.readDocument.mock.calls.map(([request]) => request.fileId)).toEqual(["grant-second"]);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "first.md", "second.md", "third.md"
    ]);
    fireEvent.click(screen.getAllByRole("tab")[0]);
    expect(await screen.findByRole("heading", { name: "first" })).toBeTruthy();
    expect(mocks.readDocument.mock.calls.map(([request]) => request.fileId)).toEqual([
      "grant-second", "grant-first"
    ]);
    await waitFor(() => expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].activeKey).toBe("first"));
    const checkpoint = mocks.checkpointWorkspaceSession.mock.lastCall?.[0];
    expect(checkpoint.rootId).toBe("root-new");
    expect(checkpoint.tabs.map((tab: { key: string }) => tab.key)).toEqual(["first", "second", "third"]);
    expect(checkpoint.activeKey).toBe("first");
  });
  it("opening an unloaded restored file from the tree reuses its tab and rejects an older restore failure", async () => {
    mocks.listEntries.mockResolvedValue({ entries: [{ name: "first.md", kind: "markdown" }], nextOffset: null });
    render(<App />); await screen.findByRole("heading", { name: "second" });
    let reject!: (error: unknown) => void;
    mocks.readDocument.mockImplementationOnce(() => new Promise((_done, fail) => { reject = fail; }));
    fireEvent.click(screen.getAllByRole("tab")[0]);
    await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledTimes(2));
    mocks.readDocument.mockResolvedValueOnce({ fileId: "grant-first", identityKey: "grant-first", name: "first.md", displayPath: "/tmp/fixture/first.md", content: "# First success", diskVersion: "v1" });
    fireEvent.click(await screen.findByTitle("first.md")); await screen.findByRole("heading", { name: "First success" });
    await act(async () => reject({ code: "missing", message: "Outdated fixture read" }));
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(3));
    expect(screen.queryByRole("alert")).toBeNull(); expect(screen.getByRole("heading", { name: "First success" })).toBeTruthy();
  });

  it("offers a completed crash checkpoint before restoring", async () => {
    mocks.loadWorkspaceSession.mockResolvedValue(saved("running"));
    render(<App />);
    const dialog = await screen.findByRole("alertdialog", { name: "Restore the last workspace checkpoint?" });
    expect(mocks.readDocument).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Restore workspace" }));
    expect(await screen.findByRole("heading", { name: "second" })).toBeTruthy();
  });

  it("clears remembered state and saved drafts only after confirmation", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    fireEvent.click(screen.getByRole("button", { name: "Manage…" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove saved session and drafts; close workspace" }));
    const dialog = screen.getByRole("alertdialog", { name: "Clear the remembered workspace?" });
    expect(mocks.clearWorkspaceSession).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear session" }));
    await waitFor(() => expect(mocks.clearWorkspaceSession).toHaveBeenCalledOnce());
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("keeps a missing folder's tabs available for explicit reselection", async () => {
    const missing = saved();
    missing.root = { id: null, name: "fixture", displayPath: "/tmp/fixture",
      generation: null, errorCode: "root_reselection_required" };
    missing.tabs = missing.tabs.map((tab) => ({ ...tab, fileId: null,
      errorCode: "root_reselection_required" }));
    mocks.loadWorkspaceSession.mockResolvedValue(missing);
    render(<App />);
    expect(await screen.findAllByRole("tab")).toHaveLength(3);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "first.md", "second.md", "third.md"
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Select folder again" }));
    await waitFor(() => expect(mocks.reselectSessionRoot).toHaveBeenCalledOnce());
    expect(await screen.findByRole("heading", { name: "second" })).toBeTruthy();
  });

  it("reselects an unavailable external file without removing other tabs", async () => {
    const missing = saved();
    missing.tabs[1] = { ...missing.tabs[1], fileId: null, rootSegments: null,
      explicitFile: true, errorCode: "reselection_required" };
    mocks.loadWorkspaceSession.mockResolvedValue(missing);
    mocks.readDocument.mockImplementation(async ({ fileId }: { fileId: string }) => ({
      fileId, identityKey: fileId, name: "second.md",
      displayPath: "/tmp/fixture/second.md", diskVersion: "v1", content: "# second"
    }));
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Select file again" }));
    await waitFor(() => expect(mocks.reselectSessionFile).toHaveBeenCalledWith("second"));
    expect(await screen.findByRole("heading", { name: "second" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("restores the active editor and saved history after normal Quit", async () => {
    const normal = saved();
    normal.tabs[1].editingActive = true;
    mocks.loadWorkspaceSession.mockResolvedValue(normal);
    mocks.loadSectionRecovery.mockResolvedValue({
      sessionId: "edit", diskVersion: "v1", section: {
        id: "section", kind: "heading", ordinal: 0, level: 1, label: "second",
        startByte: 0, endByte: 8, sourceHash: "hash"
      }, source: "# second", draft: "# changed", lineSeparator: "\n",
      editorJson: { doc: "# changed", history: { done: [] } },
      editorScrollTop: 12, editorScrollLeft: 0, readerScrollTop: 50,
      sequence: 3, savedAtMs: 123456789, conflict: false
    });
    render(<App />);
    const editor = await screen.findByTestId("restored-editor");
    expect(editor.textContent).toContain("# changed");
    expect(editor.textContent).toContain("true");
    expect(screen.queryByRole("button", { name: "Recover unsaved edit" })).toBeNull();
  });

  it("acknowledges the final durable checkpoint before clean native Quit", async () => {
    const calls: string[] = [];
    mocks.finishWorkspaceSession.mockImplementation(async () => { calls.push("checkpoint");
      return { sequence: 20, completedAtMs: 123456790 }; });
    mocks.finishEditingClose.mockImplementation(async () => { calls.push("quit"); });
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    await waitFor(() => expect(mocks.listeners["editing:close_requested"]).toBeTypeOf("function"));
    mocks.listeners["editing:close_requested"]({ payload: "quit" });
    await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledWith(true));
    expect(calls).toEqual(["checkpoint", "quit"]);
  });

  it("checkpoints keyboard tab reordering", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    const first = screen.getAllByRole("tab")[0];
    fireEvent.keyDown(first, { key: "ArrowRight", altKey: true, shiftKey: true });
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "second.md", "first.md", "third.md"
    ]);
    await waitFor(() => expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].tabs
      .map((tab: { key: string }) => tab.key)).toEqual(["second", "first", "third"]));
  });
});
