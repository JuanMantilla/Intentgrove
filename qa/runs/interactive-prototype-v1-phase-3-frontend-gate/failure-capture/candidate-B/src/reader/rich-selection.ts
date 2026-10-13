import { plainMarkdown, replaceLeaf, type RichLeaf, type RichModel, type RichNode, type SourcePatch } from "./rich-source";

export interface RichPoint { leaf: RichLeaf; offset: number }
const inline = new Set(["strong", "emphasis", "delete", "link", "linkReference", "inlineCode"]);
const startOf = (node: RichNode) => node.position!.start.offset!;
const endOf = (node: RichNode) => node.position!.end.offset!;
function wrappers(point: RichPoint) {
  return [...point.leaf.ancestors, point.leaf.node].filter(node => inline.has(node.type));
}
function delimiters(source: string, node: RichNode, model: RichModel) {
  const leaves = model.leaves.filter(leaf => leaf.node === node || leaf.ancestors.includes(node));
  if (!leaves.length) throw new Error("unmapped inline syntax");
  return { open: source.slice(startOf(node), leaves[0].from), close: source.slice(leaves.at(-1)!.to, endOf(node)), leaves };
}

/** Splice a rendered range, retaining authored delimiters around surviving text.
 * No block or document serialization: prefix/suffix bytes are never regenerated.
 */
export function replaceSelection(source: string, model: RichModel, a: RichPoint, b: RichPoint, value: string, eol: string): SourcePatch {
  let from = a.leaf.offsets[a.offset], to = b.leaf.offsets[b.offset];
  if (from > to) return replaceSelection(source, model, b, a, value, eol);
  // Validate decoded UTF-16 boundaries, including entities and surrogate pairs.
  replaceLeaf(source, a.leaf, a.offset, a.offset, "", eol);
  replaceLeaf(source, b.leaf, b.offset, b.offset, "", eol);
  if (from === undefined || to === undefined) throw new Error("range");
  if (a.leaf === b.leaf && (value || a.offset === b.offset)) return replaceLeaf(source, a.leaf, a.offset, b.offset, value, eol);
  if (model.opaque.some(block => block.from < to && block.to > from)) throw new Error("selection includes locked content");
  const wholeSection = a.offset === 0 && b.offset === b.leaf.value.length && a.leaf === model.leaves[0] && b.leaf === model.leaves.at(-1);
  const removesTable = (node: RichNode): boolean => (node.type === "table" && (wholeSection || (startOf(node) >= from && endOf(node) <= to)))
    || Boolean(node.children?.some(removesTable));
  if (model.tree.children.some(node => removesTable(node as RichNode))) throw new Error("whole-table removal requires confirmation");
  if (wholeSection && !model.opaque.length) {
    const insert = plainMarkdown(value).replace(/\r\n|\r|\n/g, eol);
    return { from: 0, to: source.length, insert, caret: insert.length };
  }
  const sameContainer = (kind: string) => [...a.leaf.ancestors].reverse().find(node => node.type === kind) === [...b.leaf.ancestors].reverse().find(node => node.type === kind);
  if (a.leaf !== b.leaf && (a.leaf.node.type === "code" || b.leaf.node.type === "code" || !sameContainer("tableCell") || !sameContainer("blockquote")))
    throw new Error("selection crosses a literal or structural boundary");
  // Crossing list depths would reparent surviving source implicitly.
  if (!sameContainer("list")) throw new Error("selection crosses list depths");
  if (model.opaque.some(block => block.from < to && block.to > from)) throw new Error("selection includes locked content");
  // Remove wholly selected inline wrappers rather than leaving visible empty delimiters.
  for (const node of new Set([...wrappers(a), ...wrappers(b)])) {
    const { leaves } = delimiters(source, node, model);
    if (from <= leaves[0].from && to >= leaves.at(-1)!.to) {
      from = Math.min(from, startOf(node)); to = Math.max(to, endOf(node));
    }
  }
  const left = wrappers(a).filter(node => startOf(node) < from && endOf(node) <= to);
  const right = wrappers(b).filter(node => startOf(node) >= from && endOf(node) > to);
  const close = left.reverse().map(node => delimiters(source, node, model).close).join("");
  const open = right.map(node => delimiters(source, node, model).open).join("");
  const literal = a.leaf.node.type === "inlineCode" && left.length > 0;
  if (literal && /[`\r\n]/.test(value)) throw new Error("literal boundary");
  const insertedText = (literal ? value : plainMarkdown(value)).replace(/\r\n|\r|\n/g, eol);
  const insert = insertedText + close + open;
  return { from, to, insert, caret: from + insertedText.length };
}

/** Heading transformations remain inside the original native-owned byte span. */
export function headingLevel(source: string, leaf: RichLeaf, depth: number): SourcePatch {
  if (!Number.isInteger(depth) || depth < 0 || depth > 6) throw new Error("heading level");
  const block = leaf.ancestors.find(n => n.type === "heading" || n.type === "paragraph");
  if (!block || leaf.ancestors.some(n => ["list", "blockquote", "tableCell"].includes(n.type))) throw new Error("block boundary");
  const from = startOf(block), to = endOf(block), raw = source.slice(from, to);
  if (block.type === "heading" && block.depth === depth) return { from, to: from, insert: "", caret: leaf.from };
  const atx = /^(#{1,6})([ \t]+|$)/.exec(raw);
  if (atx) {
    if (depth) return { from, to: from + atx[1].length, insert: "#".repeat(depth), caret: leaf.from + depth - atx[1].length };
    const body = raw.slice(atx[0].length).replace(/[ \t]+#+[ \t]*$/, "");
    return { from, to, insert: body, caret: from };
  }
  const setext = /\n[ \t]*[=-]+[ \t]*$/.exec(raw);
  const body = setext ? raw.slice(0, setext.index) : raw;
  if (body.includes("\n")) throw new Error("multiline heading");
  const insert = (depth ? "#".repeat(depth) + " " : "") + body;
  return { from, to, insert, caret: from + (depth ? depth + 1 : 0) };
}

export function selectionText(model: RichModel, a: RichPoint, b: RichPoint): string {
  if (a.leaf.offsets[a.offset] > b.leaf.offsets[b.offset]) return selectionText(model, b, a);
  const first = model.leaves.indexOf(a.leaf), last = model.leaves.indexOf(b.leaf);
  let result = "";
  const block = (leaf: RichLeaf) => [...leaf.ancestors].reverse().find(n => ["paragraph", "heading", "tableCell"].includes(n.type)) ?? leaf.node;
  for (let i = first; i <= last; i++) {
    const leaf = model.leaves[i];
    if (i > first && block(leaf) !== block(model.leaves[i - 1]))
      result += leaf.ancestors.some(n => n.type === "tableCell") ? "\t" : leaf.ancestors.some(n => n.type === "listItem") ? "\n" : "\n\n";
    result += leaf.value.slice(i === first ? a.offset : 0, i === last ? b.offset : leaf.value.length);
  }
  return result;
}
