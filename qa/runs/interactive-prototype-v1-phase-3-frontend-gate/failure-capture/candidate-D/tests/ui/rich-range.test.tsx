// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import RichSection from "../../src/reader/RichSection";
import { domPoint } from "../../src/reader/rich-dom";
import { richLeaf, selectRich, typeRich, beforeRich } from "./rich-edit-helpers";
import { blockFormat, richModel } from "../../src/reader/rich-source";
import { replaceSelection } from "../../src/reader/rich-selection";
import type { DraftFindAdapter, EditorCommandState } from "../../src/reader/SectionEditor";
afterEach(cleanup);
function setup(source: string) {
  const onChange = vi.fn(), onCheckpoint = vi.fn(), menu = vi.fn<(state: EditorCommandState) => void>();
  let adapter: DraftFindAdapter | null = null;
  render(<RichSection sessionId="range" fileId="disposable" label="One" initialDraft={source} lineSeparator={"\n"} locale="en"
    onChange={onChange} onCheckpoint={onCheckpoint} onCommandState={menu} onFindReady={value => { adapter = value; }} />);
  return { draft: () => onChange.mock.calls.at(-1)?.[0] ?? source, onCheckpoint, onChange, menu, command: (name: Parameters<NonNullable<DraftFindAdapter["command"]>>[0]) => act(() => adapter?.command?.(name)) };
}
function across(first: string, start: number, last: string, end: number, reverse = false) {
  act(() => {
    const a = richLeaf(first), b = richLeaf(last); a.focus();
    const left = domPoint(a, start), right = domPoint(b, end);
    window.getSelection()!.setBaseAndExtent(...(reverse ? right : left), ...(reverse ? left : right));
    document.dispatchEvent(new Event("selectionchange"));
  });
}
function input(type: string, data = "") {
  act(() => document.querySelector(".rich-section")!.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: type, data })));
}
it.each([false, true])("replaces across rendered inline boundaries preserving surviving markup, reverse=%s", reverse => {
  const { draft, onCheckpoint } = setup("# One\n\nA **bold** and *italic* end.\n\nuntouched &amp; source  \n");
  across("bold", 2, "italic", 3, reverse);
  input("insertText", "X");
  expect(draft()).toBe("# One\n\nA **boX***lic* end.\n\nuntouched &amp; source  \n");
  expect(document.querySelector("strong")?.textContent).toBe("boX");
  expect(document.querySelector("em")?.textContent).toBe("lic");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(draft()).toBe("# One\n\nA **bold** and *italic* end.\n\nuntouched &amp; source  \n");
  expect(onCheckpoint.mock.calls.at(-1)![1].selection).toBeTruthy();
});
it("deletes across paragraphs in one source transaction and restores the range on Undo", () => {
  const { draft } = setup("# One\n\nfirst para\n\nsecond para\n\nthird\n");
  across("first para", 6, "second para", 6);
  input("deleteContentBackward");
  expect(draft()).toBe("# One\n\nfirst  para\n\nthird\n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(window.getSelection()?.toString()).toContain("para");
  fireEvent.click(screen.getByRole("button", { name: "Redo" }));
  expect(draft()).toContain("first  para");
});
it("pastes over a multi-block range, escapes markup and leaves untouched bytes intact", () => {
  const { draft } = setup("# One\n\nfirst\n\nsecond\n\nlast  \n");
  across("first", 2, "second", 3);
  fireEvent.paste(document.querySelector(".rich-section")!, { clipboardData: { getData: () => "*paste*\n\nnext" } });
  expect(draft()).toBe("# One\n\nfi\\*paste\\*\n\nnextond\n\nlast  \n");
});
it("removes complete inline wrappers instead of exposing empty Markdown syntax", () => {
  const { draft } = setup("# One\n\nA **bold** end\n");
  beforeRich("deleteContentBackward", richLeaf("bold"), 0, 4);
  expect(draft()).toBe("# One\n\nA  end\n");
});
it("selects and replaces the complete editable section without touching another document", () => {
  const { draft } = setup("# One\n\nfirst\n\nsecond\n");
  fireEvent.keyDown(richLeaf("first"), { key: "a", metaKey: true }); input("insertText", "replacement");
  expect(draft()).toBe("replacement");
  expect(document.querySelectorAll('.rich-section[contenteditable="true"]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-rich-leaf][contenteditable="true"]')).toHaveLength(0);
});
it("refuses a multi-block range across an opaque node without a source or checkpoint change", () => {
  const source = "# One\n\nfirst\n\n```mermaid\ngraph TD; A-->B\n```\n\nlast\n";
  const { draft, onChange } = setup(source); across("first", 0, "last", 4); input("insertText", "unsafe");
  expect(draft()).toBe(source); expect(onChange).not.toHaveBeenCalled();
  expect(screen.getAllByRole("status").some(node => node.textContent?.includes("cannot safely preserve"))).toBe(true);
});
it("changes the rendered heading level and preserves its authored closing marker", () => {
  const { draft } = setup("# One ###\n\nbody\n");
  act(() => { selectRich(richLeaf("One"), 1); document.dispatchEvent(new Event("selectionchange")); });
  fireEvent.change(screen.getByRole("combobox", { name: "Block format" }), { target: { value: "3" } });
  expect(draft()).toBe("### One ###\n\nbody\n"); expect(screen.getByRole("heading", { level: 3, name: "One" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toBe("# One ###\n\nbody\n");
});
it("indents and outdents a nested item including its continuation and child source", () => {
  const source = "# One\n\n- previous\n- current\n  continuation\n  - child\n- last\n";
  const { draft } = setup(source);
  selectRich(richLeaf("current\ncontinuation"), 0); fireEvent.keyDown(richLeaf("current\ncontinuation"), { key: "Tab" });
  expect(draft()).toBe("# One\n\n- previous\n  - current\n    continuation\n    - child\n- last\n");
  fireEvent.keyDown(richLeaf("current\ncontinuation"), { key: "Tab", shiftKey: true }); expect(draft()).toBe(source);
});
it("Return on an empty nested list item exits one level and remains undoable", () => {
  const { draft } = setup("# One\n\n- parent\n  - child\n  - \n");
  beforeRich("insertParagraph", richLeaf(""), 0); expect(draft()).toBe("# One\n\n- parent\n  - child\n- \n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toBe("# One\n\n- parent\n  - child\n  - \n");
});
it("splits a formatted paragraph without losing formatting or authored surrounding source", () => {
  const { draft } = setup("# One\n\n**first second**\n\nlast\n");
  beforeRich("insertParagraph", richLeaf("first second"), 6);
  expect(draft()).toBe("# One\n\n**first** \n\n**second**\n\nlast\n");
  expect(document.querySelectorAll("strong")).toHaveLength(2);
});
it("routes native source-history commands only while the rendered editor owns focus", async () => {
  const { draft, command, menu } = setup("# One\n\ntext\n");
  typeRich("!", richLeaf("text"), 4); command("undo"); expect(draft()).toBe("# One\n\ntext\n");
  command("redo"); expect(draft()).toBe("# One\n\ntext\\!\n");
  const input = document.createElement("input"); document.body.append(input); input.focus();
  await act(async () => {}); expect(menu.mock.calls.at(-1)![0].owner).toBe(false);
  command("undo"); expect(draft()).toBe("# One\n\ntext\\!\n"); input.remove();
});
it("keeps reference-link syntax and definitions unchanged across a local range replacement", () => {
  const source = "# One\n\n[alpha][r] and omega\n\n[r]: ./target.md 'title'\n";
  const model = richModel(source), first = model.leaves.find(l => l.value === "alpha")!, last = model.leaves.find(l => l.value === " and omega")!;
  const patch = replaceSelection(source, model, { leaf: first, offset: 2 }, { leaf: last, offset: 5 }, "X", "\n");
  expect(source.slice(0, patch.from) + patch.insert + source.slice(patch.to)).toBe("# One\n\n[alX][r]omega\n\n[r]: ./target.md 'title'\n");
});
it("types literal backticks in fenced code and expands inline fences only when necessary", () => {
  const { draft } = setup("# One\n\n~~~javascript\nconst x = 1;\n~~~\n\nUse `code`.\n");
  typeRich("`template`", richLeaf("const x = 1;"), 10, 11);
  expect(draft()).toContain("~~~javascript\nconst x = `template`;\n~~~");
  typeRich("`", richLeaf("code"), 4);
  expect(draft()).toContain("Use `` code` ``."); expect(richLeaf("code`")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toContain("Use `code`.");
});
it("clipboard copy excludes link-property controls and cut is one reversible transaction", () => {
  const { draft } = setup("# One\n\n[alpha](./target.md) and omega\n");
  across("alpha", 0, " and omega", 10);
  const write = vi.fn();
  fireEvent.copy(document.querySelector(".rich-section")!, { clipboardData: { setData: write } });
  expect(write).toHaveBeenCalledWith("text/plain", "alpha and omega");
  fireEvent.cut(document.querySelector(".rich-section")!, { clipboardData: { setData: write } });
  expect(draft()).toBe("# One\n\n\n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toContain("[alpha](./target.md) and omega");
});
it("keyboard selection context menu applies formatting and Escape restores the saved range", () => {
  const { draft } = setup("# One\n\ntext\n");
  selectRich(richLeaf("text"), 0, 4);
  fireEvent.keyDown(richLeaf("text"), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("menuitem", { name: "Bold" })); expect(draft()).toBe("# One\n\n**text**\n");
  selectRich(richLeaf("text"), 1, 3);
  fireEvent.keyDown(richLeaf("text"), { key: "F10", shiftKey: true });
  fireEvent.keyDown(screen.getByRole("menuitem", { name: "Copy" }), { key: "Escape" });
  expect(screen.queryByRole("menu")).toBeNull(); expect(window.getSelection()?.toString()).toBe("ex");
});
it("commits IME replacement across blocks once and restores the source range through Undo", () => {
  const { draft, onChange } = setup("# One\n\nfirst\n\nsecond\n");
  across("first", 2, "second", 3);
  const host = document.querySelector(".rich-section")!;
  fireEvent.compositionStart(host); fireEvent.compositionUpdate(host, { data: "日本語" });
  fireEvent.input(host, { isComposing: true }); expect(onChange).not.toHaveBeenCalled();
  fireEvent.compositionEnd(host, { data: "日本語" });
  expect(draft()).toBe("# One\n\nfi日本語ond\n"); expect(onChange).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toBe("# One\n\nfirst\n\nsecond\n");
});
it("rejects a code edit that would close its existing fence, without rejecting ordinary backticks", () => {
  const { draft, onChange } = setup("# One\n\n```javascript\nabc\n```\n");
  typeRich("```", richLeaf("abc"), 0, 3); expect(onChange).not.toHaveBeenCalled();
  typeRich("`x`", richLeaf("abc"), 0, 3); expect(draft()).toContain("\n`x`\n```");
});
it("keeps typed boundary spaces rendered inside emphasis instead of exposing its delimiters", () => {
  const { draft } = setup("# One\n\n**bold**\n");
  typeRich(" ", richLeaf("bold"), 4);
  expect(document.querySelector("strong")?.textContent).toBe("bold "); expect(draft()).toContain("**bold&#32;**");
  typeRich(" ", richLeaf("bold "), 0); expect(document.querySelector("strong")?.textContent).toBe(" bold ");
});
it.each([0, 4])("splits at an emphasized run boundary without creating empty delimiters at %s", at => {
  const { draft } = setup("# One\n\n**bold**\n");
  beforeRich("insertParagraph", richLeaf("bold"), at);
  expect(draft()).not.toContain("****"); expect(document.querySelector("strong")?.textContent).toBe("bold");
});
it("keeps the literal draft and caret when asynchronous code highlighting changes text nodes", async () => {
  const workers: Array<{ input?: { source: string; language: string }; onmessage: ((event: MessageEvent) => void) | null }> = [];
  class TokenWorker {
    input?: { source: string; language: string }; onmessage: ((event: MessageEvent) => void) | null = null;
    onerror = null;
    constructor() { workers.push(this); }
    postMessage(input: { source: string; language: string }) { this.input = input; }
    terminate() {}
  }
  vi.stubGlobal("Worker", TokenWorker);
  try {
    const { draft } = setup("# One\n\n```javascript\nconst x = 1;\n```\n");
    const leaf = richLeaf("const x = 1;"); selectRich(leaf, 6);
    act(() => workers.at(-1)!.onmessage?.({ data: { kind: "tokens", tokens: [{ className: "tok-keyword", children: [{ text: "const" }] }, { text: " x = 1;" }] } } as MessageEvent));
    expect(document.querySelector(".rich-section .tok-keyword")?.textContent).toBe("const");
    const selection = window.getSelection()!, before = document.createRange(); before.selectNodeContents(leaf); before.setEnd(selection.anchorNode!, selection.anchorOffset);
    expect(before.toString().length).toBe(6);
    typeRich("answer", richLeaf("const x = 1;"), 6, 7);
    expect(draft()).toContain("const answer = 1;"); expect(richLeaf("const answer = 1;")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(richLeaf("const x = 1;")).toBeTruthy();
  } finally { vi.unstubAllGlobals(); }
});

it("replaces a complete supported section containing lists and literal code, then restores its exact source", () => {
  const source = "# One\n\n- first\n- second\n\n```js\nconst x = 1;\n```\n";
  const { draft } = setup(source);
  fireEvent.keyDown(richLeaf("first"), { key: "a", metaKey: true }); input("insertText", "replacement");
  expect(draft()).toBe("replacement");
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toBe(source);
});

it("deletes naturally across rendered formatting boundaries while retaining the remaining authored delimiters", () => {
  const source = "# One\n\nA **bold** and *italic* end\n";
  const { draft } = setup(source);
  beforeRich("deleteContentBackward", richLeaf("bold"), 0);
  expect(draft()).toBe("# One\n\nA**bold** and *italic* end\n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" })); expect(draft()).toBe(source);
  beforeRich("deleteContentForward", richLeaf("bold"), 4);
  expect(draft()).toBe("# One\n\nA **bold**and *italic* end\n");
});

it("keeps whole-table removal disabled while individual source-backed row operations remain available", () => {
  const source = "# One\n\n| A | B |\n|---|---|\n| one | two |\n";
  const { draft, onChange } = setup(source);
  fireEvent.keyDown(richLeaf("One"), { key: "a", metaKey: true }); input("deleteContentBackward");
  expect(draft()).toBe(source); expect(onChange).not.toHaveBeenCalled();
  expect(screen.getAllByRole("status").some(node => node.textContent?.includes("Removing a whole table is disabled"))).toBe(true);
});

it("extends selection to the section edge and gives lists an Escape-then-Tab exit", () => {
  const { draft } = setup("# One\n\n- first\n- last\n");
  selectRich(richLeaf("first"), 2);
  fireEvent.keyDown(richLeaf("first"), { key: "ArrowDown", metaKey: true, shiftKey: true });
  expect(window.getSelection()?.toString()).toContain("last");
  selectRich(richLeaf("first"), 0);
  fireEvent.keyDown(richLeaf("first"), { key: "Escape" });
  expect(fireEvent.keyDown(richLeaf("first"), { key: "Tab" })).toBe(true);
  expect(draft()).toBe("# One\n\n- first\n- last\n");
});

it("changes quote nesting using only authored line prefixes and restores exact source on Undo", () => {
  const source = "# One\n\n> first\n> continuation\n\nend\n";
  const { draft } = setup(source);
  act(() => { selectRich(richLeaf("first\ncontinuation"), 2); document.dispatchEvent(new Event("selectionchange")); });
  fireEvent.click(screen.getByText("Block type / More…"));
  fireEvent.click(screen.getByRole("button", { name: "Blockquote" }));
  expect(draft()).toBe("# One\n\n> > first\n> > continuation\n\nend\n");
  act(() => { selectRich(richLeaf("first\ncontinuation"), 2); document.dispatchEvent(new Event("selectionchange")); });
  fireEvent.click(screen.getByRole("button", { name: "Decrease quote level" })); expect(draft()).toBe(source);
  const opaque = "paragraph <custom>raw</custom>"; const model = richModel(opaque);
  expect(() => blockFormat(opaque, model.leaves[0], "quote", "\n")).toThrow("opaque");
});
