// @vitest-environment jsdom
// Actual App/CodeMirror behavior, mocked Tauri integration; no real document writes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import {begin, phase, registered, removed, finish} from "../trace";
import App from "../../../../src/app/App";
import { FindIndex } from "../../../../src/reader/find-index";
import { getAppearance } from "../../../../src/app/appearance";

const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(),
  listEditSections: vi.fn(), beginSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn(), saveSectionEdit: vi.fn(),
  discardSectionEdit: vi.fn(), chooseSectionSaveAs: vi.fn(), commitSectionSaveAs: vi.fn(), listSafetyCopies: vi.fn(),
  clearResolvedSafetyCopies: vi.fn(), clearAllRecovery: vi.fn(), clearWorkspaceSession: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void> }));
vi.mock("../../../../src/app/api", async (original) => ({ ...await original<typeof import("../../../../src/app/api")>(), api: mocks }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async (name, listener) => {
  registered(name,listener); mocks.listeners[name] = listener; return () => { removed(name,listener); if (mocks.listeners[name] === listener) delete mocks.listeners[name]; };
}) }));
const content = "# One\nalpha\n# Two\nbeta\n";
const sections = [
  { id: "one", kind: "heading", ordinal: 0, level: 1, label: "One", startByte: 0, endByte: 12, sourceHash: "one" },
  { id: "two", kind: "heading", ordinal: 1, level: 1, label: "Two", startByte: 12, endByte: 23, sourceHash: "two" }
];
beforeEach(() => {
  begin(mocks);
  vi.resetAllMocks(); localStorage.clear(); getAppearance().applyPreference("dark");
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
  mocks.listEntries.mockImplementation(async (_root, segments) => ({ snapshotId: "v1", nextOffset: null,
    entries: segments.length ? [{ name: "a.md", kind: "markdown" }] : [
      { name: "a.md", kind: "markdown" }, { name: "b.md", kind: "markdown" }, { name: "docs", kind: "directory" }] }));
  mocks.readDocument.mockImplementation(async (request) => ({ fileId: request.segments?.join("/") ?? "outside",
    identityKey: request.segments?.join("/") ?? "outside", name: request.segments?.at(-1) ?? "outside.md",
    displayPath: request.segments ? "/tmp/fixture/" + request.segments.join("/") : "/tmp/other/outside.md", content, diskVersion: "v1" }));
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections });
  mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1", section: sections[0], source: "# One\nalpha\n", lineSeparator: "\n" });
  mocks.checkpointSectionEdit.mockImplementation(async ({ sequence }) => ({ sequence, durationMs: 1 }));
  mocks.discardSectionEdit.mockResolvedValue(undefined); mocks.clearAllRecovery.mockResolvedValue(1);
  mocks.listSafetyCopies.mockResolvedValue({ resolvedCount: 2, resolvedBytes: 1024, unresolvedCount: 1, unresolvedBytes: 2048, usedBytes: 3072, quotaBytes: 9999 });
});
afterEach(async () => { await finish(cleanup, act); getAppearance().applyPreference("system"); });
async function open() {
  phase("setup:start"); render(<App />); phase("setup:rendered");
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
  fireEvent.click(await screen.findByTitle("a.md")); phase("setup:document-clicked");
  await screen.findByRole("button", { name: "Edit section “One”" }); phase("setup:section-ready");
}
async function edit() {
  if(process.env.INTENTGROVE_HOLD_EDIT==="1") mocks.beginSectionEdit.mockImplementation(()=>new Promise(()=>{}));
  await open(); fireEvent.click(screen.getByRole("button", { name: "Edit section “One”" }));
  await waitFor(() => expect(document.querySelector(".cm-editor")).toBeTruthy()); phase("setup:editor-ready");
  return EditorView.findFromDOM(document.querySelector(".cm-editor")!)!;
}

