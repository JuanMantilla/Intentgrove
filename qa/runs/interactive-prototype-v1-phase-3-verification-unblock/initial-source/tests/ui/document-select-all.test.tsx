// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../src/app/App";
import MarkdownView from "../../src/reader/MarkdownView";
import type { DocumentSelectionAdapter } from "../../src/reader/document-selection";
import { projectAction } from "./project-navigation-helpers";
import { richLeaf, typeRich } from "./rich-edit-helpers";
import { parseBounded } from "../../src/reader/bounded-parser";
import RichSection from "../../src/reader/RichSection";
import { selectDocumentContents } from "../../src/reader/document-selection";

const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), listEntries: vi.fn(), cancelListing: vi.fn(),
  readDocument: vi.fn(), listEditSections: vi.fn(), loadSectionRecovery: vi.fn(),
  beginSectionEdit: vi.fn(), checkpointSectionEdit: vi.fn() }));
vi.mock("../../src/app/api", async importOriginal => ({
  ...await importOriginal<typeof import("../../src/app/api")>(), api: mocks
}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));

beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); window.getSelection()?.removeAllRanges();
  Element.prototype.scrollIntoView = vi.fn();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/selection-fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "one.md", kind: "markdown" }, { name: "two.md", kind: "markdown" }], nextOffset: null });
  mocks.cancelListing.mockResolvedValue(undefined);
  mocks.listEditSections.mockResolvedValue({ sections: [], diskVersion: "v1" });
  mocks.loadSectionRecovery.mockResolvedValue(null);
  mocks.checkpointSectionEdit.mockResolvedValue({ sequence: 1, durationMs: 1 });
  mocks.readDocument.mockImplementation(async ({ segments }: { segments: string[] }) => ({
    fileId: segments[0], identityKey: segments[0], name: segments[0],
    displayPath: `/tmp/selection-fixture/${segments[0]}`, diskVersion: "v1",
    content: segments[0] === "two.md" ? "# Second document\n\nNew active ending." : "# First document\n\nFirst active ending."
  }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const shortcut = (target: EventTarget = window, options = {}) => {
  const event = new KeyboardEvent("keydown", { key: "a", metaKey: true, bubbles: true, cancelable: true, ...options });
  act(() => { target.dispatchEvent(event); });
  return event;
};
async function openOne() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("one.md"));
  await screen.findByRole("heading", { name: "First document" });
}
function expectDocumentSelection() {
  const root = document.querySelector(".document-selection-root")!;
  const selection = window.getSelection()!;
  expect(root.contains(selection.anchorNode)).toBe(true);
  expect(root.contains(selection.focusNode)).toBe(true);
  for (const ui of document.querySelectorAll(".sidebar, .tabs, .document-header"))
    expect(selection.getRangeAt(0).intersectsNode(ui)).toBe(false);
}

