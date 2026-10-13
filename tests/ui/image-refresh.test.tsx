import { projectAction, projectsToggle } from "./project-navigation-helpers";
// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import { getAppearance } from "../../src/app/appearance";
const originalWidth = window.innerWidth;
import type { ImageResponse } from "../../src/app/api";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), selectFile: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(), openImage: vi.fn(), reloadItem: vi.fn(),
  listeners: {} as Record<string, (event: { payload: unknown }) => void>
}));
vi.mock("../../src/app/api", async (original) => {
  const base = await original<typeof import("../../src/app/api")>();
  return { ...base, api: mocks };
});
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (name: string, listener: (event: { payload: unknown }) => void) => {
    mocks.listeners[name] = listener;
    return () => { delete mocks.listeners[name]; };
  })
}));

const image = (diskVersion: string, width: number): ImageResponse => ({
  fileId: "image-1", name: "figure.png", displayPath: "/tmp/fixture/figure.png",
  identityKey: "1:2", diskVersion, format: "png", mime: "image/png",
  width, height: 16, still: false, bytes: [137, 80, 78, 71]
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.selectRoot.mockResolvedValue({ id: "root", name: "fixture", displayPath: "/tmp/fixture", generation: 1 });
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "figure.png", kind: "image" }], nextOffset: null });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); getAppearance().applyPreference("system"); Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth }); });

it("replaces an image after a confirmed external change while retaining the folder tree", async () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:pixels"), revokeObjectURL: vi.fn() });
  mocks.openImage.mockResolvedValueOnce(image("v1", 24)).mockResolvedValueOnce(image("v2", 32));
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("figure.png"));
  await screen.findByText("Dimensions: 24 × 16");
  await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
  await act(async () => mocks.listeners["refresh:file_changed"]({ payload: {
    generation: 1, fileId: "image-1", diskVersion: "v2", identityKey: "1:2", checkedAt: Date.now()
  } }));
  expect(await screen.findByText("Dimensions: 32 × 16")).toBeTruthy();
  expect(within(screen.getByRole("complementary", { name: "Explorer" })).getByTitle("figure.png")).toBeTruthy();
  expect(mocks.readDocument).not.toHaveBeenCalled();
});

it("replaces stale pixels with a specific error and recovers through Retry", async () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:pixels"), revokeObjectURL: vi.fn() });
  mocks.openImage.mockResolvedValueOnce(image("v1", 24))
    .mockRejectedValueOnce({ code: "image_corrupt" })
    .mockResolvedValueOnce(image("v2", 32));
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("figure.png"));
  await screen.findByRole("img", { name: "figure.png" });
  await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
  await act(async () => mocks.listeners["refresh:file_changed"]({ payload: {
    generation: 1, fileId: "image-1", diskVersion: "v2", identityKey: "1:2", checkedAt: Date.now()
  } }));
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByRole("img", { name: "figure.png" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Dimensions: 32 × 16")).toBeTruthy();
});

