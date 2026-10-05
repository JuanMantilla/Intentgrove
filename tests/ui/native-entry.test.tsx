// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  loadWorkspaceSession: vi.fn(), checkpointWorkspaceSession: vi.fn(),
  listNativeEntries: vi.fn(), acceptNativeEntry: vi.fn(), dismissNativeEntry: vi.fn(),
  setNativeMenuState: vi.fn(),
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

const file = { id: "incoming-1", source: "finder", name: "notes.md",
  displayPath: "/tmp/fixture/notes.md", kind: "document", errorCode: null };
const bad = { id: "incoming-2", source: "drop", name: "link.md",
  displayPath: "/tmp/fixture/link.md", kind: "unsupported", errorCode: "unsupported_type" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners = {};
  localStorage.clear();
  mocks.loadWorkspaceSession.mockResolvedValue(null);
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
  mocks.listNativeEntries.mockResolvedValue([file, bad]);
  mocks.acceptNativeEntry.mockResolvedValue({ kind: "document", grant: {
    id: "file-1", name: "notes.md", displayPath: "/tmp/fixture/notes.md", generation: 1 } });
  mocks.dismissNativeEntry.mockResolvedValue(undefined);
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
  it("does not grant an incoming file until its Open action", async () => {
    render(<App />);
    const region = await screen.findByRole("region", { name: "Items opened from macOS" });
    expect(within(region).getByText(/notes.md · Finder/)).toBeTruthy();
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
    fireEvent.click(within(region).getByRole("button", { name: "Open item: notes.md" }));
    await waitFor(() => expect(mocks.acceptNativeEntry).toHaveBeenCalledWith("incoming-1"));
    expect(await screen.findByRole("heading", { name: "Notes" })).toBeTruthy();
  });

  it("shows a scoped error for an unsupported drop and lets the user dismiss it", async () => {
    render(<App />);
    const region = await screen.findByRole("region", { name: "Items opened from macOS" });
    expect(within(region).getByText(/not supported/)).toBeTruthy();
    expect(within(region).queryByRole("button", { name: "Open item: link.md" })).toBeNull();
    fireEvent.click(within(region).getByRole("button", { name: "Dismiss: link.md" }));
    await waitFor(() => expect(mocks.dismissNativeEntry).toHaveBeenCalledWith("incoming-2"));
    expect(mocks.acceptNativeEntry).not.toHaveBeenCalled();
  });

  it("enables menu actions only when a document can use them", async () => {
    render(<App />);
    await waitFor(() => expect(mocks.setNativeMenuState).toHaveBeenCalledWith(expect.objectContaining({
      closeTab: false, save: false, find: false, reload: false, locale: "en"
    })));
    fireEvent.click(await screen.findByRole("button", { name: "Open item: notes.md" }));
    await screen.findByRole("heading", { name: "Notes" });
    await waitFor(() => expect(mocks.setNativeMenuState).toHaveBeenCalledWith(expect.objectContaining({
      closeTab: true, save: false, find: true, reload: true
    })));
    await waitFor(() => expect(mocks.listeners["native:menu"]).toBeDefined());
    act(() => { mocks.listeners["native:menu"]({ payload: "workspace_find" }); });
    expect(await screen.findByRole("searchbox", { name: "Find in document" })).toBeTruthy();
  });
});
