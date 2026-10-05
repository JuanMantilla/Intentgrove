import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import { parseFrontmatter } from "./frontmatter";

// Bound the tree passed back to the synchronous React render path as well as
// parsing work in the worker. The 1 MiB mixed acceptance fixture has 7,431 nodes.
const MAX_NODES = 10_000;
const MAX_DEPTH = 128;
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);

self.onmessage = (event: MessageEvent<string>) => {
  try {
    const tree = processor.parse(event.data);
    const first = tree.children[0] as { type?: string; value?: string } | undefined;
    const metadata = first?.type === "yaml" && typeof first.value === "string"
      ? parseFrontmatter(first.value) : null;
    const pending: Array<{ node: { children?: unknown[] }; depth: number }> = [{ node: tree, depth: 0 }];
    let count = 0;
    while (pending.length) {
      const { node, depth } = pending.pop()!;
      count += 1;
      if (count > MAX_NODES || depth > MAX_DEPTH) {
        self.postMessage({ kind: "overBudget" });
        return;
      }
      if (node.children) {
        for (const child of node.children) pending.push({ node: child as { children?: unknown[] }, depth: depth + 1 });
      }
    }
    self.postMessage({ kind: "parsed", tree, metadata });
  } catch {
    self.postMessage({ kind: "overBudget" });
  }
};
