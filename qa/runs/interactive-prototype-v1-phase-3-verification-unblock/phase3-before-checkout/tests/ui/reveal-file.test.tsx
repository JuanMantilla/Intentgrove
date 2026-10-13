import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";

vi.hoisted(() => { Object.defineProperty(navigator, "platform", { configurable: true, get: () => "MacIntel" }); });

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), resolveLink: vi.fn(), readImage: vi.fn(),
  reloadItem: vi.fn(), cancelReload: vi.fn(), revealFile: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn(),
  saveSectionEdit: vi.fn(), discardSectionEdit: vi.fn(),
  loadWorkspaceSession: vi.fn(), checkpointWorkspaceSession: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../src/reader/SectionEditor", () => ({
  default: ({ initialDraft, onChange }: { initialDraft: string; onChange: (draft: string) => void }) =>
    <textarea aria-label="Fixture draft" defaultValue={initialDraft} onChange={event => onChange(event.target.value)} />
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
  mocks.loadWorkspaceSession.mockResolvedValue(null);
  mocks.checkpointWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1 });
  const section = { id: "reading", kind: "heading", ordinal: 0, level: 1, label: "Reading",
    startByte: 0, endByte: 9, sourceHash: "reading" };
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [section] });
  mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1", section,
    source: "# Reading", lineSeparator: "\n" });
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
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
  await waitFor(() => expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "root-file", rootId: "root", segments: [name], snapshotId: "snapshot" }));
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

async function status(targetRef: unknown, state = "unavailable", generation = 1) {
  await waitFor(() => expect(mocks.listeners["refresh:item_status"]).toBeTruthy());
  await act(async () => mocks.listeners["refresh:item_status"]({ payload: {
    generation, targetRef, state, reasonCode: state === "unavailable" ? "missing" : "", checkedAt: 1
  } }));
}

it.each(["missing", "reselection_required", "root_reselection_required", "denied"])("disables a restored tab with known %s availability error", async errorCode => {
  mocks.loadWorkspaceSession.mockResolvedValue({ sequence: 1, completedAtMs: 1, exitDisposition: "normal",
    root: { id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1, errorCode: null },
    tabs: [{ key: "restored", fileId: "restored", name: "readme.md", displayPath: "/tmp/fixture/readme.md",
      rootSegments: ["readme.md"], explicitFile: false, anchor: null, savedDiskVersion: "v1", errorCode, editingActive: false }],
    activeKey: "restored", tree: { expanded: [], selected: [], scrollTop: 0 }, panel: null, window: null });
  render(<App />);
  const tab = await screen.findByRole("tab", { name: /readme.md/ });
  fireEvent.contextMenu(tab);
  expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" }).disabled).toBe(true);
  expect(mocks.revealFile).not.toHaveBeenCalled();
});

it.each(["tab", "explorer", "explicit"])("disables known missing %s Reveal and retains nearby actions/focus", async entry => {
  render(<App />);
  if (entry === "explicit") fireEvent.click(projectAction("Open file"));
  else {
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("readme.md"));
  }
  const tab = await screen.findByRole("tab", { name: entry === "explicit" ? /outside.md/ : /readme.md/ });
  await status(entry === "explicit" ? "external" : "readme");
  const anchor = entry === "explorer" ? screen.getByTitle("readme.md") : tab;
  fireEvent.keyDown(anchor, { key: "F10", shiftKey: true });
  const reveal = screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" });
  expect(reveal.disabled).toBe(true);
  expect(reveal.getAttribute("aria-description")).toBe("This file is missing");
  fireEvent.click(reveal);
  expect(mocks.revealFile).not.toHaveBeenCalled();
  expect(screen.getByRole("menuitem", { name: /Reload / })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("menu"), { key: "ArrowDown" });
  expect(document.activeElement).not.toBe(reveal);
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(document.activeElement).toBe(anchor);
  expect(screen.queryByRole("menu")).toBeNull();
});

