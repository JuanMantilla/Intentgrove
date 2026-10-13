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
  return blocks;
}
