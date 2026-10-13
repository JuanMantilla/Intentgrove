import type { Root } from "mdast";

export interface HeadingEntry {
  id: string;
  level: number;
  label: string;
  offset: number;
}

export function headingSlug(value: string): string {
  return value.toLocaleLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim().replace(/\s+/g, "-");
}

function headingText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const part = node as { value?: unknown; alt?: unknown; children?: unknown[] };
  if (typeof part.value === "string") return part.value;
  if (typeof part.alt === "string") return part.alt;
  return Array.isArray(part.children) ? part.children.map(headingText).join("") : "";
}

export function collectHeadings(tree: Root | undefined): HeadingEntry[] {
  if (!tree) return [];
  const counts = new Map<string, number>();
  const result: HeadingEntry[] = [];
  for (const node of tree.children) {
    if (node.type !== "heading") continue;
    const label = headingText(node).replace(/\s+/g, " ").trim();
    const base = headingSlug(label) || "section";
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    result.push({ id: count ? `${base}-${count}` : base,
      level: node.depth, label, offset: node.position?.start.offset ?? -1 });
  }
  return result;
}
