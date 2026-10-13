// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { FindIndex } from "../../src/reader/find-index";
afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });
it.each([true, false])("keeps pointer and Find geometry consistent when the engine returns unscaled CSS-zoom rectangles: %s", async unscaled => {
  vi.resetModules();
  const { zoomRect, normalizeZoomRect } = await import("../../src/reader/usePinchZoom");
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
    if (this.style.zoom === "2") return new DOMRect(0, 0, unscaled ? 100 : 200, 1);
    return unscaled ? new DOMRect(150, 200, 300, 40) : new DOMRect(300, 400, 600, 80);
  });
  const root = document.createElement("article"); root.innerHTML = "<p>Needle</p>"; document.body.append(root);
  const rect = zoomRect(root.querySelector("p")!, 2);
  expect([rect.left, rect.top, rect.width, rect.height]).toEqual([300, 400, 600, 80]);
  expect(normalizeZoomRect(root.getBoundingClientRect(), 2).bottom).toBe(480);
  const index = new FindIndex(root);
  expect(index.visibleBounds(new DOMRect(0, 390, 800, 100), node => zoomRect(node, 2))?.start).toBe(0);
  expect(document.body.children).toHaveLength(1); // calibration leaves no extra UI/content behind.
});
