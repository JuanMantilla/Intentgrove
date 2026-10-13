import { projectAction } from "./project-navigation-helpers";
// @vitest-environment jsdom
// Real App, mocked native boundary. These checks do not establish HTML support.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({ selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(),
  readDocument: vi.fn(), loadSectionRecovery: vi.fn(), listEditSections: vi.fn(), resolveLink: vi.fn(), openHtml: vi.fn() }));
vi.mock("../../src/app/api", async original => ({ ...await original<typeof import("../../src/app/api")>(), api: mocks }));
vi.mock("../../src/app/htmlNative", () => ({htmlNative: {open: mocks.openHtml, cancelOpen: vi.fn(async()=>true), dispose: vi.fn(async()=>true)}}));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/html-fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "page.html", kind: "other" },
    { name: "UPPER.HTM", kind: "other" }, { name: "notes.md", kind: "markdown" },
    { name: "secret.txt", kind: "other" }], nextOffset: null, snapshotId: "v1" });
  mocks.readDocument.mockRejectedValue({ code: "unsupported_type", message: "Only Markdown" });
  mocks.openHtml.mockRejectedValue({ code:"html_view_unavailable", message:"Provider unavailable" });
});
afterEach(cleanup);
async function folder() {
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  return screen.findByTitle("page.html");
}
it("includes html/htm names in the filter and reports the actual missing viewer with path, Retry and Close", async () => {
  fireEvent.click(await folder());
  expect(screen.getByTitle("UPPER.HTM")).toBeTruthy();
  expect(screen.queryByTitle("secret.txt")).toBeNull();
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByRole("heading").textContent).toBe("HTML viewing is unavailable in this build");
  expect(screen.getByRole("tab", { name: /^page\.html/ })).toBeTruthy();
  fireEvent.click(screen.getByText("Show path"));
  expect(screen.getByLabelText("Full path: page.html").textContent).toBe("/tmp/html-fixture/page.html");
  fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(mocks.openHtml).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(mocks.loadSectionRecovery).not.toHaveBeenCalled();
  expect(mocks.listEditSections).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Close tab" }));
  await waitFor(() => expect(screen.queryByRole("tab")).toBeNull());
});
it.each(["missing", "denied", "reselection_required"])("retains specific native %s failures rather than claiming an unsupported viewer", async code => {
  mocks.openHtml.mockRejectedValue({ code, message: code });
  fireEvent.click(await folder());
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).not.toContain("HTML viewing is unavailable");
});
it("shows honest opening state and cannot resurrect a closed pending HTML tab", async () => {
  let reject!: (reason: unknown) => void;
  mocks.openHtml.mockImplementation(() => new Promise((_resolve, no) => { reject = no; }));
  fireEvent.click(await folder());
  expect(await screen.findByText("Opening HTML…")).toBeTruthy();
  fireEvent.keyDown(window, { key: "w", metaKey: true });
  await waitFor(() => expect(screen.queryByRole("tab")).toBeNull());
  await act(async () => reject({ code: "unsupported_type", message: "Only Markdown" }));
  expect(screen.queryByRole("tab")).toBeNull();
});
it("refuses returned HTML bytes before rendering or requesting editing/recovery", async () => {
  mocks.openHtml.mockResolvedValue({ fileId: "html", identityKey: "1:2", name: "page.html",
    displayPath: "/tmp/html-fixture/page.html", diskVersion: "v1",
    content: readFileSync("tests/fixtures/html-view/hostile.html", "utf8") });
  fireEvent.click(await folder());
  expect(await screen.findByRole("heading", { name: "HTML viewing is unavailable in this build" })).toBeTruthy();
  expect(screen.queryByText("Never render here")).toBeNull();
  expect(document.querySelector(".markdown-body")).toBeNull();
  expect(mocks.loadSectionRecovery).not.toHaveBeenCalled();
  expect(mocks.listEditSections).not.toHaveBeenCalled();
});
it("retains the Markdown source on an unsupported local HTML link", async () => {
  mocks.readDocument.mockResolvedValue({ fileId: "md", identityKey: "md", name: "notes.md",
    displayPath: "/tmp/html-fixture/notes.md", diskVersion: "v1", content: "# Notes\n\n[HTML page](page.html#start)" });
  mocks.listEditSections.mockResolvedValue({ diskVersion: "v1", sections: [] });
  mocks.resolveLink.mockResolvedValue({ kind: "unsupported", fileId: null, anchor: null, reason: "Unsupported type" });
  await folder(); fireEvent.click(screen.getByTitle("notes.md"));
  fireEvent.click(await screen.findByRole("button", { name: "HTML page" }));
  expect(await screen.findByText("HTML viewing is unavailable in this build")).toBeTruthy();
  expect(screen.getByRole("tab", { name: /^notes\.md/ }).getAttribute("aria-selected")).toBe("true");
  expect(screen.getAllByRole("tab")).toHaveLength(1);
  expect(screen.getByRole("button", { name: "Forward" }).hasAttribute("disabled")).toBe(true);
});
it("localizes the unavailable state without translating document identity", async () => {
  localStorage.setItem("md-reader-locale", "es"); render(<App />);
  fireEvent.click(projectAction("Abrir carpeta"));
  fireEvent.click(await screen.findByTitle("UPPER.HTM"));
  expect(await screen.findByRole("heading", { name: "La vista HTML no está disponible en esta versión" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: /^UPPER\.HTM/ })).toBeTruthy();
});
