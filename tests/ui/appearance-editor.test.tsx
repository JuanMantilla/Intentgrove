// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EditorView } from "@codemirror/view";
import { historyField } from "@codemirror/commands";
import { getAppearance } from "../../src/app/appearance";
import SectionEditor from "../../src/reader/SectionEditor";

afterEach(() => { cleanup(); getAppearance().applyPreference("system"); vi.unstubAllGlobals(); });

describe("F002A live editor appearance preservation", () => {
  it("keeps the editor, draft, history, selection, focus, scroll and checkpoint count through ten changes", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
    const onChange = vi.fn(), onCheckpoint = vi.fn();
    render(<SectionEditor sessionId="appearance-session" fileId="file" label="One" locale="en"
      initialSource="# One\nbase\n" initialDraft="# One\nbase\n" lineSeparator="\n" busy={false}
      checkpointStatus="saved" onChange={onChange} onCheckpoint={onCheckpoint}
      onSave={() => {}} onSaveAs={() => {}} onDiscard={() => {}} onReturn={() => {}} />);
    const node = document.querySelector<HTMLElement>(".cm-editor")!;
    const editor = EditorView.findFromDOM(node)!;
    act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "first\n" } }));
    act(() => editor.dispatch({ changes: { from: editor.state.doc.length, insert: "second\n" },
      selection: { anchor: 7 } }));
    editor.focus(); editor.scrollDOM.scrollTop = 42; editor.scrollDOM.scrollLeft = 7;
    const before = editor.state.toJSON({ history: historyField });
    const focus = document.activeElement, checkpoints = onCheckpoint.mock.calls.length;
    for (let index = 0; index < 10; index += 1) {
      const dark = index % 2 === 0;
      act(() => getAppearance().applyPreference(dark ? "dark" : "light"));
      expect(EditorView.findFromDOM(node)).toBe(editor);
      expect(editor.state.facet(EditorView.darkTheme)).toBe(dark);
      expect(editor.state.toJSON({ history: historyField })).toEqual(before);
      expect(document.activeElement).toBe(focus);
      expect(editor.scrollDOM.scrollTop).toBe(42);
      expect(editor.scrollDOM.scrollLeft).toBe(7);
    }
    expect(onCheckpoint).toHaveBeenCalledTimes(checkpoints);
    const draft = editor.state.doc.toString();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(editor.state.doc.toString()).not.toBe(draft);
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(editor.state.doc.toString()).toBe(draft);
  });
});
