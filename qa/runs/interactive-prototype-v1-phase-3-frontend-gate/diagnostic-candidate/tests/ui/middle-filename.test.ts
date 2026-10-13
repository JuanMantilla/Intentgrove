import { describe, expect, it } from "vitest";
import { fitFilename } from "../../src/app/MiddleFilename";
describe("width-based identity", () => {
  const measure = (text: string) => Array.from(text).length * 7;
  it("uses available width before abbreviation and preserves ordinary labels", () => {
    expect(fitFilename("short.md", 70, measure)).toBe("short.md");
    const name = "long-project-identity-with-a-distinguishing-alpha.md";
    expect(fitFilename(name, 400, measure)).toBe(name);
    expect(fitFilename(name, 200, measure)).toMatch(/….*alpha\.md$/);
  });
  it.each([150, 210])("distinguishes shared-prefix files at %s pixels", width => {
    const prefix = "close-review-similar-filename-with-shared-prefix-";
    const alpha = fitFilename(prefix + "alpha.md", width, measure);
    const beta = fitFilename(prefix + "beta.md", width, measure);
    expect(alpha).not.toBe(beta);
    expect(alpha.endsWith("alpha.md")).toBe(true);
    expect(beta.endsWith("beta.md")).toBe(true);
    expect(measure(alpha)).toBeLessThanOrEqual(width);
  });
});
