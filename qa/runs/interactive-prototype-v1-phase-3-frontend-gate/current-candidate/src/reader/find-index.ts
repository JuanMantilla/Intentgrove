export interface FindSpan { start: number; end: number }
interface TextPart { node: Text; start: number; end: number }
interface Shift { normalizedStart: number; normalizedEnd: number; originalStart: number; originalEnd: number }

const BLOCKS = new Set(["ARTICLE", "BLOCKQUOTE", "DD", "DIV", "DT", "H1", "H2", "H3",
  "H4", "H5", "H6", "LI", "P", "PRE", "TD", "TH"]);
const EXCLUDED = new Set(["INPUT", "SELECT", "TEXTAREA", "SCRIPT", "STYLE", "NOSCRIPT"]);
const MAX_SEARCHABLE_UNITS = 12 * 1024 * 1024;

function visible(element: Element, root: Element, cache: WeakMap<Element, boolean>): boolean {
  const saved = cache.get(element);
  if (saved !== undefined) return saved;
  const parent = element.parentElement;
  const style = getComputedStyle(element);
  const value = !EXCLUDED.has(element.tagName)
    && (element.tagName !== "BUTTON" || element.classList.contains("document-link"))
    && !element.hasAttribute("hidden")
    && element.getAttribute("aria-hidden") !== "true"
    && !element.classList.contains("context-menu")
    && style.display !== "none" && style.visibility !== "hidden"
    && (element === root || (parent !== null && visible(parent, root, cache)));
  cache.set(element, value);
  return value;
}

function blockOwner(node: Text, root: Element): Element {
  let current: Element | null = node.parentElement;
  while (current && current !== root) {
    if (BLOCKS.has(current.tagName)) return current;
    current = current.parentElement;
  }
  return root;
}

export class FindIndex {
  readonly text: string;
  readonly normalized: string;
  private readonly parts: TextPart[];
  private readonly shifts: Shift[];

  constructor(root: Element | string) {
    const walker = typeof root === "string" ? null : document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts: TextPart[] = [];
    const chunks: string[] = [];
    const cache = new WeakMap<Element, boolean>();
    let length = 0;
    let previousBlock: Element | null = null;
    while (walker?.nextNode()) {
      const node = walker.currentNode as Text;
      const value = node.data;
      if (!value || !node.parentElement || typeof root === "string"
        || !visible(node.parentElement, root, cache)) continue;
      const block = blockOwner(node, root);
      if (previousBlock && block !== previousBlock) { chunks.push("\n"); length += 1; }
      parts.push({ node, start: length, end: length + value.length });
      chunks.push(value);
      length += value.length;
      if (length > MAX_SEARCHABLE_UNITS) throw new RangeError("Find text exceeds the search budget");
      previousBlock = block;
    }
    this.parts = parts;
    this.text = typeof root === "string" ? root : chunks.join("");
    if (this.text.length > MAX_SEARCHABLE_UNITS) throw new RangeError("Find text exceeds the search budget");
    const canonical = this.text.normalize("NFC");
    const folded = canonical.toLocaleLowerCase("en");
    if (canonical === this.text && folded.length === this.text.length) {
      this.normalized = folded;
      this.shifts = [];
      return;
    }
    const segments = new Intl.Segmenter("en", { granularity: "grapheme" });
    const normalizedChunks: string[] = [];
    const shifts: Shift[] = [];
    let position = 0;
    for (const segment of segments.segment(this.text)) {
      const foldedSegment = segment.segment.normalize("NFC").toLocaleLowerCase("en");
      const normalizedStart = position;
      position += foldedSegment.length;
      normalizedChunks.push(foldedSegment);
      if (segment.segment.length !== foldedSegment.length) {
        shifts.push({ normalizedStart, normalizedEnd: position,
          originalStart: segment.index, originalEnd: segment.index + segment.segment.length });
      }
    }
    this.normalized = normalizedChunks.join("");
    this.shifts = shifts;
  }

  private offset(position: number, end: boolean): number | null {
    let difference = 0;
    for (const shift of this.shifts) {
      if (position < shift.normalizedStart) break;
      if (position <= shift.normalizedEnd) {
        if (position === shift.normalizedStart) return shift.originalStart;
        if (position === shift.normalizedEnd) return shift.originalEnd;
        return null; // Do not match only part of a composed or expanded grapheme.
      }
      difference = shift.originalEnd - shift.normalizedEnd;
    }
    const original = position + difference;
    return end ? Math.min(original, this.text.length) : original;
  }

  span(start: number, length: number): FindSpan | null {
    const originalStart = this.offset(start, false);
    const originalEnd = this.offset(start + length, true);
    if (originalStart === null || originalEnd === null) return null;
    return { start: originalStart, end: originalEnd };
  }

  range(span: FindSpan): Range | null {
    const first = this.parts.find((part) => span.start >= part.start && span.start < part.end);
    const last = this.parts.find((part) => span.end > part.start && span.end <= part.end);
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, span.start - first.start);
    range.setEnd(last.node, span.end - last.start);
    return range;
  }

  visibleBounds(viewport: DOMRect, bounds: (element: HTMLElement) => DOMRect = element => element.getBoundingClientRect()): FindSpan | null {
    let start = Infinity;
    let end = -Infinity;
    for (const part of this.parts) {
      const element = part.node.parentElement;
      const rect = element ? bounds(element) : undefined;
      if (!rect || rect.bottom < viewport.top || rect.top > viewport.bottom
        || rect.right < viewport.left || rect.left > viewport.right) continue;
      start = Math.min(start, part.start);
      end = Math.max(end, part.end);
    }
    if (!Number.isFinite(start)) return null;
    return { start: this.normalizedAt(start), end: this.normalizedAt(end) };
  }

  normalizedAt(position: number): number {
    let difference = 0;
    for (const shift of this.shifts) {
      if (position < shift.originalStart) break;
      if (position <= shift.originalEnd) return shift.normalizedStart;
      difference = shift.normalizedEnd - shift.originalEnd;
    }
    return position + difference;
  }
}

export interface FindResults { count: number; starts: Uint32Array; queryLength: number }

export function findLiteral(index: FindIndex, query: string): FindResults {
  const needle = query.trim() ? query.normalize("NFC").toLocaleLowerCase("en") : "";
  if (!needle) return { count: 0, starts: new Uint32Array(), queryLength: 0 };
  const haystack = index.normalized;
  let starts = new Uint32Array(128);
  let count = 0;
  let position = 0;
  while ((position = haystack.indexOf(needle, position)) >= 0) {
    if (index.span(position, needle.length)) {
      if (count === starts.length) {
        const grown = new Uint32Array(starts.length * 2);
        grown.set(starts);
        starts = grown;
      }
      starts[count++] = position;
    }
    position += Math.max(1, needle.length);
  }
  return { count, starts: starts.subarray(0, count), queryLength: needle.length };
}
