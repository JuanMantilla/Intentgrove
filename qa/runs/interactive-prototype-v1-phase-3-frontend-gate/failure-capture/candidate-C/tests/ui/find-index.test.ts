// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { FindIndex, findLiteral } from "../../src/reader/find-index";

afterEach(() => { document.body.replaceChildren(); });

function index(html: string): FindIndex {
  const article = document.createElement("article");
  article.className = "markdown-body";
  article.innerHTML = html;
  document.body.append(article);
  return new FindIndex(article);
}

describe("displayed text Find index", () => {
  it("counts rendered text without syntax, controls or hidden text", () => {
    const indexed = index('<h1>Alpha</h1><p><strong>Alpha</strong> and <a href="alpha.md">alpha</a></p>'
      + '<button>alpha</button><p hidden>alpha</p><p style="display:none">alpha</p>');
    const results = findLiteral(indexed, "alpha");
    expect(results.count).toBe(3);
    const spans = Array.from(results.starts, (start) => indexed.span(start, results.queryLength));
    expect(spans.every((span) => span && indexed.range(span)?.toString().toLowerCase() === "alpha")).toBe(true);
    expect(findLiteral(indexed, "alpha.md").count).toBe(0);
  });

  it("matches accents canonically without treating accented and plain letters alike", () => {
    const indexed = index("<p>café cafe\u0301 cafe CAFÉ</p>");
    const results = findLiteral(indexed, "CAFÉ");
    expect(results.count).toBe(3);
    expect(findLiteral(indexed, "cafe").count).toBe(1);
    const second = indexed.span(results.starts[1], results.queryLength);
    expect(second && indexed.range(second)?.toString()).toBe("cafe\u0301");
  });

  it("handles non-BMP offsets and empty or absent queries", () => {
    const indexed = index("<p>😀 Find 😀 find</p>");
    const results = findLiteral(indexed, "FIND");
    expect(results.count).toBe(2);
    expect(indexed.range(indexed.span(results.starts[0], results.queryLength)!)?.toString()).toBe("Find");
    expect(findLiteral(indexed, "  ").count).toBe(0);
    expect(findLiteral(indexed, "missing").count).toBe(0);
  });

  it("counts matches outside the current viewport", () => {
    const indexed = index(Array.from({ length: 200 }, (_, number) =>
      `<p data-row="${number}">needle</p>`).join(""));
    const results = findLiteral(indexed, "needle");
    expect(results.count).toBe(200);
    const last = indexed.span(results.starts[199], results.queryLength);
    expect(last && indexed.range(last)?.toString()).toBe("needle");
  });

  it("rejects text beyond the bounded search budget", () => {
    expect(() => new FindIndex("x".repeat(12 * 1024 * 1024 + 1))).toThrow(RangeError);
  });
});
