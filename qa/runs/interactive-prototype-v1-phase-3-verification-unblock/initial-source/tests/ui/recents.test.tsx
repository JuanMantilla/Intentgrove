// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  loadWorkspaceSession: vi.fn(), checkpointWorkspaceSession: vi.fn(),
  listRecentItems: vi.fn(), openRecentItem: vi.fn(), reselectRecentItem: vi.fn(),
  removeRecentItem: vi.fn(), clearRecentItems: vi.fn(), rememberRecentDocument: vi.fn(),
  listEntries: vi.fn(), cancelListing: vi.fn(), readDocument: vi.fn(),
  loadSectionRecovery: vi.fn(), selectRoot: vi.fn(), selectFile: vi.fn()
}));
vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));

const documentItem = { id: "recent-1", kind: "document", name: "notes.md",
  parent: "/tmp/project", displayPath: "/tmp/project/notes.md", status: "available", lastUsedMs: 10 };
const folderItem = { id: "recent-2", kind: "folder", name: "project",
  parent: "/tmp", displayPath: "/tmp/project", status: "replaced", lastUsedMs: 9 };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.loadWorkspaceSession.mockResolvedValue(null);
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
  mocks.listRecentItems.mockResolvedValue({ items: [documentItem, folderItem], recoveredCorrupt: false });
  mocks.openRecentItem.mockResolvedValue({ kind: "document", grant: {
    id: "file-1", name: "notes.md", displayPath: "/tmp/project/notes.md", generation: 1 } });
  mocks.reselectRecentItem.mockResolvedValue({ kind: "folder", grant: {
    id: "root-1", name: "project", displayPath: "/tmp/project", generation: 1 } });
  mocks.readDocument.mockResolvedValue({ fileId: "file-1", name: "notes.md",
    displayPath: "/tmp/project/notes.md", identityKey: "1:2", content: "# Notes", diskVersion: "v1" });
  mocks.rememberRecentDocument.mockResolvedValue(undefined);
  mocks.removeRecentItem.mockResolvedValue(undefined);
  mocks.clearRecentItems.mockResolvedValue(undefined);
  mocks.listEntries.mockResolvedValue({ entries: [], nextOffset: null });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.loadSectionRecovery.mockResolvedValue(null);
});
afterEach(cleanup);

describe("recent local items", () => {
  it("opens a verified document and remembers it only after the read", async () => {
    render(<App />);
    const section = await screen.findByRole("region", { name: "Recent items" });
    expect(within(section).getByText("/tmp/project")).toBeTruthy();
    fireEvent.click(within(section).getByRole("button", { name: "Open: notes.md" }));
    await waitFor(() => expect(mocks.openRecentItem).toHaveBeenCalledWith("recent-1"));
    expect(await screen.findByRole("heading", { name: "Notes" })).toBeTruthy();
    expect(mocks.rememberRecentDocument).toHaveBeenCalledWith("file-1");
  });

  it("routes a replaced folder through native reselection", async () => {
    render(<App />);
    const section = await screen.findByRole("region", { name: "Recent items" });
    expect(within(section).getByText("Changed at this path · reselect")).toBeTruthy();
    fireEvent.click(within(section).getByRole("button", { name: "Reselect: project" }));
    await waitFor(() => expect(mocks.reselectRecentItem).toHaveBeenCalledWith("recent-2"));
    expect(mocks.openRecentItem).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.listEntries).toHaveBeenCalled());
  });

  it("requires confirmation for clearing history and leaves the session API untouched", async () => {
    render(<App />);
    const section = await screen.findByRole("region", { name: "Recent items" });
    fireEvent.click(within(section).getByRole("button", { name: "Clear Recents" }));
    expect(mocks.clearRecentItems).not.toHaveBeenCalled();
    const dialog = screen.getByRole("alertdialog", { name: "Clear recent history?" });
    expect(within(dialog).getByText(/Current tabs, saved drafts and source files/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Clear Recents" }));
    await waitFor(() => expect(mocks.clearRecentItems).toHaveBeenCalledWith(true));
    expect(mocks.checkpointWorkspaceSession).not.toHaveBeenCalled();
  });

  it("removes one item and shows corrupt-record recovery and Spanish labels", async () => {
    mocks.listRecentItems.mockResolvedValue({ items: [documentItem], recoveredCorrupt: true });
    render(<App />);
    const section = await screen.findByRole("region", { name: "Recent items" });
    expect(within(section).getByText(/Recent history could not be read/)).toBeTruthy();
    fireEvent.click(within(section).getByRole("button", { name: "Remove from Recents: notes.md" }));
    await waitFor(() => expect(mocks.removeRecentItem).toHaveBeenCalledWith("recent-1"));
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    expect(await screen.findByRole("region", { name: "Elementos recientes" })).toBeTruthy();
  });
});

it("shows known recent rows while records load and local feedback only on the activated row", async () => {
  let listed!: (value: unknown) => void;
  mocks.listRecentItems.mockImplementationOnce(()=>new Promise(resolve=>{listed=resolve;}));
  render(<App />);
  await waitFor(()=>expect(document.querySelector(".loading-rows")).toBeTruthy());
  expect(screen.queryByText("No recent items yet.")).toBeNull();
  listed({items:[documentItem,folderItem],recoveredCorrupt:false});
  const open = await screen.findByRole("button",{name:"Open: notes.md"});
  let finish!: (value: unknown) => void;
  mocks.openRecentItem.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  fireEvent.click(open);
  expect(within(open).getByRole("status",{name:"Loading…"})).toBeTruthy();
  expect(within(screen.getByRole("button",{name:"Reselect: project"})).queryByRole("status")).toBeNull();
  finish(null);
  await waitFor(()=>expect(within(open).queryByRole("status")).toBeNull());
});
