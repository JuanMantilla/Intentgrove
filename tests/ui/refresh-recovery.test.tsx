// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), reconcileVisibleState: vi.fn(),
  discardSectionEdit: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../src/app/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name, listener) => {
  mocks.listeners[name] = listener; return () => { delete mocks.listeners[name]; };
}) }));
vi.mock("../../src/reader/SectionEditor", () => ({ default: ({ onChange, initialDraft }: {
  onChange: (draft: string) => void; initialDraft: string
}) => <button type="button" onClick={() => onChange("# One\nmy edit\n")}>
  Draft source: {initialDraft}
</button> }));
const section = { id: "one", kind: "heading", ordinal: 0, label: "One", level: 1,
  startByte: 0, endByte: 12, sourceHash: "one" };
const doc = (id = "a", version = "v1") => ({ fileId: id, identityKey: `1:${id}`, name: `${id}.md`,
  displayPath: `/tmp/fixture/${id}.md`, content: `# One\n${version === "v1" ? "alpha" : "external"}\n`, diskVersion: version });
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mocks.selectRoot.mockImplementation(async (previous?: string) => ({
    id: previous ? "root2" : "root", name: "fixture", displayPath: "/tmp/fixture", generation: previous ? 2 : 1
  }));
  mocks.selectFile.mockResolvedValue({ id: "outside", name: "outside.md", displayPath: "/tmp/fixture/outside.md", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: ["a", "b"].map((id) => ({ name: `${id}.md`, kind: "markdown" })), nextOffset: null });
  mocks.readDocument.mockImplementation(async ({ fileId, segments }) => doc(fileId ?? segments[0].slice(0, -3)));
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [section] });
  mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1", section, source: "# One\nalpha\n", lineSeparator: "\n" });
  mocks.reconcileVisibleState.mockResolvedValue({ jobId: "job", generation: 1 });
});
afterEach(cleanup);
async function setup(edit = false) {
  render(<App />);
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
  fireEvent.click(await screen.findByTitle("a.md"));
  if (edit) {
    fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    fireEvent.click(await screen.findByRole("button", { name: /Draft source:/ }));
  }
  await waitFor(() => expect(mocks.listeners["refresh:item_status"]).toBeTypeOf("function"));
}
async function status(targetRef: string, reasonCode: string, state = "unavailable") {
  await act(async () => mocks.listeners["refresh:item_status"]({ payload: {
    generation: 1, targetRef, reasonCode, state, checkedAt: Date.now()
  } }));
}

describe("F003D unavailable content and picker reselection", () => {
  it("retains a dirty tab and its editor while explicitly reselecting a replaced root", async () => {
    await setup(true);
    const editor = screen.getByRole("button", { name: /Draft source:/ });
    await status("root", "root_reselection_required");
    expect(screen.getByRole("button", { name: /Draft source:.*my edit/s })).toBe(editor);
    mocks.readDocument.mockResolvedValue(doc("a", "v2"));
    const count = mocks.readDocument.mock.calls.length;
    expect(mocks.selectRoot).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Select folder again" }));
    await waitFor(() => expect(mocks.readDocument.mock.calls.length).toBeGreaterThan(count));
    expect(mocks.selectRoot).toHaveBeenLastCalledWith("root");
    await screen.findByRole("button", { name: "Inspect versions" });
    expect(screen.getByRole("button", { name: /Draft source:.*my edit/s })).toBe(editor);
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it("leaves tabs and draft unchanged when the folder picker is cancelled", async () => {
    await setup(true); await status("root", "root_reselection_required");
    mocks.selectRoot.mockResolvedValueOnce(null);
    fireEvent.click(within(screen.getByRole("complementary")).getByRole("button", { name: "Select folder again" }));
    await waitFor(() => expect(mocks.selectRoot).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("tab", { name: /a.md.*Unsaved/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Draft source:.*my edit/s })).toBeTruthy();
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it("offers file-only reselection without creating a folder or duplicate tab", async () => {
    render(<App />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open file" }));
    await screen.findByRole("tab", { name: "outside.md" });
    await waitFor(() => expect(mocks.listeners["refresh:item_status"]).toBeTypeOf("function"));
    await status("outside", "reselection_required");
    mocks.readDocument.mockResolvedValue(doc("outside", "v2"));
    fireEvent.click(screen.getByRole("button", { name: "Select file again" }));
    await waitFor(() => expect(mocks.selectFile).toHaveBeenLastCalledWith("outside"));
    await screen.findByText("external");
    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(mocks.selectRoot).not.toHaveBeenCalled();
  });

  it("keeps another tab usable and displays a localized persistent uncertain status", async () => {
    await setup();
    fireEvent.click(await screen.findByTitle("b.md"));
    await screen.findByRole("tabpanel", { name: "b.md" });
    await status("a", "watch_failed", "uncertain");
    expect(screen.getByRole("tab", { name: "b.md" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), { target: { value: "es" } });
    fireEvent.click(screen.getByRole("tab", { name: /a.md/ }));
    expect(screen.getByRole("tabpanel", { name: "a.md" }).textContent).toContain("No se pudo confirmar la versión más reciente");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});
