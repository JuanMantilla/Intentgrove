// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditorState } from "@codemirror/state";
import { history, historyField, undo, isolateHistory } from "@codemirror/commands";
import RichSection, { restoreSourceState } from "../../src/reader/RichSection";
import { richModel, replaceLeaf } from "../../src/reader/rich-source";
import { beforeRich, richLeaf, selectRich, typeRich } from "./rich-edit-helpers";

afterEach(cleanup);
function setup(source: string, options: Partial<Parameters<typeof RichSection>[0]> = {}) {
  const onChange = vi.fn(), onCheckpoint = vi.fn();
  const props = { sessionId: "test", fileId: "disposable", label: "One", initialDraft: source,
    locale: "en" as const, lineSeparator: "\n", onChange, onCheckpoint, ...options };
  const view = render(<div className="reader-scroll"><RichSection {...props} /></div>);
  const draft = () => onChange.mock.calls.at(-1)?.[0] ?? source;
  return { ...view, draft, onCheckpoint, onChange, props };
}
describe("source-backed rendered editing", () => {
  it("enters without any source change and checkpoints compatible source history", () => {
    const source = "# One\n\nA **bold** paragraph.  \nnext\n\n- item\n\n| A | B |\n| :- | -: |\n| x | y |\n";
    const { onChange, onCheckpoint } = setup(source);
    expect(onChange).not.toHaveBeenCalled();
    expect(onCheckpoint.mock.calls[0][0]).toBe(source);
    expect(document.querySelector(".cm-editor")).toBeNull();
    expect(document.querySelector(".section-preview")).toBeNull();
    expect(document.querySelector("strong")?.textContent).toBe("bold");
    expect(restoreSourceState(source, onCheckpoint.mock.calls[0][1], "\n").doc.toString()).toBe(source);
  });
  it("types, replaces and deletes rendered text while preserving other source bytes", () => {
    const source = "# One\n\nHello world.  \n\n~~~mermaid\ngraph TD; A-->B;\n~~~\n\n<!-- opaque -->\n\n- list item\n";
    const { draft } = setup(source);
    typeRich("earth", richLeaf("Hello world."), 6, 11);
    expect(draft()).toBe(source.replace("world", "earth"));
    beforeRich("deleteContentBackward", richLeaf("Hello earth."), 6);
    expect(draft()).toBe(source.replace("Hello world", "Helloearth"));
    expect(document.querySelectorAll(".rich-opaque").length).toBe(2);
  });
  it("edits list items and table cells without rewriting markers, spacing or alignment", () => {
    const source = "# One\n\n+ first\n+ second\n\n| A | B |\n| :--- | ---: |\n| x | y |\n";
    const { draft } = setup(source);
    typeRich("updated", richLeaf("second"), 0, 6);
    typeRich("cell", richLeaf("y"), 0, 1);
    expect(draft()).toBe(source.replace("second", "updated").replace("| x | y |", "| x | cell |"));
  });
  it("splits paragraphs, continues lists, and makes each operation undoable", () => {
    const { draft } = setup("# One\n\nHello world\n\n+ item\n");
    beforeRich("insertParagraph", richLeaf("Hello world"), 6);
    expect(draft()).toBe("# One\n\nHello \n\nworld\n\n+ item\n");
    beforeRich("insertParagraph", richLeaf("item"), 4);
    typeRich("next", richLeaf(""), 0);
    expect(draft()).toContain("+ item\n+ next");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toContain("+ item\n+ ");
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(draft()).toContain("+ item\n+ next");
  });
  it("pastes text rather than HTML and retains literal punctuation", () => {
    const { draft } = setup("# One\n\nHello\n");
    const leaf = richLeaf("Hello"); selectRich(leaf, 5);
    fireEvent.paste(leaf, { clipboardData: { getData: (type: string) => type === "text/plain" ? " <script>*hi*</script>" : "<b>untrusted</b>" } });
    expect(draft()).toContain("\\<script\\>\\*hi\\*\\<\\/script\\>");
    expect(richLeaf("Hello <script>*hi*</script>")).toBeTruthy();
    expect(document.querySelector("script")).toBeNull();
  });
  it("commits composition atomically, preserving the source and Undo", () => {
    const { draft, onChange } = setup("# One\n\nHello\n");
    const leaf = richLeaf("Hello"); selectRich(leaf, 5);
    fireEvent.compositionStart(leaf);
    act(() => { leaf.textContent = "Hello日本語"; });
    fireEvent.input(leaf, { isComposing: true });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.compositionEnd(leaf);
    expect(draft()).toBe("# One\n\nHello日本語\n");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toBe("# One\n\nHello\n");
  });
  it("restores legacy CodeMirror history and source selection without changing schema", () => {
    let legacy = EditorState.create({ doc: "# One\n\nHello\n", extensions: [history()] });
    legacy = legacy.update({ changes: { from: 12, insert: "!" }, selection: { anchor: 12 }, annotations: isolateHistory.of("full") }).state;
    const source = legacy.doc.toString();
    const { draft, onCheckpoint } = setup(source, { initialEditorJson: legacy.toJSON({ history: historyField }) });
    expect(window.getSelection()?.anchorOffset).toBe(5);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toBe("# One\n\nHello\n");
    expect(() => restoreSourceState(draft(), onCheckpoint.mock.calls.at(-1)![1], "\n")).not.toThrow();
  });
  it("checkpoints a visible composition on focus exit without committing it twice", () => {
    const { draft, onChange, onCheckpoint } = setup("# One\n\nHello\n");
    const leaf = richLeaf("Hello"); selectRich(leaf, 5);
    fireEvent.compositionStart(leaf);
    act(() => { leaf.textContent = "Hello日本語"; });
    fireEvent.blur(leaf);
    expect(draft()).toBe("# One\n\nHello日本語\n");
    expect(onCheckpoint.mock.calls.at(-1)![0]).toBe(draft());
    fireEvent.compositionEnd(leaf);
    expect(onChange).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toBe("# One\n\nHello\n");
  });
  it("retains a mismatched checkpoint and draft instead of silently resetting history", () => {
    const { onCheckpoint, onChange } = setup("# One\n\ndraft\n", { initialEditorJson: { doc: "different", selection: { ranges: [{ anchor: 0, head: 0 }], main: 0 } } });
    expect(screen.getByRole("status").textContent).toContain("history could not be restored");
    expect(onCheckpoint).not.toHaveBeenCalled();
    typeRich("lost", richLeaf("draft"), 0);
    expect(onChange).not.toHaveBeenCalled();
  });
  it("holds input during Save and preserves state through locale changes", () => {
    const { rerender, props, draft, onCheckpoint } = setup("# One\n\nHello\n");
    typeRich("!", richLeaf("Hello"), 5);
    const json = onCheckpoint.mock.calls.at(-1)![1];
    rerender(<div className="reader-scroll"><RichSection {...props} saving locale="es" /></div>);
    typeRich("no", richLeaf("Hello!"), 0);
    expect(draft()).toBe("# One\n\nHello\\!\n");
    expect(onCheckpoint.mock.calls.at(-1)![1]).toEqual(json);
    expect(document.querySelector(".rich-section")!.getAttribute("contenteditable")).toBe("false");
  });
});
describe("source fidelity corpus (frontend UTF-16 spans; no native CRLF claim)", () => {
  it.each(["# Héllo\n\nemoji 😀 and café  \nnext\n", "# One\r\n\r\nalpha\r\n", "# One\n\nA \\*literal\\* &amp; &#x1F600;\n", "# One\n\n[hello][r]\n\n[r]: ./file.md \"title\"\n", "---\na: yes\n---\n\n# One\n\nalpha\n"]) ("retains every untouched source unit: %j", source => {
    const model = richModel(source); const leaf = model.leaves.find(leaf => leaf.value.includes("alpha")) ?? model.leaves.at(-1)!;
    const patch = replaceLeaf(source, leaf, 0, 0, "X", source.includes("\r\n") ? "\r\n" : "\n");
    const result = source.slice(0, patch.from) + patch.insert + source.slice(patch.to);
    expect(result.slice(0, patch.from)).toBe(source.slice(0, patch.from));
    expect(result.slice(patch.from + patch.insert.length)).toBe(source.slice(patch.to));
  });
  it("preserves decoded escape/entity boundaries and never splits emoji", () => {
    const source = "A \\*literal\\* &amp; &#x1F600;";
    const leaf = richModel(source).leaves[0];
    const at = leaf.value.indexOf("literal"); const patch = replaceLeaf(source, leaf, at, at + 7, "edited", "\n");
    expect(source.slice(0, patch.from) + patch.insert + source.slice(patch.to)).toBe("A \\*edited\\* &amp; &#x1F600;");
    expect(() => replaceLeaf(source, leaf, leaf.value.length - 1, leaf.value.length, "", "\n")).toThrow();
  });
  it("can restore new checkpoints through the original CodeMirror reader", () => {
    const state = restoreSourceState("alpha", undefined, "\n").update({ changes: { from: 5, insert: "x" }, annotations: isolateHistory.of("full") }).state;
    let restored = EditorState.fromJSON(state.toJSON({ history: historyField }), { extensions: [history()] }, { history: historyField });
    undo({ state: restored, dispatch: transaction => { restored = transaction.state; } });
    expect(restored.doc.toString()).toBe("alpha");
  });
});

