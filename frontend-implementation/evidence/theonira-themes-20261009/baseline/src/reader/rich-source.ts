import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { Root, RootContent } from "mdast";
import { expensiveShape, utf8Bytes } from "./bounded-parser";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);
export type RichNode = RootContent & { children?: RichNode[]; value?: string };
export interface RichLeaf {
  node: RichNode; from: number; to: number; value: string; offsets: number[];
  ancestors: RichNode[];
}
export interface RichModel { tree: Root; leaves: RichLeaf[]; opaque: Array<{ from: number; to: number }>; blocked: boolean }
export interface SourcePatch { from: number; to: number; insert: string; caret: number }

/** Decode only a source token; the existing Markdown parser remains authoritative. */
function decoded(token: string): string {
  const tree = parser.parse(`x${token}x`) as Root;
  const paragraph = tree.children[0];
  return paragraph?.type === "paragraph" && paragraph.children.length === 1 && paragraph.children[0].type === "text"
    ? paragraph.children[0].value.slice(1, -1) : token;
}
function textOffsets(raw: string, value: string, from: number, quoted = false): number[] | null {
  const result = [from]; let output = "";
  for (let i = 0; i < raw.length;) {
    if (i > 0 && raw[i - 1] === "\n") {
      if (quoted) {
        const prefix = /^(?: {0,3}> ?)+/.exec(raw.slice(i))?.[0] ?? "";
        i += prefix.length;
      }
      const authored = /^ */.exec(raw.slice(i))![0].length;
      const rendered = /^ */.exec(value.slice(output.length))![0].length;
      if (authored > rendered) i += authored - rendered;
      result[result.length - 1] = from + i;
      if (i >= raw.length) break;
    }
    const token = /^(?:\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]|&(?:#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);|\r\n)/.exec(raw.slice(i))?.[0] ?? raw[i];
    const text = token === "\r\n" ? "\n" : token.length > 1 ? decoded(token) : token;
    output += text;
    for (let j = 0; j < text.length; j++) result.push(from + i + (j === text.length - 1 ? token.length : 0));
    i += token.length;
  }
  return output === value ? result : null;
}
export function richModel(source: string, caret?: number): RichModel {
  if (utf8Bytes(source, 128 * 1024) > 128 * 1024 || expensiveShape(source))
    return { tree: { type: "root", children: [] }, leaves: [], opaque: [{ from: 0, to: source.length }], blocked: true };
  const tree = parser.parse(source) as Root;
  const leaves: RichLeaf[] = [], opaque: RichModel["opaque"] = [];
  const visit = (node: RichNode, ancestors: RichNode[]) => {
    const from = node.position?.start.offset, to = node.position?.end.offset;
    if (from === undefined || to === undefined) return;
    const lock = () => opaque.push({ from, to });
    if (node.type === "paragraph" && /(?:^|\n) {0,3}(?::::|\$\$|\{%|\\begin\{)/.test(source.slice(from, to))) { lock(); return; }
    if (node.type === "text") {
      const value = node.value ?? "", offsets = textOffsets(source.slice(from, to), value, from, ancestors.some(n => n.type === "blockquote"));
      if (offsets) leaves.push({ node, from, to, value, offsets, ancestors }); else lock();
    } else if (node.type === "inlineCode") {
      const raw = source.slice(from, to), fence = /^`+/.exec(raw)?.[0] ?? "";
      let body = raw.slice(fence.length, -fence.length), padding = 0;
      if (body.startsWith(" ") && body.endsWith(" ") && /[^ ]/.test(body)) { body = body.slice(1, -1); padding = 1; }
      if (fence && body === node.value) leaves.push({ node, from: from + fence.length + padding, to: to - fence.length - padding,
        value: body, offsets: Array.from({ length: body.length + 1 }, (_, i) => from + fence.length + padding + i), ancestors });
      else lock();
    } else if (node.type === "code" && node.lang?.toLowerCase() !== "mermaid") {
      const raw = source.slice(from, to), opening = /^( {0,3})(`{3,}|~{3,})[^\r\n]*\r?\n/.exec(raw);
      const closing = /\r?\n {0,3}(`{3,}|~{3,})[ \t]*$/.exec(raw);
      const body = opening && closing ? raw.slice(opening[0].length, closing.index) : null;
      if (body === node.value && opening) {
        const start = from + opening[0].length;
        leaves.push({ node, from: start, to: start + body.length, value: body,
          offsets: Array.from({ length: body.length + 1 }, (_, i) => start + i), ancestors });
      } else lock();
    } else if (["paragraph", "heading", "list", "listItem", "table", "tableRow", "tableCell", "blockquote", "strong", "emphasis", "delete", "link", "linkReference"].includes(node.type)) {
      if (!node.children?.length && ["tableCell", "heading", "listItem"].includes(node.type)) {
        const anchor = node.type === "tableCell" ? from : to;
        const text = { type: "text", value: "", position: { start: { ...node.position!.end, offset: anchor }, end: { ...node.position!.end, offset: anchor } } } as RichNode;
        node.children = [text];
      }
      for (const child of node.children ?? []) visit(child, [...ancestors, node]);
    } else lock();
  };
  for (const node of tree.children) visit(node as RichNode, []);
  if (caret !== undefined && !leaves.some(l => caret >= l.from && caret <= l.to)
    && !tree.children.some(n => caret >= n.position!.start.offset! && caret <= n.position!.end.offset!)) {
    const text = { type: "text", value: "", position: { start: { line: 1, column: 1, offset: caret }, end: { line: 1, column: 1, offset: caret } } } as RichNode;
    const paragraph = { type: "paragraph", children: [text], position: text.position } as RichNode;
    tree.children.push(paragraph as RootContent);
    tree.children.sort((a, b) => a.position!.start.offset! - b.position!.start.offset!);
    leaves.push({ node: text, from: caret, to: caret, value: "", offsets: [caret], ancestors: [paragraph] });
  }
  return { tree, leaves, opaque, blocked: false };
}
export function plainMarkdown(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]/g, "\\$&");
}
/** Every accepted edit is a localized source splice. No DOM serialization. */
export function replaceLeaf(source: string, leaf: RichLeaf, start: number, end: number, value: string, eol: string): SourcePatch {
  if (start < 0 || end < start || end > leaf.value.length) throw new Error("range");
  // Never split a surrogate pair (including a decoded numeric entity).
  for (const offset of [start, end]) if (offset > 0 && offset < leaf.value.length
    && /[\uD800-\uDBFF]/.test(leaf.value[offset - 1]) && /[\uDC00-\uDFFF]/.test(leaf.value[offset])) throw new Error("range");
  const literal = leaf.node.type === "code" || leaf.node.type === "inlineCode";
  const nextLiteral = literal ? leaf.value.slice(0, start) + value.replace(/\r\n|\r|\n/g, eol) + leaf.value.slice(end) : "";
  if (leaf.node.type === "inlineCode") {
    if (/[\r\n]/.test(value)) throw new Error("inline code boundary");
    const at = leaf.node.position!.start.offset!, finish = leaf.node.position!.end.offset!;
    const oldFence = /^`+/.exec(source.slice(at, finish))![0];
    const longest = Math.max(0, ...[...nextLiteral.matchAll(/`+/g)].map(match => match[0].length));
    const padding = /^`|`$/.test(nextLiteral) || (/^ .* $/.test(nextLiteral) && /[^ ]/.test(nextLiteral)) ? " " : "";
    if (longest >= oldFence.length || padding && leaf.from === at + oldFence.length) {
      const fence = "`".repeat(Math.max(oldFence.length, longest + 1));
      const insert = fence + padding + nextLiteral + padding + fence;
      return { from: at, to: finish, insert, caret: at + fence.length + padding.length + start + value.length };
    }
  } else if (leaf.node.type === "code") {
    const raw = source.slice(leaf.node.position!.start.offset!, leaf.node.position!.end.offset!);
    const fence = /^(?: {0,3})(`{3,}|~{3,})/.exec(raw)?.[1];
    if (!fence || nextLiteral.split(eol).some(line => new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*$`).test(line))) throw new Error("fence");
  }
  if (leaf.ancestors.some(n => n.type === "tableCell") && /[\r\n]/.test(value)) throw new Error("table");
  let insert = (literal ? value : plainMarkdown(value)).replace(/\r\n|\r|\n/g, eol);
  if (!literal && leaf.ancestors.some(n => ["strong", "emphasis", "delete"].includes(n.type))) {
    const entitySpaces = (text: string) => text.replace(/ /g, "&#32;").replace(/\t/g, "&#9;");
    if (start === 0) insert = insert.replace(/^[ \t]+/, entitySpaces);
    if (end === leaf.value.length) insert = insert.replace(/[ \t]+$/, entitySpaces);
  }
  const from = leaf.offsets[start], to = leaf.offsets[end];
  if (from === undefined || to === undefined || source.slice(leaf.from, leaf.to).length !== leaf.to - leaf.from) throw new Error("range");
  return { from, to, insert, caret: from + insert.length };
}
export function paragraphBreak(source: string, leaf: RichLeaf, start: number, end: number, eol: string, hard = false): SourcePatch {
  if (leaf.node.type === "code") return replaceLeaf(source, leaf, start, end, eol, eol);
  const block = [...leaf.ancestors].reverse().find(n => ["paragraph", "heading", "tableCell"].includes(n.type));
  if (block?.type === "tableCell" || leaf.node.type === "inlineCode") throw new Error("structure");
  const item = [...leaf.ancestors].reverse().find(n => n.type === "listItem");
  let insert = hard ? `  ${eol}` : eol + eol;
  if (item && !hard) {
    const at = item.position!.start.offset!;
    const line = source.slice(at, source.indexOf("\n", at) < 0 ? source.length : source.indexOf("\n", at));
    const marker = /^( *)([-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/.exec(line);
    if (!marker) throw new Error("structure");
    if (leaf.value.length === 0 && start === 0 && end === 0) {
      const parents = leaf.ancestors.filter(n => n.type === "listItem");
      if (parents.length > 1) return indentListItem(source, leaf, true);
      const lineStart = source.lastIndexOf("\n", at - 1) + 1;
      return { from: lineStart, to: at + marker[0].length, insert: eol, caret: lineStart + eol.length };
    }
    const next = /^\d/.test(marker[2]) ? marker[2].replace(/^\d+/, n => String(Number(n) + 1)) : marker[2];
    const task = /\[[ xX]\]/.test(marker[0]) ? "[ ] " : "";
    insert = eol.repeat(leaf.ancestors.find(n => n.type === "list")?.spread ? 2 : 1) + " ".repeat(item.position!.start.column - 1) + next + " " + task;
  }
  let from = leaf.offsets[start], to = leaf.offsets[end];
  const wrappers = leaf.ancestors.filter(n => ["strong", "emphasis", "link", "linkReference", "delete"].includes(n.type));
  if (wrappers.length && !hard) {
    const mapped = richModel(source).leaves;
    const bounds = (node: RichNode) => mapped.filter(l => l.from >= node.position!.start.offset! && l.to <= node.position!.end.offset!);
    const left = wrappers.filter(n => from > bounds(n)[0].from);
    const right = wrappers.filter(n => to < bounds(n).at(-1)!.to);
    for (const node of wrappers) {
      if (!left.includes(node)) from = Math.min(from, node.position!.start.offset!);
      if (!right.includes(node)) to = Math.max(to, node.position!.end.offset!);
    }
    const leftSpaces = /[ \t]+$/.exec(source.slice(leaf.from, from))?.[0] ?? "";
    const rightSpaces = /^[ \t]+/.exec(source.slice(to, leaf.to))?.[0] ?? "";
    from -= leftSpaces.length; to += rightSpaces.length;
    const closes = [...left].reverse().map(n => source.slice(n.children!.at(-1)!.position!.end.offset!, n.position!.end.offset!)).join("");
    const opens = right.map(n => source.slice(n.position!.start.offset!, n.children![0].position!.start.offset!)).join("");
    insert = closes + leftSpaces + insert + opens + rightSpaces.replace(/ /g, "&#32;").replace(/\t/g, "&#9;");
  }
  if (leaf.ancestors.some(n => n.type === "blockquote")) {
    if (item) throw new Error("structure");
    const blockStart = block!.position!.start.offset!, lineStart = source.lastIndexOf("\n", blockStart - 1) + 1;
    const prefix = source.slice(lineStart, blockStart);
    if (!/^(?: {0,3}> ?)+$/.test(prefix)) throw new Error("structure");
    insert = insert.replace(/\n/g, "\n" + prefix);
  }
  return { from, to, insert, caret: from + insert.length };
}

/** Join adjacent plain paragraphs or sibling list items; refuse mixed syntax. */
export function joinAtBoundary(source: string, model: RichModel, leaf: RichLeaf, backwards: boolean): SourcePatch {
  const index = model.leaves.indexOf(leaf), adjacent = model.leaves[index + (backwards ? -1 : 1)];
  if (!adjacent) throw new Error("boundary");
  const left = backwards ? adjacent : leaf, right = backwards ? leaf : adjacent;
  const plain = (l: RichLeaf) => l.node.type === "text" && l.ancestors.every(n => ["paragraph", "list", "listItem"].includes(n.type));
  if (!plain(left) || !plain(right) || model.opaque.some(n => n.from < right.from && n.to > left.to)) throw new Error("structure");
  const leftItem = left.ancestors.find(n => n.type === "listItem"), rightItem = right.ancestors.find(n => n.type === "listItem");
  if (leftItem || rightItem) {
    if (!leftItem || !rightItem || leftItem === rightItem || left.ancestors.find(n => n.type === "list") !== right.ancestors.find(n => n.type === "list")) throw new Error("structure");
    if (!/^(?:\r?\n)[ \t]*(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?$/.test(source.slice(left.to, right.from))) throw new Error("structure");
  } else if (!/^\s+$/.test(source.slice(left.to, right.from))) throw new Error("structure");
  return { from: left.to, to: right.from, insert: "", caret: left.to };
}
export function indentListItem(source: string, leaf: RichLeaf, outdent: boolean): SourcePatch {
  const path = leaf.ancestors;
  const item = [...path].reverse().find(n => n.type === "listItem");
  const list = [...path].reverse().find(n => n.type === "list");
  if (!item || !list || path.some(n => n.type === "blockquote")) throw new Error("structure");
  const movable = (node: RichNode): boolean => ["paragraph", "text", "list", "listItem", "strong", "emphasis", "delete", "link", "linkReference", "inlineCode", "break"].includes(node.type)
    && (node.children?.every(movable) ?? true);
  if (!movable(item)) throw new Error("locked content");
  const at = item.position!.start.offset!, end = item.position!.end.offset!;
  const lineStart = source.lastIndexOf("\n", at - 1) + 1;
  const raw = source.slice(lineStart, end);
  let width: number;
  if (outdent) {
    const parent = path.slice(0, path.indexOf(list)).reverse().find(n => n.type === "listItem");
    if (!parent) throw new Error("structure");
    width = item.position!.start.column - parent.position!.start.column;
    if (width < 1) throw new Error("structure");
    const lines = raw.split("\n");
    if (lines.some(line => line.trim() && !line.startsWith(" ".repeat(width)))) throw new Error("structure");
    return { from: lineStart, to: end, insert: lines.map(line => line.slice(Math.min(width, line.length))).join("\n"), caret: leaf.from - width };
  }
  const index = list.children!.indexOf(item), previous = list.children![index - 1];
  if (!previous) throw new Error("structure");
  const marker = /^(?:[-+*]|\d+[.)])[ \t]+/.exec(source.slice(previous.position!.start.offset!));
  if (!marker || item.position!.start.column > 64) throw new Error("structure");
  width = marker[0].length;
  return { from: lineStart, to: end, insert: raw.split("\n").map(line => " ".repeat(width) + line).join("\n"), caret: leaf.from + width };
}

export type TableOperation = "rowAbove" | "rowBelow" | "deleteRow" | "columnBefore" | "columnAfter" | "deleteColumn" | "alignLeft" | "alignCenter" | "alignRight";
function tableParts(line: string): string[] {
  const cuts: number[] = [];
  for (let i = 0; i < line.length; i++) if (line[i] === "|") {
    let backslashes = 0; for (let j = i - 1; j >= 0 && line[j] === "\\"; j--) backslashes++;
    if (backslashes % 2 === 0) cuts.push(i);
  }
  if (!cuts.length) throw new Error("table");
  const parts: string[] = []; let from = 0;
  for (const cut of cuts) { parts.push(line.slice(from, cut)); from = cut + 1; }
  parts.push(line.slice(from));
  return parts;
}
/** Explicit table operations preserve the spelling of all surviving cells. */
export function changeTable(source: string, leaf: RichLeaf, operation: TableOperation, eol: string): SourcePatch {
  const table = leaf.ancestors.find(n => n.type === "table");
  const row = leaf.ancestors.find(n => n.type === "tableRow");
  const cell = leaf.ancestors.find(n => n.type === "tableCell") ?? (leaf.node.type === "tableCell" ? leaf.node : undefined);
  if (!table || !row || !cell) throw new Error("table");
  const from = table.position!.start.offset!, to = table.position!.end.offset!;
  const lines = source.slice(from, to).split(eol);
  const rows = lines.map(tableParts);
  const columns = table.children?.[0].children?.length ?? 0;
  const rowIndex = table.children!.indexOf(row), col = row.children!.indexOf(cell);
  const leading = rows[0][0].trim() === "" ? 1 : 0;
  const trailing = rows[0].at(-1)?.trim() === "" ? 1 : 0;
  if (columns < 1 || col < 0 || rowIndex < 0 || rows.some(parts => parts.length !== columns + leading + trailing)) throw new Error("table");
  const rawIndex = rowIndex === 0 ? 0 : rowIndex + 1;
  if (operation === "rowAbove" || operation === "rowBelow") {
    const blank = rows[0].map((part, index) => index < leading || index >= rows[0].length - trailing ? part : " ");
    lines.splice(Math.max(2, rawIndex + (operation === "rowBelow" ? 1 : 0)), 0, blank.join("|"));
  } else if (operation === "deleteRow") {
    if (rowIndex === 0 || lines.length <= 3) throw new Error("table");
    lines.splice(rawIndex, 1);
  } else if (operation.startsWith("align")) {
    const delimiters = rows[1];
    delimiters[col + leading] = operation === "alignCenter" ? " :---: " : operation === "alignRight" ? " ---: " : " :--- ";
    lines[1] = delimiters.join("|");
  } else {
    if (operation === "deleteColumn" && columns <= 1) throw new Error("table");
    rows.forEach((parts, index) => {
      const target = col + leading + (operation === "columnAfter" ? 1 : 0);
      if (operation === "deleteColumn") parts.splice(target, 1);
      else parts.splice(target, 0, index === 1 ? " --- " : " ");
      lines[index] = parts.join("|");
    });
  }
  const insert = lines.join(eol);
  return { from, to, insert, caret: from };
}

export function inlineProperties(source: string, node: RichNode, label: string, url: string, title: string): SourcePatch | null {
  if (node.type !== "link" && node.type !== "image") throw new Error("reference");
  if (/^[a-z][a-z\d+.-]*:/i.test(url) || /[<>\r\n]/.test(url) || !url.trim() || /[\r\n]/.test(title + label)) throw new Error("target");
  const text = (n: RichNode): string => n.value ?? n.children?.map(text).join("") ?? "";
  const oldLabel = node.type === "image" ? node.alt ?? "" : text(node);
  if (oldLabel === label && node.url === url && (node.title ?? "") === title) return null;
  const from = node.position!.start.offset!, to = node.position!.end.offset!;
  const raw = source.slice(from, to), start = node.type === "image" ? 2 : 1;
  let closing = -1, depth = 1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "\\") { i++; continue; }
    if (raw[i] === "[") depth++;
    if (raw[i] === "]" && --depth === 0) { closing = i; break; }
  }
  if (closing < 0 || raw[closing + 1] !== "(") throw new Error("target");
  const authoredLabel = oldLabel === label ? raw.slice(start, closing) : plainMarkdown(label);
  const escapedTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const insert = `${node.type === "image" ? "!" : ""}[${authoredLabel}](<${url}>${title ? ` "${escapedTitle}"` : ""})`;
  return { from, to, insert, caret: from + start };
}

export function createLink(source: string, leaf: RichLeaf, start: number, end: number, label: string, url: string, title: string): SourcePatch {
  if (leaf.node.type !== "text" || start === end || /^[a-z][a-z\d+.-]*:/i.test(url) || !url.trim() || /[<>\r\n]/.test(url) || /[\r\n]/.test(label + title)) throw new Error("target");
  const from = leaf.offsets[start], to = leaf.offsets[end];
  const text = label === leaf.value.slice(start, end) ? source.slice(from, to) : plainMarkdown(label);
  const insert = `[${text}](<${url}>${title ? ` "${title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"` : ""})`;
  return { from, to, insert, caret: from + 1 };
}

export function blockFormat(source: string, leaf: RichLeaf, kind: "quote" | "unquote" | "rule", eol: string): SourcePatch {
  const block = [...leaf.ancestors].reverse().find(n => n.type === "paragraph");
  if (!block || leaf.ancestors.some(n => ["listItem", "tableCell"].includes(n.type))) throw new Error("structure");
  const from = block.position!.start.offset!, to = block.position!.end.offset!;
  if (richModel(source).opaque.some(node => node.from < to && node.to > from)) throw new Error("opaque");
  const quoted = leaf.ancestors.some(n => n.type === "blockquote");
  if (kind === "rule") {
    if (quoted) throw new Error("structure");
    return { from: to, to, insert: `${eol}${eol}---${eol}${eol}`, caret: to + 2 * eol.length };
  }
  if (quoted) {
    const start = source.lastIndexOf("\n", from - 1) + 1;
    const lines = source.slice(start, to).split(eol);
    if (lines.some(line => !/^ {0,3}> ?/.test(line))) throw new Error("structure");
    const insert = lines.map(line => kind === "quote" ? "> " + line : line.replace(/^ {0,3}> ?/, "")).join(eol);
    return { from: start, to, insert, caret: leaf.from + (kind === "quote" ? 2 : -(/^ {0,3}> ?/.exec(lines[0])![0].length)) };
  }
  if (kind === "unquote") throw new Error("structure");
  const insert = "> " + source.slice(from, to).split(eol).join(eol + "> ");
  return { from, to, insert, caret: leaf.from + 2 };
}

export function codeLanguage(source: string, node: RichNode, language: string): SourcePatch | null {
  if (node.type !== "code" || node.lang?.toLowerCase() === "mermaid" || language.toLowerCase() === "mermaid" || !/^[a-zA-Z\d_+.-]*$/.test(language)) throw new Error("language");
  if ((node.lang ?? "") === language) return null;
  const from = node.position!.start.offset!;
  const opening = /^( {0,3})(`{3,}|~{3,})([^\r\n]*)/.exec(source.slice(from, node.position!.end.offset!));
  if (!opening) throw new Error("language");
  const at = from + opening[1].length + opening[2].length;
  const insert = language + (node.meta ? " " + node.meta : "");
  return { from: at, to: from + opening[0].length, insert, caret: at + insert.length };
}
