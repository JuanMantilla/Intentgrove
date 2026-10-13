import { domPoint } from "../../src/reader/rich-dom";
import { act, fireEvent } from "@testing-library/react";

export function richLeaf(text?: string): HTMLElement {
  const leaves = Array.from(document.querySelectorAll<HTMLElement>("[data-rich-leaf]"));
  const leaf = text === undefined ? leaves.at(-1) : leaves.find(node => node.textContent === text);
  if (!leaf) throw new Error(`Rendered editable text not found: ${text}; available: ${JSON.stringify(leaves.map(node => node.textContent))}`);
  return leaf;
}
export function selectRich(leaf: HTMLElement, start = 0, end = start) {
  leaf.focus();
  window.getSelection()!.setBaseAndExtent(...domPoint(leaf, start), ...domPoint(leaf, end));
}
export function typeRich(value: string, leaf = richLeaf(), start = leaf.textContent?.length ?? 0, end = start) {
  act(() => {
    selectRich(leaf, start, end);
    leaf.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType: "insertText", data: value }));
  });
}
export function beforeRich(inputType: string, leaf = richLeaf(), start = leaf.textContent?.length ?? 0, end = start) {
  act(() => { selectRich(leaf, start, end); leaf.dispatchEvent(new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType })); });
}
export function undoRich() { fireEvent.keyDown(richLeaf(), { key: "z", metaKey: true }); }
