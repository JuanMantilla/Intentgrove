// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import type { NativePreview } from "../../src/app/api";

const mocks = vi.hoisted(() => ({
  loadWorkspaceSession: vi.fn(), checkpointWorkspaceSession: vi.fn(),
  listNativeEntries: vi.fn(), acceptNativeEntry: vi.fn(), dismissNativeEntry: vi.fn(),
  setNativeMenuState: vi.fn(), resolveLink: vi.fn(),
  listEntries: vi.fn(), cancelListing: vi.fn(), readDocument: vi.fn(),
  loadSectionRecovery: vi.fn(), rememberRecentDocument: vi.fn(),
  listeners: {} as Record<string, (event: { payload: string }) => void>
}));
vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name: string,
  listener: (event: { payload: string }) => void) => {
  mocks.listeners[name] = listener;
  return () => { delete mocks.listeners[name]; };
}) }));

const file: NativePreview = { id: "incoming-1", source: "finder", name: "notes.md",
  displayPath: "/tmp/fixture/notes.md", kind: "document", errorCode: null };
const bad: NativePreview = { id: "incoming-2", source: "drop", name: "link.md",
  displayPath: "/tmp/fixture/link.md", kind: "unsupported", errorCode: "unsupported_type" };

let pending: typeof file[];
beforeEach(() => {
  vi.resetAllMocks();
  mocks.listeners = {};
  localStorage.clear();
  mocks.loadWorkspaceSession.mockResolvedValue(null);
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
  pending = [file, bad];
  mocks.listNativeEntries.mockImplementation(async () => [...pending]);
  mocks.acceptNativeEntry.mockImplementation(async (id) => {
    const entry = pending.find(item => item.id === id)!;
    pending = pending.filter(item => item.id !== id);
    return { kind: entry.kind, grant: { id: "file-1", name: entry.name, displayPath: entry.displayPath, generation: 1 } };
  });
  mocks.dismissNativeEntry.mockImplementation(async (id) => { pending = pending.filter(item => item.id !== id); });
  mocks.readDocument.mockResolvedValue({ fileId: "file-1", name: "notes.md",
    displayPath: "/tmp/fixture/notes.md", identityKey: "1:2", content: "# Notes", diskVersion: "v1" });
  mocks.rememberRecentDocument.mockResolvedValue(undefined);
  mocks.listEntries.mockResolvedValue({ entries: [], nextOffset: null });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.loadSectionRecovery.mockResolvedValue(null);
  mocks.setNativeMenuState.mockResolvedValue(undefined);
});
afterEach(cleanup);

