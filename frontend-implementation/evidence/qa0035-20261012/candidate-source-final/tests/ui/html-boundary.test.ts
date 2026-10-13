import { beforeEach, expect, it, vi } from "vitest";
import { api, type DocumentResponse } from "../../src/app/api";
import { isHtmlDocument } from "../../src/app/htmlBoundary";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
const document: DocumentResponse = { fileId: "file", identityKey: "1:2", name: "page.htm",
  displayPath: "/fixture/page.htm", content: "<h1>HTML</h1>", diskVersion: "v1" };
beforeEach(() => vi.resetAllMocks());
it.each(["page.html", "page.HTM", "folder/á.HTML"])("classifies %s without granting access", name => expect(isHtmlDocument(name)).toBe(true));
it.each(["page.html.md", "page.html?foo", "page.htm.bak"])("does not classify %s as an HTML file", name => expect(isHtmlDocument(name)).toBe(false));
it("refuses HTML from read, refresh and search commands before it reaches Markdown", async () => {
  invoke.mockResolvedValue(document);
  await expect(api.readDocument({ fileId: "file" })).rejects.toMatchObject({ code: "html_view_unavailable" });
  await expect(api.getConfirmedDocument("file", "v1", 1)).rejects.toMatchObject({ code: "html_view_unavailable" });
  invoke.mockResolvedValue({ document, line: 1, ordinal: null, changed: false, matchMoved: false });
  await expect(api.openSearchHit("job", "hit")).rejects.toMatchObject({ code: "html_view_unavailable" });
});
it("leaves Markdown responses unchanged", async () => {
  const markdown = { ...document, name: "notes.md", content: "# Notes" };
  invoke.mockResolvedValue(markdown);
  expect(await api.readDocument({ fileId: "file" })).toBe(markdown);
});
it.each(["missing", "denied", "unsupported_type"])("retains native %s diagnostics", async code => {
  invoke.mockRejectedValue({ code, message: code });
  await expect(api.readDocument({ rootId: "root", segments: ["page.html"] })).rejects.toMatchObject({ code });
});