describe("structural and literal editing", () => {
  it("removes a paragraph boundary and a list sibling with one reversible splice", () => {
    const { draft } = setup("# One\n\nfirst\n\nsecond\n\n- a\n- b\n");
    beforeRich("deleteContentBackward", richLeaf("second"), 0);
    expect(draft()).toContain("firstsecond\n");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toContain("first\n\nsecond");
    beforeRich("deleteContentBackward", richLeaf("b"), 0);
    expect(draft()).toContain("- ab\n");
  });
  it("handles emoji composition replacements without splitting surrogate pairs", () => {
    const { draft } = setup("# One\n\nHi 😀\n");
    const leaf = richLeaf("Hi 😀"); selectRich(leaf, 3, 5);
    fireEvent.compositionStart(leaf);
    act(() => { leaf.textContent = "Hi 😃"; });
    fireEvent.compositionEnd(leaf);
    expect(draft()).toBe("# One\n\nHi 😃\n");
  });
  it("handles an uncancelable browser replacement through the same localized source mapper", () => {
    const { draft } = setup("# One\n\nspeling\n");
    const leaf = richLeaf("speling"); act(() => { leaf.textContent = "spelling"; });
    fireEvent.input(leaf, { inputType: "insertReplacementText" });
    expect(draft()).toBe("# One\n\nspelling\n");
  });
  it("preserves a code fence and changes only literal code content", () => {
    const { draft } = setup("# One\n\n~~~~js\nlet n = 1;\n~~~~\n");
    typeRich("2", richLeaf("let n = 1;"), 8, 9);
    expect(draft()).toBe("# One\n\n~~~~js\nlet n = 2;\n~~~~\n");
  });
  it("keeps text unchanged when a selection crosses an opaque block", () => {
    const { onChange } = setup("# One\n\nbefore\n\n```mermaid\ngraph TD; A-->B;\n```\n\nafter\n");
    const before = richLeaf("before"), after = richLeaf("after");
    before.focus(); window.getSelection()!.setBaseAndExtent(before.firstChild!, 0, after.firstChild!, 5);
    act(() => before.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "deleteContentBackward" })));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/This operation cannot safely preserve/)).toBeTruthy();
  });
  it("edits link properties without fetching and keeps an unchanged Apply byte-identical", () => {
    const source = "# One\n\n[**label**](./other.md 'title')\n";
    const { draft, onChange } = setup(source);
    fireEvent.click(screen.getByRole("button", { name: "Link…" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Link…" }));
    fireEvent.change(screen.getByLabelText("Local target"), { target: { value: "./new.md" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(draft()).toBe('# One\n\n[**label**](<./new.md> "title")\n');
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toBe(source);
  });
  it("supports source-preserving table insertion, deletion and alignment with Undo", () => {
    const source = "# One\n\n| A | B |\n| :--- | ---: |\n| x | y |\n| q | z |\n";
    const { draft } = setup(source);
    act(() => { selectRich(richLeaf("y"), 0); document.dispatchEvent(new Event("selectionchange")); });
    fireEvent.click(screen.getByText("Table…"));
    fireEvent.click(screen.getByRole("button", { name: "Insert column left" }));
    expect(draft()).toContain("| x | | y |");
    expect(draft()).toContain("| :--- | --- | ---: |");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(draft()).toBe(source);
    act(() => { selectRich(richLeaf("y"), 0); document.dispatchEvent(new Event("selectionchange")); });
    fireEvent.click(screen.getByRole("button", { name: "Delete row" }));
    expect(draft()).toBe(source.replace("| x | y |\n", ""));
  });
});

it("formats a selected rendered word using the keyboard without rewriting neighboring text", () => {
  const { draft } = setup("# One\n\nHello world\n");
  const leaf = richLeaf("Hello world"); selectRich(leaf, 6, 11);
  fireEvent.keyDown(leaf, { key: "b", metaKey: true });
  expect(draft()).toBe("# One\n\nHello **world**\n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(draft()).toBe("# One\n\nHello world\n");
});

it("presents contextual formatting and creates a local link in one transaction", () => {
  const { draft } = setup("# One\n\nHello world\n");
  act(() => { selectRich(richLeaf("Hello world"), 6, 11); document.dispatchEvent(new Event("selectionchange")); });
  fireEvent.click(screen.getByRole("button", { name: "Link…" }));
  fireEvent.change(screen.getByLabelText("Local target"), { target: { value: "./other.md" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(draft()).toBe("# One\n\nHello [world](<./other.md>)\n");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(draft()).toBe("# One\n\nHello world\n");
});

it("keeps unfamiliar extension blocks source-backed and read-only", () => {
  const { draft } = setup("# One\n\n:::unknown\nopaque payload\n:::\n\nEditable\n");
  expect(document.querySelector(".rich-opaque")).toBeTruthy();
  expect(() => richLeaf(":::unknown\nopaque payload\n:::")).toThrow();
  typeRich("!", richLeaf("Editable"), 8);
  expect(draft()).toContain(":::unknown\nopaque payload\n:::");
});

it("retains deferred CRLF draft bytes and existing checkpoints without normalization on entry", () => {
  const source = "# One\r\n\r\nalpha\r\n";
  const { onChange, onCheckpoint } = setup(source, { lineSeparator: "\r\n", initialEditorJson: { doc: "legacy history retained" } });
  expect(screen.getByText(/CRLF Save remains deferred/)).toBeTruthy();
  expect(onCheckpoint).not.toHaveBeenCalled();
  typeRich("x", richLeaf("alpha"), 0);
  expect(onChange).not.toHaveBeenCalled();
});

it("edits code language while preserving fence spelling, metadata and literal code", () => {
  const source = "# One\n\n~~~~js title=sample\nlet n = 1;\n~~~~\n";
  const { draft, onChange } = setup(source);
  fireEvent.click(screen.getByRole("button", { name: "Code language" }));
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Code language" }));
  fireEvent.change(screen.getByLabelText("Code language", {selector:"input"}), { target: { value: "ts" } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  expect(draft()).toBe(source.replace("~~~~js", "~~~~ts"));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(draft()).toBe(source);
});
