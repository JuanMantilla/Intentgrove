import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), resolveLink: vi.fn(), readImage: vi.fn(),
  reloadItem: vi.fn(), cancelReload: vi.fn(),
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
afterEach(cleanup);

it("returns menu focus on Escape and can reopen with keyboard navigation", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/i });
  fireEvent.contextMenu(tab);
  const menu = screen.getByRole("menu");
  fireEvent.keyDown(menu, { key: "End" });
  expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: /Reload outside.md/i }));
  fireEvent.keyDown(window, { key: "Escape" });
  expect(document.activeElement).toBe(tab);
  expect(screen.queryByRole("menu")).toBeNull();
  expect(menu.isConnected).toBe(false);
  fireEvent.keyDown(tab, { key: "F10", shiftKey: true });
  expect(screen.getByRole("menu")).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Close tab: outside.md" }));
});

it("offers scoped Reload from mouse and keyboard tree context menus without opening a closed file", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const file = await screen.findByTitle("readme.md");
  fireEvent.contextMenu(file);
  fireEvent.click(screen.getByRole("menuitem", { name: /Reload readme.md/i }));
  await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalledWith(
    { kind: "root-file", rootId: "root", segments: ["readme.md"] }, expect.any(String)
  ));
  expect(screen.queryByRole("tab", { name: /readme.md/i })).toBeNull();
  const folder = screen.getByTitle("docs");
  fireEvent.keyDown(folder, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("menuitem", { name: /Reload docs folder/i }));
  await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalledWith(
    { kind: "folder", rootId: "root", segments: ["docs"] }, expect.any(String)
  ));
});

it("offers file-only Reload on an explicit tab and shows progress and cancellation without moving focus", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open file"));
  const tab = await screen.findByRole("tab", { name: /outside.md/i });
  fireEvent.contextMenu(tab);
  fireEvent.click(screen.getByRole("menuitem", { name: /Reload outside.md/i }));
  await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalledWith(
    { kind: "explicit-file", fileId: "external" }, expect.any(String)
  ));
  expect(tab.getAttribute("aria-selected")).toBe("true");
  const listener = mocks.listeners["refresh:job_progress"];
  expect(listener).toBeTypeOf("function");
  listener({ payload: { generation: 1, jobId: "job-1", examinedCount: 7, confirmedCount: 1, state: "running" } });
  expect(await screen.findByText(/7/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(mocks.cancelReload).toHaveBeenCalledWith("job-1", 1));
});

it("keeps a cancelled folder job and its unchecked branch visible", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const folder = await screen.findByTitle("docs");
  fireEvent.contextMenu(folder);
  fireEvent.click(screen.getByRole("menuitem", { name: /Reload docs folder/i }));
  await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalled());
  const listener = mocks.listeners["refresh:job_progress"];
  listener({ payload: { generation: 1, jobId: "job-1", examinedCount: 12, confirmedCount: 2, state: "running" } });
  expect(await screen.findByText("Items checked: 12")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(mocks.cancelReload).toHaveBeenCalledWith("job-1", 1));
  listener({ payload: { generation: 1, jobId: "job-1", examinedCount: 12, confirmedCount: 2,
    currentSegments: ["docs", "nested"], state: "cancelled" } });
  expect(await screen.findByText("Not fully checked: docs/nested")).toBeTruthy();
  expect(folder).toBeTruthy();
});

it("keeps manual success out of tree rows and retains it in the target menu after dismissal", async () => {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  const file = await screen.findByTitle("readme.md");
  const rows = document.querySelectorAll(".tree-row").length;
  fireEvent.contextMenu(file);
  fireEvent.click(screen.getByRole("menuitem", { name: "Reload readme.md" }));
  await waitFor(() => expect(mocks.reloadItem).toHaveBeenCalled());
  await act(async () => mocks.listeners["refresh:item_status"]({ payload: {
    generation: 1, targetRef: { rootId: "root", segments: ["readme.md"] },
    state: "current", reasonCode: "", checkedAt: 1
  } }));
  await act(async () => mocks.listeners["refresh:job_progress"]({ payload: {
    generation: 1, jobId: "job-1", examinedCount: 1, confirmedCount: 1, state: "completed"
  } }));
  const footer = document.querySelector<HTMLElement>(".reload-feedback-footer")!;
  expect(within(footer).getByRole("status").textContent).toContain("✓ readme.md: Already current");
  expect(file.parentElement?.querySelector(".tree-feedback")).toBeNull();
  expect(document.querySelectorAll(".tree-row").length).toBe(rows);
  fireEvent.click(within(footer).getByRole("button", { name: "Dismiss" }));
  expect(within(footer).queryByRole("status")).toBeNull();
  fireEvent.contextMenu(file);
  expect(screen.getByRole("menuitem", { name: "Last reload status" }).getAttribute("aria-description"))
    .toBe("readme.md: Already current");
  fireEvent.keyDown(window, { key: "Escape" });
  await act(async () => mocks.listeners["refresh:item_status"]({ payload: {
    generation: 1, targetRef: { rootId: "root", segments: ["readme.md"] },
    state: "changed", reasonCode: "", checkedAt: 2
  } }));
  expect(within(footer).queryByRole("status")).toBeNull();
});
