/** Resolve a rendered UTF-16 offset through syntax-highlight spans. */
export function domPoint(element: HTMLElement, offset: number): [Node, number] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let text = walker.nextNode(), remaining = offset, last: Node | null = null;
  while (text) {
    const length = text.textContent?.length ?? 0;
    if (remaining <= length) return [text, remaining];
    remaining -= length; last = text; text = walker.nextNode();
  }
  return last ? [last, last.textContent?.length ?? 0] : [element, 0];
}
export function textOffset(element: HTMLElement, node: Node, offset: number) {
  const range = document.createRange(); range.selectNodeContents(element); range.setEnd(node, offset);
  return range.toString().length;
}
