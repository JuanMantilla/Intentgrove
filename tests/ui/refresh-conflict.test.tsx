import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(), getConfirmedDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), discardSectionEdit: vi.fn(),
  chooseSectionSaveAs: vi.fn(), commitSectionSaveAs: vi.fn(), checkpointSectionEdit: vi.fn(),
  reconcileVisibleState: vi.fn(),
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
vi.mock("../../src/reader/SectionEditor", () => ({
  default: ({ onChange, initialValue }: { onChange: (value: string) => void; initialValue: string }) =>
    <button type="button" onClick={() => onChange("# One\nmy edit\n")}>
      Change draft {initialValue}
    </button>
}));
const content = "# One\nalpha\n# Two\nbeta\n";
const section = { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One",
  startByte: 0, endByte: 12, sourceHash: "one" };
const disk = (fileId = "a", version = "v2") => ({ fileId, identityKey: `1:${fileId}`, name: `${fileId}.md`,
  displayPath: `/tmp/conflict/${fileId}.md`, content: `# One\nexternal ${version}\n# Two\nbeta\n`, diskVersion: version });

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/conflict", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: ["a", "b"].map((id) => ({ name: `${id}.md`, kind: "markdown" })), nextOffset: null });
  mocks.readDocument.mockImplementation(async ({ segments, fileId }) =>
    fileId ? disk(fileId) : { ...disk(segments[0].slice(0, -3), "v1"), content });
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [section,
    { ...section, id: "two", ordinal: 1, label: "Two", startByte: 12, endByte: 23 }] });
  mocks.beginSectionEdit.mockImplementation(async (id: string) => ({
    sessionId: `session-${id}`, diskVersion: "v1", section, source: "# One\nalpha\n", lineSeparator: "\n"
  }));
  mocks.getConfirmedDocument.mockImplementation(async (id: string, version: string) => disk(id, version));
  mocks.discardSectionEdit.mockResolvedValue(undefined);
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
  mocks.reconcileVisibleState.mockResolvedValue({ generation: 1, jobId: "job", accepted: true });
  mocks.chooseSectionSaveAs.mockResolvedValue({ token: "destination", name: "copy.md", exists: false });
  mocks.commitSectionSaveAs.mockResolvedValue(undefined);
});
afterEach(cleanup);

async function openEdit(id = "a") {
  fireEvent.click(await screen.findByTitle(`${id}.md`));
  await waitFor(() => expect(screen.getByRole("tabpanel", { name: `${id}.md` })).toBeTruthy());
  fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
  fireEvent.click(await screen.findByRole("menuitem", { name: "Edit section" }));
  fireEvent.click(await screen.findByRole("button", { name: /Change draft/ }));
}
async function setup() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  await openEdit();
  await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
}
async function change(id = "a", version = "v2") {
  await act(async () => mocks.listeners["refresh:file_changed"]({ payload: {
    generation: 1, fileId: id, diskVersion: version, identityKey: `1:${id}`, checkedAt: Date.now()
  } }));
}
async function inspect() {
  fireEvent.click(await screen.findByRole("button", { name: "Inspect versions" }));
  await waitFor(() => expect(document.querySelectorAll(".conflict-versions pre")).toHaveLength(2));
}
const confirm = () => fireEvent.click(within(screen.getByRole("alertdialog"))
  .getByRole("button", { name: "Use disk version" }));

describe("F003D conflict choice against approved F004 edits", () => {
  it("compares versions, keeps the draft on Cancel, and rechecks the inspected token before discarding", async () => {
    await setup(); await change(); await inspect();
    expect(screen.getByText("Your unsaved edit")).toBeTruthy();
    expect(screen.getByText("Current disk version")).toBeTruthy();
    expect(document.querySelectorAll(".conflict-versions pre")[0]?.textContent).toContain("my edit");
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    await screen.findByRole("alertdialog"); confirm();
    await waitFor(() => expect(mocks.discardSectionEdit).toHaveBeenCalledWith("session-a"));
    expect(mocks.getConfirmedDocument).toHaveBeenCalledWith("a", "v2", 1);
    expect(screen.queryByRole("button", { name: "Inspect versions" })).toBeNull();
  });

  it("retains the draft when a second writer makes the inspected token stale", async () => {
    await setup(); await change(); await inspect();
    mocks.getConfirmedDocument.mockRejectedValueOnce({ code: "version_changed", message: "changed again" });
    mocks.readDocument.mockResolvedValue(disk("a", "v3"));
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    await screen.findByRole("alertdialog"); confirm();
    await screen.findByText("Disk version changed again");
    await waitFor(() => expect(document.querySelectorAll(".conflict-versions pre")[1]?.textContent).toBe(disk("a", "v3").content));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Change draft/ })).toBeTruthy();
  });

  it("invalidates confirmation and updates the comparison on another change event", async () => {
    await setup(); await change(); await inspect();
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    await screen.findByRole("alertdialog");
    mocks.readDocument.mockResolvedValue(disk("a", "v3"));
    await change("a", "v3");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(document.querySelectorAll(".conflict-versions pre")[1]?.textContent).toBe(disk("a", "v3").content));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    await screen.findByRole("alertdialog"); confirm();
    await waitFor(() => expect(mocks.getConfirmedDocument).toHaveBeenCalledWith("a", "v3", 1));
  });

  it("ignores a late successful confirmation after a newer disk event cancelled the choice", async () => {
    await setup(); await change(); await inspect();
    let complete!: (value: ReturnType<typeof disk>) => void;
    mocks.getConfirmedDocument.mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Use disk version" }));
    await screen.findByRole("alertdialog"); confirm();
    await waitFor(() => expect(mocks.getConfirmedDocument).toHaveBeenCalledOnce());
    mocks.readDocument.mockResolvedValue(disk("a", "v3"));
    await change("a", "v3");
    await act(async () => complete(disk("a", "v2")));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /a.md.*Unsaved/ })).toBeTruthy();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps independent drafts and conflicts, and saves a copy without resolving or overwriting the original", async () => {
    await setup(); await change(); await inspect();
    fireEvent.click(screen.getByRole("button", { name: "Keep my edit" }));
    expect(screen.queryByText("Current disk version")).toBeNull();
    expect(screen.getByRole("button", { name: "Inspect versions" })).toBeTruthy();
    await openEdit("b"); await change("b");
    expect(screen.getAllByRole("tab", { name: /Unsaved/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Save a copy" }));
    await waitFor(() => expect(mocks.commitSectionSaveAs).toHaveBeenCalledWith("session-b", "destination", "# One\nmy edit\n", false));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: /a.md/ }));
    expect(screen.getByRole("button", { name: "Inspect versions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Change draft/ })).toBeTruthy();
  });
});
