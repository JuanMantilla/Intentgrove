import type { Root } from "mdast";
import type { SectionDescriptor } from "../app/api";

export interface RenderSectionMap {
  valid: boolean;
  at: (offset: number | undefined) => SectionDescriptor | undefined;
  firstOffsets: Map<string, number>;
}

export function mapRenderedSections(source: string, tree: Root | undefined, sections: SectionDescriptor[]): RenderSectionMap {
  const invalid: RenderSectionMap = { valid: false, at: () => undefined, firstOffsets: new Map() };
  if (!tree || !sections.length) return invalid;
  const headings = tree.children.filter((node) => node.type === "heading");
  const nativeHeadings = sections.filter((section) => section.kind === "heading");
  if (headings.length !== nativeHeadings.length) return invalid;
  const bom = source.startsWith("\uFEFF") ? 3 : 0;
  const body = bom ? source.slice(1) : source;
  let previousOffset = 0;
  let bytes = bom;
  for (let index = 0; index < headings.length; index += 1) {
    const offset = headings[index].position?.start.offset;
    if (offset === undefined || offset < previousOffset) return invalid;
    bytes += new TextEncoder().encode(body.slice(previousOffset, offset)).length;
    if (bytes !== nativeHeadings[index].startByte) return invalid;
    previousOffset = offset;
  }
  const boundaries = nativeHeadings.map((section, index) => ({
    offset: headings[index].position!.start.offset!,
    section
  }));
  const before = sections.find((section) => section.kind !== "heading");
  const firstOffsets = new Map<string, number>();
  function at(offset: number | undefined): SectionDescriptor | undefined {
    if (offset === undefined) return undefined;
    let current = before;
    for (const boundary of boundaries) {
      if (offset < boundary.offset) break;
      current = boundary.section;
    }
    return current ?? (sections.length === 1 ? sections[0] : undefined);
  }
  for (const node of tree.children) {
    const offset = node.position?.start.offset;
    if (offset === undefined) continue;
    const section = at(offset);
    if (section && !firstOffsets.has(section.id)) firstOffsets.set(section.id, offset);
  }
  return { valid: true, at, firstOffsets };
}
