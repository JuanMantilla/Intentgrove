import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import userEvent from "@testing-library/user-event";
import { typeRich, richLeaf } from "./rich-edit-helpers";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), listEditSections: vi.fn(), loadSectionRecovery: vi.fn(),
  beginSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn(), discardSectionEdit: vi.fn(),
  getConfirmedDocument: vi.fn(), listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../src/app/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/app/api")>();
  return { ...original, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners = {};
  localStorage.clear();
  const rect = DOMRect.fromRect({ x: 0, y: 0, width: 8, height: 16 });
  Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [rect] });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => rect });
  Element.prototype.scrollIntoView = vi.fn();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture",
    displayPath: "/tmp/fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [
    { name: "one.md", kind: "markdown" }, { name: "two.md", kind: "markdown" }
  ], nextOffset: null });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.listEditSections.mockResolvedValue({ sections: [], diskVersion: "v1" });
  mocks.loadSectionRecovery.mockResolvedValue(null);
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
  mocks.discardSectionEdit.mockResolvedValue(undefined);
  mocks.readDocument.mockImplementation(async ({ segments }: { segments?: string[] }) => ({
    fileId: segments?.[0] === "two.md" ? "two" : "one", identityKey: segments?.[0] ?? "one.md",
    name: segments?.[0] ?? "one.md", displayPath: `/tmp/fixture/${segments?.[0] ?? "one.md"}`,
    diskVersion: "v1", content: segments?.[0] === "two.md" ? "# Other" :
      "# Alpha\n\nAlpha in a [link](guide.md), alpha in `code`, and café."
  }));
});
afterEach(cleanup);

async function openOne() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("one.md"));
  await screen.findByRole("heading", { name: "Alpha" });
}

describe("document Find", () => {
  it("opens with Command+F and counts displayed headings, links and code", async () => {
    await openOne();
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    const search = screen.getByRole("search", { name: "Find in document" });
    const input = within(search).getByRole("searchbox", { name: "Find in document" });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "ALPHA" } });
    await waitFor(() => expect(within(search).getByRole("status").textContent).toBe("1 of 3"));
    fireEvent.keyDown(input, { key: "Enter" });
    expect(within(search).getByRole("status").textContent).toBe("2 of 3");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(within(search).getByRole("status").textContent).toBe("1 of 3");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(within(search).getByRole("status").textContent).toBe("3 of 3");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("search")).toBeNull();
    await waitFor(() => expect(document.activeElement?.classList.contains("markdown-body")).toBe(true));
  });

  it("keeps entry, zero and accent-sensitive matches distinct", async () => {
    await openOne();
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    const input = screen.getByRole("searchbox", { name: "Find in document" });
    expect(screen.getByRole("status", { name: "" }).textContent).toBe("Type to find");
    fireEvent.change(input, { target: { value: "  " } });
    expect(screen.getByRole("status", { name: "" }).textContent).toBe("Type to find");
    fireEvent.change(input, { target: { value: "cafe" } });
    await waitFor(() => expect(screen.getByText("No matches")).toBeTruthy());
    fireEvent.change(input, { target: { value: "CAFÉ" } });
    await waitFor(() => expect(screen.getByText("1 of 1")).toBeTruthy());
  });

  it("closes on tab switch and localizes the band", async () => {
    await openOne();
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alpha" } });
    await screen.findByText("1 of 3");
    fireEvent.click(await screen.findByTitle("two.md"));
    await screen.findByRole("heading", { name: "Other" });
    expect(screen.queryByRole("search")).toBeNull();
    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "es" } });
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    expect(screen.getByRole("searchbox", { name: "Buscar en el documento" })).toBeTruthy();
    expect(screen.getByText("Escribe para buscar")).toBeTruthy();
  });

  it("shows an unavailable state for a failed document", async () => {
    mocks.readDocument.mockRejectedValue({ code: "missing", message: "missing" });
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("one.md"));
    await screen.findByRole("heading", { name: "This file is missing" });
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    expect(screen.getByText("Find is unavailable for this document")).toBeTruthy();
  });

  it("searches only the live rendered draft and follows unsaved edits", async () => {
    const sections = [
      { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One",
        startByte: 0, endByte: 12, sourceHash: "one" },
      { id: "two", kind: "heading", ordinal: 1, level: 1, label: "Two",
        startByte: 12, endByte: 23, sourceHash: "two" }
    ];
    mocks.readDocument.mockResolvedValue({ fileId: "one", identityKey: "one.md", name: "one.md",
      displayPath: "/tmp/fixture/one.md", diskVersion: "v1", content: "# One\nalpha\n# Two\nbeta\n" });
    mocks.listEditSections.mockResolvedValue({ sections, diskVersion: "v1" });
    mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1",
      section: sections[0], source: "# One\nalpha\n", lineSeparator: "\n" });
    render(<App />);
    fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("one.md"));
    fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    await waitFor(() => expect(document.querySelector(".rich-section")).toBeTruthy());
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    const input = screen.getByRole("searchbox", { name: "Find in document" });
    fireEvent.change(input, { target: { value: "beta" } });
    await waitFor(() => expect(screen.getByText("No matches")).toBeTruthy());
    fireEvent.change(input, { target: { value: "alpha" } });
    await waitFor(() => expect(screen.getByText("1 of 1")).toBeTruthy());
    typeRich("changed", richLeaf("alpha"), 0, 5);
    await waitFor(() => expect(screen.getByText("No matches")).toBeTruthy());
    fireEvent.change(input, { target: { value: "changed" } });
    await waitFor(() => expect(screen.getByText("1 of 1")).toBeTruthy());
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it("reindexes the displayed version after an external clean refresh", async () => {
    await openOne();
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "alpha" } });
    await screen.findByText("1 of 3");
    mocks.getConfirmedDocument.mockResolvedValue({ fileId: "one", identityKey: "one.md",
      name: "one.md", displayPath: "/tmp/fixture/one.md", diskVersion: "v2",
      content: "# Different\n\nOnly alpha remains." });
    await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
    mocks.listeners["refresh:file_changed"]({ payload: {
      generation: 1, fileId: "one", diskVersion: "v2", identityKey: "one.md", checkedAt: Date.now()
    } });
    await waitFor(() => expect(screen.getByText("1 of 1")).toBeTruthy());
  });
});

