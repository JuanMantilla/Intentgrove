import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import type { Root } from "mdast";
import { boundedBlocks, type BoundedBlock } from "./block-budget";
import { parseFrontmatter } from "./frontmatter";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkFrontmatter);
export const MAX_DOCUMENT = 10 * 1024 * 1024;
const MAX_PARSE_BYTES = 128 * 1024;
const MAX_CHUNK = 64 * 1024;

/** Count UTF-8 without allocating a second document-sized buffer. */
export function utf8Bytes(source: string, limit = MAX_DOCUMENT): number {
  let bytes = 0;
  for (let i = 0; i < source.length; i++) {
    const code = source.charCodeAt(i);
    if (code < 0x80) bytes++;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < source.length
      && source.charCodeAt(i+1) >= 0xdc00 && source.charCodeAt(i+1) <= 0xdfff) { bytes += 4; i++; }
    else bytes += 3;
    if (bytes > limit) return limit + 1;
  }
  return bytes;
}
export function documentOverLimit(source: string): boolean { return source.length > MAX_DOCUMENT || utf8Bytes(source) > MAX_DOCUMENT; }

/** Linear preflight, before any parser allocation; applied to each source region. */
export function expensiveShape(source: string): boolean {
  let line = 0, pipes = 0, total = 0, lines = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") { line = 0; pipes = 0; if (++lines > 4096) return true; }
    else {
      if (++line > 8192) return true;
      if (source[i] === "|" && (++pipes > 128 || ++total > 4096)) return true;
    }
  }
  return /^(?:[ \t]*>[ \t]*){65}/m.test(source);
}

function footnotes(tree: Root) {
  const numbers = new Map<string, number>();
  const visits = new Map<string, number>();
  const pending: any[] = [...tree.children].reverse();
  while (pending.length) {
    const node = pending.pop();
    if (node.type === "footnoteReference" && !numbers.has(node.identifier)) numbers.set(node.identifier, numbers.size + 1);
    if (node.children) pending.push(...[...node.children].reverse());
  }
  const walk: any[] = [...tree.children].reverse();
  while (walk.length) {
    const node = walk.pop();
    if (node.type === "footnoteReference") {
      const key = encodeURIComponent(node.identifier), number = numbers.get(node.identifier);
      const visit = (visits.get(key) ?? 0) + 1; visits.set(key, visit);
      Object.assign(node, { type: "emphasis", data: { hName: "sup" }, children: [{ type: "link", url: `#fn-${key}`,
        data: { hProperties: { id: `fnref-${node.identifier}-${visit}` } },
        children: [{ type: "text", value: String(number) }] }] });
    } else if (node.type === "footnoteDefinition") {
      const key = encodeURIComponent(node.identifier), number = numbers.get(node.identifier);
      Object.assign(node, { type: "blockquote", data: { hName: "section", hProperties: { id: `fn-${node.identifier}` } }, children: [
        { type: "paragraph", children: [{ type: "text", value: `[${number ?? node.identifier}] ` },
          { type: "link", url: `#fnref-${key}-1`, children: [{ type: "text", value: "↩" }] }] }, ...node.children] });
    }
    if (node.children) walk.push(...[...node.children].reverse());
  }
}

