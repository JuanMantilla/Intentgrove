import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";

vi.hoisted(() => { Object.defineProperty(navigator, "platform", { configurable: true, get: () => "MacIntel" }); });

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), resolveLink: vi.fn(), readImage: vi.fn(),
  reloadItem: vi.fn(), cancelReload: vi.fn(), revealFile: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../src/app/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
  mocks.revealFile.mockResolvedValue(undefined);
  for (const key of Object.keys(mocks.listeners)) delete mocks.listeners[key];
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
  mocks.selectFile.mockResolvedValue({ id: "external", name: "outside.md", displayPath: "/tmp/outside.md", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [
    { name: "docs", kind: "directory" }, { name: "readme.md", kind: "markdown" }
  ], nextOffset: null, snapshotId: "snapshot" });
  mocks.readDocument.mockImplementation(async (request: { fileId?: string; segments?: string[] }) => ({
    fileId: request.fileId ?? "readme", name: request.fileId ? "outside.md" : "readme.md",
    displayPath: request.fileId ? "/tmp/outside.md" : "/tmp/fixture/readme.md",
    identityKey: "1:1", content: "# Reading", diskVersion: "v1"
  }));
  mocks.reloadItem.mockResolvedValue({ jobId: "job-1", generation: 1, accepted: true });
  mocks.cancelReload.mockResolvedValue({ cancelled: true });
  mocks.cancelListing.mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });


it("reveals a closed explorer file and its tab through native grants with special path characters", async () => {
  const name = "café # $&' (draft), %.md";
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "space folder", displayPath: "/tmp/space folder", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name, kind: "markdown" }], nextOffset: null, snapshotId: "snapshot" });
  mocks.readDocument.mockResolvedValue({ fileId: "special", name, displayPath: `/tmp/space folder/${name}`, identityKey: "1:1", content: "# Fixture", diskVersion: "v1" });
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const file = await screen.findByTitle(name);
  fireEvent.contextMenu(file);
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  await waitFor(() => expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "root-file", rootId: "root", segments: [name] }));
  expect(screen.queryByRole("tab")).toBeNull();
  fireEvent.click(file);
  const tab = await screen.findByRole("tab", { name: new RegExp("café") });
  fireEvent.keyDown(tab, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  await waitFor(() => expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "explicit-file", fileId: "special" }));
});

it("reveals an external tab without a workspace and reports a missing file", async () => {
  mocks.revealFile.mockRejectedValue({ code: "missing", message: "file removed" });
  render(<App />);
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/i });
  fireEvent.contextMenu(tab);
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  await waitFor(() => expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "explicit-file", fileId: "external" }));
  expect(await screen.findByText(/Could not reveal the file/)).toBeTruthy();
  expect(screen.getByRole("tab", { name: /outside.md/i })).toBeTruthy();
});

it.each(["", "untitled.md", "virtual://scratch.md"])("hides reveal for a tab without an absolute local path: %s", async (displayPath) => {
  mocks.readDocument.mockResolvedValue({ fileId: "external", name: "outside.md", displayPath, identityKey: "1:1", content: "# Fixture", diskVersion: "v1" });
  render(<App />);
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/i });
  fireEvent.contextMenu(tab);
  expect(screen.queryByRole("menuitem", { name: "Reveal in Finder" })).toBeNull();
  expect(mocks.revealFile).not.toHaveBeenCalled();
});

it("uses the Windows File Explorer label and preserves its native grant", async () => {
  vi.spyOn(navigator, "platform", "get").mockReturnValue("Win32");
  vi.resetModules();
  const { default: WindowsApp } = await import("../../src/app/App");
  mocks.readDocument.mockResolvedValue({ fileId: "external", name: "outside.md", displayPath: "C:\\space folder\\outside.md", identityKey: "1:1", content: "# Fixture", diskVersion: "v1" });
  render(<WindowsApp />);
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/i });
  fireEvent.contextMenu(tab);
  fireEvent.click(screen.getByRole("menuitem", { name: "Show in File Explorer" }));
  await waitFor(() => expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "explicit-file", fileId: "external" }));
});

it("reports a missing explorer file without opening it", async () => {
  mocks.revealFile.mockRejectedValue({ code: "missing", message: "file removed" });
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.contextMenu(await screen.findByTitle("readme.md"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  expect(await screen.findByText(/Could not reveal the file/)).toBeTruthy();
  expect(screen.queryByRole("tab")).toBeNull();
});