describe("document select all", () => {
  function holdSecondRead() {
    let resolve!: (value: object) => void;
    const normalRead = mocks.readDocument.getMockImplementation()!;
    mocks.readDocument.mockImplementation((request: { segments: string[] }) => request.segments[0] === "two.md"
      ? new Promise(value => { resolve = value; }) : normalRead(request));
    return async () => { await act(async () => resolve({ fileId: "two.md", identityKey: "two.md", name: "two.md",
      displayPath: "/tmp/selection-fixture/two.md", diskVersion: "v1", content: "# Second document\n\nNew active ending." })); };
  }

  it("remembers one Cmd+A across first read and close/reopen without selecting the retained document", async () => {
    await openOne();
    const release = holdSecondRead();
    for (let attempt = 0; attempt < 2; attempt++) {
      fireEvent.click(screen.getByTitle("two.md"));
      expect(shortcut().defaultPrevented).toBe(true);
      expect(window.getSelection()!.toString()).toBe("");
      await release();
      await waitFor(() => expect(window.getSelection()!.toString()).toBe("Second documentNew active ending."));
      expectDocumentSelection();
      window.getSelection()!.removeAllRanges();
      fireEvent.keyDown(window, { key: "w", metaKey: true });
      await screen.findByRole("heading", { name: "First document" });
    }
  });

  it("remembers loading intent from an empty workspace before any reader adapter exists", async () => {
    const release = holdSecondRead();
    render(<App />); fireEvent.click(projectAction("Open folder"));
    fireEvent.click(await screen.findByTitle("two.md"));
    expect(shortcut().defaultPrevented).toBe(true);
    await release();
    await waitFor(() => expect(window.getSelection()!.toString()).toBe("Second documentNew active ending."));
  });

  it("cancels a queued read on rapid A to B to A, even when B later completes", async () => {
    await openOne(); const release = holdSecondRead();
    fireEvent.click(screen.getByTitle("two.md")); shortcut();
    fireEvent.click(screen.getByRole("tab", { name: /one.md/ }));
    await release();
    await screen.findByRole("heading", { name: "First document" });
    expect(window.getSelection()!.toString()).toBe("");
    shortcut(); expect(window.getSelection()!.toString()).toBe("First documentFirst active ending.");
  });

  it.each(["field", "modal", "composition"])("cancels remembered loading intent after transient %s ownership", async owner => {
    await openOne(); const release = holdSecondRead();
    fireEvent.click(screen.getByTitle("two.md")); shortcut();
    const field = document.createElement("input"); document.body.append(field);
    if (owner === "field") { field.focus(); expect(shortcut(field).defaultPrevented).toBe(false); }
    if (owner === "modal") { field.setAttribute("aria-modal", "true"); field.remove(); await act(async () => {}); }
    if (owner === "composition") fireEvent.compositionStart(field);
    field.remove();
    await release(); await screen.findByRole("heading", { name: "Second document" });
    expect(window.getSelection()!.toString()).toBe("");
    shortcut(); expect(window.getSelection()!.toString()).toBe("Second documentNew active ending.");
  });

  it("selects only the active document from reading, project and tab focus", async () => {
    await openOne();
    const root = document.querySelector<HTMLElement>(".document-selection-root")!;
    for (const focus of [root, screen.getByTitle("two.md"), screen.getByRole("tab", { name: /one.md/ })]) {
      focus.focus();
      expect(shortcut(focus).defaultPrevented).toBe(true);
      expect(window.getSelection()!.toString()).toBe("First documentFirst active ending.");
      expectDocumentSelection();
    }
  });

  it("uses the newly active document after switching back and forth", async () => {
    await openOne(); shortcut();
    fireEvent.click(screen.getByTitle("two.md"));
    await screen.findByRole("heading", { name: "Second document" });
    const tab = screen.getByRole("tab", { name: /two.md/ }); tab.focus();
    expect(shortcut(tab).defaultPrevented).toBe(true);
    expect(window.getSelection()!.toString()).toBe("Second documentNew active ending.");
    expectDocumentSelection();
    fireEvent.click(screen.getByRole("tab", { name: /one.md/ }));
    await screen.findByRole("heading", { name: "First document" }); shortcut();
    expect(window.getSelection()!.toString()).toBe("First documentFirst active ending.");
  });

  it("leaves Find, other text inputs and external contenteditable owners alone", async () => {
    await openOne();
    fireEvent.keyDown(window, { key: "f", metaKey: true });
    const search = screen.getByRole("searchbox", { name: "Find in document" });
    expect(shortcut(search).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(search);
    // Match rename inputs and any other native field without relying on a
    // particular dialog being available on every supported platform.
    const fixture = document.createElement("div");
    fixture.innerHTML = '<input aria-label="Rename" value="filename.md"><textarea>Notes</textarea><div contenteditable="true" tabindex="0">Other owner</div>';
    document.body.append(fixture);
    for (const field of Array.from(fixture.children) as HTMLElement[]) {
      field.focus();
      expect(shortcut(field).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(field);
    }
    fixture.remove();
  });

  it("preserves modal ownership, composition, modified chords and the empty workspace", async () => {
    render(<App />);
    expect(shortcut().defaultPrevented).toBe(false);
    fireEvent.click(projectAction("Open folder")); fireEvent.click(await screen.findByTitle("one.md"));
    await screen.findByRole("heading", { name: "First document" });
    for (const options of [{ shiftKey: true }, { altKey: true }, { ctrlKey: true }, { isComposing: true }])
      expect(shortcut(window, options).defaultPrevented).toBe(false);
    const modal = document.createElement("div"); modal.setAttribute("aria-modal", "true"); document.body.append(modal);
    expect(shortcut().defaultPrevented).toBe(false); modal.remove();
  });

  it("includes unsaved edited section text and all read-only surroundings", async () => {
    const source = "# One\nalpha\n# Two\nbeta\n";
    const sections = [{ id: "first", kind: "heading", ordinal: 0, level: 1, label: "One", startByte: 0, endByte: 12, sourceHash: "first" },
      { id: "second", kind: "heading", ordinal: 1, level: 1, label: "Two", startByte: 12, endByte: 23, sourceHash: "second" }];
    mocks.readDocument.mockResolvedValue({ fileId: "one.md", identityKey: "one.md", name: "one.md", displayPath: "/tmp/selection-fixture/one.md", diskVersion: "v1", content: source });
    mocks.listEditSections.mockResolvedValue({ sections, diskVersion: "v1" });
    mocks.beginSectionEdit.mockResolvedValue({ sessionId: "edit", diskVersion: "v1", section: sections[0], source: "# One\nalpha\n", lineSeparator: "\n" });
    render(<App />); fireEvent.click(projectAction("Open folder")); fireEvent.click(await screen.findByTitle("one.md"));
    fireEvent.contextMenu(await screen.findByLabelText("Edit section: One"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit section" }));
    await waitFor(() => expect(document.querySelector(".rich-section")).toBeTruthy());
    typeRich("unsaved", richLeaf("alpha"), 0, 5);
    expect(shortcut(richLeaf("unsaved")).defaultPrevented).toBe(true);
    expect(window.getSelection()!.toString()).toContain("unsaved");
    expect(window.getSelection()!.toString()).toContain("beta");
    expectDocumentSelection();
    expect(mocks.readDocument).toHaveBeenCalledTimes(1);
  });

  it("mounts all parsed blocks synchronously, including blocks not painted yet", () => {
    vi.useFakeTimers();
    let adapter: DocumentSelectionAdapter | null = null;
    const content = Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}.`).join("\n\n");
    render(<MarkdownView fileId="long" content={content} locale="en" onNavigate={() => {}}
      onSelectionReady={value => { adapter = value; }} />);
    expect(screen.queryByText("Paragraph 100.")).toBeNull();
    act(() => adapter!.selectAll());
    expect(screen.getByText("Paragraph 100.")).toBeTruthy();
    expect(window.getSelection()!.toString()).toBe(Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}.`).join(""));
  });

  it("keeps native copy and source selection working for a whole rendered draft", () => {
    const checkpoint = vi.fn();
    const view = render(<article tabIndex={-1}><RichSection fileId="whole" sessionId="whole-edit" label="Whole document"
      initialDraft={"First paragraph.\n\nLast paragraph.\n"} lineSeparator={"\n"} locale="en" onChange={() => {}} onCheckpoint={checkpoint} /></article>);
    act(() => selectDocumentContents(view.container.querySelector("article")!));
    fireEvent(document, new Event("selectionchange"));
    expect(document.activeElement?.classList.contains("rich-section")).toBe(true);
    expect(checkpoint.mock.calls.at(-1)?.[1].selection).toEqual({ ranges: [{ anchor: 0, head: 33 }], main: 0 });
    const setData = vi.fn(); fireEvent.copy(document.activeElement!, { clipboardData: { setData } });
    expect(setData).toHaveBeenCalledWith("text/plain", "First paragraph.\n\nLast paragraph.");
  });

  it("selects the complete preserved source after a rendering fallback", () => {
    let adapter: DocumentSelectionAdapter | null = null;
    const content = "x".repeat(260 * 1024);
    render(<MarkdownView fileId="fallback" content={content} locale="en" onNavigate={() => {}}
      onSelectionReady={value => { adapter = value; }} />);
    act(() => adapter!.selectAll());
    expect(window.getSelection()!.toString()).toBe(content);
    expect(document.querySelector("details")!.open).toBe(true);
  });

  it("queues selection until parsing finishes and discards it when the document changes", () => {
    const workers: DeferredWorker[] = [];
    class DeferredWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      request!: { source: string; version: number; generation: number };
      constructor() { workers.push(this); }
      postMessage(request: DeferredWorker["request"]) { this.request = request; }
      terminate() {}
      reply() { const parsed = parseBounded(this.request.source); this.onmessage?.({ data: {
        kind: "parsed", ...this.request, tree: parsed.tree, blocks: parsed.blocks
      } } as MessageEvent); }
    }
    vi.stubGlobal("Worker", DeferredWorker);
    let adapter: DocumentSelectionAdapter | null = null;
    const ready = (value: DocumentSelectionAdapter | null) => { adapter = value; };
    const view = render(<MarkdownView fileId="one" content="# Waiting" locale="en" onNavigate={() => {}} onSelectionReady={ready} />);
    act(() => adapter!.selectAll()); act(() => workers[0].reply());
    expect(window.getSelection()!.toString()).toBe("Waiting");
    view.rerender(<MarkdownView fileId="two" content="# Replacement" locale="en" onNavigate={() => {}} onSelectionReady={ready} />);
    act(() => adapter!.selectAll());
    view.rerender(<MarkdownView fileId="three" content="# Newly active" locale="en" onNavigate={() => {}} onSelectionReady={ready} />);
    act(() => workers[2].reply());
    expect(window.getSelection()!.toString()).toBe("");
    act(() => adapter!.selectAll()); expect(window.getSelection()!.toString()).toBe("Newly active");
  });

  it("cancels deferred layout selection on content replacement, revoked navigation, and transient field focus", () => {
    let adapter: DocumentSelectionAdapter | null = null;
    const ready = (value: DocumentSelectionAdapter | null) => { adapter = value; };
    const props = { fileId: "same", locale: "en" as const, onNavigate: () => {}, onSelectionReady: ready };
    const view = render(<MarkdownView {...props} content="# Original" layoutPending />);
    act(() => adapter!.selectAll());
    view.rerender(<MarkdownView {...props} content="# Replacement" />);
    expect(window.getSelection()!.toString()).toBe("");
    view.rerender(<MarkdownView {...props} content="# Replacement" layoutPending />);
    let current = true;
    act(() => adapter!.selectAll({ isCurrent: () => current })); current = false;
    view.rerender(<MarkdownView {...props} content="# Replacement" />);
    expect(window.getSelection()!.toString()).toBe("");
    view.rerender(<MarkdownView {...props} content="# Replacement" layoutPending />);
    act(() => adapter!.selectAll());
    const field = document.createElement("input"); document.body.append(field);
    act(() => field.focus()); field.remove();
    view.rerender(<MarkdownView {...props} content="# Replacement" />);
    expect(window.getSelection()!.toString()).toBe("");
    act(() => adapter!.selectAll()); expect(window.getSelection()!.toString()).toBe("Replacement");
  });
});