export function parseBounded(source: string) {
  const empty = (): Root => ({ type: "root", children: [] });
  const fallback = (text: string): BoundedBlock => ({ tree: empty(), source: text, fallback: true });
  if (documentOverLimit(source)) return { tree: empty(), blocks: [fallback(source)], metadata: null };
  // Ordinary small documents retain the parser's full document semantics.
  if (utf8Bytes(source, MAX_CHUNK) <= MAX_CHUNK && !expensiveShape(source)) {
    const tree = parser.parse(source) as Root;
    const first = tree.children[0] as any;
    const metadata = first?.type === "yaml" ? parseFrontmatter(first.value) : null;
    footnotes(tree);
    return { tree, blocks: boundedBlocks(tree, source), metadata };
  }
  // Defer blank-line boundaries until the next content line. Loose lists and
  // indented definition continuations remain one semantic region; oversized
  // containers fall back intact rather than changing their Markdown meaning.
  const regions: Array<{ start: number; end: number }> = [];
  const definitionStarts = new Set<number>();
  let start = 0, offset = 0, fence = "", front = /^---\r?\n/.test(source), firstLine = true;
  let boundary: number | null = null, container = false;
  const listMarker = /^(?: {0,3})(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/;
  for (const match of source.matchAll(/[^\n]*(?:\n|$)/g)) {
    const line = match[0]; if (!line) continue;
    const blank = /^[ \t]*\r?\n$/.test(line);
    if (boundary !== null && !blank) {
      if (!container || (!/^[ \t]+\S/.test(line) && !listMarker.test(line))) {
        regions.push({ start, end: boundary }); start = boundary; container = false;
      }
      boundary = null;
    }
    const marker = /^(?: {0,3})(`{3,}|~{3,})/.exec(line)?.[1];
    if (front) { if (!firstLine && /^(?:---|\.\.\.)\s*$/.test(line)) front = false; }
    else if (marker && !fence) fence = marker;
    else if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = "";
    else if (!fence) {
      if (!container && /^ {0,3}\[(?:\^)?[^\]\n]{1,256}\]:/.test(line)) definitionStarts.add(offset);
      if (listMarker.test(line) || /^ {0,3}\[\^/.test(line)) container = true;
    }
    offset += line.length;
    if (!front && !fence && blank && boundary === null) boundary = offset;
    firstLine = false;
    if (regions.length >= 4096) break;
  }
  if (start < source.length) regions.push({ start, end: source.length });
  // Definitions are document-scoped, but examples in fences and list content
  // cannot acquire that scope. Context has an aggregate allocation bound.
  let context = "";
  for (const match of source.matchAll(/^ {0,3}\[(?:\^)?[^\]\n]{1,256}\]:[^\n]*(?:\n(?:[ \t]*\n)*(?: {2,}|\t)[^\n]*)*/gm)) {
    if (!definitionStarts.has(match.index)) continue;
    if (utf8Bytes(context + match[0], 32768) > 32768) break;
    context += `${match[0]}\n\n`;
  }
  const tree = empty(); const rejected = new Map<number, string>();
  let parsedBytes = 0, exhausted = false;
  for (const region of regions) {
    const text = source.slice(region.start, region.end);
    const textBytes = utf8Bytes(text, MAX_CHUNK);
    const contextBytes = utf8Bytes(context, 32768);
    if (textBytes <= MAX_CHUNK && !expensiveShape(text)
      && parsedBytes + textBytes + contextBytes > MAX_PARSE_BYTES) exhausted = true;
    if (textBytes > MAX_CHUNK || expensiveShape(text) || exhausted) {
      rejected.set(tree.children.length, text);
      tree.children.push({ type: "code", value: text, data: { hProperties: { "data-budget-fallback": true } },
        position: { start: { line: 1, column: 1, offset: region.start }, end: { line: 1, column: 1, offset: region.end } } });
      continue;
    }
    parsedBytes += textBytes + contextBytes;
    try {
      const part = parser.parse(text + "\n\n" + context) as Root;
      const original = part.children.filter(node => (node.position?.start.offset ?? 0) < text.length);
      const pending: any[] = [...original];
      while (pending.length) {
        const node = pending.pop();
        if (node.position) { node.position.start.offset += region.start; node.position.end.offset += region.start; }
        if (node.children) pending.push(...node.children);
      }
      tree.children.push(...original);
    } catch { rejected.set(tree.children.length, text); tree.children.push({ type: "code", value: text }); }
  }
  const first = tree.children[0] as any;
  const metadata = first?.type === "yaml" ? parseFrontmatter(first.value) : null;
  footnotes(tree);
  const blocks = boundedBlocks(tree, source);
  for (const [index, text] of rejected) if (index < 2048 && blocks[index]) blocks[index] = fallback(text);
  const compact: BoundedBlock[] = [];
  for (const block of blocks) {
    const previous = compact.at(-1);
    if (block.fallback && previous?.fallback) previous.source += block.source;
    else compact.push(block);
  }
  return { tree: { ...tree, children: compact.flatMap(block => block.tree.children) }, blocks: compact, metadata };
}