it("updates an open explorer menu for missing, recovered and stale-generation states", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const anchor = await screen.findByTitle("readme.md");
  fireEvent.contextMenu(anchor);
  const target = { rootId: "root", segments: ["readme.md"] };
  await status(target, "unavailable", 0);
  expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" }).disabled).toBe(false);
  screen.getByRole("menuitem", { name: "Reveal in Finder" }).focus();
  await status(target);
  const reveal = screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" });
  expect(reveal.disabled).toBe(true);
  expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Reload readme.md" }));
  fireEvent.click(reveal);
  expect(mocks.revealFile).not.toHaveBeenCalled();
  await status(target, "current");
  expect(reveal.disabled).toBe(false);
  fireEvent.click(reveal);
  expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "root-file", rootId: "root", segments: ["readme.md"], snapshotId: "snapshot" });
});

it("disables unavailable root targets without disabling independent explicit grants", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const file = await screen.findByTitle("readme.md");
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/ });
  await status("root");
  fireEvent.contextMenu(file);
  expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" }).disabled).toBe(true);
  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.contextMenu(tab);
  expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" }).disabled).toBe(false);
});

it.each(["tab", "explorer", "explicit"])("keeps saved dirty %s revealable and retains its draft after missing status", async entry => {
  render(<App />);
  if (entry === "explicit") fireEvent.click(projectAction("Open file"));
  else {
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("readme.md"));
  }
  const tab = await screen.findByRole("tab", { name: entry === "explicit" ? /outside.md/ : /readme.md/ });
  fireEvent.contextMenu(await screen.findByLabelText("Edit section: Reading"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit section" }));
  fireEvent.change(await screen.findByLabelText("Fixture draft"), { target: { value: "# Reading\nQA0031 unsaved" } });
  await screen.findByRole("tab", { name: /Unsaved/ });
  const anchor = entry === "explorer" ? screen.getByTitle("readme.md") : tab;
  fireEvent.contextMenu(anchor);
  const reveal = screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" });
  expect(reveal.disabled).toBe(false);
  fireEvent.click(reveal);
  expect(mocks.revealFile).toHaveBeenCalledWith({ kind: "explicit-file", fileId: entry === "explicit" ? "external" : "readme" });
  expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Fixture draft" }).value).toContain("QA0031 unsaved");
  fireEvent.contextMenu(anchor);
  await status(entry === "explicit" ? "external" : "readme");
  expect(screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" }).disabled).toBe(true);
  expect(screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Fixture draft" }).value).toContain("QA0031 unsaved");
  expect(mocks.saveSectionEdit).not.toHaveBeenCalled();
  expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
});


it("freezes the listed target across refresh while a menu is open and permits fresh reselection", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const anchor = await screen.findByTitle("readme.md");
  fireEvent.keyDown(anchor, { key: "F10", shiftKey: true });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "readme.md", kind: "markdown" }], nextOffset: null, snapshotId: "replacement-snapshot" });
  await act(async () => { mocks.listeners["refresh:directory_changed"]?.({ payload: { rootId: "root", segments: [], generation: 1 } }); });
  await waitFor(() => expect(mocks.listEntries).toHaveBeenCalledTimes(2));
  mocks.revealFile.mockRejectedValueOnce({ code: "reselection_required", message: "Listed file changed" });
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  expect(mocks.revealFile).toHaveBeenLastCalledWith({ kind: "root-file", rootId: "root", segments: ["readme.md"], snapshotId: "snapshot" });
  expect(await screen.findByText(/Select file again/)).toBeTruthy();
  fireEvent.contextMenu(screen.getByTitle("readme.md"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Reveal in Finder" }));
  expect(mocks.revealFile).toHaveBeenLastCalledWith({ kind: "root-file", rootId: "root", segments: ["readme.md"], snapshotId: "replacement-snapshot" });
  expect(screen.queryByRole("tab")).toBeNull();
});

it("safely disables an unopened row without a native listing reference", async () => {
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "readme.md", kind: "markdown" }], nextOffset: null });
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.contextMenu(await screen.findByTitle("readme.md"));
  const reveal = screen.getByRole<HTMLButtonElement>("menuitem", { name: "Reveal in Finder" });
  expect(reveal.disabled).toBe(true);
  fireEvent.click(reveal);
  expect(mocks.revealFile).not.toHaveBeenCalled();
});