it("QA-0036 preserves query focus and all draft bytes during automatic editable match revelation", async () => {
 const source = "# MIXED_SECTION\nalpha\n";
 const section = { id:"one",kind:"heading",ordinal:0,level:1,label:"MIXED_SECTION",startByte:0,endByte:source.length,sourceHash:"one" };
 mocks.readDocument.mockResolvedValue({fileId:"one",identityKey:"one.md",name:"one.md",displayPath:"/tmp/fixture/one.md",diskVersion:"v1",content:source});
 mocks.listEditSections.mockResolvedValue({sections:[section],diskVersion:"v1"});
 mocks.beginSectionEdit.mockResolvedValue({sessionId:"edit",diskVersion:"v1",section,source,lineSeparator:"\n"});
 render(<App/>);fireEvent.click(projectAction("Open folder"));fireEvent.click(await screen.findByTitle("one.md"));
 fireEvent.contextMenu(await screen.findByLabelText("Edit section: MIXED_SECTION"));fireEvent.click(screen.getByRole("menuitem",{name:"Edit section"}));
 await waitFor(()=>expect(document.querySelector(".rich-section")).toBeTruthy());
 fireEvent.keyDown(window,{key:"f",metaKey:true});const input=screen.getByRole("searchbox",{name:"Find in document"});
 const user=userEvent.setup();await user.keyboard("x");await screen.findByText("1 of 1");
 expect(document.activeElement).toBe(input);await user.keyboard("y");
 expect((input as HTMLInputElement).value).toBe("xy");expect(document.activeElement).toBe(input);
 expect(richLeaf("MIXED_SECTION").textContent).toBe("MIXED_SECTION");
 for(const [checkpoint] of mocks.checkpointSectionEdit.mock.calls)expect(checkpoint.draft).toBe(source);
 await user.clear(input);await user.keyboard("x");await screen.findByText("1 of 1");await user.keyboard("q");
 expect((input as HTMLInputElement).value).toBe("xq");expect(document.activeElement).toBe(input);
 for(const [checkpoint] of mocks.checkpointSectionEdit.mock.calls)expect(checkpoint.draft).toBe(source);
 fireEvent.keyDown(input,{key:"Escape"});await waitFor(()=>expect(document.activeElement?.closest(".rich-section")).not.toBeNull());
});
