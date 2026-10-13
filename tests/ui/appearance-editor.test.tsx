// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getAppearance } from "../../src/app/appearance";
import SectionEditor from "../../src/reader/SectionEditor";
import { richLeaf, selectRich, typeRich } from "./rich-edit-helpers";

afterEach(() => { cleanup(); getAppearance().applyPreference("system"); });
describe("live rendered editor appearance preservation", () => {
  it("keeps draft, source history, selection, DOM, focus and reader scroll through ten changes", () => {
    const onChange = vi.fn(), onCheckpoint = vi.fn();
    render(<div className="reader-scroll"><SectionEditor sessionId="appearance-session" fileId="file" label="One" locale="en"
      initialSource={"# One\nbase\n"} initialDraft={"# One\nbase\n"} lineSeparator={"\n"} busy={false}
      checkpointStatus="saved" onChange={onChange} onCheckpoint={onCheckpoint}
      onSave={() => {}} onSaveAs={() => {}} onDiscard={() => {}} onReturn={() => {}} /></div>);
    typeRich(" first", richLeaf("base"), 4);
    typeRich(" second", richLeaf("base first"), 10);
    const node = document.querySelector(".rich-section");
    const leaf = richLeaf("base first second");
    act(() => { selectRich(leaf, 7); document.dispatchEvent(new Event("selectionchange")); });
    const before = onCheckpoint.mock.calls.at(-1)![1];
    const reader = document.querySelector<HTMLElement>(".reader-scroll")!;
    reader.scrollTop = 42; reader.scrollLeft = 7;
    const focus = document.activeElement, checkpoints = onCheckpoint.mock.calls.length;
    for (let index = 0; index < 10; index++) {
      act(() => getAppearance().applyPreference(index % 2 ? "light" : "dark"));
      expect(document.querySelector(".rich-section")).toBe(node);
      expect(onCheckpoint.mock.calls.at(-1)![1]).toEqual(before);
      expect(document.activeElement).toBe(focus);
      expect(window.getSelection()?.anchorOffset).toBe(7);
      expect(reader.scrollTop).toBe(42); expect(reader.scrollLeft).toBe(7);
    }
    expect(onCheckpoint).toHaveBeenCalledTimes(checkpoints);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(richLeaf("base first")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(richLeaf("base first second")).toBeTruthy();
  });
});
