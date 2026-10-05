// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../src/app/App";
import type { ImageResponse } from "../../src/app/api";

const mocks = vi.hoisted(() => ({
  selectRoot: vi.fn(), listEntries: vi.fn(), readDocument: vi.fn(), openImage: vi.fn(),
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
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("replaces an image after a confirmed external change while retaining the folder tree", async () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:pixels"), revokeObjectURL: vi.fn() });
  mocks.openImage.mockResolvedValueOnce(image("v1", 24)).mockResolvedValueOnce(image("v2", 32));
  render(<App />);
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
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
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Open folder" }));
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
