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
  reselectSessionRoot: vi.fn(), reselectSessionFile: vi.fn(), resolveLink: vi.fn(),
  reloadItem: vi.fn(),
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
  mocks.reloadItem.mockResolvedValue({ jobId: "qa0004-reload", generation: 1, accepted: true });
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

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("workspace session", () => {
  it("starts empty without a content warning when no session exists (QA-0004)", async () => {
    mocks.loadWorkspaceSession.mockResolvedValue(null);
    render(<App />);
    await waitFor(() => expect(mocks.loadWorkspaceSession).toHaveBeenCalledOnce());
    expect(screen.queryByText("This content is not supported in this version")).toBeNull();
    expect(mocks.checkpointWorkspaceSession).not.toHaveBeenCalled();
  });

  it.each(["unsupported_type", "recovery_permissions"])("names startup session failure %s and retains it during supported reading (QA-0004)", async (code) => {
    mocks.loadWorkspaceSession.mockRejectedValue({ code, message: "private storage failed" });
    mocks.selectFile.mockResolvedValue({ id: "grant-first", name: "first.md", displayPath: "/tmp/fixture/first.md" });
    mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
    mocks.listEntries.mockResolvedValue({ entries: [{ name: "first.md", kind: "markdown" }], nextOffset: null });
    mocks.resolveLink.mockResolvedValue({ kind: "document", fileId: "grant-second", anchor: null });
    mocks.readDocument.mockImplementation(async ({ fileId }: { fileId?: string }) => ({
      fileId: fileId ?? "grant-first", identityKey: fileId ?? "grant-first", name: fileId === "grant-second" ? "second.md" : "first.md",
      displayPath: fileId === "grant-second" ? "/tmp/fixture/second.md" : "/tmp/fixture/first.md", diskVersion: "v1",
      content: fileId === "grant-second" ? "# Second" : "# First\n\n[Read second](second.md)"
    }));
    render(<App />);
    const failure = await screen.findByText(/The remembered workspace could not be loaded/);
    expect(failure.textContent).toContain(code);
    expect(screen.queryByText("This content is not supported in this version")).toBeNull();
    fireEvent.keyDown(window, { key: "o", metaKey: true });
    await screen.findByRole("heading", { name: "First" });
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
    fireEvent.click(await screen.findByTitle("first.md"));
    await screen.findByRole("heading", { name: "First" });
    fireEvent.click(screen.getByRole("button", { name: "Read second" }));
    await screen.findByRole("heading", { name: "Second" });
    await waitFor(() => expect(mocks.checkpointWorkspaceSession).toHaveBeenCalled());
    fireEvent.contextMenu(screen.getByRole("tab", { name: /second.md/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Reload second.md" }));
    await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalled());
    await act(async () => mocks.listeners["refresh:item_status"]({ payload: {
      generation: 1, targetRef: { rootId: "root", segments: ["second.md"] }, state: "current", reasonCode: "", checkedAt: 1
    } }));
    await act(async () => mocks.listeners["refresh:job_progress"]({ payload: {
      generation: 1, jobId: "qa0004-reload", examinedCount: 1, confirmedCount: 1, state: "completed"
    } }));
    expect(within(document.querySelector<HTMLElement>(".reload-feedback-footer")!).getByRole("status").textContent)
      .toContain("Already current");
    expect(screen.getByText(/The remembered workspace could not be loaded/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    expect(screen.getByText(/No se pudo cargar el espacio de trabajo recordado/).textContent).toContain(code);
    expect(screen.queryByText(/The remembered workspace could not be loaded/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });
    expect(screen.getByText(/The remembered workspace could not be loaded/)).toBeTruthy();
    fireEvent.click(screen.getByText(/The remembered workspace could not be loaded/).closest(".notice")!
      .querySelector<HTMLButtonElement>("button")!);
    expect(screen.queryByText(/The remembered workspace could not be loaded/)).toBeNull();
  });

  it("keeps a failed checkpoint truthful through locale changes and clears it only after a successful retry (QA-0004)", async () => {
    mocks.checkpointWorkspaceSession.mockRejectedValueOnce({ code: "recovery_permissions", message: "DACL is not protected" });
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    expect((await screen.findByText(/Workspace progress could not be saved/)).textContent).toContain("recovery_permissions");
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    expect(screen.getByText(/No se pudo guardar el progreso/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.checkpointWorkspaceSession).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/Workspace progress could not be saved/)).toBeNull());
  });

  it.each(["none", "pending", "editing"])("preserves checkpoint keys when reopening a picker tab from the tree (recovery: %s)", async (recoveryState) => {
    const pendingRecovery = recoveryState !== "none";
    const restored = saved();
    restored.tabs = [{ ...restored.tabs[0], fileId: "explicit-first", explicitFile: true, rootSegments: null }];
    restored.activeKey = "first";
    if (pendingRecovery) { restored.tabs = []; restored.activeKey = null; }
    mocks.loadWorkspaceSession.mockResolvedValue(restored);
    mocks.selectFile.mockResolvedValue({ id: "explicit-first", name: "first.md", displayPath: "/tmp/fixture/first.md" });
    mocks.listEntries.mockResolvedValue({ entries: [{ name: "first.md", kind: "markdown" }], nextOffset: null });
    mocks.readDocument.mockImplementation(async ({ fileId }: { fileId?: string }) => ({
      fileId: fileId ?? "root-first", identityKey: "same-first", name: "first.md",
      displayPath: "/tmp/fixture/first.md", content: "# First\n\n[Read second](second.md)", diskVersion: "v1"
    }));
    if (pendingRecovery) mocks.loadSectionRecovery.mockResolvedValue({ sessionId: "retained-recovery", diskVersion: "v1",
      section: { id: "section", kind: "whole", ordinal: 0, label: "First", startByte: 0, endByte: 7, sourceHash: "hash" },
      source: "# First", draft: "# Saved draft", lineSeparator: "\n", editorJson: null,
      editorScrollTop: 0, editorScrollLeft: 0, readerScrollTop: 0, sequence: 1, savedAtMs: 123456789, conflict: false });
    mocks.resolveLink.mockResolvedValue({ kind: "blocked", fileId: null, anchor: null, reason: "fixture boundary" });
    render(<App />);
    if (pendingRecovery) {
      await screen.findByTitle("first.md");
      fireEvent.keyDown(window, { key: "o", metaKey: true });
    }
    await screen.findByRole("heading", { name: "First" });
    if (pendingRecovery) await screen.findByRole("button", { name: "Recover unsaved edit" });
    if (recoveryState === "editing") {
      fireEvent.click(screen.getByRole("button", { name: "Recover unsaved edit" }));
      expect(await screen.findByTestId("restored-editor")).toBeTruthy();
    }
    fireEvent.click(await screen.findByTitle("first.md"));
    await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledWith({ rootId: "root-new", segments: ["first.md"] }));
    await waitFor(() => expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].tabs[0].fileId)
      .toBe(pendingRecovery ? "explicit-first" : "root-first"));
    expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].tabs[0].key).toBe(pendingRecovery ? "explicit-first" : "first");
    expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].activeKey).toBe(pendingRecovery ? "explicit-first" : "first");
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    if (recoveryState !== "editing") {
      fireEvent.click(screen.getByRole("button", { name: "Read second" }));
      await waitFor(() => expect(mocks.resolveLink).toHaveBeenCalledWith(pendingRecovery ? "explicit-first" : "root-first", "second.md"));
      if (pendingRecovery) expect(screen.getByRole("button", { name: "Recover unsaved edit" })).toBeTruthy();
    } else {
      expect(screen.getByTestId("restored-editor").textContent).toContain("# Saved draft");
      expect(mocks.checkpointWorkspaceSession.mock.lastCall?.[0].tabs[0].editingActive).toBe(true);
    }
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: "window" }));
    if (!pendingRecovery) {
      await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledWith(false));
      expect(mocks.finishWorkspaceSession.mock.lastCall?.[0].tabs[0]).toMatchObject({ key: "first", fileId: "root-first" });
    } else expect(mocks.finishEditingClose).not.toHaveBeenCalled();
  });

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

  it("reports language storage failure, keeps reading and retries the selected language", async () => {
    const store = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("denied"); });
    try {
      render(<App />);
      await screen.findByRole("heading", { name: "second" });
      fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
      expect(screen.getByText("El idioma cambió, pero no se pudo guardar.")).toBeTruthy();
      expect(screen.getByRole("heading", { name: "second" })).toBeTruthy();
      store.mockRestore();
      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      expect(localStorage.getItem("md-reader-locale")).toBe("es");
      expect(screen.queryByText("El idioma cambió, pero no se pudo guardar.")).toBeNull();
      expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["first.md", "second.md", "third.md"]);
    } finally { store.mockRestore(); }
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

  it.each(["window", "quit"])("keeps %s open on checkpoint failure and permits a protected retry (QA-0003)", async (route) => {
    mocks.finishWorkspaceSession.mockRejectedValueOnce({ code: "session_error", message: "checkpoint failed" });
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    await waitFor(() => expect(mocks.listeners["editing:close_requested"]).toBeTypeOf("function"));
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: route }));
    await waitFor(() => expect(mocks.finishWorkspaceSession).toHaveBeenCalledOnce());
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "second" })).toBeTruthy();
    expect(screen.getByText(/The app could not close safely/).textContent).toContain("session_error");
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: route }));
    await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledWith(route === "quit"));
    expect(mocks.finishWorkspaceSession).toHaveBeenCalledTimes(2);
  });

  it("shows the actual returned close error only in an explicit diagnostic build (QA-0003)", async () => {
    vi.stubEnv("VITE_CLOSE_DIAGNOSTICS", "1");
    mocks.finishWorkspaceSession.mockRejectedValueOnce({ code: "unsupported_type", message: "Expected a regular file or directory" });
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    await waitFor(() => expect(mocks.listeners["editing:close_requested"]).toBeTypeOf("function"));
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: "window" }));
    expect(await screen.findByText("finish_workspace_session: unsupported_type: Expected a regular file or directory")).toBeTruthy();
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
  });

  it("serializes the final checkpoint behind pending writes and ignores duplicate close requests (QA-0003)", async () => {
    let releaseRunning!: (value: { sequence: number; completedAtMs: number }) => void;
    let releaseFinal!: (value: { sequence: number; completedAtMs: number }) => void;
    mocks.checkpointWorkspaceSession.mockImplementationOnce(() => new Promise((resolve) => { releaseRunning = resolve; }));
    mocks.finishWorkspaceSession.mockImplementationOnce(() => new Promise((resolve) => { releaseFinal = resolve; }));
    render(<App />);
    await screen.findByRole("heading", { name: "second" });
    await waitFor(() => expect(releaseRunning).toBeTypeOf("function"));
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: "window" }));
    expect(mocks.finishWorkspaceSession).not.toHaveBeenCalled();
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
    await act(async () => releaseRunning({ sequence: 10, completedAtMs: 123456790 }));
    await waitFor(() => expect(releaseFinal).toBeTypeOf("function"));
    await act(async () => mocks.listeners["editing:close_requested"]({ payload: "window" }));
    expect(mocks.finishWorkspaceSession).toHaveBeenCalledOnce();
    expect(mocks.finishEditingClose).not.toHaveBeenCalled();
    await act(async () => releaseFinal({ sequence: 11, completedAtMs: 123456791 }));
    await waitFor(() => expect(mocks.finishEditingClose).toHaveBeenCalledOnce());
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