describe("approved workspace handoff", () => {
  it("exposes folder expansion and context actions on root-owned tabs without changing selection", async () => {
    await open(); const folder = screen.getByTitle("docs");
    fireEvent.contextMenu(folder);
    fireEvent.click(screen.getByRole("menuitem", { name: "Expand folder" }));
    expect(await screen.findByTitle("docs/a.md")).toBeTruthy();
    fireEvent.contextMenu(folder);
    fireEvent.click(screen.getByRole("menuitem", { name: "Collapse folder" }));
    expect(screen.queryByTitle("docs/a.md")).toBeNull();
    fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("tab", { name: "b.md" });
    const a = screen.getByRole("tab", { name: "a.md" });
    fireEvent.keyDown(a, { key: "F10", shiftKey: true });
    expect(screen.getByRole("menuitem", { name: "Close other tabs" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Reload a.md" }).textContent).not.toContain("⌘R");
    expect(screen.getByRole("tab", { name: "b.md" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Close other tabs" }));
    await waitFor(() => expect(screen.getAllByRole("tab").length).toBe(1));
    expect(screen.getByRole("tab", { name: "a.md" }).getAttribute("aria-selected")).toBe("true");
  });
  it("closes only tabs to the right and disables an empty range", async () => {
    await open(); fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("tab", { name: "b.md" });
    fireEvent.contextMenu(screen.getByRole("tab", { name: "b.md" }));
    expect((screen.getByRole("menuitem", { name: "Close tabs to the right" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.contextMenu(screen.getByRole("tab", { name: "a.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close tabs to the right" }));
    await waitFor(() => expect(screen.queryByRole("tab", { name: "b.md" })).toBeNull());
    expect(screen.getByRole("tab", { name: "a.md" })).toBeTruthy();
  });
  it("preserves every tab and dirty draft when a batch close is cancelled", async () => {
    const editor = await edit();
    act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("tab", { name: "b.md" });
    fireEvent.contextMenu(screen.getByRole("tab", { name: "b.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close other tabs" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Keep this section edit?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("tab").length).toBe(2);
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: /a.md/ }));
    await waitFor(() => expect(document.querySelector(".cm-content")?.textContent).toContain("draft"));
  });
  it("retains tabs and drafts when a batch Save fails", async () => {
    const editor = await edit();
    act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    fireEvent.click(screen.getByTitle("b.md"));
    await screen.findByRole("tab", { name: "b.md" });
    mocks.saveSectionEdit.mockRejectedValueOnce({ code: "io_error" });
    fireEvent.contextMenu(screen.getByRole("tab", { name: "b.md" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Close other tabs" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Keep this section edit?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(mocks.saveSectionEdit).toHaveBeenCalledOnce());
    expect(screen.getAllByRole("tab").length).toBe(2);
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });

  it("lists full identities in stable tab order and selects without closing", async () => {
    await open(); fireEvent.click(screen.getByTitle("b.md")); await screen.findByRole("tab", { name: "b.md" });
    fireEvent.click(screen.getByRole("button", { name: "Open documents (2)" }));
    const dialog = screen.getByRole("dialog", { name: "Open documents" });
    const files = within(dialog).getAllByRole("button").slice(1);
    expect(files.map((file) => file.textContent)).toEqual(["a.md/tmp/fixture/a.md", "b.md/tmp/fixture/b.mdCurrent document"]);
    fireEvent.click(files[0]);
    await waitFor(() => expect(screen.getByRole("tab", { name: "a.md" }).getAttribute("aria-selected")).toBe("true"));
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["a.md", "b.md"]);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("tab", { name: "a.md" })));
  });
  it("discloses a selectable full path by keyboard without changing the document", async () => {
    await open(); const summary = screen.getByText("Show path");
    summary.focus(); fireEvent.click(summary);
    const path = screen.getByLabelText("Full path: a.md");
    expect(path.textContent).toBe("/tmp/fixture/a.md"); expect(path.tabIndex).toBe(0);
    fireEvent.keyDown(path, { key: "Escape" });
    expect(summary.closest("details")!.open).toBe(false); expect(document.activeElement).toBe(summary);
    expect(screen.getByRole("tab", { name: "a.md" }).getAttribute("aria-selected")).toBe("true");
  });
  it("marks the current row independently from keyboard browsing focus", async () => {
    await open(); const a = screen.getByTitle("a.md"), b = screen.getByTitle("b.md");
    b.focus(); expect(a.getAttribute("aria-current")).toBe("page"); expect(b.getAttribute("aria-current")).toBeNull();
    expect(document.activeElement).toBe(b);
  });
  it("reveals collapsed branches only after explicit request", async () => {
    await open(); fireEvent.click(screen.getByTitle("docs")); fireEvent.click(await screen.findByTitle("docs/a.md"));
    await screen.findByRole("tab", { name: /a.md.*docs/ }); fireEvent.click(screen.getByTitle("docs"));
    expect(screen.queryByTitle("docs/a.md")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /a.md.*fixture/ }));
    fireEvent.click(screen.getByRole("tab", { name: /a.md.*docs/ }));
    expect(screen.queryByTitle("docs/a.md")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show in explorer" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTitle("docs/a.md")));
  });
  it("keeps an outside-root explicit file outside explorer membership", async () => {
    await open(); mocks.selectFile.mockResolvedValue({ id: "outside", name: "outside.md", displayPath: "/tmp/other/outside.md", generation: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Open file" }));
    await screen.findByRole("tab", { name: "outside.md" });
    expect(screen.getByText("Outside the open folder")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show in explorer" })).toBeNull();
  });
  it("uses the visible edit route while keeping heading identity and Find content clean", async () => {
    const editor = await edit(); expect(mocks.beginSectionEdit).toHaveBeenCalledWith("a.md", "one", "v1");
    expect(editor.state.doc.toString()).toBe("# One\nalpha\n");
    const article = document.querySelectorAll(".markdown-body")[1];
    expect(new FindIndex(article).text).not.toContain("Edit section");
    expect(screen.getAllByRole("heading", { name: "One" }).every((heading) => heading.textContent === "One")).toBe(true);
  });
  it("confirms discard, preserves input on cancel and returns to the section button", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    fireEvent.click(screen.getByRole("button", { name: "Discard changes…" }));
    let dialog = screen.getByRole("dialog", { name: "Discard this section’s changes?" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(mocks.discardSectionEdit).not.toHaveBeenCalled(); expect(editor.state.doc.toString()).toContain("draft");
    fireEvent.click(screen.getByRole("button", { name: "Discard changes…" }));
    dialog = screen.getByRole("dialog", { name: "Discard this section’s changes?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(document.querySelector(".cm-editor")).toBeNull());
    expect(mocks.discardSectionEdit).toHaveBeenCalledOnce();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit section “One”" })));
  });
  it("keeps dirty source status after confirmed recovery and protects a submitted save revision", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    await screen.findByText("Recovery copy saved on this Mac");
    expect(screen.getByText("Changes not saved to the file")).toBeTruthy();
    let reject!: (error: unknown) => void;
    mocks.saveSectionEdit.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
    fireEvent.click(screen.getByRole("button", { name: "Save file" }));
    expect(editor.state.facet(EditorState.readOnly)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save file" }));
    expect(mocks.saveSectionEdit).toHaveBeenCalledOnce();
    await act(async () => reject({ code: "io_error", message: "test" }));
    expect(editor.state.doc.toString()).toContain("draft"); expect(editor.state.facet(EditorState.readOnly)).toBe(false);
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
  });
  it("retains draft, selection and Undo while traversing away and back, without saving or discarding", async () => {
    const editor = await edit();
    act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" }, selection: { anchor: 3 } }));
    fireEvent.click(screen.getByTitle("b.md")); await screen.findByRole("tab", { name: "b.md" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(document.querySelector(".cm-content")?.textContent).toContain("draft"));
    const restored = EditorView.findFromDOM(document.querySelector(".cm-editor")!)!;
    expect(restored.state.selection.main.anchor).toBe(3);
    expect(mocks.saveSectionEdit).not.toHaveBeenCalled(); expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(restored.state.doc.toString()).toBe("# One\nalpha\n");
  });
  it("returns to reading only after the submitted header Save succeeds", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    let resolve!: (value: unknown) => void;
    mocks.saveSectionEdit.mockReturnValueOnce(new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByRole("button", { name: "Save file" }));
    expect(document.querySelector(".cm-editor")).toBeTruthy();
    await act(async () => resolve({ content: "# One\nalpha\ndraft\n# Two\nbeta\n", diskVersion: "v2", sections, recoveryCleanupFailed: false }));
    await waitFor(() => expect(document.querySelector(".cm-editor")).toBeNull());
    expect(screen.queryByRole("tab", { name: /Unsaved/ })).toBeNull(); expect(mocks.saveSectionEdit).toHaveBeenCalledOnce();
  });
  it("cancels Save As without clearing the original dirty state", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    mocks.chooseSectionSaveAs.mockResolvedValue(null); phase("save-as:before-click");
    fireEvent.click(screen.getByRole("button", { name: "Save as…" }));
    await waitFor(() => expect(mocks.chooseSectionSaveAs).toHaveBeenCalledOnce()); phase("save-as:invoked");
    await waitFor(() => expect((screen.getByRole("button", { name: "Save as…" }) as HTMLButtonElement).disabled).toBe(false));
    expect(editor.state.facet(EditorState.readOnly)).toBe(false);
    expect(EditorView.findFromDOM(document.querySelector(".cm-editor")!)).toBe(editor);
    expect(mocks.commitSectionSaveAs).not.toHaveBeenCalled(); expect(editor.state.doc.toString()).toContain("draft");
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
  });
  it("waits for the real Save As adapter cancellation while retaining the dirty editor owner", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" }, selection: { anchor: 3 } }));
    let cancel!: (value: null) => void;
    mocks.chooseSectionSaveAs.mockReturnValueOnce(new Promise(resolve => { cancel = resolve; }));
    fireEvent.click(screen.getByRole("button", { name: "Save as…" }));
    await waitFor(() => expect(mocks.chooseSectionSaveAs).toHaveBeenCalledOnce()); phase("save-as:invoked");
    expect((screen.getByRole("button", { name: "Save as…" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
    await act(async () => cancel(null));
    await waitFor(() => expect((screen.getByRole("button", { name: "Save as…" }) as HTMLButtonElement).disabled).toBe(false));
    expect(editor.state.facet(EditorState.readOnly)).toBe(false);
    expect(EditorView.findFromDOM(document.querySelector(".cm-editor")!)).toBe(editor);
    expect(editor.state.doc.toString()).toContain("draft"); expect(editor.state.selection.main.anchor).toBe(3);
    expect(mocks.commitSectionSaveAs).not.toHaveBeenCalled(); expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
  });
  it("preserves search query and returns focus on Escape", async () => {
    await open(); const trigger = screen.getByRole("button", { name: "Projects" });
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("menuitem", { name: "Search folder" })); let input = screen.getByRole("searchbox");
    expect(document.activeElement).toBe(input); fireEvent.change(input, { target: { value: "alpha" } });
    fireEvent.keyDown(input, { key: "Escape" }); expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("menuitem", { name: "Search folder" })); input = screen.getByRole("searchbox");
    expect((input as HTMLInputElement).value).toBe("alpha"); expect(document.activeElement).toBe(input);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect((input as HTMLInputElement).value).toBe("");
  });
  it("saves a separate copy while preserving the original unsaved editor", async () => {
    const editor = await edit(); act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "draft" } }));
    mocks.chooseSectionSaveAs.mockResolvedValue({ token: "copy", name: "copy.md", exists: false });
    mocks.commitSectionSaveAs.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Save as…" }));
    await waitFor(() => expect(mocks.commitSectionSaveAs).toHaveBeenCalledWith("edit", "copy", "# One\nalpha\ndraft", false));
    expect(editor.state.doc.toString()).toContain("draft");
    expect(screen.getByRole("tab", { name: /Unsaved/ })).toBeTruthy();
    expect(screen.getByText(/Copy saved: copy.md/)).toBeTruthy();
  });
  it("discloses broad draft cleanup and cannot invoke deletion until confirmation", async () => {
    await edit(); fireEvent.click(screen.getByRole("button", { name: "Manage…" }));
    expect(within(screen.getByRole("dialog", { name: "Storage and recovery" })).getByText(/Individual copy inspection is not available/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard open edits and delete saved drafts" }));
    const dialog = screen.getByRole("alertdialog", { name: "Remove all saved recovery drafts from this Mac?" });
    expect(within(dialog).getByText(/This ends all open section edits/)).toBeTruthy();
    expect(mocks.clearAllRecovery).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(document.querySelector(".cm-editor")).toBeTruthy(); expect(mocks.discardSectionEdit).not.toHaveBeenCalled();
  });
});

