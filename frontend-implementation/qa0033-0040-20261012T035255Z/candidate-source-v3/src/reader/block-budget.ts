import type { Root } from "mdast";

export const BLOCK_PROTOCOL = 1;
export interface BoundedBlock { tree: Root; source: string; fallback: boolean }
// Cap both each rich subtree and total rich DOM work. Excess source remains text.
export function boundedBlocks(tree: Root, source: string): BoundedBlock[] {
  let remaining = 10_000;
  const blocks: BoundedBlock[] = [];
  for (let index = 0; index < tree.children.length; index++) {
    const child = tree.children[index];
    const start = child.position?.start.offset ?? 0;
    const end = child.position?.end.offset ?? source.length;
    if (index >= 2048) {
      blocks.push({ tree: { type: "root", children: [] }, source: source.slice(start), fallback: true });
      break;
    }
    const pending: Array<{ node: unknown; depth: number }> = [{ node: child, depth: 0 }];
    let count = 0; let fallback = false;
    while (pending.length) {
      const { node, depth } = pending.pop()!;
      if (++count > Math.min(2048, remaining) || depth > 64) { fallback = true; break; }
      const children = (node as { children?: unknown[] }).children;
      if (children) for (const node of children) pending.push({ node, depth: depth + 1 });
    }
    if (!fallback) remaining -= count;
    blocks.push({ tree: { type: "root", children: fallback ? [] : [child] },
      source: source.slice(start, end), fallback });
  }
  // Markdown definitions belong to the document, even when rich DOM is painted
  // block by block. Carry only definitions actually referenced by each bounded
  // subtree, reusing node objects rather than multiplying the entire document.
  const definitions = new Map<string, Root["children"][number]>();
  for (const block of blocks) for (const node of block.tree.children) {
    if (node.type === "definition" || node.type === "footnoteDefinition")
      definitions.set(`${node.type}:${node.identifier}`, node);
  }
  for (const block of blocks) {
    if (block.fallback) continue;
    const needed = new Set<string>();
    const pending: unknown[] = [...block.tree.children];
    while (pending.length) {
      const node = pending.pop() as { type: string; identifier?: string; children?: unknown[] };
      const kind = node.type === "footnoteReference" ? "footnoteDefinition"
        : node.type === "linkReference" || node.type === "imageReference" ? "definition" : null;
      if (kind && node.identifier) needed.add(`${kind}:${node.identifier}`);
      if (node.children) pending.push(...node.children);
    }
    const context = Array.from(needed, key => definitions.get(key)).filter(
      (node): node is Root["children"][number] => Boolean(node));
    block.tree = { ...block.tree, children: [...block.tree.children, ...context] };
  }
  // Referenced context also consumes the output budget (not just source nodes).
  let outputRemaining = 10_000;
  for (const block of blocks) {
    if (block.fallback) continue;
    const pending: Array<{ node: unknown; depth: number }> = block.tree.children.map(node => ({ node, depth: 0 }));
    let count = 0;
    while (pending.length) {
      const { node, depth } = pending.pop()!;
      if (++count > Math.min(2048, outputRemaining) || depth > 64) {
        block.fallback = true; block.tree = { type: "root", children: [] }; break;
      }
      const children = (node as { children?: unknown[] }).children;
      if (children) for (const node of children) pending.push({ node, depth: depth + 1 });
    }
    if (!block.fallback) outputRemaining -= count;
  }
  return blocks;
}
