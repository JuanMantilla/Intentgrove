import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root } from "mdast";
import type { SectionDescriptor } from "../../src/app/api";
import { mapRenderedSections } from "../../src/reader/sectionMap";

function descriptor(id: string, startByte: number, kind: SectionDescriptor["kind"]): SectionDescriptor {
  return { id, kind, ordinal: 0, label: id, startByte, endByte: 999, sourceHash: id };
}

function map(source: string, sections: SectionDescriptor[]) {
  const body = source.startsWith("\uFEFF") ? source.slice(1) : source;
  const tree = unified().use(remarkParse).parse(body) as Root;
  return mapRenderedSections(source, tree, sections);
}

describe("rendered section mapping", () => {
  it("matches native byte offsets across BOM, CRLF, and multibyte text", () => {
    const source = "\uFEFFintro😊\r\n# One\r\nbody\r\n## Two\r\n";
    const first = new TextEncoder().encode("\uFEFFintro😊\r\n").length;
    const second = new TextEncoder().encode("\uFEFFintro😊\r\n# One\r\nbody\r\n").length;
    const mapped = map(source, [
      descriptor("before", 3, "preheading"),
      descriptor("one", first, "heading"),
      descriptor("two", second, "heading")
    ]);
    expect(mapped.valid).toBe(true);
    expect(mapped.at(0)?.id).toBe("before");
    expect(mapped.at(source.slice(1).indexOf("# One"))?.id).toBe("one");
    expect(mapped.at(source.slice(1).indexOf("## Two"))?.id).toBe("two");
  });

  it("refuses a native/rendered heading mismatch", () => {
    expect(map("# A\n# B\n", [descriptor("a", 0, "heading")]).valid).toBe(false);
  });

  it("maps bare-CR headings to the same native byte boundaries", () => {
    const source = "intro\r# One\rbody\r# Two\rend\r";
    const second = source.indexOf("# Two");
    const mapped = map(source, [
      descriptor("before", 0, "preheading"),
      descriptor("one", source.indexOf("# One"), "heading"),
      descriptor("two", second, "heading")
    ]);
    expect(mapped.valid).toBe(true);
    expect(mapped.at(second)?.id).toBe("two");
  });
});
