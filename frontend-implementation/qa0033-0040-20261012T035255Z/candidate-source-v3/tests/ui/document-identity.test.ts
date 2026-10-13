import { describe, expect, it } from "vitest";
import { tabFilename, distinguishingParent, workspaceSegments } from "../../src/app/documentIdentity";

describe("document identity disclosure", () => {
  it("retains filename suffix and extension and exposes collisions in full", () => {
    const siblings = ["same-pre-alpha-a-very-long-ending.md", "same-pre-beta--a-very-long-ending.md"]
      .map((name) => ({ name, displayPath: "/fixture/" + name }));
    expect(tabFilename(siblings[0], siblings)).toBe(siblings[0].name);
    expect(tabFilename(siblings[1], siblings)).toBe(siblings[1].name);
    const solo = { name: "a-long-document-with-unique-suffix.md", displayPath: "/fixture/solo" };
    expect(tabFilename(solo, [solo])).toMatch(/^a-long-d….*suffix\.md$/);
  });
  it("finds differing parents beyond identical immediate folder names", () => {
    const siblings = ["a/docs/README.md", "b/docs/README.md"].map((path) => ({ name: "README.md", displayPath: "/fixture/" + path }));
    expect(distinguishingParent(siblings[0], siblings)).toBe("a/docs");
    expect(distinguishingParent(siblings[1], siblings)).toBe("b/docs");
  });
  it("does not imply membership for prefix collisions or traversal paths", () => {
    expect(workspaceSegments("/fixture-other/a.md", "/fixture")).toBeNull();
    expect(workspaceSegments("/fixture/../outside.md", "/fixture")).toBeNull();
    expect(workspaceSegments("/fixture/docs/a.md", "/fixture/")).toEqual(["docs", "a.md"]);
  });
});