// The first external refresh used to strip request.rootId/segments, so a later
// root-file Reload could report success without re-reading the errored image.
it.each(["1:2", "1:replacement"])("recovers a settled image error via Reload after refresh (identity %s)", async identityKey => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:repaired"), revokeObjectURL: vi.fn() });
  mocks.openImage.mockReset().mockResolvedValueOnce(image("v1", 24))
    .mockResolvedValueOnce(image("v2", 32))
    .mockRejectedValueOnce({ code: "image_mismatch" })
    .mockResolvedValueOnce({ ...image("v1", 24), identityKey });
  mocks.reloadItem.mockResolvedValue({ jobId: "repair", generation: 1, accepted: true });
  render(<App />);
  fireEvent.click(projectAction("Open folder"));
  fireEvent.click(await screen.findByTitle("figure.png"));
  await screen.findByText("Dimensions: 24 × 16");
  await waitFor(() => expect(mocks.listeners["refresh:file_changed"]).toBeTypeOf("function"));
  const changed = async (diskVersion: string) => {
    await act(async () => mocks.listeners["refresh:file_changed"]({ payload: {
      generation: 1, fileId: "image-1", diskVersion, identityKey: "1:2", checkedAt: Date.now()
    } }));
  };
  await changed("v2");
  await screen.findByText("Dimensions: 32 × 16");
  await changed("corrupt");
  await screen.findByRole("alert");
  expect(screen.queryByRole("img", { name: "figure.png" })).toBeNull();
  // No file_changed event is needed: restored exact bytes may match the last
  // confirmed native fingerprint. Manual Reload must still clear the error.
  fireEvent.contextMenu(screen.getByRole("tab", { name: /figure.png/i }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Reload figure.png" }));
  expect(await screen.findByText("Dimensions: 24 × 16")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(mocks.openImage).toHaveBeenCalledTimes(4);
  expect(within(screen.getByRole("complementary", { name: "Explorer" })).getByTitle("figure.png")).toBeTruthy();
  expect(screen.getAllByRole("tab")).toHaveLength(1);
});

it("retains file-only Reload for an explicit image after refresh and corruption", async () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:explicit"), revokeObjectURL: vi.fn() });
  mocks.selectFile.mockResolvedValue({ id: "image-1", name: "figure.png", displayPath: "/tmp/fixture/figure.png", generation: 1 });
  mocks.openImage.mockReset().mockResolvedValueOnce(image("v1",24))
    .mockResolvedValueOnce(image("v2",32)).mockRejectedValueOnce({code:"image_mismatch"})
    .mockResolvedValueOnce(image("v1",24));
  mocks.reloadItem.mockResolvedValue({jobId:"explicit-repair",generation:1,accepted:true});
  render(<App />);
  fireEvent.click(projectAction("Open file"));
  await screen.findByText("Dimensions: 24 × 16");
  for (const diskVersion of ["v2","corrupt"]) {
    await act(async()=>mocks.listeners["refresh:file_changed"]({payload:{
      generation:1,fileId:"image-1",diskVersion,identityKey:"1:2",checkedAt:Date.now()
    }}));
    if(diskVersion==="v2")await screen.findByText("Dimensions: 32 × 16");
    else await screen.findByRole("alert");
  }
  fireEvent.contextMenu(screen.getByRole("tab",{name:/figure.png/i}));
  fireEvent.click(screen.getByRole("menuitem",{name:"Reload figure.png"}));
  expect(await screen.findByText("Dimensions: 24 × 16")).toBeTruthy();
  expect(mocks.reloadItem).toHaveBeenCalledWith({kind:"explicit-file",fileId:"image-1"},expect.any(String));
  expect(screen.queryByRole("alert")).toBeNull();
});

it.each((["light", "dark"] as const).flatMap(theme => [1280, 390].map(width => ({ theme, width }))))("places live controls in the header/footer and retains modes across tabs in $theme at $width px (DOM only)", async ({ theme, width }) => {
  getAppearance().applyPreference(theme);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:fixture", revokeObjectURL: vi.fn() });
  mocks.openImage.mockResolvedValue(image("v1", 800));
  mocks.listEntries.mockResolvedValue({ entries: [{ name: "figure.png", kind: "image" }, { name: "notes.md", kind: "markdown" }], nextOffset: null });
  mocks.readDocument.mockResolvedValue({ fileId: "notes", identityKey: "notes", name: "notes.md", displayPath: "/tmp/fixture/notes.md", content: "# Notes\nRetained text", diskVersion: "v1" });
  render(<App />);
  fireEvent.click(projectAction("Open folder")); fireEvent.click(await screen.findByTitle("figure.png"));
  const fit = await screen.findByRole("button", { name: "Fit" });
  expect(fit.closest(".document-location")).toBeTruthy();
  expect(screen.getByText("Dimensions: 800 × 16").closest("footer.image-meta")).toBeTruthy();
  expect(document.querySelector(".image-header")).toBeNull();
  expect(screen.queryByRole("button", { name: "Outline" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Reading settings" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Find in document" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
  const viewport = document.querySelector<HTMLDivElement>(".image-viewport")!;
  viewport.scrollLeft = 112; viewport.scrollTop = 48; fireEvent.scroll(viewport);
  if (document.querySelector(".sidebar")?.getAttribute("aria-hidden") === "true") fireEvent.click(projectsToggle());
  fireEvent.click(screen.getByTitle("notes.md")); await screen.findByRole("heading", { name: "Notes" });
  expect(screen.getByRole("button", { name: "Find in document" }).closest(".document-location")).toBeTruthy();
  fireEvent.click(screen.getByRole("tab", { name: "figure.png" }));
  expect((await screen.findByRole("button", { name: "Actual size" })).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByLabelText("Zoom percentage").textContent).toBe("100%");
  expect(document.querySelector<HTMLDivElement>(".image-viewport")!.scrollLeft).toBe(112);
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  fireEvent.click(screen.getByRole("tab", { name: "notes.md" }));
  await screen.findByRole("heading", { name: "Notes" });
  fireEvent.click(screen.getByRole("tab", { name: "figure.png" }));
  expect((await screen.findByRole("button", { name: "Actual size" })).getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByLabelText("Zoom percentage").textContent).toBe("100%");
  // The existing memory owner releases inactive image bytes and reacquires them on each return.
  expect(mocks.openImage).toHaveBeenCalledTimes(3); expect(mocks.readDocument).toHaveBeenCalledTimes(1);
  const menu = document.querySelector<HTMLDetailsElement>(".document-actions-disclosure")!;
  menu.open = true; fireEvent(menu, new Event("toggle"));
  expect(screen.getByRole("button", { name: "Copy path" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Outline" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Reading settings" })).toBeNull();
});