describe("native incoming items", () => {
  it("opens and focuses a cold Finder file without an extra Open action", async () => {
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Notes" })).toBeTruthy();
    expect(mocks.acceptNativeEntry).toHaveBeenCalledExactlyOnceWith("incoming-1", true);
    expect(screen.getByRole("tab", { name: "notes.md" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("button", { name: "Open item: notes.md" })).toBeNull();
    expect(mocks.readDocument).toHaveBeenCalledWith({ fileId: "file-1", explicitFile: true });
  });

  it("follows individual-file links with fragments, history and repeated tab reuse", async () => {
    pending = [file];
    mocks.readDocument.mockImplementation(async (request) => request.fileId === "linked"
      ? { fileId: "linked", identityKey: "1:3", name: "Café 文.md", displayPath: "/tmp/Café 文.md",
          content: "# Destination\n[Return](fixture/notes.md)", diskVersion: "v1" }
      : { fileId: "file-1", identityKey: "1:2", name: "notes.md", displayPath: file.displayPath,
          content: "# Notes\n[Go](../Caf%C3%A9%20%E6%96%87.md#destination)\n[Here](#notes)", diskVersion: "v1" });
    mocks.resolveLink.mockImplementation(async (source, target) => target === "#notes"
      ? { kind: "anchor", fileId: null, anchor: "notes", reason: null }
      : { kind: "document", fileId: source === "file-1" ? "linked" : "file-1",
          anchor: source === "file-1" ? "destination" : null, reason: null });
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<App />);
    await screen.findByRole("heading", { name: "Notes" });
    fireEvent.click(screen.getByRole("button", { name: "Here" }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled());
    for (let index = 0; index < 3; index++) {
      fireEvent.click(screen.getByRole("button", { name: "Go" }));
      await screen.findByRole("heading", { name: "Destination" });
      await waitFor(() => expect(scrollIntoView.mock.contexts.some(element => (element as HTMLElement)?.id === "destination")).toBe(true));
      expect(mocks.readDocument).toHaveBeenCalledWith({ fileId: "linked", explicitFile: true });
      fireEvent.click(screen.getByRole("button", { name: "Return" }));
      await screen.findByRole("heading", { name: "Notes" });
      expect(screen.getAllByRole("tab")).toHaveLength(2);
    }
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "Destination" });
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    await screen.findByRole("heading", { name: "Notes" });
    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(mocks.resolveLink).toHaveBeenCalledWith("file-1", "../Caf%C3%A9%20%E6%96%87.md#destination");
  });

  it.each([["missing", "This file is missing"], ["denied", "Permission denied"],
    ["unsupported_type", "This content is not supported in this version"]])(
    "keeps the individual source and tabs on %s target failure", async (code, message) => {
      pending = [file];
      mocks.readDocument.mockResolvedValue({ fileId: "file-1", identityKey: "1:2", name: "notes.md",
        displayPath: file.displayPath, content: "# Notes\n[Go](target.md)", diskVersion: "v1" });
      mocks.resolveLink.mockRejectedValue({ code, message: "native failure" });
      render(<App />);
      fireEvent.click(await screen.findByRole("button", { name: "Go" }));
      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Notes" })).toBeTruthy();
      expect(screen.getAllByRole("tab")).toHaveLength(1);
      expect(mocks.readDocument).toHaveBeenCalledTimes(1);
    });

  it("waits for session loading before consuming queued files", async () => {
    let resolve!: (value: null) => void;
    mocks.loadWorkspaceSession.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<App />);
    await screen.findByText(/notes.md · Finder/);
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
    await act(async () => { resolve(null); });
    await screen.findByRole("heading", { name: "Notes" });
    expect(mocks.acceptNativeEntry).toHaveBeenCalledExactlyOnceWith("incoming-1", true);
  });

  it("opens warm drop events and focuses the existing file instead of duplicating its tab", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Notes" });
    pending.push({ ...file, id: "incoming-3", source: "drop" });
    await act(async () => { mocks.listeners["native:entry_pending"]({ payload: "" }); });
    await waitFor(() => expect(mocks.acceptNativeEntry).toHaveBeenCalledWith("incoming-3", true));
    await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledTimes(2));
    expect(screen.getAllByRole("tab", { name: "notes.md" })).toHaveLength(1);
  });

  it("serializes multiple files and focuses the last requested tab", async () => {
    pending = [file, { ...file, id: "second", name: "second.markdown" }];
    let resolve!: (value: unknown) => void;
    mocks.readDocument.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    mocks.acceptNativeEntry.mockImplementation(async (id) => {
      const entry = pending.find(item => item.id === id)!;
      pending = pending.filter(item => item.id !== id);
      return { kind: "document", grant: { id, name: entry.name, displayPath: entry.displayPath, generation: 1 } };
    });
    mocks.readDocument.mockImplementation(async (request) => ({ fileId: request.fileId, identityKey: request.fileId,
      name: "second.markdown", content: "# Second", diskVersion: "v1", displayPath: "/tmp/second.markdown" }));
    render(<App />);
    await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledTimes(1));
    expect(mocks.acceptNativeEntry).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ fileId: "incoming-1", identityKey: "first", name: "notes.md",
      content: "# Notes", diskVersion: "v1", displayPath: file.displayPath }); });
    await screen.findByRole("heading", { name: "Second" });
    expect(mocks.acceptNativeEntry.mock.calls.map(call => call[0])).toEqual(["incoming-1", "second"]);
    expect(screen.getByRole("tab", { name: "notes.md" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "second.markdown" }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps an interrupted-session decision ahead of native opening", async () => {
    mocks.loadWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1, exitDisposition: "running",
      root: null, tabs: [], activeKey: null, tree: { expanded: [], selected: null, scrollTop: 0 },
      panel: { sidebarOpen: true, sidebarWidth: 260, outlineOpen: false, outlineWidth: 220,
        readingWidth: 760, readingFont: "roboto", readingSize: 16, readingLineHeight: 1.6 }, window: null });
    render(<App />);
    await screen.findByRole("alertdialog");
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Restore workspace" }));
    await screen.findByRole("heading", { name: "Notes" });
    expect(mocks.acceptNativeEntry).toHaveBeenCalledExactlyOnceWith("incoming-1", true);
  });

  it("finishes restoring the active document and its recovery before opening an incoming file", async () => {
    mocks.loadWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1, exitDisposition: "normal",
      root: null, tabs: [{ key: "saved", fileId: "saved-file", name: "saved.md", displayPath: "/tmp/saved.md",
        rootSegments: null, explicitFile: true, anchor: { headingId: null, offset: 0, scrollTop: 0,
          viewportWidth: 800, viewportHeight: 600, contentVersion: "v1" }, savedDiskVersion: "v1",
        errorCode: null, editingActive: false }], activeKey: "saved",
      tree: { expanded: [], selected: null, scrollTop: 0 }, panel: { sidebarOpen: true, sidebarWidth: 260,
        outlineOpen: false, outlineWidth: 220, readingWidth: 760, readingFont: "roboto", readingSize: 16,
        readingLineHeight: 1.6 }, window: null });
    let resolveRead!: (value: unknown) => void;
    let resolveRecovery!: (value: null) => void;
    mocks.readDocument.mockImplementationOnce(() => new Promise(r => { resolveRead = r; }));
    mocks.loadSectionRecovery.mockImplementationOnce(() => new Promise(r => { resolveRecovery = r; }));
    render(<App />);
    await waitFor(() => expect(mocks.readDocument).toHaveBeenCalledWith({ fileId: "saved-file" }));
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
    await act(async () => { resolveRead({ fileId: "saved-file", name: "saved.md", displayPath: "/tmp/saved.md",
      identityKey: "saved", content: "# Saved", diskVersion: "v1" }); });
    await screen.findByRole("heading", { name: "Saved" });
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
    await act(async () => { resolveRecovery(null); });
    await screen.findByRole("heading", { name: "Notes" });
    expect(screen.getByRole("tab", { name: "saved.md" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "notes.md" }).getAttribute("aria-selected")).toBe("true");
  });
  it("ignores a stale queue snapshot after a newer warm event", async () => {
    pending = [];
    render(<App />);
    await waitFor(() => expect(mocks.listNativeEntries).toHaveBeenCalledTimes(2));
    let resolve!: (value: typeof file[]) => void;
    mocks.listNativeEntries.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    await act(async () => { mocks.listeners["native:entry_pending"]({ payload: "" }); });
    pending = [file];
    await act(async () => { mocks.listeners["native:entry_pending"]({ payload: "" }); });
    await screen.findByRole("heading", { name: "Notes" });
    await act(async () => { resolve([file]); });
    expect(screen.queryByText(/notes.md · Finder/)).toBeNull();
    expect(mocks.acceptNativeEntry).toHaveBeenCalledTimes(1);
  });
  it("retains manual confirmation for folders", async () => {
    pending = [{ ...file, kind: "folder", name: "fixture" }];
    render(<App />);
    expect(await screen.findByRole("button", { name: "Open item: fixture" })).toBeTruthy();
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
  });

  it("reports a failed native grant without repeatedly consuming it", async () => {
    mocks.acceptNativeEntry.mockRejectedValue({ code: "permission_denied" });
    render(<App />);
    await waitFor(() => expect(mocks.acceptNativeEntry).toHaveBeenCalledTimes(1));
    await act(async () => { mocks.listeners["native:entry_pending"]({ payload: "" }); });
    await waitFor(() => expect(mocks.listNativeEntries).toHaveBeenCalledTimes(4));
    expect(mocks.acceptNativeEntry).toHaveBeenCalledTimes(1);
    expect(mocks.readDocument).not.toHaveBeenCalled();
  });

  it("shows a scoped error for an unsupported drop and lets the user dismiss it", async () => {
    render(<App />);
    const region = await screen.findByRole("region", { name: "Items opened from macOS" });
    expect(within(region).getByText(/not supported/)).toBeTruthy();
    expect(within(region).queryByRole("button", { name: "Open item: link.md" })).toBeNull();
    fireEvent.click(within(region).getByRole("button", { name: "Dismiss: link.md" }));
    await waitFor(() => expect(mocks.dismissNativeEntry).toHaveBeenCalledWith("incoming-2"));
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalledWith("incoming-2");
  });

  it("enables menu actions only when a document can use them", async () => {
    render(<App />);
    await waitFor(() => expect(mocks.setNativeMenuState).toHaveBeenCalledWith(expect.objectContaining({
      closeTab: false, save: false, find: false, reload: false, locale: "en"
    })));
    await screen.findByRole("heading", { name: "Notes" });
    await waitFor(() => expect(mocks.setNativeMenuState).toHaveBeenCalledWith(expect.objectContaining({
      closeTab: true, save: false, find: true, reload: true
    })));
    await waitFor(() => expect(mocks.listeners["native:menu"]).toBeDefined());
    act(() => { mocks.listeners["native:menu"]({ payload: "workspace_find" }); });
    expect(await screen.findByRole("searchbox", { name: "Find in document" })).toBeTruthy();
  });
});
