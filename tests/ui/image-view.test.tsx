// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ImageView from "../../src/reader/ImageView";
import type { ImageResponse } from "../../src/app/api";
import { api } from "../../src/app/api";
import { waitFor } from "@testing-library/react";

const image: ImageResponse = {
  fileId: "fixture", name: "diagram.svg", displayPath: "/tmp/fixture/diagram.svg",
  identityKey: "1:2", diskVersion: "v1", format: "svg", mime: "image/png",
  width: 800, height: 400, still: true, bytes: [137, 80, 78, 71]
};

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("shows format and intrinsic size, provides bounded zoom, and releases the inert pixel URL", () => {
  const create = vi.fn(() => "blob:decoded-pixels");
  const revoke = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL: create, revokeObjectURL: revoke });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 300 });
  const view = render(<ImageView image={image} locale="en" />);
  expect(screen.getByText("Format: SVG")).toBeTruthy();
  expect(screen.getByText("Dimensions: 800 × 400")).toBeTruthy();
  expect(screen.getByText("47%")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
  expect(screen.getByText("100%")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("150%")).toBeTruthy();
  expect(screen.getByRole("img", { name: "diagram.svg" }).getAttribute("src")).toBe("blob:decoded-pixels");
  view.unmount();
  expect(revoke).toHaveBeenCalledWith("blob:decoded-pixels");
});

it("requests full-resolution tiles only for the visible area at Actual size", async () => {
  const create = vi.fn(() => `blob:pixel-${create.mock.calls.length}`);
  const revoke = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL: create, revokeObjectURL: revoke });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 300 });
  const bytes = Array(24).fill(0);
  bytes.splice(16, 8, 0, 0, 16, 0, 0, 0, 10, 0); // 4096 × 2560 preview.
  const large = { ...image, fileId: "large", width: 8000, height: 5000, bytes };
  const tiles = vi.spyOn(api, "openImageTile").mockImplementation(async (fileId, diskVersion, x, y) => ({ fileId, diskVersion,
    x, y, width: 1024, height: 1024, bytes: [137, 80, 78, 71] }));
  try {
    const view = render(<ImageView image={large} locale="en" />);
    expect(tiles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
    const viewport = view.container.querySelector<HTMLDivElement>(".image-viewport")!;
    await waitFor(() => expect(tiles).toHaveBeenCalledWith("large", "v1",
      Math.floor(viewport.scrollLeft / 1024) * 1024, Math.floor(viewport.scrollTop / 1024) * 1024));
    const required = new Set(tiles.mock.calls.map(([, , x, y]) => `${x}:${y}`));
    await waitFor(() => expect(view.container.querySelectorAll(".image-tile")).toHaveLength(required.size));
    expect(required.size).toBeLessThanOrEqual(4);
    view.unmount();
    expect(revoke).toHaveBeenCalled();
  } finally { tiles.mockRestore(); }
});

it("recalculates Fit after viewport resize and keeps controls keyboard-focusable", () => {
  let width = 400;
  let height = 300;
  vi.stubGlobal("ResizeObserver", undefined);
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => height });
  const view = render(<ImageView image={image} locale="es" />);
  expect(view.container.querySelector("output")?.textContent).toBe("47%");
  const fit = screen.getByRole("button", { name: "Ajustar" });
  const actual = screen.getByRole("button", { name: "Tamaño real" });
  expect(fit.tabIndex).toBe(0);
  expect(actual.tabIndex).toBe(0);
  width = 800;
  fireEvent(window, new Event("resize"));
  expect(view.container.querySelector("output")?.textContent).toBe("69%");
  fireEvent.click(actual);
  expect(view.container.querySelector("output")?.textContent).toBe("100%");
  height = 180;
  fireEvent(window, new Event("resize"));
  expect(view.container.querySelector("output")?.textContent).toBe("100%");
  view.unmount();
});

it("distinguishes Actual from manual 100%, clamps zoom, resets Fit scroll and restores explicit modes", () => {
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:fixture", revokeObjectURL: vi.fn() });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => 300 });
  const changes = vi.fn();
  let view = render(<ImageView image={image} locale="en" onViewChange={changes} />);
  const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");
  expect(pressed("Fit")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
  expect(pressed("Actual size")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByLabelText("Zoom percentage").textContent).toBe("100%");
  expect(pressed("Fit")).toBe("false"); expect(pressed("Actual size")).toBe("false");
  for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect((screen.getByRole("button", { name: "Zoom in" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByLabelText("Zoom percentage").textContent).toBe("400%");
  for (let i = 0; i < 10; i++) fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
  expect((screen.getByRole("button", { name: "Zoom out" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByLabelText("Zoom percentage").textContent).toBe("25%");
  fireEvent.click(screen.getByRole("button", { name: "Actual size" }));
  const viewport = view.container.querySelector<HTMLDivElement>(".image-viewport")!;
  viewport.scrollLeft = 103; viewport.scrollTop = 51; fireEvent.scroll(viewport);
  const saved = changes.mock.lastCall![0];
  expect(saved).toEqual({ mode: "actual", scale: 1, left: 103, top: 51 });
  view.unmount();
  view = render(<ImageView image={image} locale="en" initialView={saved} />);
  expect(pressed("Actual size")).toBe("true");
  const restored = view.container.querySelector<HTMLDivElement>(".image-viewport")!;
  expect(restored.scrollLeft).toBe(103); expect(restored.scrollTop).toBe(51);
  fireEvent.click(screen.getByRole("button", { name: "Fit" }));
  expect(restored.scrollLeft).toBe(0); expect(restored.scrollTop).toBe(0);
  expect(pressed("Fit")).toBe("true");
});
